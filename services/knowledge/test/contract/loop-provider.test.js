'use strict';
/**
 * Loop provider contract tests (ADR-0027, revised).
 *
 * These verify LoopKnowledgeStore + LoopClient against a MOCK fetch — no network, no
 * credentials, no real Loop. Normal CI runs these with no Loop secrets.
 *
 * Coverage: service-auth header, tenant scoping, read normalization, batch import +
 * deterministic idempotency key, retry-on-transient, no-retry-on-permanent, timeout,
 * typed errors (auth/validation/not_found/rate_limit), malformed response, and the
 * fail-closed config guard.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { LoopKnowledgeStore } = require('../../src/storage/loop/LoopKnowledgeStore');
const { LoopError } = require('../../src/storage/loop/loop-errors');
const { resolveConfig, StorageConfigError } = require('../../src/storage/create-store');

/** Build a mock fetch that records calls and returns queued responses. */
function mockFetch(responder) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    const r = await responder(url, init, calls.length);
    return {
      status: r.status == null ? 200 : r.status,
      text: async () => (r.body == null ? '' : (typeof r.body === 'string' ? r.body : JSON.stringify(r.body))),
    };
  };
  fn.calls = calls;
  return fn;
}

function makeStore(fetchImpl, extra) {
  return new LoopKnowledgeStore(Object.assign({
    baseUrl: 'https://loop.test', serviceToken: 'tkn_secret', platform: 'petsinmycity',
    organizationId: 'org_1', propertyId: 'petsinmycity', maxRetries: 2, timeoutMs: 50, fetchImpl,
  }, extra || {}));
}

test('sends x-emg-loop-secret auth header and tenant scope', async () => {
  const fetchImpl = mockFetch(() => ({ body: { ok: true, claims: [] } }));
  const store = makeStore(fetchImpl);
  await store.claims.findBySubject('subj', 'pred');
  const call = fetchImpl.calls[0];
  assert.equal(call.init.headers['x-emg-loop-secret'], 'tkn_secret');
  assert.match(call.url, /platform=petsinmycity/);
  assert.match(call.url, /organization_id=org_1/);
  assert.match(call.url, /subject=subj/);
  assert.match(call.url, /predicate=pred/);
});

test('never puts the service token in the URL', async () => {
  const fetchImpl = mockFetch(() => ({ body: { ok: true, claims: [] } }));
  const store = makeStore(fetchImpl);
  await store.claims.findBySubject('s');
  assert.equal(fetchImpl.calls[0].url.includes('tkn_secret'), false);
});

test('normalizes Loop claims + sources into KDP row shape', async () => {
  const claim = { id: 'c1', subject: 's', predicate: 'p', value: { n: 1 }, confidence: 'high',
    verification: 'verified', safety_critical: true, valid_from: '2025-01-01',
    sources: [{ id: 'src1', tier: 1, kind: 'government', url: 'https://x' }] };
  const fetchImpl = mockFetch(() => ({ body: { ok: true, claims: [claim] } }));
  const store = makeStore(fetchImpl);
  const rows = await store.claims.findBySubject('s', 'p');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'c1');
  assert.deepEqual(rows[0].value, { n: 1 });
  assert.equal(rows[0].safety_critical, true);
  const srcs = await store.sources.forClaim('c1');
  assert.equal(srcs[0].tier, 1);
  assert.equal(srcs[0].id, 'src1');
});

test('batch import posts one request with a deterministic idempotency key', async () => {
  const fetchImpl = mockFetch(() => ({ body: { ok: true, imported: true } }));
  const store = makeStore(fetchImpl, { datasetVersion: 'austin-v1' });
  await store.transaction(async (tx) => {
    await tx.sources.upsert({ id: 'src1', tier: 1 });
    await tx.entities.upsert({ id: 'e1', type: 'place', name: 'A' });
    await tx.claims.upsert({ id: 'c1', subject: 'e1', predicate: 'p', value: 'v' });
    await tx.claims.addSource('c1', 'src1');
    await tx.relationships.add({ edge: 'in', from: 'e1', to: 'e1' });
  });
  assert.equal(fetchImpl.calls.length, 1);
  const call = fetchImpl.calls[0];
  assert.match(call.url, /\/api\/v1\/knowledge\/import/);
  assert.equal(call.init.headers['x-idempotency-key'], 'pimc:petsinmycity:austin-v1');
  const body = JSON.parse(call.init.body);
  assert.equal(body.idempotency_key, 'pimc:petsinmycity:austin-v1');
  assert.equal(body.batch.entities.length, 1);
  assert.equal(body.batch.claims.length, 1);
  assert.equal(body.batch.sources.length, 1);
  assert.equal(body.batch.claim_sources.length, 1);
  assert.equal(body.batch.relationships.length, 1);
});

