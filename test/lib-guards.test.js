'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const cors = require('../netlify/lib/cors');
const guard = require('../netlify/lib/request-guard');
const validate = require('../netlify/lib/validate');
const rateLimit = require('../netlify/lib/rate-limit');
const log = require('../netlify/lib/log');
const { makeEvent, resetRateLimits } = require('./helpers');

test('CORS: production origin is allowed and echoed back', () => {
  const result = cors.evaluate(makeEvent({ origin: 'https://petsinmycity.com' }), {});
  assert.equal(result.allowed, true);
  assert.equal(result.headers['Access-Control-Allow-Origin'], 'https://petsinmycity.com');
  assert.equal(result.headers.Vary, 'Origin');
});

test('CORS: wildcard is never emitted', () => {
  for (const origin of ['https://petsinmycity.com', 'https://evil.example', null]) {
    const result = cors.evaluate(makeEvent({ origin: origin }), {});
    assert.notEqual(result.headers['Access-Control-Allow-Origin'], '*');
  }
});

test('CORS: a foreign origin is rejected', () => {
  const result = cors.evaluate(makeEvent({ origin: 'https://evil.example' }), {});
  assert.equal(result.allowed, false);
  assert.equal(result.headers['Access-Control-Allow-Origin'], undefined);
});

test('CORS: look-alike origins are rejected', () => {
  for (const origin of [
    'https://petsinmycity.com.evil.example',
    'http://petsinmycity.com',
    'https://evil.petsinmycity.com.attacker.test',
    'https://www.petsinmycity.com',
  ]) {
    assert.equal(cors.evaluate(makeEvent({ origin: origin }), {}).allowed, false, origin);
  }
});

test('CORS: a request with no Origin header is allowed but gets no ACAO', () => {
  // Same-origin and server-to-server. A browser always attaches Origin
  // cross-origin, so this cannot be a cross-site attack.
  const result = cors.evaluate(makeEvent({ origin: null }), {});
  assert.equal(result.allowed, true);
  assert.equal(result.headers['Access-Control-Allow-Origin'], undefined);
});

test('CORS: preview origins only in a non-production context', () => {
  const preview = { CONTEXT: 'deploy-preview', DEPLOY_PRIME_URL: 'https://dp--petsinmycity.netlify.app' };
  assert.equal(cors.evaluate(makeEvent({ origin: 'https://dp--petsinmycity.netlify.app' }), preview).allowed, true);

  const production = { CONTEXT: 'production', DEPLOY_PRIME_URL: 'https://dp--petsinmycity.netlify.app' };
  assert.equal(cors.evaluate(makeEvent({ origin: 'https://dp--petsinmycity.netlify.app' }), production).allowed, false);
});

test('CORS: ALLOWED_ORIGINS adds explicit https origins only', () => {
  const env = { ALLOWED_ORIGINS: 'https://preview.example, http://insecure.example, not-a-url' };
  assert.equal(cors.evaluate(makeEvent({ origin: 'https://preview.example' }), env).allowed, true);
  assert.equal(cors.evaluate(makeEvent({ origin: 'http://insecure.example' }), env).allowed, false);
});

test('guard: only POST and OPTIONS are accepted', () => {
  for (const method of ['GET', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'TRACE']) {
    assert.deepEqual(guard.guard(makeEvent({ method: method, body: {} })), { error: 'method_not_allowed' }, method);
  }
  assert.deepEqual(guard.guard(makeEvent({ method: 'OPTIONS' })), { preflight: true });
  assert.equal(guard.guard(makeEvent({ method: 'POST', body: { a: 1 } })).ok, true);
});

test('guard: the size limit is enforced before parsing', () => {
  const huge = { text: 'x'.repeat(20000) };
  assert.deepEqual(guard.guard(makeEvent({ body: huge }), { maxBodyBytes: 1024 }), { error: 'payload_too_large' });
});

test('guard: a lying Content-Length is still rejected', () => {
  const event = makeEvent({ rawBody: '{}', headers: { 'content-length': '999999' } });
  assert.deepEqual(guard.guard(event, { maxBodyBytes: 1024 }), { error: 'payload_too_large' });
});

test('guard: malformed JSON and non-object bodies are rejected', () => {
  assert.deepEqual(guard.guard(makeEvent({ rawBody: '{not json' })), { error: 'invalid_json' });
  assert.deepEqual(guard.guard(makeEvent({ rawBody: '[1,2,3]' })), { error: 'invalid_request' });
  assert.deepEqual(guard.guard(makeEvent({ rawBody: '"hello"' })), { error: 'invalid_request' });
  assert.deepEqual(guard.guard(makeEvent({ rawBody: 'null' })), { error: 'invalid_request' });
  assert.deepEqual(guard.guard(makeEvent({ rawBody: '' })), { error: 'invalid_request' });
});

test('clientKey: never contains the raw IP and is stable per IP', () => {
  const a = guard.clientKey(makeEvent({ ip: '198.51.100.7' }), { RATE_LIMIT_HMAC_SECRET: 's' });
  const b = guard.clientKey(makeEvent({ ip: '198.51.100.7' }), { RATE_LIMIT_HMAC_SECRET: 's' });
  const c = guard.clientKey(makeEvent({ ip: '198.51.100.8' }), { RATE_LIMIT_HMAC_SECRET: 's' });
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.ok(!a.includes('198.51.100'));
  assert.match(a, /^[0-9a-f]{16}$/);
});

