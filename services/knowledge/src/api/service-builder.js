'use strict';

/**
* Neutral delivery-service assembly (ADR-0027).
*
* This module is STORAGE-AGNOSTIC. It takes an already-created store (SQLite-backed
* KnowledgeStore or LoopKnowledgeStore) and wraps it in the delivery service, then
* reports stats. It performs NO driver selection, has NO importer reference, NO
* SQLite reference, NO Loop-specific configuration and NO serverless cache.
*
* Both bootstraps depend on this module; neither bootstrap depends on the other.
*/

const { KnowledgeDeliveryService } = require('../delivery');

async function buildService(store, options) {
  const opts = options || {};
  const service = new KnowledgeDeliveryService(store, {
    now: opts.now,
    diagnosticsSink: opts.diagnosticsSink,
  });
  const stats = await store.stats();
  return { service, store, stats };
}

module.exports = { buildService };
