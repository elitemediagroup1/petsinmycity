'use strict';

/**
* EPHEMERAL bootstrap (local development / CI / SQLite tests / explicit tooling).
*
* This is the ONLY bootstrap that reaches the packaged-YAML importer (which pulls
* in js-yaml and, on the sqlite path, the better-sqlite3 driver). It is NEVER
* imported by the deployed Netlify Function, so js-yaml, the importer, and the
* Austin research dataset stay out of the production Functions bundle graph.
*
* It builds an isolated in-memory SQLite store seeded from the packaged Austin
* pilot YAML, and mirrors the production bootstrap surface (build/getService/
* _reset) so local/test callers use one entry point. Explicit configs are still
* honoured (delegated to the same store factory) for parity.
*
* Dependency direction (decoupled): this module and the production bootstrap both
* depend on ./service-builder; neither bootstrap depends on the other.
*/

const path = require('path');
const KnowledgeStore = require('../KnowledgeStore');
const { resolveConfig } = require('../storage/create-store');
const { buildService } = require('./service-builder');
const { importDirectory } = require('../import/importDataset');

/** Default packaged dataset: the verified Austin pilot YAML (source of record). */
const DEFAULT_DATASET = path.resolve(__dirname, '../../../../research/austin/pilot/data');

let _cachedPromise = null;

/**
* Does the config/env explicitly select a backend? When nothing is explicitly
* configured we use an ephemeral in-memory sqlite fixture seeded from packaged
* YAML. Duplicated here intentionally so this module never depends on the
* production bootstrap.
*/
function isExplicitlyConfigured(explicit, env) {
  if (explicit) return true;
  return !!(env.KNOWLEDGE_DB_DRIVER || env.EMG_LOOP_API_BASE_URL || env.KNOWLEDGE_DB_FILE);
}

/**
* Build a delivery service. If no backend is explicitly configured, use an
* isolated in-memory SQLite store seeded from packaged YAML (the local/test
* default). Otherwise honour the explicit config.
* @param {object} [opts] { dataset, config, dbFile, now, diagnosticsSink, env }
* @returns {Promise<{ service, store, stats }>}
*/
async function build(opts) {
  const options = opts || {};
  const env = options.env || process.env;
  const explicit = options.config
  || (options.dbFile ? { driver: 'sqlite', filename: options.dbFile } : null);
  const ephemeral = !isExplicitlyConfigured(explicit, env);
  const cfg = ephemeral
  ? { driver: 'sqlite', filename: ':memory:' }
    : resolveConfig(explicit, env);
  const store = await KnowledgeStore.create(cfg, env);
  if (ephemeral) {
    const dataset = options.dataset || env.KNOWLEDGE_DATASET_DIR || DEFAULT_DATASET;
    await importDirectory(store, dataset);
  }
  return buildService(store, options);
}

function getService(opts) {
  if (_cachedPromise) return _cachedPromise;
  _cachedPromise = build(opts).catch((err) => {
    _cachedPromise = null;
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
