'use strict';

/**
 * Austin-backed integration tests for the delivery read layer (ADR-0027: async).
 * Imports the REAL verified Austin dataset (research/austin/pilot/data/) then
 * exercises the generic delivery path. No Austin research fact is modified.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const KnowledgeStore = require('../../src/KnowledgeStore');
const { importDirectory } = require('../../src/import/importDataset');
const { KnowledgeDeliveryService, ResultState } = require('../../src/delivery');

const AUSTIN_DIR = path.resolve(__dirname, '../../../../research/austin/pilot/data');

async function loadedStore() {
  const store = await KnowledgeStore.open(':memory:');
  await importDirectory(store, AUSTIN_DIR);
  return store;
}

test('Austin: a verified relationship-style claim resolves with provenance', async () => {
  const store = await loadedStore();
  const s = new KnowledgeDeliveryService(store);
  const r = await s.getKnowledge({ subjectId: 'place/tx/austin', predicate: 'located_in_county', consumer: 'internal' });
  assert.equal(r.state, ResultState.RESOLVED, 'verified Austin claim should be delivered');
  assert.ok(r.items[0].provenance.sources.length >= 1, 'delivered claim must carry provenance');
  assert.equal(r.items[0].provenance.verification_state, 'verified');
  await store.close();
});

test('Austin: a verified emergency-vet claim resolves', async () => {
  const store = await loadedStore();
  const s = new KnowledgeDeliveryService(store);
  const r = await s.getKnowledge({ subjectId: 'org/emergency-vet/tx/austin/aves', predicate: 'emergency_availability', consumer: 'map' });
  assert.equal(r.state, ResultState.RESOLVED);
  assert.equal(r.items[0].payload.identity.subject, 'org/emergency-vet/tx/austin/aves');
  await store.close();
});

test('Austin: needs_verification claim does NOT leak into delivery', async () => {
  const store = await loadedStore();
  const s = new KnowledgeDeliveryService(store);
  const r = await s.getKnowledge({ subjectId: 'place/tx/austin/red-bud-isle', predicate: 'off_leash_designation' });
  assert.notEqual(r.state, ResultState.RESOLVED, 'unverified Austin fact must not be delivered as fact');
  assert.equal(r.state, ResultState.INADMISSIBLE);
  await store.close();
});

test('Austin: unknown subject returns not_found', async () => {
  const store = await loadedStore();
  const s = new KnowledgeDeliveryService(store);
  const r = await s.getKnowledge({ subjectId: 'place/tx/nowhere', predicate: 'located_in_county' });
  assert.equal(r.state, ResultState.NOT_FOUND);
  await store.close();
});

test('Austin: unknown predicate on a real subject returns not_found', async () => {
  const store = await loadedStore();
  const s = new KnowledgeDeliveryService(store);
  const r = await s.getKnowledge({ subjectId: 'place/tx/austin', predicate: 'no_such_predicate' });
  assert.equal(r.state, ResultState.NOT_FOUND);
  await store.close();
});

test('Austin: confidence and verification metadata are preserved in envelope', async () => {
  const store = await loadedStore();
  const s = new KnowledgeDeliveryService(store);
  const r = await s.getKnowledge({ subjectId: 'place/tx/austin', predicate: 'located_in_county' });
  assert.equal(r.state, ResultState.RESOLVED);
  assert.equal(r.items[0].payload.trust.verificationStatus, 'verified');
  assert.ok(typeof r.items[0].payload.trust.confidence === 'number' || r.items[0].payload.trust.confidence === null);
  await store.close();
});
