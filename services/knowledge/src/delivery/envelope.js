'use strict';

/**
 * Standard delivery envelope assembly.
 *
 * Contract source (frozen Architecture v1.0): delivery/DELIVERY_ENGINE.md
 * (§3 Response envelope — `contract_version: kdp.v1`).
 *
 * We follow the canonical KDP envelope shape rather than inventing a new one:
 *   { contract_version, assembled_at, context_signature, items:[{payload,
 *     provenance}], currency:{fresh, stale_items}, explain:{rules_fired,
 *     ranking_reason} }
 *
 * We EXTEND (never rename) the canonical block with the additional identity,
 * trust, freshness and delivery-metadata fields the PR #10 spec requires, placed
 * inside `payload` and alongside the canonical `provenance`. Consumers that only
 * know kdp.v1 keep working; richer consumers can read the extensions.
 */

const CONTRACT_VERSION = 'kdp.v1';
const SCHEMA_VERSION = 'kd-read.v1';

function confidenceToFraction(conf) {
  if (conf == null) return null;
  const n = Number(conf);
  if (Number.isNaN(n)) return null;
  // Machine schema stores 0-100; envelope provenance uses 0.0-1.0.
  return n > 1 ? Math.round((n / 100) * 1000) / 1000 : n;
}

/**
 * Build one envelope item from a selected candidate.
 */
function buildItem(selected, provenance) {
  const c = selected.claim;
  const fresh = selected.freshness;
  return {
    // Consumer-neutral payload: value + structured attributes + relations.
    payload: {
      identity: {
        subject: c.subject,
        predicate: c.predicate,
        objectId: c.id,
        objectType: 'claim',
        version: c.version != null ? c.version : null,
      },
      value: {
        value: c.value != null ? c.value : null,
        attributes: c.attributes != null ? c.attributes : null,
        relatedEntityIds: selected.relatedEntityIds || [],
      },
      trust: {
        verificationStatus: c.verification,
        confidence: c.confidence != null ? Number(c.confidence) : null,
        claimNature: c.note != null ? c.note : null,
        safetyCritical: !!c.safety_critical,
      },
      freshness: {
        verified: c.updated_at != null ? c.updated_at : null,
        lastReviewed: c.last_reviewed != null ? c.last_reviewed : null,
        nextReview: fresh.reviewBy,
        validFrom: fresh.validFrom,
        validUntil: fresh.expiresAt,
        expirationState: fresh.status,
        freshnessStatus: fresh.status,
      },
    },
    // Canonical kdp.v1 provenance block (+ extended source detail).
    provenance: {
      object_id: c.id,
      verification_state: c.verification,
      confidence: confidenceToFraction(c.confidence),
      source_tier: provenance.bestTier,
      as_of: c.valid_from != null ? c.valid_from : null,
      expires_at: fresh.expiresAt,
      safety_floor: !!c.safety_critical,
      approved_by: c.owner != null ? c.owner : null,
      sources: provenance.sources,
      source_organizations: provenance.sourceOrganizations,
      source_classifications: provenance.sourceClassifications,
      supported_claim_ids: [c.id],
    },
  };
}

/**
 * Assemble a full success envelope.
 *
 * @param {object} args {request, selected, provenance, freshFlag, staleItems,
 *                       rankingReason, rulesFired, traceId, consumer,
 *                       contextSignature}
 */
function buildEnvelope(args) {
  const item = buildItem(args.selected, args.provenance);
  return {
    contract_version: CONTRACT_VERSION,
    schema_version: SCHEMA_VERSION,
    assembled_at: new Date(args.nowMs != null ? args.nowMs : Date.now()).toISOString(),
    context_signature: args.contextSignature != null ? args.contextSignature : null,
    items: [item],
    currency: {
      fresh: !!args.freshFlag,
      stale_items: args.staleItems || [],
    },
    explain: {
      rules_fired: args.rulesFired || [],
      ranking_reason: args.rankingReason != null ? args.rankingReason : '',
    },
    delivery: {
      delivered_at: new Date(args.nowMs != null ? args.nowMs : Date.now()).toISOString(),
      consumer: args.consumer != null ? args.consumer : 'internal',
      trace_id: args.traceId != null ? args.traceId : null,
      warnings: args.warnings || [],
    },
  };
}

module.exports = {
  CONTRACT_VERSION,
  SCHEMA_VERSION,
  buildEnvelope,
  buildItem,
  confidenceToFraction,
};
