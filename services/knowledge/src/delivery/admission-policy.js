'use strict';

/**
 * Admission policy — delivery-time verification gate.
 *
 * Contract source (frozen Architecture v1.0):
 *   docs/editorial/knowledge-graph/LIFECYCLE.md
 *   docs/editorial/knowledge-graph/MACHINE_SCHEMA.yaml
 *
 * Rule (LIFECYCLE.md): `verified` is the ONLY verification state that may render
 * on a public surface. Every other state is withheld from delivery-as-fact:
 *   unverified, researching, needs_verification  -> not yet a fact
 *   disputed                                      -> blocks ALL surfaces
 *   needs_review, outdated                        -> was verified, now withheld
 *   deprecated, archived, rejected, merged        -> not served
 *
 * Storage presence != delivery eligibility. This module makes that distinction
 * real in code. It never mutates or deletes the underlying record.
 */

const { ReasonCode } = require('./errors');

// The single admissible state. Kept as a Set for O(1) checks and to make the
// 'only verified renders' rule impossible to widen by accident.
const ADMISSIBLE_VERIFICATION = new Set(['verified']);

// States mapped to their suppression reason for diagnostics.
const SUPPRESSION_REASON = Object.freeze({
  unverified: ReasonCode.VERIFICATION_NOT_ADMISSIBLE,
  researching: ReasonCode.VERIFICATION_NOT_ADMISSIBLE,
  needs_verification: ReasonCode.VERIFICATION_NOT_ADMISSIBLE,
  disputed: ReasonCode.DISPUTED,
  needs_review: ReasonCode.NEEDS_REVIEW,
  outdated: ReasonCode.VERIFICATION_NOT_ADMISSIBLE,
  deprecated: ReasonCode.VERIFICATION_NOT_ADMISSIBLE,
  archived: ReasonCode.VERIFICATION_NOT_ADMISSIBLE,
  rejected: ReasonCode.VERIFICATION_NOT_ADMISSIBLE,
  merged: ReasonCode.VERIFICATION_NOT_ADMISSIBLE,
});

/**
 * @param {object} record  A hydrated claim or entity (must expose `verification`).
 * @returns {{admissible: boolean, reason: (string|null)}}
 */
function evaluateVerification(record) {
  const state = record && record.verification;
  if (ADMISSIBLE_VERIFICATION.has(state)) {
    return { admissible: true, reason: null };
  }
  return {
    admissible: false,
    reason: SUPPRESSION_REASON[state] || ReasonCode.VERIFICATION_NOT_ADMISSIBLE,
  };
}

function isAdmissibleVerification(state) {
  return ADMISSIBLE_VERIFICATION.has(state);
}

module.exports = {
  ADMISSIBLE_VERIFICATION,
  evaluateVerification,
  isAdmissibleVerification,
};
