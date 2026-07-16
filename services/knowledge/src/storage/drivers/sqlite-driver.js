'use strict';
/**
 * SQLite storage driver (better-sqlite3) exposed behind the async driver contract.
 *
 * better-sqlite3 is synchronous; every method here completes immediately but is
 * declared \`async\` so it satisfies the SAME promise-based contract as the durable
 * libSQL driver (ADR-0027). Repositories therefore never learn which backend is
 * active. This driver is for local development and automated tests only — it is
 * NOT durable on Netlify's ephemeral filesystem.
 *
 * better-sqlite3 is required LAZILY (inside open()) so that deployed libSQL-only
 * runtimes never load the native binary, and so a missing optional native module
 * does not break importing this file.
 *
 * Driver contract (shared with libsql-driver.js):
 *   await driver.execute({ sql, args })  -> { rows, rowsAffected, lastInsertRowid }
 *   await driver.batch(statements)       -> ResultSet[]        (atomic: all or nothing)
 *   await driver.transaction()           -> { execute, commit, rollback }  (interactive)
 *   await driver.exec(sqlText)           -> void               (multi-statement DDL)
 *   await driver.close()                 -> void
 *
 * Bindings: named object args use SQLite '@name' placeholders (parity with libSQL).
 * Positional args use an array with '?' placeholders.
 */

const path = require('path');
const fs = require('fs');

/** Normalise a better-sqlite3 statement result into the shared ResultSet shape. */
function toResultSet(stmt, args) {
  // A statement is a reader iff it returns data (SELECT / RETURNING).
  if (stmt.reader) {
    const rows = args === undefined ? stmt.all() : stmt.all(args);
    return { rows, rowsAffected: 0, lastInsertRowid: undefined };
  }
  const info = args === undefined ? stmt.run() : stmt.run(args);
  return {
    rows: [],
    rowsAffected: info.changes,
    lastInsertRowid: info.lastInsertRowid,
  };
}

class SqliteDriver {
  /** @param {import('better-sqlite3').Database} db an open connection */
  constructor(db) {
    this.db = db;
    this.dialect = 'sqlite';
  }

  /**
   * Open a SQLite database. ':memory:' for tests; a file path for local persistence.
   * @param {object} [opts] { filename }
   */
  static async open(opts) {
    const options = opts || {};
    // Lazy require: keeps the native module out of the deployed libSQL path.
    // eslint-disable-next-line global-require
    const Database = require('better-sqlite3');
    const target = options.filename
      || process.env.KG_DB_PATH
      || path.join(__dirname, '..', '..', '..', 'data', 'knowledge.db');
    if (target !== ':memory:' && !String(target).startsWith('file:')) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
    }
    const db = new Database(target === 'file::memory:' ? ':memory:' : target);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    return new SqliteDriver(db);
  }

  /** Run one parameterised statement. */
  async execute(statement) {
    const { sql, args } = normalise(statement);
    const stmt = this.db.prepare(sql);
    return toResultSet(stmt, args);
  }

  /** Atomic batch: all statements commit together or none do. */
  async batch(statements) {
    const run = this.db.transaction((list) => {
      const out = [];
      for (const s of list) {
        const { sql, args } = normalise(s);
        out.push(toResultSet(this.db.prepare(sql), args));
      }
      return out;
    });
    return run(statements);
  }

  /**
   * Interactive transaction. better-sqlite3 has no async tx object, so we emulate
   * one with explicit BEGIN/COMMIT/ROLLBACK. Safe because everything is synchronous.
   */
  async transaction() {
    this.db.exec('BEGIN');
    let open = true;
    const self = this;
    return {
      async execute(statement) {
        const { sql, args } = normalise(statement);
        return toResultSet(self.db.prepare(sql), args);
      },
      async commit() { if (open) { self.db.exec('COMMIT'); open = false; } },
      async rollback() { if (open) { self.db.exec('ROLLBACK'); open = false; } },
    };
  }

  /** Execute raw multi-statement SQL (used by the migration runner for DDL). */
  async exec(sqlText) {
    this.db.exec(sqlText);
  }

  async close() {
    try { this.db.close(); } catch (e) { /* already closed */ }
  }
}

/** Accept a plain SQL string or a { sql, args } object; normalise to { sql, args }. */
function normalise(statement) {
  if (typeof statement === 'string') return { sql: statement, args: undefined };
  if (statement && typeof statement === 'object' && statement.sql) {
    return { sql: statement.sql, args: statement.args };
  }
  throw new TypeError('SqliteDriver: statement must be a string or { sql, args }');
}

module.exports = SqliteDriver;
