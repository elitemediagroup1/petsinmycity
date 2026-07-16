'use strict';

/**
 * Storage + delivery bootstrap for the Knowledge API (ADR-0027: async, durable-ready).
 *
 * Data access flows strictly:
 *   Netlify Function -> KnowledgeDeliveryService -> KnowledgeStore -> driver.
 *
 * The API never touches SQLite directly and never imports a vendor client as a
 * second data path. It builds a KnowledgeStore via the driver factory and wraps it
 * in the delivery service. The store is READ-ONLY at delivery time.
 *
 * Two operating modes (chosen by configuration, never inferred unsafely):
 *   - Local / test  (default): driver 'sqlite', an in-memory store (':memory:')
 *     loaded from the packaged Austin YAML. Ephemeral and rebuildable.
 *   - Durable       (KNOWLEDGE_DB_DRIVER=libsql, or an explicit config): a remote
 *     libSQL/Turso database. Data is already durable, so this path does NOT
 *     auto-import Austin (imports are an explicit admin step) and does NOT fall back
 *     to ephemeral storage.
 *
 * Fail-closed: if a durable driver is configured but its configuration is invalid
 * (missing url/token) initialization throws a safe error. Production never silently
 * falls back to an in-memory Austin fixture.
 *
 * Serverless reuse: getService() caches an initialization PROMISE at module scope so
 * concurrent cold-start invocations share one store rather than building several.
 */

const path = require('path');
const KnowledgeStore = require('../KnowledgeStore');
const { resolveConfig } = require('../storage/create-store');
const { importDirectory } = require('../import/importDataset');
const { KnowledgeDeliveryService } = require('../delivery');

/** Default packaged dataset: the verified Austin pilot YAML (source of record). */
const DEFAULT_DATASET = path.resolve(__dirname, '../../../../research/austin/pilot/data');

let _cachedPromise = null;

/**
 * Does the environment/config explicitly select a storage backend? When nothing is
 * explicitly configured we use an ephemeral in-memory sqlite fixture (local/test);
 * this is the ONLY mode that auto-seeds from packaged YAML.
 */
function isExplicitlyConfigured(explicit, env) {
  if (explicit) return true;
  return !!(env.KNOWLEDGE_DB_DRIVER || env.KNOWLEDGE_DB_URL || env.KNOWLEDGE_DB_FILE);
}

/**
 * Build a fresh delivery service backed by a configured store.
 * @param {object} [opts] { dataset, config, dbFile, now, diagnosticsSink, env }
 * @returns {Promise<{ service, store, stats }>}
 */
async function build(opts) {
  const options = opts || {};
  const env = options.env || process.env;

  const explicit = options.config
    || (options.dbFile ? { driver: 'sqlite', filename: options.dbFile } : null);

  const ephemeral = !isExplicitlyConfigured(explicit, env);

  // Ephemeral local/test default: an isolated in-memory sqlite store, seeded from
  // packaged YAML. Otherwise resolve the configured (possibly durable) backend.
  const cfg = ephemeral
    ? { driver: 'sqlite', filename: ':memory:' }
    : resolveConfig(explicit, env);

  const store = await KnowledgeStore.create(cfg, env);

  if (ephemeral) {
    const dataset = options.dataset || env.KNOWLEDGE_DATASET_DIR || DEFAULT_DATASET;
    await importDirectory(store, dataset);
  }

  const service = new KnowledgeDeliveryService(store, {
    now: options.now,
    diagnosticsSink: options.diagnosticsSink,
  });
  const stats = await store.stats();
  return { service, store, stats };
}

/**
 * Get a cached delivery service for serverless reuse. Initialization is cached as a
 * promise so repeated warm invocations reuse one store; a failed initialization
 * clears the cache so a later invocation can retry rather than caching a broken
 * state forever.
 * @param {object} [opts]
 * @returns {Promise<{ service, store, stats }>}
 */
function getService(opts) {
  if (_cachedPromise) return _cachedPromise;
  _cachedPromise = build(opts).catch((err) => {
    _cachedPromise = null; // allow retry on next invocation
    throw err;
  });
  return _cachedPromise;
}

/** Reset cached state (tests only). */
async function _reset() {
  const p = _cachedPromise;
  _cachedPromise = null;
  if (!p) return;
  try {
    const cached = await p;
    if (cached && cached.store) await cached.store.close();
  } catch (e) { /* ignore */ }
}

module.exports = { build, getService, _reset, DEFAULT_DATASET };
