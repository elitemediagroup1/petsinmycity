'use strict';

/**
 * Delivery read-layer tests (ADR-0027: async). Run with: node --test
 *
 * These build isolated in-memory fixtures via the KnowledgeStore repositories.
 * They do NOT modify Austin research facts. Where an edge case is needed that
 * the real dataset does not contain, an isolated synthetic fixture is created.
 * All storage and delivery calls are awaited.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const KnowledgeStore = require('../../src/KnowledgeStore');
const {
  KnowledgeDeliveryService, ResultState, ReasonCode, FreshnessStatus,
  InvalidRequestError,
} = require('../../src/delivery');

// ---- helpers ---------------------------------------------------------------

function freshStore() { return KnowledgeStore.open(':memory:'); }

const DAY = 24 * 60 * 60 * 1000;
function iso(ms) { return new Date(ms).toISOString(); }

// Ensure a subject entity exists (claims.subject has a FK to entities.id).
async function ensureEntity(store, id) {
  await store.entities.upsert({ id: id, type: 'place', name: id });
}

// Insert a claim + a linked source in one call. Returns claim id.
async function seedClaim(store, claim, source) {
  await ensureEntity(store, claim.subject);
  if (source) await store.sources.upsert(source);
  await store.claims.upsert(claim);
  if (source) await store.claims.addSource(claim.id, source.id);
  return claim.id;
}

function svc(store, now) {
  return new KnowledgeDeliveryService(store, { now });
}

const T1 = { id: 's-gov', tier: 1, kind: 'government', url: 'https://example.gov/a', accessed: '2025-01-02' };
const T2 = { id: 's-org', tier: 2, kind: 'operator', url: 'https://example.org/b', accessed: '2025-01-02' };
const T3 = { id: 's-com', tier: 3, kind: 'community', url: 'https://example.com/c', accessed: '2025-01-02' };

// ---- request validation ----------------------------------------------------

test('valid subject/predicate query returns a result object', async () => {
  const store = await freshStore();
  const s = svc(store);
  const r = await s.getKnowledge({ subjectId: 'place:austin', predicate: 'governed_by' });
  assert.equal(r.state, ResultState.NOT_FOUND);
  await store.close();
});

test('missing subject throws InvalidRequestError', async () => {
  const store = await freshStore();
  const s = svc(store);
  await assert.rejects(() => s.getKnowledge({ predicate: 'x' }), InvalidRequestError);
  await store.close();
});

test('missing predicate throws InvalidRequestError', async () => {
  const store = await freshStore();
  const s = svc(store);
  await assert.rejects(() => s.getKnowledge({ subjectId: 'place:austin' }), InvalidRequestError);
  await store.close();
});

test('malformed asOf timestamp throws InvalidRequestError', async () => {
  const store = await freshStore();
  const s = svc(store);
  await assert.rejects(
    () => s.getKnowledge({ subjectId: 'a', predicate: 'b', asOf: 'not-a-date' }),
    InvalidRequestError);
  await store.close();
});

test('unsupported consumer identifier throws InvalidRequestError', async () => {
  const store = await freshStore();
  const s = svc(store);
  await assert.rejects(
    () => s.getKnowledge({ subjectId: 'a', predicate: 'b', consumer: 'hacker' }),
    InvalidRequestError);
  await store.close();
});

// ---- admission -------------------------------------------------------------

test('verified claim is delivered as a resolved envelope', async () => {
  const store = await freshStore();
  await seedClaim(store,
    { id: 'c1', subject: 'place:austin', predicate: 'leash', value: 'on-leash', verification: 'verified', confidence: 92 },
    T1);
  const r = await svc(store).getKnowledge({ subjectId: 'place:austin', predicate: 'leash' });
  assert.equal(r.state, ResultState.RESOLVED);
  assert.equal(r.contract_version, 'kdp.v1');
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].payload.value.value, 'on-leash');
  assert.equal(r.items[0].provenance.verification_state, 'verified');
  await store.close();
});

test('needs_verification claim is suppressed (inadmissible)', async () => {
  const store = await freshStore();
  await seedClaim(store,
    { id: 'c1', subject: 'sub', predicate: 'pred', value: 'x', verification: 'needs_verification', confidence: 80 },
    T1);
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'pred' });
  assert.equal(r.state, ResultState.INADMISSIBLE);
  assert.equal(r.reasons[0].reason, ReasonCode.VERIFICATION_NOT_ADMISSIBLE);
  await store.close();
});

test('rejected claim is suppressed', async () => {
  const store = await freshStore();
  await seedClaim(store, { id: 'c1', subject: 'sub', predicate: 'p', value: 'x', verification: 'rejected', confidence: 99 }, T1);
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.state, ResultState.INADMISSIBLE);
  await store.close();
});

test('archived claim is suppressed', async () => {
  const store = await freshStore();
  await seedClaim(store, { id: 'c1', subject: 'sub', predicate: 'p', value: 'x', verification: 'archived', confidence: 99 }, T1);
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.state, ResultState.INADMISSIBLE);
  await store.close();
});

test('disputed claim is suppressed with disputed reason', async () => {
  const store = await freshStore();
  await seedClaim(store, { id: 'c1', subject: 'sub', predicate: 'p', value: 'x', verification: 'disputed', confidence: 99 }, T1);
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.state, ResultState.INADMISSIBLE);
  assert.equal(r.reasons[0].reason, ReasonCode.DISPUTED);
  await store.close();
});

test('outdated claim is suppressed', async () => {
  const store = await freshStore();
  await seedClaim(store, { id: 'c1', subject: 'sub', predicate: 'p', value: 'x', verification: 'outdated', confidence: 99 }, T1);
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.state, ResultState.INADMISSIBLE);
  await store.close();
});

// ---- freshness -------------------------------------------------------------

test('current evergreen claim (no time bounds) is delivered', async () => {
  const store = await freshStore();
  await seedClaim(store, { id: 'c1', subject: 'sub', predicate: 'p', value: 'x', verification: 'verified', confidence: 88 }, T1);
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.state, ResultState.RESOLVED);
  assert.equal(r.items[0].payload.freshness.freshnessStatus, FreshnessStatus.NOT_TIME_BOUND);
  await store.close();
});

test('approaching-review claim is delivered and flagged', async () => {
  const now = Date.parse('2025-06-01T00:00:00Z');
  const store = await freshStore();
  await seedClaim(store,
    { id: 'c1', subject: 'sub', predicate: 'p', value: 'x', verification: 'verified', confidence: 88, review_by: iso(now + 10 * DAY) }, T1);
  const r = await svc(store, now).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.state, ResultState.RESOLVED);
  assert.equal(r.items[0].payload.freshness.freshnessStatus, FreshnessStatus.APPROACHING_REVIEW);
  await store.close();
});

test('expired dynamic claim is suppressed as EXPIRED', async () => {
  const now = Date.parse('2025-06-01T00:00:00Z');
  const store = await freshStore();
  await seedClaim(store,
    { id: 'c1', subject: 'sub', predicate: 'p', value: 'x', verification: 'verified', confidence: 92, valid_until: iso(now - DAY) }, T1);
  const r = await svc(store, now).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.state, ResultState.EXPIRED);
  await store.close();
});

test('future valid_from claim is not yet deliverable', async () => {
  const now = Date.parse('2025-06-01T00:00:00Z');
  const store = await freshStore();
  await seedClaim(store,
    { id: 'c1', subject: 'sub', predicate: 'p', value: 'x', verification: 'verified', confidence: 92, valid_from: iso(now + DAY) }, T1);
  const r = await svc(store, now).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.state, ResultState.INADMISSIBLE);
  assert.equal(r.reasons[0].reason, ReasonCode.NOT_YET_VALID);
  await store.close();
});

test('needs_review evergreen claim is still delivered but marked stale', async () => {
  const now = Date.parse('2025-06-01T00:00:00Z');
  const store = await freshStore();
  await seedClaim(store,
    { id: 'c1', subject: 'sub', predicate: 'p', value: 'x', verification: 'verified', confidence: 88, review_by: iso(now - DAY) }, T1);
  const r = await svc(store, now).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.state, ResultState.RESOLVED);
  assert.equal(r.currency.fresh, false);
  assert.deepEqual(r.currency.stale_items, ['c1']);
  await store.close();
});

// ---- ranking ---------------------------------------------------------------

test('higher-authority source wins when precedence is clear', async () => {
  const store = await freshStore();
  await seedClaim(store, { id: 'low', subject: 'sub', predicate: 'p', value: 'community', verification: 'verified', confidence: 80 }, T3);
  await seedClaim(store, { id: 'high', subject: 'sub', predicate: 'p', value: 'official', verification: 'verified', confidence: 80 }, T1);
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.state, ResultState.RESOLVED);
  assert.equal(r.items[0].payload.value.value, 'official');
  await store.close();
});

test('verified older claim beats newer unverified claim', async () => {
  const store = await freshStore();
  await seedClaim(store, { id: 'old', subject: 'sub', predicate: 'p', value: 'trusted', verification: 'verified', confidence: 85 }, T2);
  await seedClaim(store, { id: 'new', subject: 'sub', predicate: 'p', value: 'unchecked', verification: 'unverified', confidence: 99 }, T1);
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.state, ResultState.RESOLVED);
  assert.equal(r.items[0].payload.value.value, 'trusted');
  await store.close();
});

test('current version beats superseded version (higher confidence, same tier)', async () => {
  const store = await freshStore();
  await seedClaim(store, { id: 'a', subject: 'sub', predicate: 'p', value: 'weaker', verification: 'verified', confidence: 80 }, T2);
  await seedClaim(store, { id: 'b', subject: 'sub', predicate: 'p', value: 'stronger', verification: 'verified', confidence: 90 }, T2);
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.items[0].payload.value.value, 'stronger');
  await store.close();
});

test('ranking is deterministic across repeated calls', async () => {
  const store = await freshStore();
  await seedClaim(store, { id: 'x', subject: 'sub', predicate: 'p', value: 'X', verification: 'verified', confidence: 90 }, T2);
  await seedClaim(store, { id: 'y', subject: 'sub', predicate: 'p', value: 'Y', verification: 'verified', confidence: 88 }, T2);
  const s = svc(store);
  const r1 = await s.getKnowledge({ subjectId: 'sub', predicate: 'p' });
  const r2 = await s.getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r1.items[0].payload.identity.objectId, r2.items[0].payload.identity.objectId);
  await store.close();
});

// ---- conflict --------------------------------------------------------------

test('unresolved credible conflict returns a typed conflict result', async () => {
  const store = await freshStore();
  await seedClaim(store, { id: 'c-a', subject: 'sub', predicate: 'p', value: 'A', verification: 'verified', confidence: 90 }, T1);
  const t1b = { id: 's-gov2', tier: 1, kind: 'government', url: 'https://example.gov/z', accessed: '2025-01-02' };
  await seedClaim(store, { id: 'c-b', subject: 'sub', predicate: 'p', value: 'B', verification: 'verified', confidence: 90 }, t1b);
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.state, ResultState.CONFLICT);
  assert.equal(r.conflicting.length, 2);
  await store.close();
});

test('conflicting inadmissible claim does not contaminate a resolved result', async () => {
  const store = await freshStore();
  await seedClaim(store, { id: 'good', subject: 'sub', predicate: 'p', value: 'ok', verification: 'verified', confidence: 90 }, T1);
  await seedClaim(store, { id: 'bad', subject: 'sub', predicate: 'p', value: 'nope', verification: 'rejected', confidence: 99 }, T1);
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.state, ResultState.RESOLVED);
  assert.equal(r.items[0].payload.value.value, 'ok');
  await store.close();
});

// ---- provenance ------------------------------------------------------------

test('linked sources are returned in provenance', async () => {
  const store = await freshStore();
  await seedClaim(store, { id: 'c1', subject: 'sub', predicate: 'p', value: 'x', verification: 'verified', confidence: 90 }, T1);
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.items[0].provenance.sources.length, 1);
  assert.equal(r.items[0].provenance.sources[0].id, 's-gov');
  await store.close();
});

test('missing required provenance blocks delivery', async () => {
  const store = await freshStore();
  await ensureEntity(store, 'sub');
  await store.claims.upsert({ id: 'c1', subject: 'sub', predicate: 'p', value: 'x', verification: 'verified', confidence: 90 });
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.state, ResultState.INADMISSIBLE);
  assert.equal(r.reasons[0].reason, ReasonCode.MISSING_PROVENANCE);
  await store.close();
});

test('multiple sources are preserved for one claim', async () => {
  const store = await freshStore();
  await ensureEntity(store, 'sub');
  await store.sources.upsert(T1);
  await store.sources.upsert(T2);
  await store.claims.upsert({ id: 'c1', subject: 'sub', predicate: 'p', value: 'x', verification: 'verified', confidence: 90 });
  await store.claims.addSource('c1', T1.id);
  await store.claims.addSource('c1', T2.id);
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.items[0].provenance.sources.length, 2);
  await store.close();
});

// ---- versioning ------------------------------------------------------------

test('latest admissible claim version is returned after update', async () => {
  const store = await freshStore();
  await ensureEntity(store, 'sub');
  await store.sources.upsert(T1);
  await store.claims.upsert({ id: 'c1', subject: 'sub', predicate: 'p', value: 'v1', verification: 'verified', confidence: 90 });
  await store.claims.addSource('c1', T1.id);
  await store.claims.upsert({ id: 'c1', subject: 'sub', predicate: 'p', value: 'v2', verification: 'verified', confidence: 90 });
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'p' });
  assert.equal(r.items[0].payload.value.value, 'v2');
  assert.ok(r.items[0].payload.identity.version >= 2);
  await store.close();
});

// ---- safety ----------------------------------------------------------------

test('safety-sensitive claim with insufficient confidence is suppressed', async () => {
  const store = await freshStore();
  await seedClaim(store,
    { id: 'c1', subject: 'sub', predicate: 'venom', value: 'antivenom-here', verification: 'verified', confidence: 80, safety_critical: true }, T1);
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'venom' });
  assert.equal(r.state, ResultState.INADMISSIBLE);
  assert.equal(r.reasons[0].reason, ReasonCode.SAFETY_FLOOR_CONFIDENCE);
  await store.close();
});

test('safety-sensitive claim from a weak source tier is suppressed', async () => {
  const store = await freshStore();
  await seedClaim(store,
    { id: 'c1', subject: 'sub', predicate: 'venom', value: 'x', verification: 'verified', confidence: 95, safety_critical: true }, T3);
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'venom' });
  assert.equal(r.state, ResultState.INADMISSIBLE);
  assert.equal(r.reasons[0].reason, ReasonCode.SAFETY_FLOOR_SOURCE);
  await store.close();
});

test('expired safety claim is suppressed', async () => {
  const now = Date.parse('2025-06-01T00:00:00Z');
  const store = await freshStore();
  await seedClaim(store,
    { id: 'c1', subject: 'sub', predicate: 'venom', value: 'x', verification: 'verified', confidence: 95, safety_critical: true, valid_until: iso(now - DAY) }, T1);
  const r = await svc(store, now).getKnowledge({ subjectId: 'sub', predicate: 'venom' });
  assert.equal(r.state, ResultState.EXPIRED);
  await store.close();
});

test('passing safety claim exposes safety_floor flag in envelope', async () => {
  const store = await freshStore();
  await seedClaim(store,
    { id: 'c1', subject: 'sub', predicate: 'venom', value: 'x', verification: 'verified', confidence: 95, safety_critical: true }, T1);
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'venom' });
  assert.equal(r.state, ResultState.RESOLVED);
  assert.equal(r.items[0].provenance.safety_floor, true);
  assert.equal(r.items[0].payload.trust.safetyCritical, true);
  await store.close();
});

test('consumer context never suppresses an applicable safety fact', async () => {
  const store = await freshStore();
  await seedClaim(store,
    { id: 'c1', subject: 'sub', predicate: 'venom', value: 'x', verification: 'verified', confidence: 95, safety_critical: true }, T1);
  const r = await svc(store).getKnowledge({ subjectId: 'sub', predicate: 'venom', consumer: 'recommendations', context: { persona: 'casual' } });
  assert.equal(r.state, ResultState.RESOLVED);
  await store.close();
});
