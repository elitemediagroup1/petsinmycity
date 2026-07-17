'use strict';
/**
 * Driver / store factory + centralized storage configuration (ADR-0027, revised).
 *
 * This is the ONE place that:
 * - reads storage environment variables,
 * - validates configuration and fails closed,
 * - selects and constructs the concrete storage backend.
 *
 * No repository, service, API handler or Netlify function reads storage env vars
 * or constructs a backend directly. They receive a ready store.
 *
 * Two backends:
 *   'sqlite' (default)  local development + automated tests ONLY. A SQL driver
 *                       (better-sqlite3) behind the async repository interface.
 *   'loop'   (production) durable storage through EMG Loop. Loop is the system of
 *                       record and persists through Neon internally; PetsInMyCity
 *                       never touches Neon. Implemented as LoopKnowledgeStore over
 *                       an authenticated Loop HTTP client. NOT a SQL driver.
 *
 * Environment variables (final names, aligned to Loop's producer conventions):
 *   KNOWLEDGE_DB_DRIVER        'sqlite' (default) | 'loop'
 *   KNOWLEDGE_DB_FILE          sqlite file path (optional; 'sqlite' only)
 *   EMG_LOOP_API_BASE_URL      Loop base url,  e.g. https://app.emgloop.com  ('loop')
 *   EMG_LOOP_SERVICE_TOKEN     Loop service token (sent as x-emg-loop-secret) ('loop')
 *   EMG_LOOP_PLATFORM          producer slug (default 'petsinmycity')
 *   EMG_LOOP_ORGANIZATION_ID   tenant scope (optional until Loop requires it)
 *   EMG_LOOP_WORKSPACE_ID      tenant scope (optional)
 *   EMG_LOOP_PROPERTY_ID       property/product scope (default = platform)
 *   EMG_LOOP_TIMEOUT_MS        request timeout (optional)
 *
 * Fail-closed rules (production):
 * - An unknown driver value is rejected.
 * - 'loop' without a base url or service token is rejected.
 * - There is NO implicit fallback to SQLite / in-memory storage in production.
 *   Callers that want ephemeral storage must ask for it explicitly
 *   (driver 'sqlite', filename ':memory:').
 */

const DRIVERS = { sqlite: true, loop: true };

/** A configuration error that is safe to surface as a non-secret code. */
class StorageConfigError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StorageConfigError';
    this.code = code; // stable, non-secret code for logs (never includes values)
  }
}

/**
 * Resolve a validated storage configuration from an explicit object and/or env.
 * Explicit fields win over env. Never logs or returns secret values.
 * @param {object} [explicit] { driver, filename, baseUrl, serviceToken, ... }
 * @param {object} [env] defaults to process.env
 */
function resolveConfig(explicit, env) {
  const e = env || process.env;
  const cfg = explicit || {};
  const driver = String(cfg.driver || e.KNOWLEDGE_DB_DRIVER || 'sqlite').toLowerCase();

  if (!DRIVERS[driver]) {
    throw new StorageConfigError('unknown_driver',
      'unknown KNOWLEDGE_DB_DRIVER (expected sqlite or loop)');
  }

  if (driver === 'sqlite') {
    const filename = cfg.filename || e.KNOWLEDGE_DB_FILE || undefined;
    return { driver: 'sqlite', filename };
  }

  // loop (durable production)
  const baseUrl = cfg.baseUrl || e.EMG_LOOP_API_BASE_URL;
  const serviceToken = cfg.serviceToken || e.EMG_LOOP_SERVICE_TOKEN;
  if (!baseUrl) {
    throw new StorageConfigError('missing_base_url',
      'EMG_LOOP_API_BASE_URL is required when KNOWLEDGE_DB_DRIVER=loop');
  }
  if (!serviceToken) {
    // Do not reveal any value; only a stable internal code.
    throw new StorageConfigError('missing_service_token',
      'EMG_LOOP_SERVICE_TOKEN is required when KNOWLEDGE_DB_DRIVER=loop');
  }
  return {
    driver: 'loop',
    baseUrl,
    serviceToken,
    platform: cfg.platform || e.EMG_LOOP_PLATFORM || 'petsinmycity',
    organizationId: cfg.organizationId || e.EMG_LOOP_ORGANIZATION_ID || null,
    workspaceId: cfg.workspaceId || e.EMG_LOOP_WORKSPACE_ID || null,
    propertyId: cfg.propertyId || e.EMG_LOOP_PROPERTY_ID || null,
    timeoutMs: cfg.timeoutMs || (e.EMG_LOOP_TIMEOUT_MS ? Number(e.EMG_LOOP_TIMEOUT_MS) : undefined),
    fetchImpl: cfg.fetchImpl,
    client: cfg.client, // test injection
  };
}

/**
 * Construct an open SQLite SQL driver from a resolved sqlite config. This exists
 * for the sqlite path only (readiness/migration tooling). The loop backend has no
 * SQL driver; use createKnowledgeStore().
 * @returns {Promise<object>} an open driver implementing the async driver contract
 */
async function createDriver(explicit, env) {
  const cfg = resolveConfig(explicit, env);
  if (cfg.driver !== 'sqlite') {
    throw new StorageConfigError('no_sql_driver',
      'createDriver() is sqlite-only; the loop backend is not a SQL driver');
  }
  const SqliteDriver = require('./drivers/sqlite-driver');
  return SqliteDriver.open(cfg);
}

/**
 * Build a ready-to-use store from configuration. This is the top-level entry the
 * bootstrap and tooling use; it returns whichever store type the driver selects.
 * - sqlite: an SQL-backed KnowledgeStore (migrated).
 * - loop:   a LoopKnowledgeStore over the authenticated Loop client.
 * @returns {Promise<object>} a store implementing the KnowledgeStore surface
 */
async function createKnowledgeStore(explicit, env) {
  const cfg = resolveConfig(explicit, env);
  if (cfg.driver === 'loop') {
    const { LoopKnowledgeStore } = require('./loop/LoopKnowledgeStore');
    return new LoopKnowledgeStore(cfg);
  }
  // sqlite: build driver, migrate, wrap. Required lazily to avoid a cycle with
  // KnowledgeStore (which requires this module).
  const KnowledgeStore = require('../KnowledgeStore');
  const { runMigrations } = require('./migrate');
  const SqliteDriver = require('./drivers/sqlite-driver');
  const driver = await SqliteDriver.open(cfg);
  await runMigrations(driver);
  return new KnowledgeStore(driver);
}

module.exports = {
  createKnowledgeStore,
  createDriver,
  resolveConfig,
  StorageConfigError,
  DRIVER_NAMES: Object.keys(DRIVERS),
};
