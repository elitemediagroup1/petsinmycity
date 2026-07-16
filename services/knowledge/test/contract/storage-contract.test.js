'use strict';

/**
 * Shared storage contract test (ADR-0027).
 *
 * The SAME behavioural suite runs against every supported storage driver, proving
 * identical observable behaviour regardless of backend:
 *   - SQLite  (better-sqlite3, local/test)
 *   - libSQL  (@libsql/client, in-memory ':memory:' — the durable driver in a
 *              secret-free local mode, so ordinary CI needs no credentials)
 *
 * A full remote Turso integration test requires credentials and is kept separate
 * and optional (see docs). This contract suite must pass with no secrets.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const KnowledgeStore = require('../../src/KnowledgeStore');

// Is the libSQL client importable in this environment? (It is a declared dep, but
// guard so the suite degrades gracefully rather than failing to load.)
let libsqlAvailable = true;
try { require.resolve('@libsql/client'); } catch (e) { libsqlAvailable = false; }

/** The driver configurations under test. */
const DRIVERS = [
  { name: 'sqlite', config: { driver: 'sqlite', filename: ':memory:' }, enabled: true },
  { name: 'libsql', config: { driver: 'libsql', url: ':memory:' }, enabled: libsqlAvailable },
];

const T1 = { id: 's-gov', tier: 1, kind: 'government', url: 'https://example.gov/a', accessed: '2025-01-02' };
const T2 = { id: 's-org', tier: 2, kind: 'operator', url: 'https://example.org/b', accessed: '2025-01-02' };

/**
 * Register the shared contract suite for one driver.
 * @param {string} name driver label
 * @param {object} config createKnowledgeStore config
 * @param {boolean} enabled false -> tests are skipped (dependency unavailable)
 */
