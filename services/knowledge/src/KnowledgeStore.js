'use strict';
/**
 * KnowledgeStore — the storage abstraction layer for the Knowledge Graph.
 *
 * This is the single seam every future service builds on. It exposes the four
 * repositories (entities, claims, relationships, sources) over one open database,
 * and hides the concrete backend. Today the backend is SQLite; per ADR-0026 it can
 * be replaced (PostgreSQL / libSQL) without changing this interface or any consumer.
 *
 * This PR intentionally implements ONLY storage. No retrieval/delivery logic, no
 * rules, no Lucy, no recommendations — those consume this store in later PRs.
 */
const { openDatabase, migrate } = require('./db');
const EntityRepository = require('./repositories/EntityRepository');
const ClaimRepository = require('./repositories/ClaimRepository');
const RelationshipRepository = require('./repositories/RelationshipRepository');
const SourceRepository = require('./repositories/SourceRepository');

class KnowledgeStore {
  /** @param {import('better-sqlite3').Database} db an open, migrated database */
  constructor(db) {
    this.db = db;
    this.sources = new SourceRepository(db);
    this.entities = new EntityRepository(db);
    this.claims = new ClaimRepository(db);
    this.relationships = new RelationshipRepository(db);
  }

  /**
   * Open and migrate a store in one step.
   * @param {string} [file] sqlite path, or ':memory:' for tests
   * @returns {KnowledgeStore}
   */
  static open(file) {
    const db = openDatabase(file);
    migrate(db);
    return new KnowledgeStore(db);
  }

  /** Run a function inside a single transaction. */
  transaction(fn) {
    return this.db.transaction(fn)();
  }

  /** Aggregate counts — handy for load verification and health checks. */
  stats() {
    return {
      sources: this.sources.count(),
      entities: this.entities.count(),
      claims: this.claims.count(),
      edges: this.relationships.count(),
    };
  }

  close() { this.db.close(); }
}
module.exports = KnowledgeStore;
