'use strict';

/**
 * Austin-backed integration tests for the delivery read layer.
 *
 * These import the REAL verified Austin dataset (research/austin/pilot/data/)
 * via the PR #9 importer, then exercise the generic delivery path. No Austin
 * research fact is modified. The needs_verification case below is a real fact in
 * the dataset (red-bud-isle off_leash_designation), used to prove suppression.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { KnowledgeStore } = require('../../src/KnowledgeStore');
const { importDirectory } = require('../../src/import/importDataset');
const { KnowledgeDeliveryService, ResultState } = require('../../src/delivery');

const AUSTIN_DIR = path.resolve(__dirname, '../../../../research/austin/pilot/data');

function loadedStore() {
  const store = KnowledgeStore.open(':memory:');
  importDirectory(store, AUSTIN_DIR);
  return store;
}

test('Austin: a verified relationship-style claim resolves with provenance', () => {
  const store = loadedStore();
  const s = new KnowledgeDeliveryService(store);
  const r = s.getKnowledge({
    subjectId: 'place/tx/austin',
    predicate: 'located_in_county',
    consumer: 'internal',
  });
  assert.equal(r.state, ResultState.RESOLVED, 'verified Austin claim should be delivered');
  assert.ok(r.items[0].provenance.sources.length >= 1, 'delivered claim must carry provenance');
  assert.equal(r.items[0].provenance.verification_state, 'verified');
  store.close();
});

test('Austin: a verified emergency-vet claim resolves', () => {
  const store = loadedStore();
  const s = new KnowledgeDeliveryService(store);
  const r = s.getKnowledge({
    subjectId: 'org/emergency-vet/tx/austin/aves',
    predicate: 'emergency_availability',
    consumer: 'map',
  });
  assert.equal(r.state, ResultState.RESOLVED);
  assert.equal(r.items[0].payload.identity.subject, 'org/emergency-vet/tx/austin/aves');
  store.close();
});

test('Austin: needs_verification claim does NOT leak into delivery', () => {
  const store = loadedStore();
  const s = new KnowledgeDeliveryService(store);
  const r = s.getKnowledge({
    subjectId: 'place/tx/austin/red-bud-isle',
    predicate: 'off_leash_designation',
  });
  assert.notEqual(r.state, ResultState.RESOLVED, 'unverified Austin fact must not be delivered as fact');
  assert.equal(r.state, ResultState.INADMISSIBLE);
  store.close();
});

test('Austin: unknown subject returns not_found', () => {
  const store = loadedStore();
  const s = new KnowledgeDeliveryService(store);
  const r = s.getKnowledge({ subjectId: 'place/tx/nowhere', predicate: 'located_in_county' });
  assert.equal(r.state, ResultState.NOT_FOUND);
  store.close();
});

test('Austin: unknown predicate on a real subject returns not_found', () => {
  const store = loadedStore();
  const s = new KnowledgeDeliveryService(store);
  const r = s.getKnowledge({ subjectId: 'place/tx/austin', predicate: 'no_such_predicate' });
  assert.equal(r.state, ResultState.NOT_FOUND);
  store.close();
});

test('Austin: confidence and verification metadata are preserved in envelope', () => {
  const store = loadedStore();
  const s = new KnowledgeDeliveryService(store);
  const r = s.getKnowledge({ subjectId: 'place/tx/austin', predicate: 'located_in_county' });
  assert.equal(r.state, ResultState.RESOLVED);
  assert.equal(r.items[0].payload.trust.verificationStatus, 'verified');
  assert.ok(typeof r.items[0].payload.trust.confidence === 'number' || r.items[0].payload.trust.confidence === null);
  store.close();
});
