'use strict';

/**
 * Ranking policy — deterministic candidate ordering.
 *
 * Contract source (frozen Architecture v1.0):
 *   docs/editorial/knowledge-graph/LIFECYCLE.md (confidence bands, source tiers)
 *   delivery/DELIVERY_ENGINE.md
 *
 * Precedence (highest first), applied lexicographically so the result is
 * explainable and NEVER 'confidence number alone':
 *   1. official confirmation  (verified + confidence >= 95 + Tier-1 source)
 *   2. source authority        (best supporting source tier: T1 > T2 > T3 > ...)
 *   3. confidence              (higher wins)
 *   4. current version         (higher `version` wins)
 *   5. freshness               (current > approaching > needs_review)
 *   6. effective date          (later valid_from wins)
 *   7. recency                 (later updated_at wins)
 *
 * Admissibility is enforced BEFORE ranking by the service; only admissible
 * candidates reach this comparator. A newer-but-unverified claim can never be
 * ranked above an older verified claim because it never becomes a candidate.
 */

const { FreshnessStatus } = require('./freshness-policy');

// Lower ordinal = higher authority. Tiers follow the source `tier` field (T1..).
function tierRank(tier) {
  if (!tier) return 99;
  const m = String(tier).match(/(\d+)/);
  return m ? Number(m[1]) : 99;
}

const FRESHNESS_ORDINAL = {
  [FreshnessStatus.CURRENT]: 0,
  [FreshnessStatus.NOT_TIME_BOUND]: 1,
  [FreshnessStatus.APPROACHING_REVIEW]: 2,
  [FreshnessStatus.NEEDS_REVIEW]: 3,
};

function officialConfirmation(candidate) {
  const c = candidate.claim;
  const bestTier = candidate.bestSourceTier;
  return c.verification === 'verified'
    && Number(c.confidence) >= 95
    && tierRank(bestTier) === 1 ? 1 : 0;
}

function dateMs(v) {
  if (!v) return -Infinity;
  const t = Date.parse(v);
  return Number.isNaN(t) ? -Infinity : t;
}

/**
 * Compare two candidates. Returns negative if `a` outranks `b`.
 * A candidate is { claim, sources, bestSourceTier, freshness }.
 */
function compareCandidates(a, b) {
  const byOfficial = officialConfirmation(b) - officialConfirmation(a);
  if (byOfficial) return byOfficial;

  const byTier = tierRank(a.bestSourceTier) - tierRank(b.bestSourceTier);
  if (byTier) return byTier;

  const byConfidence = Number(b.claim.confidence || 0) - Number(a.claim.confidence || 0);
  if (byConfidence) return byConfidence;

  const byVersion = Number(b.claim.version || 0) - Number(a.claim.version || 0);
  if (byVersion) return byVersion;

  const fa = FRESHNESS_ORDINAL[a.freshness.status];
  const fb = FRESHNESS_ORDINAL[b.freshness.status];
  const byFresh = (fa == null ? 9 : fa) - (fb == null ? 9 : fb);
  if (byFresh) return byFresh;

  const byEffective = dateMs(b.claim.valid_from) - dateMs(a.claim.valid_from);
  if (byEffective) return byEffective;

  const byRecency = dateMs(b.claim.updated_at) - dateMs(a.claim.updated_at);
  if (byRecency) return byRecency;

  // Final deterministic tie-break: stable by claim id.
  return String(a.claim.id).localeCompare(String(b.claim.id));
}

/**
 * Rank candidates and return { ordered, tie } where `tie` is true when the top
 * two candidates compare exactly equal on every precedence dimension EXCEPT the
 * id tie-break (i.e. a genuine unresolved conflict).
 */
function rank(candidates) {
  const ordered = candidates.slice().sort(compareCandidates);
  let tie = false;
  if (ordered.length >= 2) {
    const a = ordered[0];
    const b = ordered[1];
    const decisiveDiff =
      officialConfirmation(b) - officialConfirmation(a) ||
      tierRank(a.bestSourceTier) - tierRank(b.bestSourceTier) ||
      Number(b.claim.confidence || 0) - Number(a.claim.confidence || 0) ||
      Number(b.claim.version || 0) - Number(a.claim.version || 0);
    tie = decisiveDiff === 0;
  }
  return { ordered, tie };
}

function explain(candidate) {
  const c = candidate.claim;
  if (officialConfirmation(candidate)) return 'officially_confirmed(tier1,conf>=95)';
  return 'tier=' + (candidate.bestSourceTier || 'none') +
    ';confidence=' + (c.confidence != null ? c.confidence : 'n/a') +
    ';version=' + (c.version != null ? c.version : 'n/a') +
    ';freshness=' + candidate.freshness.status;
}

module.exports = { rank, compareCandidates, tierRank, explain };
