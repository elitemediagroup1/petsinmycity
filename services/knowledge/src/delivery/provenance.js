'use strict';

/**
 * Provenance assembly — traceability from a delivered value back to stored sources.
 *
 * Contract source (frozen Architecture v1.0):
 *   delivery/DELIVERY_ENGINE.md (envelope `provenance` block)
 *   docs/editorial/knowledge-graph/MACHINE_SCHEMA.yaml (sources[])
 *
 * Rules:
 *   - Preserve the many-to-many claim<->source relationship.
 *   - A delivered result WITHOUT provenance fails the delivery gate.
 *   - Never fabricate provenance from importer metadata or filenames.
 *   - Do not duplicate full source bodies unnecessarily; carry ids + essentials.
 */

/**
 * Build the provenance view for a claim from its linked source rows.
 *
 * @param {Array<object>} sources  rows from SourceRepository.forClaim(claimId).
 *                                 Each row exposes: id, tier, kind, url, accessed,
 *                                 quote, captured_by.
 * @returns {{sources: Array, sourceOrganizations: Array<string>,
 *           sourceClassifications: Array, bestTier: (string|null),
 *           hasProvenance: boolean}}
 */
function assembleProvenance(sources) {
  const list = Array.isArray(sources) ? sources : [];
  const items = list.map((s) => ({
    id: s.id,
    tier: s.tier != null ? s.tier : null,
    kind: s.kind != null ? s.kind : null,
    url: s.url != null ? s.url : null,
    accessed: s.accessed != null ? s.accessed : null,
    capturedBy: s.captured_by != null ? s.captured_by : null,
  }));

  const orgs = [];
  const seenOrg = new Set();
  for (const s of items) {
    const org = s.capturedBy || s.kind;
    if (org && !seenOrg.has(org)) { seenOrg.add(org); orgs.push(org); }
  }

  const classifications = [];
  const seenTier = new Set();
  for (const s of items) {
    if (s.tier != null && !seenTier.has(s.tier)) { seenTier.add(s.tier); classifications.push(s.tier); }
  }

  return {
    sources: items,
    sourceOrganizations: orgs,
    sourceClassifications: classifications,
    bestTier: bestTier(items),
    hasProvenance: items.length > 0,
  };
}

function tierNumber(tier) {
  if (!tier) return 99;
  const m = String(tier).match(/(\d+)/);
  return m ? Number(m[1]) : 99;
}

/** Return the strongest (lowest-numbered) tier string among sources, or null. */
function bestTier(items) {
  let best = null;
  let bestNum = Infinity;
  for (const s of items) {
    const n = tierNumber(s.tier);
    if (n < bestNum) { bestNum = n; best = s.tier; }
  }
  return best;
}

module.exports = { assembleProvenance, bestTier, tierNumber };
