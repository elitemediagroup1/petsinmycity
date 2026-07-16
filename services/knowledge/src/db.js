'use strict';
/**
 * DEPRECATED (ADR-0027).
 *
 * The synchronous better-sqlite3 connection + migration runner that used to live
 * here has been replaced by the async storage layer:
 *   - drivers:            ./storage/drivers/{sqlite,libsql}-driver.js
 *   - driver factory:     ./storage/create-store.js
 *   - migration runner:   ./storage/migrate.js
 *
 * This shim remains only so any stray legacy require('./db') keeps resolving. It
 * intentionally does NOT import better-sqlite3 at module scope, so requiring it in
 * the deployed Netlify path pulls in no native binary. Prefer KnowledgeStore.create()
 * or createDriver() for all new code.
 */
const { createDriver } = require('./storage/create-store');
const { runMigrations, MIGRATIONS_DIR } = require('./storage/migrate');

/**
 * @deprecated Use createDriver({ driver: 'sqlite', filename }) instead.
 * Returns an async SQLite driver (not a raw better-sqlite3 handle).
 */
async function openDatabase(file) {
  return createDriver({ driver: 'sqlite', filename: file });
}

/** @deprecated Use runMigrations(driver) from ./storage/migrate instead. */
async function migrate(driver) {
  return runMigrations(driver);
}

module.exports = { openDatabase, migrate, MIGRATIONS_DIR };
