'use strict';
/**
 * Knowledge Graph storage — public entry point.
 * Later services import from here: const { KnowledgeStore } = require('../../services/knowledge/src');
 */
const KnowledgeStore = require('./KnowledgeStore');
const EntityRepository = require('./repositories/EntityRepository');
const ClaimRepository = require('./repositories/ClaimRepository');
const RelationshipRepository = require('./repositories/RelationshipRepository');
const SourceRepository = require('./repositories/SourceRepository');
const { openDatabase, migrate } = require('./db');

module.exports = {
  KnowledgeStore,
  EntityRepository,
  ClaimRepository,
  RelationshipRepository,
  SourceRepository,
  openDatabase,
  migrate,
};
