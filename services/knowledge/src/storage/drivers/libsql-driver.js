'use strict';
/**
 * libSQL / Turso storage driver (durable, remote, serverless-compatible).
 *
 * This is the durable production backend (ADR-0027). It uses the official
 * @libsql/client, which speaks the SQLite dialect over a remote connection, so the
 * existing schema, migrations and named '@param' bindings port without a rewrite.
 *
 * Modes (chosen by the connection url):
 *   'libsql://...'            durable remote Turso database (production)
 *   'file:/path/to.db'        local file (durable dev, and CI without secrets)
 *   ':memory:'                ephemeral (tests)
 *
 * Vendor isolation: @libsql/client is required ONLY here. Nothing above the driver
 * boundary imports it. Repositories talk to the shared async driver contract:
 *   await driver.execute({ sql, args }) -> { rows, rowsAffected, lastInsertRowid }
 *   await driver.batch(statements)      -> ResultSet[]  (atomic)
 *   await driver.transaction()          -> { execute, commit, rollback }
 *   await driver.exec(sqlText)          -> void
 *   await driver.close()                -> void
 *
 * The @libsql/client dependency is loaded lazily so that local/test runs that use
 * the SQLite driver do not require it to be installed.
 */

/** bigint -> Number so integer/boolean columns match better-sqlite3 semantics. */
function normaliseValue(v) {
  if (typeof v === 'bigint') {
    return (v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER))
      ? Number(v) : v.toString();
  }
  return v;
}

/** Turn a libSQL ResultSet row object into a plain object with normalised values. */
function normaliseRow(row) {
  const out = {};
  for (const key of Object.keys(row)) out[key] = normaliseValue(row[key]);
  return out;
}

function toResultSet(rs) {
  return {
    rows: (rs.rows || []).map(normaliseRow),
    rowsAffected: rs.rowsAffected || 0,
    lastInsertRowid: rs.lastInsertRowid != null ? normaliseValue(rs.lastInsertRowid) : undefined,
  };
}

/** Accept a plain SQL string or { sql, args }; libSQL takes both natively. */
function normalise(statement) {
  if (typeof statement === 'string') return { sql: statement };
  if (statement && typeof statement === 'object' && statement.sql) {
    return statement.args === undefined
      ? { sql: statement.sql }
      : { sql: statement.sql, args: statement.args };
  }
  throw new TypeError('LibsqlDriver: statement must be a string or { sql, args }');
}

class LibsqlDriver {
  /** @param {import('@libsql/client').Client} client */
  constructor(client) {
    this.client = client;
    this.dialect = 'libsql';
  }

  /**
   * Open a libSQL client. Requires a url; a remote 'libsql://' url also needs an
   * authToken. Local 'file:'/':memory:' urls need no token.
   * @param {object} opts { url, authToken }
   */
  static async open(opts) {
    const options = opts || {};
    if (!options.url) {
      throw new Error('LibsqlDriver.open: a connection url is required');
    }
    const isRemote = /^libsql:\/\//.test(options.url) || /^https?:\/\//.test(options.url);
    if (isRemote && !options.authToken) {
      throw new Error('LibsqlDriver.open: authToken is required for remote libsql urls');
    }
    // Lazy require keeps @libsql/client out of the SQLite-only local/test path.
    // eslint-disable-next-line global-require
    const { createClient } = require('@libsql/client');
    const config = { url: options.url };
    if (options.authToken) config.authToken = options.authToken;
    const client = createClient(config);
    return new LibsqlDriver(client);
  }

  async execute(statement) {
    const rs = await this.client.execute(normalise(statement));
    return toResultSet(rs);
  }

  /** Atomic batch (implicit write transaction: all commit or all roll back). */
  async batch(statements) {
    const stmts = statements.map(normalise);
    const results = await this.client.batch(stmts, 'write');
    return results.map(toResultSet);
  }

  /** Interactive transaction backed by libSQL's transaction('write'). */
  async transaction() {
    const tx = await this.client.transaction('write');
    return {
      async execute(statement) {
        const rs = await tx.execute(normalise(statement));
        return toResultSet(rs);
      },
      async commit() { await tx.commit(); },
      async rollback() { await tx.rollback(); },
    };
  }

  /**
   * Execute raw multi-statement SQL (DDL for migrations). libSQL exposes this via
   * executeMultiple when available; otherwise split on ';' as a safe fallback.
   */
  async exec(sqlText) {
    if (typeof this.client.executeMultiple === 'function') {
      await this.client.executeMultiple(sqlText);
      return;
    }
    const parts = sqlText.split(';').map((s) => s.trim()).filter(Boolean);
    for (const sql of parts) {
      // eslint-disable-next-line no-await-in-loop
      await this.client.execute(sql);
    }
  }

  async close() {
    try { await this.client.close(); } catch (e) { /* already closed */ }
  }
}

module.exports = LibsqlDriver;
