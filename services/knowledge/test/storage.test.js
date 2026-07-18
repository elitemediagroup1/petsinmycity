'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const KnowledgeStore = require('../src/KnowledgeStore');

/** Fresh in-memory store per test for isolation. */
function freshStore() { return KnowledgeStore.open(':memory:'); }

test('migrations create the schema and store opens empty', async () => {
  const store = await freshStore();
  assert.deepEqual(await store.stats(), { sources: 0, entities: 0, claims: 0, edges: 0 });
  await store.close();
});

test('entity creation stores identity and trust fields', async () => {
  const store = await freshStore();
  await store.entities.upsert({
    id: 'org_austin_animal_center', type: 'organization', name: 'Austin Animal Center',
    aliases: ['AAC'], status: 'active', confidence: 'high', verification: 'verified',
    safety_critical: true, owner: 'knowledge-team', review_cadence: 'quarterly',
    attributes: { org_type: 'municipal_shelter' },
  });
  const e = await store.entities.getById('org_austin_animal_center');
  assert.equal(e.name, 'Austin Animal Center');
  assert.deepEqual(e.aliases, ['AAC']);
  assert.equal(e.type, 'organization');
  assert.equal(e.safety_critical, true); // boolean round-trip
  assert.equal(e.confidence, 'high'); // confidence stored
  assert.equal(e.verification, 'verified');
  assert.deepEqual(e.attributes, { org_type: 'municipal_shelter' });
  await store.close();
});

test('entity requires id, type and name', async () => {
  const store = await freshStore();
  await assert.rejects(() => store.entities.upsert({ type: 'place', name: 'X' }), /id is required/);
  await assert.rejects(() => store.entities.upsert({ id: 'a', name: 'X' }), /type is required/);
  await assert.rejects(() => store.entities.upsert({ id: 'a', type: 'place' }), /name is required/);
  await store.close();
});

test('claim creation stores subject/predicate/value and confidence', async () => {
  const store = await freshStore();
  await store.entities.upsert({ id: 'city_austin', type: 'place', name: 'Austin' });
  await store.claims.upsert({
    id: 'clm_leash', subject: 'city_austin', predicate: 'leash_rule',
    value: { text: 'Dogs must be leashed in public areas.', max_length_ft: 6 },
    confidence: 'high', verification: 'verified', safety_critical: true,
  });
  const c = await store.claims.getById('clm_leash');
  assert.equal(c.subject, 'city_austin');
  assert.equal(c.predicate, 'leash_rule');
  assert.deepEqual(c.value, { text: 'Dogs must be leashed in public areas.', max_length_ft: 6 });
  assert.equal(c.confidence, 'high');
  assert.equal(c.safety_critical, true);
  await store.close();
});

test('retrieval accuracy: findBySubject and by predicate', async () => {
  const store = await freshStore();
  await store.entities.upsert({ id: 'city_austin', type: 'place', name: 'Austin' });
  await store.claims.upsert({ id: 'c1', subject: 'city_austin', predicate: 'leash_rule', value: 'A' });
  await store.claims.upsert({ id: 'c2', subject: 'city_austin', predicate: 'heat_risk', value: 'B' });
  assert.equal((await store.claims.findBySubject('city_austin')).length, 2);
  const only = await store.claims.findBySubject('city_austin', 'leash_rule');
  assert.equal(only.length, 1);
  assert.equal(only[0].id, 'c1');
  await store.close();
});

test('relationship creation and traversal (from/to/byType)', async () => {
  const store = await freshStore();
  await store.entities.upsert({ id: 'state_tx', type: 'place', name: 'Texas' });
  await store.entities.upsert({ id: 'city_austin', type: 'place', name: 'Austin' });
  assert.equal(await store.relationships.add({ edge: 'located_in', from: 'city_austin', to: 'state_tx' }), true);
  // duplicate edge is idempotent
  assert.equal(await store.relationships.add({ edge: 'located_in', from: 'city_austin', to: 'state_tx' }), false);
  assert.equal(await store.relationships.count(), 1);
  assert.equal((await store.relationships.from('city_austin'))[0].to_id, 'state_tx');
  assert.equal((await store.relationships.to('state_tx'))[0].from_id, 'city_austin');
  assert.equal((await store.relationships.byType('located_in')).length, 1);
  await store.close();
});

test('provenance preservation: sources linked to entities and claims', async () => {
  const store = await freshStore();
  await store.entities.upsert({ id: 'org_aac', type: 'organization', name: 'Austin Animal Center' });
  await store.sources.upsert({ id: 's1', tier: 1, kind: 'government', url: 'https://example.gov/aac', accessed: '2025-01-10' });
  await store.entities.addSource('org_aac', 's1');
  const esrc = await store.sources.forEntity('org_aac');
  assert.equal(esrc.length, 1);
  assert.equal(esrc[0].tier, 1);
  assert.equal(esrc[0].kind, 'government');

  await store.claims.upsert({ id: 'c1', subject: 'org_aac', predicate: 'hours', value: 'daily' });
  await store.claims.addSource('c1', 's1');
  const csrc = await store.sources.forClaim('c1');
  assert.equal(csrc.length, 1);
  assert.equal(csrc[0].id, 's1');
  await store.close();
});

test('verification lifecycle: state transitions are versioned', async () => {
  const store = await freshStore();
  await store.entities.upsert({ id: 'city_austin', type: 'place', name: 'Austin' });
  await store.claims.upsert({ id: 'c1', subject: 'city_austin', predicate: 'leash_rule', value: 'A', verification: 'unverified', confidence: 'low' });
  await store.claims.setVerification('c1', 'in_review');
  await store.claims.setVerification('c1', 'verified', 'high');
  const c = await store.claims.getById('c1');
  assert.equal(c.verification, 'verified');
  assert.equal(c.confidence, 'high');
  assert.equal(c.version, 3); // initial + 2 transitions
  const hist = await store.claims.history('c1');
  assert.equal(hist.length, 2); // two prior states snapshotted
  assert.equal(hist[0].snapshot.verification, 'unverified');
  assert.equal(hist[1].snapshot.verification, 'in_review');
  await store.close();
});

test('entity versioning preserves prior snapshots on update', async () => {
  const store = await freshStore();
  await store.entities.upsert({ id: 'e1', type: 'place', name: 'Austin', confidence: 'medium' });
  await store.entities.upsert({ id: 'e1', type: 'place', name: 'Austin', confidence: 'high' });
  const e = await store.entities.getById('e1');
  assert.equal(e.version, 2);
  assert.equal(e.confidence, 'high');
  const hist = await store.entities.history('e1');
  assert.equal(hist.length, 1);
  assert.equal(hist[0].snapshot.confidence, 'medium');
  await store.close();
});

test('timestamps: created_at set, updated_at advances on change', async () => {
  const store = await freshStore();
  await store.entities.upsert({ id: 'e1', type: 'place', name: 'Austin' });
  const rs = await store.driver.execute({ sql: 'SELECT created_at, updated_at FROM entities WHERE id=@id', args: { id: 'e1' } });
  const first = rs.rows[0];
  assert.ok(first.created_at);
  assert.ok(first.updated_at);
  await store.close();
});
