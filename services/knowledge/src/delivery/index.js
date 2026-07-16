'use strict';

/**
 * Public surface of the Knowledge Delivery read layer.
 *
 * The delivery layer is the only supported read path. Consumers import from here;
 * they never import repositories or the storage driver directly.
 */

const { KnowledgeDeliveryService, KNOWN_CONSUMERS } = require('./knowledge-delivery-service');
const errors = require('./errors');
const admission = require('./admission-policy');
const freshness = require('./freshness-policy');
const ranking = require('./ranking-policy');
const safety = require('./safety-floor');
const provenance = require('./provenance');
const envelope = require('./envelope');
const diagnostics = require('./diagnostics');

module.exports = {
  KnowledgeDeliveryService,
  KNOWN_CONSUMERS,
  ResultState: errors.ResultState,
  ReasonCode: errors.ReasonCode,
  ErrorCode: errors.ErrorCode,
  DeliveryError: errors.DeliveryError,
  InvalidRequestError: errors.InvalidRequestError,
  StorageFailureError: errors.StorageFailureError,
  FreshnessStatus: freshness.FreshnessStatus,
  CONTRACT_VERSION: envelope.CONTRACT_VERSION,
  SCHEMA_VERSION: envelope.SCHEMA_VERSION,
  // Policies exposed for targeted unit testing / future reuse.
  policies: { admission, freshness, ranking, safety, provenance, envelope, diagnostics },
};
