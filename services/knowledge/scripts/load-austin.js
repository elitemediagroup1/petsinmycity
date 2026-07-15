#!/usr/bin/env node
'use strict';
/**
 * Load the verified Austin dataset into the Knowledge Graph store.
 * Reuses research/austin/pilot/data/ (the pilot's verified YAML) as the first dataset.
 *
 * Usage: node services/knowledge/scripts/load-austin.js [dbFile]
 */
const path = require('path');
const KnowledgeStore = require('../src/KnowledgeStore');
const { importDirectory } = require('../src/import/importDataset');

const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const AUSTIN_DATA = path.join(REPO_ROOT, 'research', 'austin', 'pilot', 'data');

function main() {
  const dbFile = process.argv[2] || path.join(__dirname, '..', 'data', 'knowledge.db');
  const store = KnowledgeStore.open(dbFile);
  const before = store.stats();
  const counts = importDirectory(store, AUSTIN_DATA);
  const after = store.stats();
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ db: dbFile, source: AUSTIN_DATA, imported: counts, before: before, after: after }, null, 2));
  store.close();
}

if (require.main === module) main();
module.exports = { AUSTIN_DATA };
