'use strict';
/**
 * KnowledgeStore — the SQL-backed storage abstraction for the Knowledge Graph.
 *
 * This is the local/test store: it exposes the four repositories (entities, claims,
 * relationships, sources) over one configured SQL driver (SQLite), hides the
 * concrete backend, and provides an async transaction(). Per ADR-0027 the store,
 * repositories and transactions are ASYNC.
 *
 * PRODUCTION NOTE (ADR-0027, revised): production durable storage is NOT this
 * class. It is LoopKnowledgeStore, which speaks to EMG Loop (the system of record;
 * Loop persists through Neon). Both stores implement the same public surface so the
 * delivery service and importer are identical across them. The driver factory
 * (createKnowledgeStore) decides which one is built. SQLite is retained ONLY for
 * isolated local development and automated tests.
 *
 * Data access is: consumers -> delivery service -> store repos -> driver / Loop.
 */
const EntityRepository = require('./repositories/EntityRepository');
const ClaimRepository = require('./repositories/ClaimRepository');
const RelationshipRepository = require('./repositories/RelationshipRepository');
const SourceRepository = require('./repositories/SourceRepository');

/** Build the four repositories bound to a single executor (driver or transaction). */
function buildRepos(executor) {
  return {
    sources: new SourceRepository(executor),
    entities: new EntityRepository(executor),
    claims: new ClaimRepository(executor),
    relationships: new RelationshipRepository(executor),
  };
}

class KnowledgeStore {
  /** @param {object} driver an open, migrated SQL storage driver */
  constructor(driver) {
    this.driver = driver;
    const repos = buildRepos(driver);
    this.sources = repos.sources;
    this.entities = repos.entities;
    this.claims = repos.claims;
    this.relationships = repos.relationships;
  }

  /**
   * Create a store from a storage configuration. Delegates to the driver factory,
   * so a 'loop' configuration returns a LoopKnowledgeStore and a 'sqlite'
   * configuration returns a migrated SQL-backed KnowledgeStore. Callers above the
   * store boundary never learn which backend is active.
   * @param {object} [config] { driver, filename, baseUrl, serviceToken, ... }
   * @param {object} [env] optional env override (tests)
   * @returns {Promise<object>} a store implementing the KnowledgeStore surface
   */
  static async create(config, env) {
    // Lazy require avoids a module cycle (create-store requires this file).
    const { createKnowledgeStore } = require('./storage/create-store');
    return createKnowledgeStore(config, env);
  }

  /**
   * Backwards-compatible open(). Accepts a sqlite filename string (':memory:' or a
   * path) OR a full config object. Kept so existing local/test callers keep working.
   * @param {string|object} [fileOrConfig]
   * @returns {Promise<object>}
   */
  static async open(fileOrConfig) {
    if (fileOrConfig == null) return KnowledgeStore.create();
    if (typeof fileOrConfig === 'string') {
      return KnowledgeStore.create({ driver: 'sqlite', filename: fileOrConfig });
    }
    return KnowledgeStore.create(fileOrConfig);
  }

  /**
   * Run a function inside a single transaction. The callback receives a
   * transaction-scoped store exposing the same repositories, bound to the tx.
   * Commits on success, rolls back on any thrown error.
   * @param {(tx: {sources,entities,claims,relationships}) => Promise<any>} fn
   */
  async transaction(fn) {
    const tx = await this.driver.transaction();
    const scoped = buildRepos(tx);
    try {
      const result = await fn(scoped);
      await tx.commit();
      return result;
    } catch (err) {
      try { await tx.rollback(); } catch (e) { /* rollback best-effort */ }
      throw err;
    }
  }

  /** Aggregate counts — handy for load verification and health checks. */
  async stats() {
    const [sources, entities, claims, edges] = await Promise.all([
      this.sources.count(),
      this.entities.count(),
      this.claims.count(),
      this.relationships.count(),
    ]);
    return { sources, entities, claims, edges };
  }

  /**
   * Readiness for the SQL store: schema migrations applied. (LoopKnowledgeStore has
   * its own readiness() that checks Loop reachability + contract version.)
   */
  async readiness() {
    const { schemaStatus } = require('./storage/migrate');
    const status = await schemaStatus(this.driver);
    return { reachable: true, migrated: status.ready, contractVersion: 'sqlite', expected: 'sqlite' };
  }

  async close() { await this.driver.close(); }
}
module.exports = KnowledgeStore;