test('clientKey: rotating the salt rotates the identifier', () => {
  const a = guard.clientKey(makeEvent({ ip: '198.51.100.7' }), { RATE_LIMIT_HMAC_SECRET: 'one' });
  const b = guard.clientKey(makeEvent({ ip: '198.51.100.7' }), { RATE_LIMIT_HMAC_SECRET: 'two' });
  assert.notEqual(a, b);
});

test('validate: US ZIP codes', () => {
  assert.deepEqual(validate.usZip('60601'), { ok: true, value: '60601' });
  assert.deepEqual(validate.usZip(' 60601-1234 '), { ok: true, value: '60601' });
  for (const bad of ['6060', '606011', 'ABCDE', '60601 OR 1=1', '', '0x123', 123]) {
    assert.equal(validate.usZip(bad).ok, false, String(bad));
  }
});

test('validate: city strings reject query-steering punctuation', () => {
  assert.equal(validate.cityName('Chicago').ok, true);
  assert.equal(validate.cityName('Chicago, IL').ok, true);
  assert.equal(validate.cityName('Winston-Salem').ok, true);
  for (const bad of ['Chicago; DROP', 'Chicago&key=x', 'Chicago|IL', '<script>', 'A', 'x'.repeat(80)]) {
    assert.equal(validate.cityName(bad).ok, false, bad);
  }
});

test('validate: control characters are rejected', () => {
  assert.equal(validate.boundedString('ok text').ok, true);
  assert.equal(validate.boundedString('bad' + String.fromCharCode(0) + 'text').reason, 'control_characters');
  assert.equal(validate.boundedString('bad' + String.fromCharCode(7) + 'text').reason, 'control_characters');
});

test('rate limit: blocks at the cap and reports a retry window', async () => {
  resetRateLimits();
  const rules = [{ name: 'minute', windowSeconds: 60, max: 2 }];
  const opts = { endpoint: 'unit', scope: 'client', identifier: 'a', rules: rules, env: process.env, now: 60000 };
  assert.equal((await rateLimit.consume(opts)).allowed, true);
  assert.equal((await rateLimit.consume(opts)).allowed, true);
  const blocked = await rateLimit.consume(opts);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.rule, 'minute');
  assert.ok(blocked.retryAfterSeconds > 0 && blocked.retryAfterSeconds <= 60);
});

test('rate limit: counters are isolated by endpoint and identifier', async () => {
  resetRateLimits();
  const rules = [{ name: 'minute', windowSeconds: 60, max: 1 }];
  const base = { rules: rules, env: process.env, now: 60000, scope: 'client' };
  assert.equal((await rateLimit.consume(Object.assign({}, base, { endpoint: 'a', identifier: 'x' }))).allowed, true);
  // Same identifier, different endpoint: fresh budget.
  assert.equal((await rateLimit.consume(Object.assign({}, base, { endpoint: 'b', identifier: 'x' }))).allowed, true);
  // Different identifier, same endpoint: fresh budget.
  assert.equal((await rateLimit.consume(Object.assign({}, base, { endpoint: 'a', identifier: 'y' }))).allowed, true);
  // Repeat of the first: blocked.
  assert.equal((await rateLimit.consume(Object.assign({}, base, { endpoint: 'a', identifier: 'x' }))).allowed, false);
});

test('rate limit: the window resets', async () => {
  resetRateLimits();
  const rules = [{ name: 'minute', windowSeconds: 60, max: 1 }];
  const base = { endpoint: 'unit', scope: 'client', identifier: 'z', rules: rules, env: process.env };
  assert.equal((await rateLimit.consume(Object.assign({}, base, { now: 0 }))).allowed, true);
  assert.equal((await rateLimit.consume(Object.assign({}, base, { now: 1000 }))).allowed, false);
  assert.equal((await rateLimit.consume(Object.assign({}, base, { now: 61000 }))).allowed, true);
});

test('rate limit: a failing durable backend does not fail the request', async () => {
  const store = require('../netlify/lib/rate-limit-store');
  store.setBackend({
    kind: 'broken',
    durable: {
      async get() { throw new Error('blobs down'); },
      async set() { throw new Error('blobs down'); },
    },
    memory: store.createMemoryBackend(),
  });
  const rules = [{ name: 'minute', windowSeconds: 60, max: 2 }];
  const opts = { endpoint: 'unit', scope: 'client', identifier: 'q', rules: rules, env: process.env, now: 0 };
  assert.equal((await rateLimit.consume(opts)).allowed, true);
  assert.equal((await rateLimit.consume(opts)).allowed, true);
  // The in-memory mirror still enforces the cap when the durable store is down.
  assert.equal((await rateLimit.consume(opts)).allowed, false);
  resetRateLimits();
});

test('log: credentials and query strings never reach the log line', () => {
  const lines = [];
  const original = console.log;
  console.log = function (line) { lines.push(line); };
  try {
    log.emit({ endpoint: '/x', outcome: 'ok', upstream: 'https://maps.googleapis.com/x?key=SECRETVALUE' });
    log.emit({ endpoint: '/x', outcome: 'ok', reason: 'https://api.example/z?token=abc' });
  } finally {
    console.log = original;
  }
  const joined = lines.join('\n');
  assert.ok(!joined.includes('SECRETVALUE'), joined);
  assert.ok(!joined.includes('abc'), joined);
});

test('log: unknown fields are dropped rather than logged', () => {
  const lines = [];
  const original = console.log;
  console.log = function (line) { lines.push(line); };
  try {
    log.emit({ endpoint: '/x', outcome: 'ok', user_message: 'my dog ate chocolate', ip: '203.0.113.1' });
  } finally {
    console.log = original;
  }
  assert.ok(!lines.join('').includes('chocolate'));
  assert.ok(!lines.join('').includes('203.0.113.1'));
});
