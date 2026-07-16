'use strict';
/**
 * KnowledgeStore — the storage abstraction layer for the Knowledge Graph.
 *
 * This is the single seam every service builds on. It exposes the four repositories
 * (entities, claims, relationships, sources) over one configured storage driver, and
 * hides the concrete backend. Per ADR-0026 the backend is swappable; per ADR-0027 the
 * store, repositories and transactions are ASYNC so a durable remote driver (libSQL /
 * Turso) can sit behind the same interface as local SQLite. Consumers never learn
 * which driver is active.
 *
 * Data access is: consumers -> delivery service -> KnowledgeStore repos -> driver.
 */
const { createDriver } = require('./storage/create-store');
const { runMigrations } = require('./storage/migrate');
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
  /** @param {object} driver an open, migrated storage driver */
  constructor(driver) {
    this.driver = driver;
    const repos = buildRepos(driver);
    this.sources = repos.sources;
    this.entities = repos.entities;
    this.claims = repos.claims;
    this.relationships = repos.relationships;
  }

  /**
   * Create and migrate a store from a storage configuration.
   * @param {object} [config] { driver, url, authToken, filename } (falls back to env)
   * @param {object} [env] optional env override (tests)
   * @returns {Promise<KnowledgeStore>}
   */
  static async create(config, env) {
    const driver = await createDriver(config, env);
    await runMigrations(driver);
    return new KnowledgeStore(driver);
  }

  /**
   * Backwards-compatible open(). Accepts a sqlite filename string (':memory:' or a
   * path) OR a full config object. Kept so existing local/test callers keep working.
   * @param {string|object} [fileOrConfig]
   * @returns {Promise<KnowledgeStore>}
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

  async close() { await this.driver.close(); }
}
module.exports = KnowledgeStore;
