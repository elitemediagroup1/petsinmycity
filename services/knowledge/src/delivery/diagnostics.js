'use strict';

/**
 * Lightweight structured diagnostics for delivery operations.
 *
 * Contract source (frozen Architecture v1.0): delivery/DELIVERY_ENGINE.md (explain),
 * delivery/EVENT_SYSTEM.md.
 *
 * Kept behind an interface so production logging (serverless, vendor, etc.) can
 * evolve later without touching call sites. Default sink is a no-op so tests and
 * libraries stay quiet; callers can inject a logger.
 *
 * NEVER log sensitive My Pets data. This layer only handles knowledge-delivery
 * envelope metadata (ids, states, timings) — no personal data flows here.
 */

let _counter = 0;

function newTraceId() {
  _counter = (_counter + 1) % 1e9;
  return 'kd-' + Date.now().toString(36) + '-' + _counter.toString(36);
}

const noopSink = { log() {} };

class Diagnostics {
  constructor(sink) {
    this.sink = sink || noopSink;
  }

  /**
   * Emit a single structured delivery record.
   * @param {object} rec {traceId, subject, predicate, outcome, selectedClaimId,
   *                      suppressionReason, freshness, durationMs, consumer}
   */
  emit(rec) {
    const safe = {
      traceId: rec.traceId || null,
      subject: rec.subject != null ? rec.subject : null,
      predicate: rec.predicate != null ? rec.predicate : null,
      outcome: rec.outcome != null ? rec.outcome : null,
      selectedClaimId: rec.selectedClaimId != null ? rec.selectedClaimId : null,
      suppressionReason: rec.suppressionReason != null ? rec.suppressionReason : null,
      freshness: rec.freshness != null ? rec.freshness : null,
      consumer: rec.consumer != null ? rec.consumer : null,
      durationMs: typeof rec.durationMs === 'number' ? rec.durationMs : null,
    };
    try { this.sink.log(safe); } catch (_e) { /* diagnostics must never throw */ }
    return safe;
  }
}

module.exports = { Diagnostics, newTraceId, noopSink };
