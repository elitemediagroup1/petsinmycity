'use strict';

/**
 * Storage + delivery bootstrap for the Knowledge API.
 *
 * Data access flows strictly:
 *   Netlify Function -> KnowledgeDeliveryService -> KnowledgeStore -> driver.
 *
 * The API never touches SQLite directly and never imports better-sqlite3 as a
 * second data path. It builds a KnowledgeStore, populates it from the verified
 * Austin YAML via the existing importer, and wraps it in the delivery service.
 *
 * Serverless reuse: the built service is cached in module scope so warm invocations
 * reuse a single in-memory store rather than rebuilding it per request. The store is
 * treated as READ-ONLY at delivery time (the delivery layer performs no writes).
 *
 * Deployment reality (see api/README): a locally created SQLite file is NOT durable
 * writable production storage on Netlify's ephemeral filesystem. This bootstrap
 * therefore builds a read-only in-memory fixture from packaged YAML, which is a
 * correct internal proof of the API boundary and is storage-driver independent.
 */

const path = require('path');
const KnowledgeStore = require('../KnowledgeStore');
const { importDirectory } = require('../import/importDataset');
const { KnowledgeDeliveryService } = require('../delivery');

/** Default packaged dataset: the verified Austin pilot YAML (source of record). */
const DEFAULT_DATASET = path.resolve(__dirname, '../../../../research/austin/pilot/data');

let _cached = null;
let _initError = null;

/**
 * Build a fresh delivery service backed by an in-memory store loaded from a dataset.
 * @param {object} [opts] { dataset, dbFile, now, diagnosticsSink }
 * @returns {{ service, store, stats }}
 */
function build(opts) {
  const options = opts || {};
  const dataset = options.dataset || process.env.KNOWLEDGE_DATASET_DIR || DEFAULT_DATASET;
  const dbFile = options.dbFile || ':memory:';
  const store = KnowledgeStore.open(dbFile);
  importDirectory(store, dataset);
  const service = new KnowledgeDeliveryService(store, {
    now: options.now,
    diagnosticsSink: options.diagnosticsSink,
  });
  return { service, store, stats: store.stats() };
}

/**
 * Get a cached delivery service for serverless reuse. Initialization failure is
 * cached as an error so repeated warm invocations fail fast and safely.
 * @returns {{ service }}
 */
function getService() {
  if (_cached) return _cached;
  if (_initError) throw _initError;
  try {
    _cached = build();
    return _cached;
  } catch (err) {
    _initError = err;
    throw err;
  }
}

/** Reset cached state (tests only). */
function _reset() {
  if (_cached && _cached.store) {
    try { _cached.store.close(); } catch (e) { /* ignore */ }
  }
  _cached = null;
  _initError = null;
}

module.exports = { build, getService, _reset, DEFAULT_DATASET };
