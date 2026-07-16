'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const KnowledgeStore = require('../src/KnowledgeStore');
const { importDirectory } = require('../src/import/importDataset');

/** Write a tiny YAML dataset to a temp dir and import it. */
test('importDirectory loads entities, claims and edges from yaml', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kg-fixture-'));
  fs.writeFileSync(path.join(dir, 'entities.yaml'),
    'schema_version: 1\n' +
    'entities:\n' +
    '  - id: city_austin\n' +
    '    type: place\n' +
    '    name: Austin\n' +
    '    confidence: high\n' +
    '    verification: verified\n' +
    '    sources:\n' +
    '      - {id: s1, tier: 1, kind: government, url: https://example.gov, accessed: 2025-01-10}\n' +
    '  - id: state_tx\n' +
    '    type: place\n' +
    '    name: Texas\n');
  fs.writeFileSync(path.join(dir, 'claims.yaml'),
    'schema_version: 1\n' +
    'claims:\n' +
    '  - id: c1\n' +
    '    subject: city_austin\n' +
    '    predicate: leash_rule\n' +
    '    value: Dogs must be leashed\n' +
    '    confidence: high\n' +
    '    verification: verified\n' +
    '    safety_critical: true\n' +
    '    sources:\n' +
    '      - {id: s1, tier: 1, kind: government}\n');
  fs.writeFileSync(path.join(dir, 'edges.yaml'),
    'schema_version: 1\n' +
    'edges:\n' +
    '  - {edge: located_in, from: city_austin, to: state_tx}\n');

  const store = await KnowledgeStore.open(':memory:');
  const counts = await importDirectory(store, dir);
  assert.equal(counts.entities, 2);
  assert.equal(counts.claims, 1);
  assert.equal(counts.edges, 1);

  // retrieval accuracy after import
  const c = await store.claims.getById('c1');
  assert.equal(c.subject, 'city_austin');
  assert.equal(c.safety_critical, true);
  assert.equal((await store.sources.forClaim('c1')).length, 1);
  assert.equal((await store.sources.forEntity('city_austin')).length, 1);
  assert.equal((await store.relationships.from('city_austin'))[0].to_id, 'state_tx');

  // idempotent re-import: counts of stored rows unchanged
  await importDirectory(store, dir);
  assert.equal(await store.entities.count(), 2);
  assert.equal(await store.relationships.count(), 1);

  await store.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
