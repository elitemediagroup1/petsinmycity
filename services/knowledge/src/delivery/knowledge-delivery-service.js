'use strict';

/**
 * KnowledgeDeliveryService — the ONLY supported read path between stored
 * knowledge and future consumers (Lucy, articles, search, maps, recommendations,
 * My Pets, future APIs).
 *
 * Contract sources (frozen Architecture v1.0):
 *   delivery/KNOWLEDGE_DELIVERY_PLATFORM.md, delivery/DELIVERY_ENGINE.md,
 *   delivery/FRESHNESS_ENGINE.md, docs/editorial/knowledge-graph/LIFECYCLE.md,
 *   docs/editorial/knowledge-graph/MACHINE_SCHEMA.yaml.
 *
 * Storage boundary (PR #9): ALL reads go through the KnowledgeStore repository
 * interfaces (store.claims / store.entities / store.relationships / store.sources).
 * This service never touches SQLite, never imports better-sqlite3, never returns
 * raw rows, and never introduces a second persistence path. That keeps the
 * future PostgreSQL / libSQL migration a storage-only change.
 *
 * Pipeline for getKnowledge():
 *   validate -> resolve subject -> retrieve candidate claims -> admission gate
 *   (verification) -> freshness gate -> provenance gate -> safety floor -> rank
 *   -> conflict detection -> envelope | typed result.
 */

const {
  ResultState, ReasonCode, InvalidRequestError, StorageFailureError,
} = require('./errors');
const { evaluateVerification } = require('./admission-policy');
const { evaluateFreshness, FreshnessStatus } = require('./freshness-policy');
const { rank, explain } = require('./ranking-policy');
const { evaluateSafetyFloor } = require('./safety-floor');
const { assembleProvenance } = require('./provenance');
const { buildEnvelope } = require('./envelope');
const { Diagnostics, newTraceId } = require('./diagnostics');

// Consumers are enumerated so an unknown identifier is a validation error, but
// no consumer-specific business logic exists yet (KDP: same fact across consumers).
const KNOWN_CONSUMERS = new Set([
  'internal', 'lucy', 'article', 'search', 'map', 'recommendations', 'my_pets',
]);

class KnowledgeDeliveryService {
  /**
   * @param {KnowledgeStore} store  the PR #9 storage abstraction.
   * @param {object} [opts] { diagnosticsSink, now }
   */
  constructor(store, opts) {
    if (!store || !store.claims || !store.sources) {
      throw new InvalidRequestError('KnowledgeDeliveryService requires a KnowledgeStore');
    }
    this.store = store;
    this.opts = opts || {};
    this.diagnostics = new Diagnostics(this.opts.diagnosticsSink);
  }

  _now(request) {
    if (request && request.asOf != null) {
      const t = Date.parse(request.asOf);
      if (Number.isNaN(t)) throw new InvalidRequestError('asOf is not a valid ISO-8601 timestamp', { asOf: request.asOf });
      return t;
    }
    if (typeof this.opts.now === 'number') return this.opts.now;
    return Date.now();
  }

  _validate(request) {
    if (!request || typeof request !== 'object') {
      throw new InvalidRequestError('request must be an object');
    }
    if (!request.subjectId || typeof request.subjectId !== 'string') {
      throw new InvalidRequestError('subjectId is required and must be a string');
    }
    if (!request.predicate || typeof request.predicate !== 'string') {
      throw new InvalidRequestError('predicate is required and must be a string');
    }
    if (request.consumer != null && !KNOWN_CONSUMERS.has(request.consumer)) {
      throw new InvalidRequestError('unsupported consumer identifier', { consumer: request.consumer });
    }
  }

