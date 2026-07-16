'use strict';
/**
 * Knowledge Graph storage — public entry point.
 * Later services import from here: const { KnowledgeStore } = require('../../services/knowledge/src');
 *
 * ADR-0027: the store is async and backend-agnostic. Storage configuration and
 * driver construction live in ./storage; migrations in ./storage/migrate.
 */
const KnowledgeStore = require('./KnowledgeStore');
const EntityRepository = require('./repositories/EntityRepository');
const ClaimRepository = require('./repositories/ClaimRepository');
const RelationshipRepository = require('./repositories/RelationshipRepository');
const SourceRepository = require('./repositories/SourceRepository');
const { createDriver, resolveConfig, StorageConfigError } = require('./storage/create-store');
const { runMigrations, schemaStatus } = require('./storage/migrate');

module.exports = {
  KnowledgeStore,
  EntityRepository,
  ClaimRepository,
  RelationshipRepository,
  SourceRepository,
  createDriver,
  resolveConfig,
  StorageConfigError,
  runMigrations,
  schemaStatus,
};
