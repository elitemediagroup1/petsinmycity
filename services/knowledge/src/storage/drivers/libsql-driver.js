'use strict';
/**
 * REMOVED — libSQL / Turso production driver (ADR-0027, revised).
 *
 * PetsInMyCity no longer owns a durable remote database. EMG Loop is the production
 * system of record (Loop persists through Neon). Durable production storage is now
 * LoopKnowledgeStore (services/knowledge/src/storage/loop/), reached through the
 * authenticated Loop service contract — NOT a SQL driver.
 *
 * This module is intentionally left as a hard-failing stub so that any stale import
 * fails loudly in tests rather than silently resurrecting the removed Turso path.
 * There is no @libsql/client dependency in the deployed path.
 *
 * See docs/implementation/DECISIONS.md (ADR-0027) and docs/implementation/STORAGE.md.
 */

module.exports = {
  open() {
    throw new Error(
      'libsql-driver has been removed: production storage is EMG Loop via ' +
      'LoopKnowledgeStore (KNOWLEDGE_DB_DRIVER=loop). See ADR-0027.',
    );
  },
};
