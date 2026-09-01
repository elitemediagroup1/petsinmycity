'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const relay = require('../netlify/functions/indexnow-relay');
const handler = relay.handler;
const {
  makeEvent, parseBody, resetRateLimits, stubFetch, jsonResponse, withEnv, muteLogs,
} = require('./helpers');

const SECRET = 'test-relay-secret-value';
const KEY = 'test-indexnow-key';

function setup(t, extraEnv) {
  const unmute = muteLogs();
  const restoreEnv = withEnv(Object.assign({
    INDEXNOW_RELAY_SECRET: SECRET,
    INDEXNOW_KEY: KEY,
    INDEXNOW_HOST: 'petsinmycity.com',
    RATE_LIMIT_BACKEND: 'memory',
    INDEXNOW_PER_MIN: '50',
    INDEXNOW_PER_DAY: '50',
  }, extraEnv || {}));
  resetRateLimits();
  t.after(function () { restoreEnv(); unmute(); resetRateLimits(); });
}

function submit(body, extra) {
  return makeEvent(Object.assign({
    body: body,
    headers: { 'x-indexnow-token': SECRET },
  }, extra || {}));
}

/**
 * Every test stubs fetch. Nothing in this suite ever reaches api.indexnow.org,
 * so no URL is submitted to IndexNow during testing.
 */
function upstreamStub(status) {
  return stubFetch(function () { return jsonResponse(status === undefined ? 200 : status, { ok: true }); });
}

test('indexnow: an authorized submission of canonical URLs succeeds', async (t) => {
  setup(t);
  t.after(upstreamStub(200));
  const res = await handler(submit({ urls: ['https://petsinmycity.com/', 'https://petsinmycity.com/tools/'] }));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(parseBody(res), { ok: true, submitted: 2 });
  assert.equal(globalThis.fetch.calls.length, 1);
  assert.equal(globalThis.fetch.calls[0].url, 'https://api.indexnow.org/indexnow');
});

test('indexnow: no CORS headers are ever emitted', async (t) => {
  setup(t);
  t.after(upstreamStub(200));
  const res = await handler(submit({ urls: ['https://petsinmycity.com/'] }, { origin: 'https://petsinmycity.com' }));
  const headerNames = Object.keys(res.headers).map(function (h) { return h.toLowerCase(); });
  assert.ok(!headerNames.some(function (h) { return h.startsWith('access-control-'); }), JSON.stringify(res.headers));
});

test('indexnow: only POST is accepted', async (t) => {
  setup(t);
  t.after(upstreamStub(200));
  for (const method of ['GET', 'OPTIONS', 'PUT', 'DELETE']) {
    const res = await handler(submit({ urls: ['https://petsinmycity.com/'] }, { method: method }));
    assert.equal(res.statusCode, 405, method);
  }
  assert.equal(globalThis.fetch.calls.length, 0);
});

test('indexnow: a missing or wrong token is rejected', async (t) => {
  setup(t);
  t.after(upstreamStub(200));
  const noToken = await handler(makeEvent({ body: { urls: ['https://petsinmycity.com/'] } }));
  assert.equal(noToken.statusCode, 401);
  assert.equal(parseBody(noToken).error, 'unauthorized');

  const wrongToken = await handler(makeEvent({
    body: { urls: ['https://petsinmycity.com/'] },
    headers: { 'x-indexnow-token': 'not-the-secret' },
  }));
  assert.equal(wrongToken.statusCode, 401);
  assert.equal(globalThis.fetch.calls.length, 0);
});

test('indexnow: an unconfigured relay fails closed rather than open', async (t) => {
  setup(t, { INDEXNOW_RELAY_SECRET: undefined });
  t.after(upstreamStub(200));
  const res = await handler(submit({ urls: ['https://petsinmycity.com/'] }));
  assert.equal(res.statusCode, 503);
  assert.equal(parseBody(res).error, 'service_unavailable');
  assert.equal(globalThis.fetch.calls.length, 0);
});

test('indexnow: a missing IndexNow key fails closed', async (t) => {
  setup(t, { INDEXNOW_KEY: undefined });
  t.after(upstreamStub(200));
  const res = await handler(submit({ urls: ['https://petsinmycity.com/'] }));
  assert.equal(res.statusCode, 503);
  assert.equal(globalThis.fetch.calls.length, 0);
});

