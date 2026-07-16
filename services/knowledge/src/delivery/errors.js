'use strict';

/**
 * Typed error and result-state constants for the Knowledge Delivery read layer.
 *
 * Consumers MUST branch on `result.state` (or `error.code`) rather than parsing
 * human-readable message strings. Every predictable outcome has a stable code.
 */

/** Terminal result states returned by the delivery service. */
const ResultState = Object.freeze({
  RESOLVED: 'resolved',        // exactly one admissible claim selected
  CONFLICT: 'conflict',        // >1 credible admissible claims, precedence unclear
  NOT_FOUND: 'not_found',      // no stored record matches subject+predicate
  INADMISSIBLE: 'inadmissible',// records exist but none clears the delivery gate
  EXPIRED: 'expired',          // best candidate is a dynamic fact past valid_until
});

/** Machine-readable reason codes attached to suppression / ranking decisions. */
const ReasonCode = Object.freeze({
  VERIFICATION_NOT_ADMISSIBLE: 'verification_not_admissible',
  DISPUTED: 'disputed',
  EXPIRED_DYNAMIC: 'expired_dynamic',
  NOT_YET_VALID: 'not_yet_valid',
  NEEDS_REVIEW: 'needs_review',
  MISSING_PROVENANCE: 'missing_provenance',
  SAFETY_FLOOR_CONFIDENCE: 'safety_floor_confidence',
  SAFETY_FLOOR_SOURCE: 'safety_floor_source',
  SAFETY_FLOOR_FRESHNESS: 'safety_floor_freshness',
  SAFETY_FLOOR_VERIFICATION: 'safety_floor_verification',
  LOWER_PRECEDENCE: 'lower_precedence',
  ADMITTED: 'admitted',
});

class DeliveryError extends Error {
  constructor(code, message, details) {
    super(message || code);
    this.name = 'DeliveryError';
    this.code = code;
    this.details = details || null;
  }
}

/** Error codes for non-result failures (bad input, backend failure). */
const ErrorCode = Object.freeze({
  INVALID_REQUEST: 'invalid_request',
  STORAGE_FAILURE: 'storage_failure',
});

class InvalidRequestError extends DeliveryError {
  constructor(message, details) { super(ErrorCode.INVALID_REQUEST, message, details); this.name = 'InvalidRequestError'; }
}

class StorageFailureError extends DeliveryError {
  constructor(message, details) { super(ErrorCode.STORAGE_FAILURE, message, details); this.name = 'StorageFailureError'; }
}

module.exports = {
  ResultState,
  ReasonCode,
  ErrorCode,
  DeliveryError,
  InvalidRequestError,
  StorageFailureError,
};
