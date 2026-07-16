#!/usr/bin/env node
'use strict';
/**
 * Load the verified Austin dataset into the configured Knowledge store (ADR-0027: async).
 * Reuses research/austin/pilot/data/ (the pilot's verified YAML) as the first dataset.
 *
 * Usage:
 *   node services/knowledge/scripts/load-austin.js              # env-configured store
 *   node services/knowledge/scripts/load-austin.js ':memory:'   # explicit local sqlite
 *   node services/knowledge/scripts/load-austin.js ./data/kg.db # explicit local sqlite file
 *
 * For the durable driver, set KNOWLEDGE_DB_DRIVER=libsql and KNOWLEDGE_DB_URL /
 * KNOWLEDGE_DB_AUTH_TOKEN in the environment. This is an EXPLICIT import command:
 * deploying the repo does NOT by itself overwrite durable knowledge. The import is
 * idempotent (upserts + ignored duplicate edges). Credentials are never printed.
 */
const path = require('path');
const KnowledgeStore = require('../src/KnowledgeStore');
const { importDirectory } = require('../src/import/importDataset');

const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const AUSTIN_DATA = path.join(REPO_ROOT, 'research', 'austin', 'pilot', 'data');

async function main() {
  const arg = process.argv[2];
  const config = arg ? { driver: 'sqlite', filename: arg } : undefined;
  const store = await KnowledgeStore.create(config);
  try {
    const before = await store.stats();
    const counts = await importDirectory(store, AUSTIN_DATA);
    const after = await store.stats();
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      driver: store.driver.dialect,
      source: AUSTIN_DATA,
      imported: counts,
      before,
      after,
    }, null, 2));
  } finally {
    await store.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('austin import failed:', err && err.message ? err.message : String(err));
    process.exit(1);
  });
}

module.exports = { AUSTIN_DATA, main };
