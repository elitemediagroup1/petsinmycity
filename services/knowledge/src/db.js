'use strict';
/**
 * Knowledge Graph storage — database connection and migration runner.
 *
 * Concrete backend: SQLite via better-sqlite3 (synchronous, zero-config, file-based).
 * Chosen as the first production backend because it needs no server, ships with the
 * repo for build-time / CI loading and local dev, and its plain-SQL migrations port
 * directly to PostgreSQL / libSQL (Turso) for serverless production with no schema
 * rewrite. See services/knowledge/README.md and ADR-0026.
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

/**
 * Open a database. Pass ':memory:' for tests, or a file path for persistence.
 * @param {string} [file] path to the sqlite file, or ':memory:'
 * @returns {import('better-sqlite3').Database}
 */
function openDatabase(file) {
  const target = file || process.env.KG_DB_PATH || path.join(__dirname, '..', 'data', 'knowledge.db');
  if (target !== ':memory:') {
    fs.mkdirSync(path.dirname(target), { recursive: true });
  }
  const db = new Database(target);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

/**
 * Apply all pending SQL migrations in lexical order. Idempotent: already-applied
 * migrations (recorded in schema_migrations) are skipped.
 * @param {import('better-sqlite3').Database} db
 * @returns {string[]} versions applied during this call
 */
function migrate(db) {
  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (' +
    ' version TEXT PRIMARY KEY,' +
    " applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));"
  );
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version)
  );
  const ran = [];
  const run = db.transaction((file) => {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(file);
  });
  for (const file of files) {
    if (applied.has(file)) continue;
    run(file);
    ran.push(file);
  }
  return ran;
}

module.exports = { openDatabase, migrate, MIGRATIONS_DIR };
