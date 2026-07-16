'use strict';

/**
 * Shared SQL storage contract test (ADR-0027, revised).
 *
 * This suite proves the SQL-backed KnowledgeStore behaves correctly and is exercised
 * against SQLite (better-sqlite3), the ONLY SQL backend, used for local development
 * and automated tests. Production durable storage is EMG Loop via LoopKnowledgeStore,
 * which is NOT a SQL driver and is covered by test/contract/loop-provider.test.js.
 *
 * (The former libSQL/Turso variant was removed: PetsInMyCity no longer owns a durable
 * remote SQL database.)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const KnowledgeStore = require('../../src/KnowledgeStore');

const DRIVERS = [
  { name: 'sqlite', config: { driver: 'sqlite', filename: ':memory:' }, enabled: true },
];

const T1 = { id: 's-gov', tier: 1, kind: 'government', url: 'https://example.gov/a', accessed: '2025-01-02' };

/** Register the shared contract suite for one driver. */
function defineContract(name, config, enabled) {
  const opts = enabled ? {} : { skip: name + ' driver unavailable in this environment' };
  const store = () => KnowledgeStore.create(config);

  test('[' + name + '] opens empty and migrates schema', opts, async () => {
    const s = await store();
    const stats = await s.stats();
    assert.equal(typeof stats.entities, 'number');
    assert.equal(typeof stats.claims, 'number');
    await s.close();
  });

  test('[' + name + '] entity create + retrieve preserves trust/JSON/boolean', opts, async () => {
    const s = await store();
    await s.entities.upsert({ id: 'ce1', type: 'organization', name: 'AAC', aliases: ['x'],
      safety_critical: true, confidence: 'high', verification: 'verified', attributes: { k: 'v' } });
    const e = await s.entities.getById('ce1');
    assert.equal(e.name, 'AAC');
    assert.deepEqual(e.aliases, ['x']);
    assert.equal(e.safety_critical, true);
    assert.deepEqual(e.attributes, { k: 'v' });
    await s.close();
  });

  test('[' + name + '] claim create + findBySubject/predicate', opts, async () => {
    const s = await store();
    await s.entities.upsert({ id: 'csub', type: 'place', name: 'sub' });
    await s.claims.upsert({ id: 'cc1', subject: 'csub', predicate: 'cp', value: { n: 6 }, confidence: 'high' });
    await s.claims.upsert({ id: 'cc2', subject: 'csub', predicate: 'cq', value: 'B' });
    const one = await s.claims.findBySubject('csub', 'cp');
    assert.equal(one.length, 1);
    assert.deepEqual(one[0].value, { n: 6 });
    await s.close();
  });

  test('[' + name + '] relationship traversal + idempotent edge', opts, async () => {
    const s = await store();
    await s.entities.upsert({ id: 'ra', type: 'place', name: 'a' });
    await s.entities.upsert({ id: 'rb', type: 'place', name: 'b' });
    assert.equal(await s.relationships.add({ edge: 'in', from: 'ra', to: 'rb' }), true);
    assert.equal(await s.relationships.add({ edge: 'in', from: 'ra', to: 'rb' }), false);
    assert.equal((await s.relationships.from('ra'))[0].to_id, 'rb');
    assert.equal((await s.relationships.to('rb'))[0].from_id, 'ra');
    await s.close();
  });

  test('[' + name + '] source linking + provenance for claim/entity', opts, async () => {
    const s = await store();
    await s.entities.upsert({ id: 'psub', type: 'place', name: 'sub' });
    await s.sources.upsert(T1);
    await s.entities.addSource('psub', T1.id);
    await s.claims.upsert({ id: 'pc1', subject: 'psub', predicate: 'p', value: 'x' });
    await s.claims.addSource('pc1', T1.id);
    assert.equal((await s.sources.forEntity('psub'))[0].tier, 1);
    assert.equal((await s.sources.forClaim('pc1'))[0].id, 's-gov');
    await s.close();
  });

  test('[' + name + '] verification lifecycle is append-only versioned', opts, async () => {
    const s = await store();
    await s.entities.upsert({ id: 'vsub', type: 'place', name: 'sub' });
    await s.claims.upsert({ id: 'vc1', subject: 'vsub', predicate: 'p', value: 'A', verification: 'unverified' });
    await s.claims.setVerification('vc1', 'in_review');
    await s.claims.setVerification('vc1', 'verified', 'high');
    const c = await s.claims.getById('vc1');
    assert.equal(c.verification, 'verified');
    assert.equal(c.version, 3);
    const hist = await s.claims.history('vc1');
    assert.equal(hist.length, 2);
    await s.close();
  });

  test('[' + name + '] historical entity versions preserved on update', opts, async () => {
    const s = await store();
    await s.entities.upsert({ id: 'he1', type: 'place', name: 'X', confidence: 'medium' });
    await s.entities.upsert({ id: 'he1', type: 'place', name: 'X', confidence: 'high' });
    const e = await s.entities.getById('he1');
    assert.equal(e.version, 2);
    const hist = await s.entities.history('he1');
    assert.equal(hist.length, 1);
    assert.equal(hist[0].snapshot.confidence, 'medium');
    await s.close();
  });

  test('[' + name + '] transaction commits all writes', opts, async () => {
    const s = await store();
    await s.transaction(async (tx) => {
      await tx.entities.upsert({ id: 'te1', type: 'place', name: 'A' });
      await tx.entities.upsert({ id: 'te2', type: 'place', name: 'B' });
    });
    assert.equal(!!(await s.entities.getById('te1')), true);
    assert.equal(!!(await s.entities.getById('te2')), true);
    await s.close();
  });

  test('[' + name + '] transaction rolls back on failure (no partial writes)', opts, async () => {
    const s = await store();
    await assert.rejects(() => s.transaction(async (tx) => {
      await tx.entities.upsert({ id: 'rbx', type: 'place', name: 'A' });
      throw new Error('boom');
    }));
    assert.equal(await s.entities.getById('rbx'), undefined);
    await s.close();
  });

  test('[' + name + '] date + boolean semantics round-trip', opts, async () => {
    const s = await store();
    await s.entities.upsert({ id: 'dsub', type: 'place', name: 'sub' });
    await s.claims.upsert({ id: 'dc1', subject: 'dsub', predicate: 'p', value: 'x',
      safety_critical: false, valid_from: '2025-01-01', valid_until: '2025-12-31' });
    const c = await s.claims.getById('dc1');
    assert.equal(c.safety_critical, false);
    assert.equal(c.valid_from, '2025-01-01');
    assert.equal(c.valid_until, '2025-12-31');
    await s.close();
  });

  test('[' + name + '] uniqueness: repeated writes converge (idempotent upsert)', opts, async () => {
    const s = await store();
    await s.entities.upsert({ id: 'usub', type: 'place', name: 'sub' });
    await s.claims.upsert({ id: 'uc1', subject: 'usub', predicate: 'p', value: 'v1', verification: 'verified' });
    await s.claims.upsert({ id: 'uc1', subject: 'usub', predicate: 'p', value: 'v2', verification: 'verified' });
    const c = await s.claims.getById('uc1');
    assert.equal(c.value, 'v2');
    await s.close();
  });
}

for (const d of DRIVERS) {
  defineContract(d.name, d.config, d.enabled);
}
