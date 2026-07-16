'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { handle } = require('../../src/api/http-handler');
const { makeDiagnostics } = require('../../src/api/diagnostics');
const { build } = require('../../src/api/bootstrap');
const { ResultState } = require('../../src/delivery');

const SECRET = 'test-internal-secret';
const ENV = { KNOWLEDGE_API_INTERNAL_SECRET: SECRET };
const AUTH = { 'x-internal-key': SECRET };

// One shared read-only Austin fixture service for all HTTP-level tests.
function makeService(now) {
  return build({ now }).service;
}

function post(body, deps) {
  return handle({ method: 'POST', headers: AUTH, body: typeof body === 'string' ? body : JSON.stringify(body) }, deps);
}

function depsFor(now) {
  const records = [];
  const diag = makeDiagnostics({ sink: (r) => records.push(r) });
  return { deps: { service: makeService(now), env: ENV, diag: diag.emit }, records };
}

// ---------------- HTTP request handling ----------------

test('valid POST returns 200 with a kdp.v1 envelope', () => {
  const { deps } = depsFor();
  const res = post({ subjectId: 'place/tx/austin', predicate: 'located_in_county', consumer: 'internal' }, deps);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.state, ResultState.RESOLVED);
  assert.equal(body.envelope.contract_version, 'kdp.v1');
  assert.equal(body.api_version, 'knowledge-api.v1');
});

test('malformed JSON returns 400', () => {
  const { deps } = depsFor();
  const res = post('{not json', deps);
  assert.equal(res.statusCode, 400);
  assert.equal(JSON.parse(res.body).result, 'invalid_request');
});

test('missing body returns 400', () => {
  const { deps } = depsFor();
  const res = handle({ method: 'POST', headers: AUTH, body: '' }, deps);
  assert.equal(res.statusCode, 400);
});

test('missing subjectId returns 400', () => {
  const { deps } = depsFor();
  const res = post({ predicate: 'located_in_county' }, deps);
  assert.equal(res.statusCode, 400);
});

test('missing predicate returns 400', () => {
  const { deps } = depsFor();
  const res = post({ subjectId: 'place/tx/austin' }, deps);
  assert.equal(res.statusCode, 400);
});

test('invalid asOf returns 400', () => {
  const { deps } = depsFor();
  const res = post({ subjectId: 'place/tx/austin', predicate: 'located_in_county', asOf: 'not-a-date' }, deps);
  assert.equal(res.statusCode, 400);
});

test('invalid context returns 400', () => {
  const { deps } = depsFor();
  const res = post({ subjectId: 'place/tx/austin', predicate: 'located_in_county', context: 'nope' }, deps);
  assert.equal(res.statusCode, 400);
});

test('unknown top-level field returns 400', () => {
  const { deps } = depsFor();
  const res = post({ subjectId: 'place/tx/austin', predicate: 'located_in_county', evil: 1 }, deps);
  assert.equal(res.statusCode, 400);
});

test('unsupported method returns 405', () => {
  const { deps } = depsFor();
  const res = handle({ method: 'DELETE', headers: AUTH }, deps);
  assert.equal(res.statusCode, 405);
  assert.equal(JSON.parse(res.body).result, 'unsupported_method');
});

test('OPTIONS returns 204 with no permissive CORS', () => {
  const { deps } = depsFor();
  const res = handle({ method: 'OPTIONS', headers: AUTH }, deps);
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
});

test('oversized body returns 413', () => {
  const { deps } = depsFor();
  const big = JSON.stringify({ subjectId: 'x', predicate: 'y', context: { blob: 'a'.repeat(20000) } });
  const res = post(big, deps);
  assert.equal(res.statusCode, 413);
});

// ---------------- Authentication ----------------

test('missing internal credential returns 401', () => {
  const { deps } = depsFor();
  const res = handle({ method: 'POST', headers: {}, body: JSON.stringify({ subjectId: 'place/tx/austin', predicate: 'located_in_county' }) }, deps);
  assert.equal(res.statusCode, 401);
});

test('incorrect credential returns 401', () => {
  const { deps } = depsFor();
  const res = handle({ method: 'POST', headers: { 'x-internal-key': 'wrong' }, body: JSON.stringify({ subjectId: 'place/tx/austin', predicate: 'located_in_county' }) }, deps);
  assert.equal(res.statusCode, 401);
});

test('valid credential is accepted', () => {
  const { deps } = depsFor();
  const res = post({ subjectId: 'place/tx/austin', predicate: 'located_in_county' }, deps);
  assert.equal(res.statusCode, 200);
});

test('fail closed: no configured secret denies access', () => {
  const service = makeService();
  const res = handle({ method: 'POST', headers: { 'x-internal-key': 'anything' }, body: JSON.stringify({ subjectId: 'place/tx/austin', predicate: 'located_in_county' }) }, { service, env: {}, diag: () => {} });
  assert.equal(res.statusCode, 401);
});

test('no secret value appears in any response body', () => {
  const { deps } = depsFor();
  const res = post({ subjectId: 'place/tx/austin', predicate: 'located_in_county' }, deps);
  assert.ok(!res.body.includes(SECRET));
});

test('no secret value appears in diagnostics', () => {
  const { deps, records } = depsFor();
  post({ subjectId: 'place/tx/austin', predicate: 'located_in_county' }, deps);
  const dumped = JSON.stringify(records);
  assert.ok(!dumped.includes(SECRET));
});