  /**
   * Retrieve the best admissible knowledge for a subject + predicate.
   *
   * @param {object} request {subjectId, predicate, asOf?, consumer?, context?,
   *                          includeDiagnostics?}
   * @returns {object} a delivery envelope (RESOLVED) OR a typed result object
   *                   whose `state` is one of ResultState.*
   */
  getKnowledge(request) {
    const startedAt = Date.now();
    this._validate(request);
    const now = this._now(request);
    const consumer = request.consumer || 'internal';
    const traceId = newTraceId();
    const diag = (outcome, extra) => this.diagnostics.emit(Object.assign({
      traceId, subject: request.subjectId, predicate: request.predicate,
      outcome, consumer, durationMs: Date.now() - startedAt,
    }, extra || {}));

    let rows;
    try {
      rows = this.store.claims.findBySubject(request.subjectId, request.predicate) || [];
    } catch (err) {
      throw new StorageFailureError('storage read failed', { cause: String(err && err.message || err) });
    }

    if (rows.length === 0) {
      diag(ResultState.NOT_FOUND);
      return this._result(ResultState.NOT_FOUND, request, traceId, { reasons: [] });
    }

    // Build candidates, running each gate and recording why anything is dropped.
    const candidates = [];
    const suppressed = [];
    let sawExpired = false;

    for (const claim of rows) {
      const verdict = evaluateVerification(claim);
      if (!verdict.admissible) {
        suppressed.push({ claimId: claim.id, reason: verdict.reason });
        continue;
      }
      const freshness = evaluateFreshness(claim, now);
      if (!freshness.deliverable) {
        if (freshness.status === FreshnessStatus.EXPIRED) sawExpired = true;
        const reason = freshness.status === FreshnessStatus.EXPIRED
          ? ReasonCode.EXPIRED_DYNAMIC : ReasonCode.NOT_YET_VALID;
        suppressed.push({ claimId: claim.id, reason });
        continue;
      }

      let sources;
      try {
        sources = this.store.sources.forClaim(claim.id) || [];
      } catch (err) {
        throw new StorageFailureError('source read failed', { claimId: claim.id, cause: String(err && err.message || err) });
      }
      const provenance = assembleProvenance(sources);
      if (!provenance.hasProvenance) {
        suppressed.push({ claimId: claim.id, reason: ReasonCode.MISSING_PROVENANCE });
        continue;
      }

      const candidate = {
        claim,
        sources,
        provenance,
        bestSourceTier: provenance.bestTier,
        freshness,
        relatedEntityIds: [],
      };

      const safety = evaluateSafetyFloor(candidate);
      if (!safety.pass) {
        suppressed.push({ claimId: claim.id, reason: safety.reason });
        continue;
      }
      candidates.push(candidate);
    }

    if (candidates.length === 0) {
      const state = sawExpired ? ResultState.EXPIRED : ResultState.INADMISSIBLE;
      diag(state, { suppressionReason: suppressed.length ? suppressed[0].reason : null });
      return this._result(state, request, traceId, { reasons: suppressed });
    }

    const { ordered, tie } = rank(candidates);

    if (tie && candidates.length > 1) {
      diag(ResultState.CONFLICT, { selectedClaimId: null });
      return this._result(ResultState.CONFLICT, request, traceId, {
        reasons: suppressed,
        conflicting: ordered.slice(0, 2).map((c) => ({ claimId: c.claim.id, explanation: explain(c) })),
      });
    }

    const selected = ordered[0];
    const rankingReason = explain(selected);
    const staleItems = selected.freshness.status === FreshnessStatus.NEEDS_REVIEW
      ? [selected.claim.id] : [];
    const warnings = [];
    if (selected.freshness.status === FreshnessStatus.NEEDS_REVIEW) warnings.push(ReasonCode.NEEDS_REVIEW);

    diag(ResultState.RESOLVED, {
      selectedClaimId: selected.claim.id,
      freshness: selected.freshness.status,
    });

    const envelope = buildEnvelope({
      request,
      selected,
      provenance: selected.provenance,
      freshFlag: staleItems.length === 0,
      staleItems,
      rankingReason,
      rulesFired: ['admission', 'freshness', 'provenance', 'safety_floor', 'ranking'],
      traceId,
      consumer,
      contextSignature: request.context ? JSON.stringify(request.context) : null,
      nowMs: now,
      warnings,
    });
    envelope.state = ResultState.RESOLVED;
    if (request.includeDiagnostics) {
      envelope.diagnostics = { suppressed, candidateCount: candidates.length };
    }
    return envelope;
  }

  _result(state, request, traceId, extra) {
    return Object.assign({
      state,
      contract_version: 'kdp.v1',
      subject: request.subjectId,
      predicate: request.predicate,
      trace_id: traceId,
      items: [],
    }, extra || {});
  }
}

module.exports = { KnowledgeDeliveryService, KNOWN_CONSUMERS };
