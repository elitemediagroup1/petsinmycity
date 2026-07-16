'use strict';
/**
 * Driver factory + centralized storage configuration (ADR-0027).
 *
 * This is the ONE place that:
 *   - reads storage environment variables,
 *   - validates configuration and fails closed,
 *   - selects and constructs the concrete storage driver.
 *
 * No repository, service, API handler or Netlify function reads storage env vars
 * or imports a vendor client directly. They receive a ready driver / store.
 *
 * Environment variables (final names):
 *   KNOWLEDGE_DB_DRIVER      'sqlite' (default, local/test) | 'libsql' (durable)
 *   KNOWLEDGE_DB_URL         libsql/file url            (required for 'libsql')
 *   KNOWLEDGE_DB_AUTH_TOKEN  Turso auth token           (required for remote 'libsql://')
 *   KNOWLEDGE_DB_FILE        sqlite file path           (optional; 'sqlite' only)
 *
 * Fail-closed rules:
 *   - An unknown driver value is rejected.
 *   - 'libsql' without a url is rejected.
 *   - a remote 'libsql://' url without an auth token is rejected.
 *   - There is NO implicit fallback to an in-memory or temporary database in
 *     production. Callers that want ephemeral storage must ask for it explicitly
 *     (driver 'sqlite', filename ':memory:').
 */

const SqliteDriver = require('./drivers/sqlite-driver');
const LibsqlDriver = require('./drivers/libsql-driver');

const DRIVERS = { sqlite: SqliteDriver, libsql: LibsqlDriver };

/** A configuration error that is safe to surface as a non-secret code. */
class StorageConfigError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StorageConfigError';
    this.code = code; // stable, non-secret code for logs (never includes values)
  }
}

/** True for a remote libSQL/HTTP url (needs an auth token). */
function isRemoteUrl(url) {
  return /^libsql:\/\//.test(url) || /^https?:\/\//.test(url) || /^wss?:\/\//.test(url);
}

/**
 * Resolve a validated storage configuration from an explicit object and/or env.
 * Explicit fields win over env. Never logs or returns secret values.
 * @param {object} [explicit] { driver, url, authToken, filename }
 * @param {object} [env] defaults to process.env
 * @returns {{ driver, url?, authToken?, filename? }}
 */
function resolveConfig(explicit, env) {
  const e = env || process.env;
  const cfg = explicit || {};
  const driver = String(cfg.driver || e.KNOWLEDGE_DB_DRIVER || 'sqlite').toLowerCase();

  if (!DRIVERS[driver]) {
    throw new StorageConfigError('unknown_driver',
      'unknown KNOWLEDGE_DB_DRIVER (expected sqlite or libsql)');
  }

  if (driver === 'sqlite') {
    const filename = cfg.filename || e.KNOWLEDGE_DB_FILE || undefined;
    return { driver: 'sqlite', filename };
  }

  // libsql
  const url = cfg.url || e.KNOWLEDGE_DB_URL;
  const authToken = cfg.authToken || e.KNOWLEDGE_DB_AUTH_TOKEN;
  if (!url) {
    throw new StorageConfigError('missing_url',
      'KNOWLEDGE_DB_URL is required when KNOWLEDGE_DB_DRIVER=libsql');
  }
  if (isRemoteUrl(url) && !authToken) {
    // Do not reveal which credential is missing beyond a stable internal code.
    throw new StorageConfigError('missing_auth_token',
      'KNOWLEDGE_DB_AUTH_TOKEN is required for a remote libsql url');
  }
  return { driver: 'libsql', url, authToken };
}

/**
 * Construct a concrete storage driver from a resolved (or resolvable) config.
 * @returns {Promise<object>} an open driver implementing the async driver contract
 */
async function createDriver(explicit, env) {
  const cfg = resolveConfig(explicit, env);
  const Driver = DRIVERS[cfg.driver];
  return Driver.open(cfg);
}

module.exports = { createDriver, resolveConfig, StorageConfigError, isRemoteUrl, DRIVER_NAMES: Object.keys(DRIVERS) };