function defineContract(name, config, enabled) {
  const opts = enabled ? {} : { skip: name + ' driver unavailable in this environment' };
  const store = () => KnowledgeStore.create(config);

  test('[' + name + '] opens empty and migrates schema', opts, async () => {
    const s = await store();
    assert.deepEqual(await s.stats(), { sources: 0, entities: 0, claims: 0, edges: 0 });
    await s.close();
  });

  test('[' + name + '] entity create + retrieve preserves trust/JSON/boolean', opts, async () => {
    const s = await store();
    await s.entities.upsert({ id: 'e1', type: 'organization', name: 'AAC', aliases: ['x'],
      safety_critical: true, confidence: 'high', verification: 'verified', attributes: { k: 'v' } });
    const e = await s.entities.getById('e1');
    assert.equal(e.name, 'AAC');
    assert.deepEqual(e.aliases, ['x']);
    assert.equal(e.safety_critical, true);
    assert.deepEqual(e.attributes, { k: 'v' });
    await s.close();
  });

  test('[' + name + '] claim create + findBySubject/predicate', opts, async () => {
    const s = await store();
    await s.entities.upsert({ id: 'sub', type: 'place', name: 'sub' });
    await s.claims.upsert({ id: 'c1', subject: 'sub', predicate: 'p', value: { n: 6 }, confidence: 'high' });
    await s.claims.upsert({ id: 'c2', subject: 'sub', predicate: 'q', value: 'B' });
    assert.equal((await s.claims.findBySubject('sub')).length, 2);
    const one = await s.claims.findBySubject('sub', 'p');
    assert.equal(one.length, 1);
    assert.deepEqual(one[0].value, { n: 6 });
    await s.close();
  });

  test('[' + name + '] relationship traversal + idempotent edge', opts, async () => {
    const s = await store();
    await s.entities.upsert({ id: 'a', type: 'place', name: 'a' });
    await s.entities.upsert({ id: 'b', type: 'place', name: 'b' });
    assert.equal(await s.relationships.add({ edge: 'in', from: 'a', to: 'b' }), true);
    assert.equal(await s.relationships.add({ edge: 'in', from: 'a', to: 'b' }), false);
    assert.equal((await s.relationships.from('a'))[0].to_id, 'b');
    assert.equal((await s.relationships.to('b'))[0].from_id, 'a');
    assert.equal(await s.relationships.count(), 1);
    await s.close();
  });

  test('[' + name + '] source linking + provenance for claim/entity', opts, async () => {
    const s = await store();
    await s.entities.upsert({ id: 'sub', type: 'place', name: 'sub' });
    await s.sources.upsert(T1);
    await s.entities.addSource('sub', T1.id);
    await s.claims.upsert({ id: 'c1', subject: 'sub', predicate: 'p', value: 'x' });
    await s.claims.addSource('c1', T1.id);
    assert.equal((await s.sources.forEntity('sub'))[0].tier, 1);
    assert.equal((await s.sources.forClaim('c1'))[0].id, 's-gov');
    // reuse: upserting same source id does not duplicate
    await s.sources.upsert(T1);
    assert.equal(await s.sources.count(), 1);
    await s.close();
  });

  test('[' + name + '] verification lifecycle is append-only versioned', opts, async () => {
    const s = await store();
    await s.entities.upsert({ id: 'sub', type: 'place', name: 'sub' });
    await s.claims.upsert({ id: 'c1', subject: 'sub', predicate: 'p', value: 'A', verification: 'unverified' });
    await s.claims.setVerification('c1', 'in_review');
    await s.claims.setVerification('c1', 'verified', 'high');
    const c = await s.claims.getById('c1');
    assert.equal(c.verification, 'verified');
    assert.equal(c.version, 3);
    const hist = await s.claims.history('c1');
    assert.equal(hist.length, 2);
    assert.equal(hist[0].snapshot.verification, 'unverified');
    await s.close();
  });

  test('[' + name + '] historical entity versions preserved on update', opts, async () => {
    const s = await store();
    await s.entities.upsert({ id: 'e1', type: 'place', name: 'X', confidence: 'medium' });
    await s.entities.upsert({ id: 'e1', type: 'place', name: 'X', confidence: 'high' });
    const e = await s.entities.getById('e1');
    assert.equal(e.version, 2);
    const hist = await s.entities.history('e1');
    assert.equal(hist.length, 1);
    assert.equal(hist[0].snapshot.confidence, 'medium');
    await s.close();
  });

  test('[' + name + '] transaction commits all writes', opts, async () => {
    const s = await store();
    await s.transaction(async (tx) => {
      await tx.entities.upsert({ id: 'e1', type: 'place', name: 'A' });
      await tx.entities.upsert({ id: 'e2', type: 'place', name: 'B' });
    });
    assert.equal(await s.entities.count(), 2);
    await s.close();
  });

  test('[' + name + '] transaction rolls back on failure (no partial writes)', opts, async () => {
    const s = await store();
    await assert.rejects(() => s.transaction(async (tx) => {
      await tx.entities.upsert({ id: 'e1', type: 'place', name: 'A' });
      throw new Error('boom');
    }));
    assert.equal(await s.entities.count(), 0);
    await s.close();
  });

  test('[' + name + '] date + boolean semantics round-trip', opts, async () => {
    const s = await store();
    await s.entities.upsert({ id: 'sub', type: 'place', name: 'sub' });
    await s.claims.upsert({ id: 'c1', subject: 'sub', predicate: 'p', value: 'x',
      safety_critical: false, valid_from: '2025-01-01', valid_until: '2025-12-31' });
    const c = await s.claims.getById('c1');
    assert.equal(c.safety_critical, false);
    assert.equal(c.valid_from, '2025-01-01');
    assert.equal(c.valid_until, '2025-12-31');
    await s.close();
  });

  test('[' + name + '] uniqueness: repeated writes converge (idempotent upsert)', opts, async () => {
    const s = await store();
    await s.entities.upsert({ id: 'sub', type: 'place', name: 'sub' });
    await s.claims.upsert({ id: 'c1', subject: 'sub', predicate: 'p', value: 'v1', verification: 'verified' });
    await s.claims.upsert({ id: 'c1', subject: 'sub', predicate: 'p', value: 'v2', verification: 'verified' });
    const c = await s.claims.getById('c1');
    assert.equal(c.value, 'v2');
    assert.equal(await s.claims.count(), 1);
    await s.close();
  });
}

for (const d of DRIVERS) {
  defineContract(d.name, d.config, d.enabled);
}
