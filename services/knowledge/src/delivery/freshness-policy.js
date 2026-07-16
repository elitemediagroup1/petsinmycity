'use strict';

/**
 * Freshness policy — delivery-time currency evaluation.
 *
 * Contract source (frozen Architecture v1.0):
 *   delivery/FRESHNESS_ENGINE.md
 *   docs/editorial/knowledge-graph/LIFECYCLE.md
 *
 * Classes (FRESHNESS_ENGINE.md):
 *   dynamic   -> has a hard `valid_until` / `expires`; MUST NOT be served past it.
 *   evergreen -> no hard expiry; governed by a review cadence (`next_review`).
 *
 * This module does not invent review cadences. It reads the dates stored on the
 * object (valid_from, valid_until/expires, review_by/next_review). It never
 * mutates the record; an expired object simply fails the freshness gate.
 */

const FreshnessStatus = Object.freeze({
  CURRENT: 'current',
  APPROACHING_REVIEW: 'approaching_review',
  NEEDS_REVIEW: 'needs_review',
  EXPIRED: 'expired',
  NOT_YET_VALID: 'not_yet_valid',
  NOT_TIME_BOUND: 'not_time_bound',
  UNKNOWN: 'unknown',
});

// Days before next_review at which we flag 'approaching_review'.
const APPROACHING_REVIEW_WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/**
 * Evaluate freshness of a claim/entity as of a reference instant.
 *
 * @param {object} record  hydrated claim/entity; reads valid_from, valid_until,
 *                         expires, review_by, next_review (whichever are present).
 * @param {number} nowMs   reference time (ms epoch). Defaults to Date.now().
 * @returns {{status:string, deliverable:boolean, expiresAt:(string|null),
 *           validFrom:(string|null), reviewBy:(string|null), isDynamic:boolean}}
 */
function evaluateFreshness(record, nowMs) {
  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  const validFromRaw = record.valid_from != null ? record.valid_from : null;
  const validUntilRaw = record.valid_until != null ? record.valid_until
    : (record.expires != null ? record.expires : null);
  const reviewByRaw = record.review_by != null ? record.review_by
    : (record.next_review != null ? record.next_review : null);

  const validFrom = parseDate(validFromRaw);
  const validUntil = parseDate(validUntilRaw);
  const reviewBy = parseDate(reviewByRaw);
  const isDynamic = validUntil !== null;

  const base = {
    expiresAt: validUntil !== null ? validUntilRaw : null,
    validFrom: validFrom !== null ? validFromRaw : null,
    reviewBy: reviewBy !== null ? reviewByRaw : null,
    isDynamic,
  };

  // Not yet valid: a future valid_from means it must not be delivered yet.
  if (validFrom !== null && now < validFrom) {
    return Object.assign({ status: FreshnessStatus.NOT_YET_VALID, deliverable: false }, base);
  }

  // Dynamic hard expiry: never serve an expired dynamic fact.
  if (validUntil !== null && now > validUntil) {
    return Object.assign({ status: FreshnessStatus.EXPIRED, deliverable: false }, base);
  }

  // Evergreen review cadence: past review => needs_review (visible but flagged).
  if (reviewBy !== null) {
    if (now > reviewBy) {
      return Object.assign({ status: FreshnessStatus.NEEDS_REVIEW, deliverable: true }, base);
    }
    if (reviewBy - now <= APPROACHING_REVIEW_WINDOW_DAYS * MS_PER_DAY) {
      return Object.assign({ status: FreshnessStatus.APPROACHING_REVIEW, deliverable: true }, base);
    }
    return Object.assign({ status: FreshnessStatus.CURRENT, deliverable: true }, base);
  }

  // A dynamic fact with a valid (non-expired) window is current.
  if (validUntil !== null) {
    return Object.assign({ status: FreshnessStatus.CURRENT, deliverable: true }, base);
  }

  // No time bounds at all: evergreen without a stored cadence.
  return Object.assign({ status: FreshnessStatus.NOT_TIME_BOUND, deliverable: true }, base);
}

module.exports = {
  FreshnessStatus,
  APPROACHING_REVIEW_WINDOW_DAYS,
  evaluateFreshness,
};