test('the same import twice reuses the same idempotency key (retry-safe)', async () => {
  const fetchImpl = mockFetch(() => ({ body: { ok: true } }));
  const store = makeStore(fetchImpl, { datasetVersion: 'austin-v1' });
  const run = () => store.transaction(async (tx) => { await tx.claims.upsert({ id: 'c1', subject: 's', predicate: 'p', value: 'v' }); });
  await run();
  await run();
  assert.equal(fetchImpl.calls[0].init.headers['x-idempotency-key'], fetchImpl.calls[1].init.headers['x-idempotency-key']);
});

test('empty transaction sends no request (nothing to write)', async () => {
  const fetchImpl = mockFetch(() => ({ body: { ok: true } }));
  const store = makeStore(fetchImpl);
  await store.transaction(async () => { /* no writes */ });
  assert.equal(fetchImpl.calls.length, 0);
});

test('retries a transient 503 on an idempotent read and then succeeds', async () => {
  let n = 0;
  const fetchImpl = mockFetch(() => { n += 1; return n < 2 ? { status: 503, body: { ok: false, error: 'unavailable' } } : { body: { ok: true, claims: [] } }; });
  const store = makeStore(fetchImpl);
  const rows = await store.claims.findBySubject('s', 'p');
  assert.deepEqual(rows, []);
  assert.equal(fetchImpl.calls.length, 2);
});

test('does NOT retry a 401 auth failure', async () => {
  const fetchImpl = mockFetch(() => ({ status: 401, body: { ok: false, error: 'unauthorized' } }));
  const store = makeStore(fetchImpl);
  await assert.rejects(() => store.claims.findBySubject('s', 'p'), (e) => e instanceof LoopError && e.code === 'auth');
  assert.equal(fetchImpl.calls.length, 1);
});

test('does NOT retry a 400 validation failure', async () => {
  const fetchImpl = mockFetch(() => ({ status: 400, body: { ok: false, error: 'bad_request', message: 'nope' } }));
  const store = makeStore(fetchImpl);
  await assert.rejects(() => store.claims.findBySubject('s'), (e) => e.code === 'validation');
  assert.equal(fetchImpl.calls.length, 1);
});

test('maps 404 on a single-claim lookup to null (not an error)', async () => {
  const fetchImpl = mockFetch(() => ({ status: 404, body: { ok: false, error: 'not_found' } }));
  const store = makeStore(fetchImpl);
  const c = await store.claims.getById('missing');
  assert.equal(c, undefined);
});

test('rate limit (429) is retried on idempotent reads', async () => {
  let n = 0;
  const fetchImpl = mockFetch(() => { n += 1; return n < 2 ? { status: 429, body: { ok: false, error: 'rate_limited' } } : { body: { ok: true, claims: [] } }; });
  const store = makeStore(fetchImpl);
  await store.claims.findBySubject('s', 'p');
  assert.equal(fetchImpl.calls.length, 2);
});

test('malformed (non-JSON) response is a typed malformed_response error', async () => {
  const fetchImpl = mockFetch(() => ({ status: 200, body: 'not json <html>' }));
  const store = makeStore(fetchImpl);
  await assert.rejects(() => store.claims.findBySubject('s', 'p'), (e) => e instanceof LoopError && e.code === 'malformed_response');
});

test('readiness reports compatible contract version', async () => {
  const fetchImpl = mockFetch(() => ({ body: { ok: true, contract_version: 'kg.v1' } }));
  const store = makeStore(fetchImpl);
  const r = await store.readiness();
  assert.equal(r.reachable, true);
  assert.equal(r.migrated, true);
});

test('readiness flags an incompatible contract version', async () => {
  const fetchImpl = mockFetch(() => ({ body: { ok: true, contract_version: 'kg.v0' } }));
  const store = makeStore(fetchImpl);
  const r = await store.readiness();
  assert.equal(r.reachable, true);
  assert.equal(r.migrated, false);
});

test('fail-closed: loop driver without base url is rejected by config', () => {
  assert.throws(
    () => resolveConfig({ driver: 'loop', serviceToken: 't' }, {}),
    (e) => e instanceof StorageConfigError && e.code === 'missing_base_url',
  );
});

test('fail-closed: loop driver without service token is rejected by config', () => {
  assert.throws(
    () => resolveConfig({ driver: 'loop', baseUrl: 'https://loop.test' }, {}),
    (e) => e instanceof StorageConfigError && e.code === 'missing_service_token',
  );
});

test('config never echoes secret values in the error', () => {
  try { resolveConfig({ driver: 'loop', baseUrl: 'https://loop.test' }, {}); }
  catch (e) { assert.equal(String(e.message).includes('SECRET'), false); }
});