test('indexnow: there is no committed fallback key in the source', () => {
  const fs = require('fs');
  const source = fs.readFileSync(require.resolve('../netlify/functions/indexnow-relay.js'), 'utf8');
  assert.ok(!/INDEXNOW_KEY\s*\|\|\s*["']/.test(source), 'no `env || "literal"` key fallback');
  assert.ok(!/[0-9a-f]{32}/.test(source), 'no 32-hex literal in the relay source');
});

test('indexnow: the key is never echoed in a response', async (t) => {
  setup(t);
  t.after(upstreamStub(200));
  const res = await handler(submit({ urls: ['https://petsinmycity.com/'] }));
  assert.ok(!res.body.includes(KEY));
  assert.ok(!res.body.includes(SECRET));
});

test('indexnow: foreign and non-canonical URLs are rejected', async (t) => {
  setup(t);
  t.after(upstreamStub(200));
  const rejected = [
    'https://evil.example/page',
    'https://www.petsinmycity.com/page',
    'https://sub.petsinmycity.com/page',
    'https://petsinmycity.com.evil.example/page',
    'http://petsinmycity.com/page',
    'https://user:pass@petsinmycity.com/page',
    'https://petsinmycity.com/page#section',
    'https://petsinmycity.com:8443/page',
    'javascript:alert(1)',
    'not a url at all',
    '//petsinmycity.com/page',
    'https://petsinmycity.com/' + 'x'.repeat(2100),
  ];
  for (const url of rejected) {
    const res = await handler(submit({ urls: [url] }));
    assert.equal(res.statusCode, 400, url);
    assert.equal(parseBody(res).error, 'invalid_request', url);
  }
  assert.equal(globalThis.fetch.calls.length, 0, 'nothing was submitted upstream');
});

test('indexnow: one bad URL rejects the whole batch', async (t) => {
  setup(t);
  t.after(upstreamStub(200));
  const res = await handler(submit({
    urls: ['https://petsinmycity.com/ok', 'https://evil.example/bad'],
  }));
  assert.equal(res.statusCode, 400);
  assert.equal(globalThis.fetch.calls.length, 0);
});

test('indexnow: oversized batches are rejected', async (t) => {
  setup(t);
  t.after(upstreamStub(200));
  const urls = [];
  for (let i = 0; i < relay._internal.MAX_BATCH + 1; i += 1) urls.push('https://petsinmycity.com/p' + i);
  const res = await handler(submit({ urls: urls }));
  assert.equal(res.statusCode, 400);
  assert.equal(parseBody(res).field, 'urls');
  assert.equal(globalThis.fetch.calls.length, 0);
});

test('indexnow: oversized bodies are rejected before parsing', async (t) => {
  setup(t);
  t.after(upstreamStub(200));
  const res = await handler(makeEvent({
    rawBody: 'x'.repeat(relay._internal.MAX_BODY_BYTES + 1),
    headers: { 'x-indexnow-token': SECRET },
  }));
  assert.equal(res.statusCode, 413);
  assert.equal(globalThis.fetch.calls.length, 0);
});

test('indexnow: malformed input is rejected', async (t) => {
  setup(t);
  t.after(upstreamStub(200));
  const bad = [{}, { urls: [] }, { urls: 'https://petsinmycity.com/' }, { urls: [null] }, { urls: [{}] }];
  for (const body of bad) {
    const res = await handler(submit(body));
    assert.equal(res.statusCode, 400, JSON.stringify(body));
  }
  const badJson = await handler(makeEvent({ rawBody: '{oops', headers: { 'x-indexnow-token': SECRET } }));
  assert.equal(badJson.statusCode, 400);
  assert.equal(parseBody(badJson).error, 'invalid_json');
  assert.equal(globalThis.fetch.calls.length, 0);
});

test('indexnow: duplicate URLs are collapsed', async (t) => {
  setup(t);
  t.after(upstreamStub(200));
  const res = await handler(submit({ urls: ['https://petsinmycity.com/a', 'https://petsinmycity.com/a'] }));
  assert.equal(parseBody(res).submitted, 1);
});

test('indexnow: an upstream failure returns a stable code and no upstream body', async (t) => {
  setup(t);
  t.after(stubFetch(function () {
    return { ok: false, status: 422, async json() { return { message: 'key not found at ' + KEY }; } };
  }));
  const res = await handler(submit({ urls: ['https://petsinmycity.com/'] }));
  assert.equal(res.statusCode, 502);
  assert.equal(parseBody(res).error, 'upstream_unavailable');
  assert.ok(!res.body.includes(KEY));
  assert.ok(!res.body.includes('key not found'));
});

test('indexnow: a network error is not surfaced verbatim', async (t) => {
  setup(t);
  t.after(stubFetch(function () { throw new Error('ECONNREFUSED 10.0.0.1:443'); }));
  const res = await handler(submit({ urls: ['https://petsinmycity.com/'] }));
  assert.equal(res.statusCode, 502);
  assert.ok(!res.body.includes('ECONNREFUSED'));
  assert.ok(!res.body.includes('10.0.0.1'));
});

test('indexnow: rate limiting applies', async (t) => {
  setup(t, { INDEXNOW_PER_MIN: '2' });
  t.after(upstreamStub(200));
  const body = { urls: ['https://petsinmycity.com/'] };
  assert.equal((await handler(submit(body))).statusCode, 200);
  assert.equal((await handler(submit(body))).statusCode, 200);
  const limited = await handler(submit(body));
  assert.equal(limited.statusCode, 429);
  assert.equal(parseBody(limited).error, 'rate_limited');
  assert.equal(globalThis.fetch.calls.length, 2);
});

test('indexnow: the public key-verification file is still published', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.resolve(__dirname, '..');
  const keyFiles = fs.readdirSync(root).filter(function (f) { return /^[0-9a-f]{32}\.txt$/.test(f); });
  assert.equal(keyFiles.length, 1, 'exactly one IndexNow key-verification file at the site root');
  const contents = fs.readFileSync(path.join(root, keyFiles[0]), 'utf8').trim();
  assert.equal(contents, path.basename(keyFiles[0], '.txt'),
    'the file must contain exactly the key that names it');
});
