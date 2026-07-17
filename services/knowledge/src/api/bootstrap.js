'use strict';

/**
* PRODUCTION storage + delivery bootstrap for the Knowledge API
* (ADR-0027, revised: async, Loop-backed durable production).
*
* This module is the ONLY bootstrap that the deployed Netlify Function
* (netlify/functions/knowledge.js) is allowed to import. It builds a durable,
* explicitly-configured store (production: EMG Loop) and wraps it in the delivery
* service via the neutral service-builder. It has NO static path to the YAML
* importer, to js-yaml, or to the packaged Austin research dataset, so none of
* those can enter the production Functions bundle graph.
*
* Ephemeral local/test seeding (in-memory SQLite loaded from packaged YAML) lives
* in a SEPARATE module (./bootstrap-ephemeral) that is never referenced here.
*
* Data access flows strictly:
* Netlify Function -> KnowledgeDeliveryService -> KnowledgeStore -> Loop.
*
* Fail-closed: build() requires an explicit storage configuration (via opts or
* env). It NEVER auto-seeds and NEVER falls back to an in-memory Austin fixture.
* Callers that want the ephemeral seeded fixture must use ./bootstrap-ephemeral.
*
* Serverless reuse: getService() caches an initialization PROMISE at module scope
* so concurrent cold-start invocations share one store.
*/

const KnowledgeStore = require('../KnowledgeStore');
const { resolveConfig } = require('../storage/create-store');
const { buildService } = require('./service-builder');

let _cachedPromise = null;

/**
* Is a storage backend explicitly selected (by opts or env)? Production always is
* (KNOWLEDGE_DB_DRIVER=loop + Loop credentials). When nothing is explicitly
* configured, production refuses to guess: the ephemeral seeded fixture is a
* deliberate, separate entry point (./bootstrap-ephemeral).
*/
function isExplicitlyConfigured(explicit, env) {
  if (explicit) return true;
  return !!(env.KNOWLEDGE_DB_DRIVER || env.EMG_LOOP_API_BASE_URL || env.KNOWLEDGE_DB_FILE);
}

/**
* Build a fresh delivery service backed by an explicitly-configured durable store.
* Fails closed if no explicit configuration is present (production never seeds).
* @param {object} [opts] { config, dbFile, now, diagnosticsSink, env }
* @returns {Promise<{ service, store, stats }>}
*/
async function build(opts) {
  const options = opts || {};
  const env = options.env || process.env;
  const explicit = options.config
  || (options.dbFile ? { driver: 'sqlite', filename: options.dbFile } : null);
  if (!isExplicitlyConfigured(explicit, env)) {
    throw new Error('knowledge bootstrap: no storage backend configured. Set KNOWLEDGE_DB_DRIVER (production: "loop" with EMG Loop credentials), or use bootstrap-ephemeral for the local/test in-memory Austin fixture.');
  }
  const cfg = resolveConfig(explicit, env);
  const store = await KnowledgeStore.create(cfg, env);
  return buildService(store, options);
}

/**
* Cached delivery service for serverless reuse. A failed initialization clears the
* cache so a later invocation can retry rather than caching a broken state.
* @param {object} [opts]
* @returns {Promise<{ service, store, stats }>}
*/
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

module.exports = { build, getService, _reset };
