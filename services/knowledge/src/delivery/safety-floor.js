'use strict';

/**
 * Safety-floor enforcement — delivery-time protection for safety-critical facts.
 *
 * Contract source (frozen Architecture v1.0):
 *   docs/editorial/knowledge-graph/LIFECYCLE.md
 *   docs/editorial/knowledge-graph/MACHINE_SCHEMA.yaml (confidence_bands)
 *   delivery/FRESHNESS_ENGINE.md
 *
 * A safety-critical object (`safety_critical: true`) is held to a stricter bar:
 *   - verification MUST be `verified` (never disputed/needs_review/outdated),
 *   - confidence MUST meet the safety band (>= 90 per MACHINE_SCHEMA bands;
 *     75-89 is only allowed with editor sign-off, which delivery cannot assume),
 *   - a Tier-1 or Tier-2 source classification MUST be present,
 *   - freshness MUST be current (not expired, not needs_review).
 *
 * Personalization / consumer context can NEVER suppress a safety fact that would
 * otherwise pass. This module only ever REMOVES unsafe facts; it never adds or
 * relaxes. The delivery service exposes the resulting flag in the envelope.
 */

const { ReasonCode } = require('./errors');
const { FreshnessStatus } = require('./freshness-policy');

// Minimum confidence for auto-assembly of safety facts (MACHINE_SCHEMA band 90-100).
const SAFETY_MIN_CONFIDENCE = 90;
// Acceptable source tiers for safety facts.
const SAFETY_ACCEPTABLE_TIERS = new Set([1, 2]);

function tierNumber(tier) {
  if (!tier) return 99;
  const m = String(tier).match(/(\d+)/);
  return m ? Number(m[1]) : 99;
}

/**
 * @param {object} candidate { claim, sources, bestSourceTier, freshness }
 * @returns {{pass: boolean, reason: (string|null)}}
 */
function evaluateSafetyFloor(candidate) {
  const c = candidate.claim;
  if (!c.safety_critical) {
    return { pass: true, reason: null };
  }
  if (c.verification !== 'verified') {
    return { pass: false, reason: ReasonCode.SAFETY_FLOOR_VERIFICATION };
  }
  if (Number(c.confidence || 0) < SAFETY_MIN_CONFIDENCE) {
    return { pass: false, reason: ReasonCode.SAFETY_FLOOR_CONFIDENCE };
  }
  if (!SAFETY_ACCEPTABLE_TIERS.has(tierNumber(candidate.bestSourceTier))) {
    return { pass: false, reason: ReasonCode.SAFETY_FLOOR_SOURCE };
  }
  const fs = candidate.freshness.status;
  if (fs === FreshnessStatus.EXPIRED ||
      fs === FreshnessStatus.NEEDS_REVIEW ||
      fs === FreshnessStatus.NOT_YET_VALID) {
    return { pass: false, reason: ReasonCode.SAFETY_FLOOR_FRESHNESS };
  }
  return { pass: true, reason: null };
}

module.exports = {
  SAFETY_MIN_CONFIDENCE,
  SAFETY_ACCEPTABLE_TIERS,
  evaluateSafetyFloor,
};
