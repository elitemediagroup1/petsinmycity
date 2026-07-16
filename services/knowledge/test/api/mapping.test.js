'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { handle } = require('../../src/api/http-handler');
const { mapResultState, mapErrorCode, ApiCode } = require('../../src/api/errors');
const { build } = require('../../src/api/bootstrap');
const { ResultState, ErrorCode, StorageFailureError } = require('../../src/delivery');

const SECRET = 'test-internal-secret';
const ENV = { KNOWLEDGE_API_INTERNAL_SECRET: SECRET };
const AUTH = { 'x-internal-key': SECRET };
const DIAG_AUTH = { 'x-internal-key': SECRET, 'x-internal-diagnostics': '1' };

function svc(now) { return build({ now }).service; }
function post(headers, body, service) {
  return handle({ method: 'POST', headers, body: JSON.stringify(body) }, { service, env: ENV, diag: () => {} });
}

// ---------------- Pure mapping unit tests ----------------

test('resultState maps: conflict->409, not_found->404, expired->410', () => {
  assert.equal(mapResultState(ResultState.CONFLICT).status, 409);
  assert.equal(mapResultState(ResultState.NOT_FOUND).status, 404);
  assert.equal(mapResultState(ResultState.EXPIRED).status, 410);
});

test('inadmissible: 404 for ordinary, 422 for diagnostic', () => {
  assert.equal(mapResultState(ResultState.INADMISSIBLE).status, 404);
  assert.equal(mapResultState(ResultState.INADMISSIBLE, { diagnostic: true }).status, 422);
});

test('errorCode maps: invalid->400, storage->500', () => {
  assert.equal(mapErrorCode(ErrorCode.INVALID_REQUEST).status, 400);
  assert.equal(mapErrorCode(ErrorCode.STORAGE_FAILURE).status, 500);
});

// ---------------- Result mapping through the handler ----------------

test('resolved -> 200', () => {
  const res = post(AUTH, { subjectId: 'place/tx/austin', predicate: 'located_in_county' }, svc());
  assert.equal(res.statusCode, 200);
});

test('unknown subject/predicate -> 404 not_found', () => {
  const res = post(AUTH, { subjectId: 'place/nowhere', predicate: 'nonexistent' }, svc());
  assert.equal(res.statusCode, 404);
  assert.equal(JSON.parse(res.body).result, 'not_found');
});

test('needs_verification Austin claim -> 404 (suppressed, non-disclosing) for ordinary caller', () => {
  const res = post(AUTH, { subjectId: 'place/tx/austin/red-bud-isle', predicate: 'off_leash_designation' }, svc());
  assert.equal(res.statusCode, 404);
  const body = JSON.parse(res.body);
  assert.equal(body.state, ResultState.NOT_FOUND);
  // Must not reveal that a suppressed record exists.
  assert.equal(body.reasons, undefined);
});

test('diagnostic mode reveals typed suppression as 422 to authorized caller', () => {
  const res = post(DIAG_AUTH, { subjectId: 'place/tx/austin/red-bud-isle', predicate: 'off_leash_designation' }, svc());
  assert.equal(res.statusCode, 422);
  const body = JSON.parse(res.body);
  assert.equal(body.result, 'inadmissible');
  assert.ok(Array.isArray(body.reasons));
});

test('expired dynamic event -> 410 after valid_until', () => {
  // valid_until is 2026-07-16T19:00:00-05:00; query after that.
  const after = new Date('2026-07-20T00:00:00-05:00').getTime();
  const res = post(AUTH, { subjectId: 'concept/hazard/austin-flooding', predicate: 'active_alert' }, svc(after));
  assert.equal(res.statusCode, 410);
  assert.equal(JSON.parse(res.body).result, 'expired');
});

test('storage/service error -> 500 with no internal details', () => {
  const brokenService = {
    getKnowledge() { throw new StorageFailureError('disk melted at /var/data/knowledge.db', { path: '/secret' }); },
  };
  const res = handle({ method: 'POST', headers: AUTH, body: JSON.stringify({ subjectId: 'a', predicate: 'b' }) }, { service: brokenService, env: ENV, diag: () => {} });
  assert.equal(res.statusCode, 500);
  assert.ok(!res.body.includes('/var/data'));
  assert.ok(!res.body.includes('/secret'));
  assert.equal(JSON.parse(res.body).error.message, 'internal error');
});

// ---------------- Envelope preservation ----------------

test('kdp.v1 identity, trust, freshness, provenance and delivery preserved unchanged', () => {
  const res = post(AUTH, { subjectId: 'org/emergency-vet/tx/austin/aves', predicate: 'emergency_availability' }, svc());
  assert.equal(res.statusCode, 200);
  const env = JSON.parse(res.body).envelope;
  const item = env.items[0];
  assert.equal(item.payload.identity.subject, 'org/emergency-vet/tx/austin/aves');
  assert.equal(item.payload.identity.predicate, 'emergency_availability');
  assert.equal(item.payload.trust.verificationStatus, 'verified');
  assert.equal(typeof item.payload.trust.confidence, 'number');
  assert.ok(item.payload.freshness);
  assert.ok(item.provenance.sources && item.provenance.sources.length >= 1);
  assert.ok(env.delivery.trace_id);
});

test('trace_id is preserved at the top level of the response', () => {
  const res = post(AUTH, { subjectId: 'place/tx/austin', predicate: 'located_in_county' }, svc());
  const body = JSON.parse(res.body);
  assert.ok(body.trace_id);
  assert.equal(body.trace_id, body.envelope.delivery.trace_id);
});

// ---------------- Safety ----------------

test('unverified (needs_verification) safety claim never appears in HTTP payload', () => {
  const res = post(AUTH, { subjectId: 'place/tx/austin/red-bud-isle', predicate: 'off_leash_designation' }, svc());
  assert.ok(!res.body.includes('unknown') || JSON.parse(res.body).state === ResultState.NOT_FOUND);
  // The suppressed value 'unknown' must not be delivered as fact.
  const body = JSON.parse(res.body);
  assert.notEqual(body.result, 'ok');
});

test('expired safety event value never returned as usable knowledge', () => {
  const after = new Date('2026-07-20T00:00:00-05:00').getTime();
  const res = post(AUTH, { subjectId: 'concept/hazard/austin-flooding', predicate: 'active_alert' }, svc(after));
  assert.ok(!res.body.includes('Flood Watch'));
});

test('no raw database rows are returned (only envelope structure)', () => {
  const res = post(AUTH, { subjectId: 'place/tx/austin', predicate: 'located_in_county' }, svc());
  const body = JSON.parse(res.body);
  // envelope exposes payload/provenance, never raw row keys like created_at columns at top level.
  assert.equal(body.envelope.items[0].id, undefined);
  assert.ok(body.envelope.items[0].payload);
});
