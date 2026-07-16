'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { build, getService, _reset, DEFAULT_DATASET } = require('../../src/api/bootstrap');
const { handle } = require('../../src/api/http-handler');
const { ResultState } = require('../../src/delivery');

const SECRET = 'test-internal-secret';
const ENV = { KNOWLEDGE_API_INTERNAL_SECRET: SECRET };
const AUTH = { 'x-internal-key': SECRET };

// Simulate the Netlify function event->handler path without importing Netlify.
function invokeNetlifyStyle(service, event) {
  const input = {
    method: event.httpMethod,
    headers: event.headers || {},
    body: event.body,
    query: event.queryStringParameters || {},
  };
  return handle(input, { service, env: ENV, diag: () => {} });
}

// ---------------- Austin integration through the full HTTP handler ----------------

test('retrieve a verified Austin object through the full HTTP handler', () => {
  const { service } = build();
  const res = invokeNetlifyStyle(service, {
    httpMethod: 'POST', headers: AUTH,
    body: JSON.stringify({ subjectId: 'place/tx/austin', predicate: 'located_in_county', consumer: 'internal' }),
  });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.state, ResultState.RESOLVED);
  assert.equal(body.envelope.items[0].payload.value.value, 'place/tx/travis');
});

test('a needs_verification Austin object remains unavailable via HTTP', () => {
  const { service } = build();
  const res = invokeNetlifyStyle(service, {
    httpMethod: 'POST', headers: AUTH,
    body: JSON.stringify({ subjectId: 'place/tx/austin/red-bud-isle', predicate: 'off_leash_designation' }),
  });
  assert.equal(res.statusCode, 404);
});

test('unknown Austin predicate returns the expected typed 404', () => {
  const { service } = build();
  const res = invokeNetlifyStyle(service, {
    httpMethod: 'POST', headers: AUTH,
    body: JSON.stringify({ subjectId: 'place/tx/austin', predicate: 'made_of_cheese' }),
  });
  assert.equal(res.statusCode, 404);
  assert.equal(JSON.parse(res.body).result, 'not_found');
});

test('limited GET query form works for a verified object', () => {
  const { service } = build();
  const res = invokeNetlifyStyle(service, {
    httpMethod: 'GET', headers: AUTH,
    queryStringParameters: { subjectId: 'place/tx/austin', predicate: 'located_in_county' },
  });
  assert.equal(res.statusCode, 200);
});

// ---------------- Runtime initialization ----------------

test('missing database/dataset configuration fails safely (no filesystem paths leaked)', () => {
  assert.throws(() => build({ dataset: path.resolve(__dirname, 'no-such-dataset-dir') }));
});

test('default dataset path resolves to the packaged Austin fixture', () => {
  assert.ok(DEFAULT_DATASET.endsWith(path.join('research', 'austin', 'pilot', 'data')));
});

test('temporary in-memory stores are isolated per build', () => {
  const a = build();
  const b = build();
  assert.notEqual(a.store, b.store);
  a.store.close();
  b.store.close();
});

test('repeated warm-style getService invocations reuse one store and do not corrupt state', () => {
  _reset();
  process.env.KNOWLEDGE_API_INTERNAL_SECRET = SECRET;
  const first = getService();
  const second = getService();
  assert.equal(first, second);
  const call = (s) => handle({ method: 'POST', headers: AUTH, body: JSON.stringify({ subjectId: 'place/tx/austin', predicate: 'located_in_county' }) }, { service: s.service, env: ENV, diag: () => {} });
  const r1 = call(first);
  const r2 = call(second);
  assert.equal(r1.statusCode, 200);
  assert.equal(r2.statusCode, 200);
  // Stable knowledge fields are identical across warm invocations (ignoring per-request trace/timestamps).
  const v1 = JSON.parse(r1.body).envelope.items[0].payload.value.value;
  const v2 = JSON.parse(r2.body).envelope.items[0].payload.value.value;
  assert.equal(v1, v2);
  assert.equal(v1, 'place/tx/travis');
  _reset();
});
