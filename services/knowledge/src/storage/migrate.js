'use strict';
/**
 * Async migration runner (ADR-0027).
 *
 * Applies the shared SQL migrations in services/knowledge/migrations/ through the
 * async storage-driver contract, so the SAME migrations run against SQLite (local /
 * test) and libSQL / Turso (durable). Because libSQL is SQLite-dialect compatible,
 * there is ONE set of migrations and no divergent remote schema.
 *
 * Guarantees:
 *   - deterministic order (lexical filename sort),
 *   - each migration runs exactly once (recorded in schema_migrations),
 *   - a failing migration stops the run (later migrations are not applied),
 *   - migrations are explicit: nothing here runs on an ordinary read request.
 */
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

const CREATE_MIGRATIONS_TABLE =
  'CREATE TABLE IF NOT EXISTS schema_migrations ('
  + ' version TEXT PRIMARY KEY,'
  + " applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));";

/** List migration filenames in deterministic order. */
function listMigrationFiles(dir) {
  return fs.readdirSync(dir || MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

/** Read the set of already-applied migration versions. */
async function appliedVersions(driver) {
  await driver.exec(CREATE_MIGRATIONS_TABLE);
  const rs = await driver.execute({ sql: 'SELECT version FROM schema_migrations' });
  return new Set(rs.rows.map((r) => r.version));
}

/**
 * Apply all pending migrations. Idempotent: already-applied files are skipped.
 * @param {object} driver an open storage driver
 * @param {object} [opts] { dir }
 * @returns {Promise<string[]>} versions applied during this call
 */
async function runMigrations(driver, opts) {
  const options = opts || {};
  const dir = options.dir || MIGRATIONS_DIR;
  const applied = await appliedVersions(driver);
  const files = listMigrationFiles(dir);
  const ran = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    // eslint-disable-next-line no-await-in-loop
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    // Apply DDL, then record the version. Stops the run on any failure.
    // eslint-disable-next-line no-await-in-loop
    await driver.exec(sql);
    // eslint-disable-next-line no-await-in-loop
    await driver.execute({
      sql: 'INSERT INTO schema_migrations (version) VALUES (@version)',
      args: { version: file },
    });
    ran.push(file);
  }
  return ran;
}

/**
 * Report schema readiness: which migrations exist vs. are applied.
 * @returns {Promise<{ expected: string[], applied: string[], pending: string[], ready: boolean }>}
 */
async function schemaStatus(driver, opts) {
  const options = opts || {};
  const dir = options.dir || MIGRATIONS_DIR;
  const applied = await appliedVersions(driver);
  const expected = listMigrationFiles(dir);
  const pending = expected.filter((f) => !applied.has(f));
  return {
    expected,
    applied: expected.filter((f) => applied.has(f)),
    pending,
    ready: pending.length === 0 && expected.length > 0,
  };
}

module.exports = { runMigrations, schemaStatus, listMigrationFiles, MIGRATIONS_DIR };
