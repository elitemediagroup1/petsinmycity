#!/usr/bin/env node
'use strict';
/**
 * Apply pending migrations to the configured knowledge database (ADR-0027: async).
 *
 * Usage:
 *   node scripts/migrate.js                 # uses env config (KNOWLEDGE_DB_DRIVER=...)
 *   node scripts/migrate.js ':memory:'      # explicit local sqlite (memory)
 *   node scripts/migrate.js ./data/kg.db    # explicit local sqlite file
 *
 * For the durable driver, set KNOWLEDGE_DB_DRIVER=libsql and KNOWLEDGE_DB_URL /
 * KNOWLEDGE_DB_AUTH_TOKEN in the environment (never on the command line). This is an
 * EXPLICIT, controlled migration step. Credentials are never printed.
 */
const { createDriver } = require('../src/storage/create-store');
const { runMigrations, schemaStatus } = require('../src/storage/migrate');

async function main() {
  const arg = process.argv[2];
  const config = arg ? { driver: 'sqlite', filename: arg } : undefined;
  const driver = await createDriver(config);
  try {
    const applied = await runMigrations(driver);
    const status = await schemaStatus(driver);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      driver: driver.dialect,
      applied,
      schema: { expected: status.expected, applied: status.applied, pending: status.pending, ready: status.ready },
    }, null, 2));
  } finally {
    await driver.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('migration failed:', err && err.message ? err.message : String(err));
    process.exit(1);
  });
}

module.exports = { main };
