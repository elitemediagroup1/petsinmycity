'use strict';
/**
 * LoopKnowledgeStore — the PRODUCTION KnowledgeStore backed by EMG Loop.
 *
 * Architecture (ADR-0027, revised): PetsInMyCity does NOT own durable storage.
 * EMG Loop is the system of record; Loop persists through Neon internally.
 * PetsInMyCity talks ONLY to Loop's authenticated service contract — never to
 * Neon, never to Loop's database schema or table names.
 *
 *   consumer -> KnowledgeDeliveryService -> LoopKnowledgeStore -> Loop API -> Neon
 *
 * This store implements the SAME public surface the delivery service and importer
 * depend on (the four repositories, transaction(), stats(), readiness(), close()),
 * so nothing above the store boundary knows Loop is behind it. But it is NOT a SQL
 * driver: it maps repository operations to Loop HTTP calls.
 *
 * Delivery authority: the KDP (KnowledgeDeliveryService) remains the SOLE authority
 * for admission, freshness, ranking, conflict, provenance and safety. Loop returns
 * STORED objects; it never decides deliverability. Reads therefore only need to
 * return the raw claim rows (+ their sources) for a subject/predicate; the KDP
 * evaluates them exactly as it does for SQLite.
 *
 * Writes are used by controlled admin tooling only (Austin import). They are
 * accumulated inside transaction() and flushed as ONE idempotent Loop batch on
 * commit, so a partial failure does not half-write.
 */

const { LoopClient } = require('./loop-client');
const { LoopError } = require('./loop-errors');

/** Contract version PetsInMyCity expects Loop's knowledge endpoints to speak. */
const KNOWLEDGE_CONTRACT_VERSION = 'kg.v1';

/** Normalize a Loop-returned claim object into the row shape the KDP consumes. */
function normalizeClaim(c) {
  if (!c || typeof c !== 'object') return null;
  return {
    id: c.id,
    subject: c.subject,
    predicate: c.predicate,
    // Loop stores value as JSON already; keep it as a parsed value.
    value: c.value == null ? null : c.value,
    confidence: c.confidence == null ? null : c.confidence,
    verification: c.verification == null ? null : c.verification,
    safety_critical: !!c.safety_critical,
    valid_from: c.valid_from == null ? null : c.valid_from,
    valid_until: c.valid_until == null ? null : c.valid_until,
    expires: c.expires == null ? null : c.expires,
    review_by: c.review_by == null ? null : c.review_by,
    note: c.note == null ? null : c.note,
    version: c.version == null ? null : c.version,
  };
}

/** Normalize a Loop-returned source object into the source row shape. */
function normalizeSource(s) {
  if (!s || typeof s !== 'object') return null;
  return {
    id: s.id,
    tier: s.tier == null ? null : s.tier,
    kind: s.kind == null ? null : s.kind,
    url: s.url == null ? null : s.url,
    accessed: s.accessed == null ? null : s.accessed,
    quote: s.quote == null ? null : s.quote,
    captured_by: s.captured_by == null ? null : s.captured_by,
  };
}

/**
 * Read-only repositories the delivery service uses. Backed by a single Loop query
 * endpoint that returns claims-with-their-sources for a subject (+ optional
 * predicate). We cache the last query per store instance so sources.forClaim() can
 * be answered without a second round trip during one getKnowledge() call.
 */
class LoopReadRepositories {
  constructor(store) { this.store = store; this._sourcesByClaim = new Map(); }

  get claims() {
    const self = this;
    return {
      async findBySubject(subject, predicate) {
        const rows = await self.store._querySubject(subject, predicate);
        // Cache each claim's sources so sources.forClaim resolves locally.
        for (const r of rows) {
          self._sourcesByClaim.set(r.claim.id, r.sources.map(normalizeSource).filter(Boolean));
        }
        return rows.map((r) => normalizeClaim(r.claim)).filter(Boolean);
      },
      async getById(id) {
        const c = await self.store._getClaim(id);
        return c ? normalizeClaim(c.claim) : undefined;
      },
      async count() { return self.store._count('claims'); },
    };
  }

  get sources() {
    const self = this;
    return {
      async forClaim(claimId) {
        if (self._sourcesByClaim.has(claimId)) return self._sourcesByClaim.get(claimId);
        const c = await self.store._getClaim(claimId);
        const sources = (c && c.sources ? c.sources : []).map(normalizeSource).filter(Boolean);
        self._sourcesByClaim.set(claimId, sources);
        return sources;
      },
      async forEntity(entityId) {
        const e = await self.store._getEntity(entityId);
        return (e && e.sources ? e.sources : []).map(normalizeSource).filter(Boolean);
      },
      async count() { return self.store._count('sources'); },
    };
  }

  get entities() {
    const self = this;
    return {
      async getById(id) { const e = await self.store._getEntity(id); return e ? e.entity : undefined; },
      async count() { return self.store._count('entities'); },
    };
  }

  get relationships() {
    const self = this;
    return { async count() { return self.store._count('relationships'); } };
  }
}

/**
 * A write batch collected inside transaction(). Every repository write appends a
 * typed operation; commit() flushes the whole batch to Loop in one idempotent
 * request. There are no partial writes: Loop applies the batch atomically or
 * rejects it.
 */
class LoopWriteBatch {
  constructor() {
    this.entities = []; this.claims = []; this.relationships = [];
    this.sources = []; this.entitySources = []; this.claimSources = [];
  }
  _repoEntities() { const b = this; return { async upsert(e) { b.entities.push(e); return e.id; }, async getById() { return undefined; }, async addSource(entityId, sourceId) { b.entitySources.push({ entityId, sourceId }); } }; }
  _repoClaims() { const b = this; return { async upsert(c) { b.claims.push(c); return c.id; }, async getById() { return undefined; }, async addSource(claimId, sourceId) { b.claimSources.push({ claimId, sourceId }); } }; }
  _repoRelationships() { const b = this; return { async add(edge) { b.relationships.push(edge); return true; } }; }
  _repoSources() { const b = this; return { async upsert(s) { b.sources.push(s); return s.id; }, async count() { return b.sources.length; } }; }
  scoped() { return { entities: this._repoEntities(), claims: this._repoClaims(), relationships: this._repoRelationships(), sources: this._repoSources() }; }
  toPayload() {
    return {
      contract_version: KNOWLEDGE_CONTRACT_VERSION,
      entities: this.entities, claims: this.claims, relationships: this.relationships,
      sources: this.sources, entity_sources: this.entitySources, claim_sources: this.claimSources,
    };
  }
  size() { return this.entities.length + this.claims.length + this.relationships.length + this.sources.length; }
}

class LoopKnowledgeStore {
  /**
   * @param {object} cfg { baseUrl, serviceToken, platform, organizationId?, workspaceId?, propertyId?, timeoutMs?, maxRetries?, fetchImpl?, datasetVersion? }
   */
  constructor(cfg) {
    const c = cfg || {};
    this.platform = c.platform || 'petsinmycity';
    this.organizationId = c.organizationId || null;
    this.workspaceId = c.workspaceId || null;
    this.propertyId = c.propertyId || this.platform;
    this.datasetVersion = c.datasetVersion || 'austin-pilot';
    this.client = c.client || new LoopClient({
      baseUrl: c.baseUrl, serviceToken: c.serviceToken,
      timeoutMs: c.timeoutMs, maxRetries: c.maxRetries, fetchImpl: c.fetchImpl,
    });
    const repos = new LoopReadRepositories(this);
    this.claims = repos.claims;
    this.sources = repos.sources;
    this.entities = repos.entities;
    this.relationships = repos.relationships;
  }

  /** Tenant scope sent on every request (never includes secrets). */
  _scope() {
    const s = { platform: this.platform, property: this.propertyId };
    if (this.organizationId) s.organization_id = this.organizationId;
    if (this.workspaceId) s.workspace_id = this.workspaceId;
    return s;
  }
  _q(extra) {
    const s = this._scope();
    const p = new URLSearchParams();
    for (const k of Object.keys(s)) p.set(k, String(s[k]));
    if (extra) for (const k of Object.keys(extra)) if (extra[k] != null) p.set(k, String(extra[k]));
    return p.toString();
  }

  /** Query claims (+sources) for a subject and optional predicate. */
  async _querySubject(subject, predicate) {
    const res = await this.client.get('/api/v1/knowledge/query?' + this._q({ subject, predicate }));
    const items = (res && Array.isArray(res.claims)) ? res.claims : [];
    return items.map((it) => ({ claim: it, sources: Array.isArray(it.sources) ? it.sources : [] }));
  }

  async _getClaim(id) {
    try {
      const res = await this.client.get('/api/v1/knowledge/claims/' + encodeURIComponent(id) + '?' + this._q());
      if (!res || !res.claim) return null;
      return { claim: res.claim, sources: Array.isArray(res.claim.sources) ? res.claim.sources : [] };
    } catch (err) {
      if (err instanceof LoopError && err.code === 'not_found') return null;
      throw err;
    }
  }

  async _getEntity(id) {
    try {
      const res = await this.client.get('/api/v1/knowledge/entities/' + encodeURIComponent(id) + '?' + this._q());
      if (!res || !res.entity) return null;
      return { entity: res.entity, sources: Array.isArray(res.entity.sources) ? res.entity.sources : [] };
    } catch (err) {
      if (err instanceof LoopError && err.code === 'not_found') return null;
      throw err;
    }
  }

  async _count(kind) {
    const res = await this.client.get('/api/v1/knowledge/stats?' + this._q());
    const counts = (res && res.counts) ? res.counts : {};
    return counts[kind] == null ? 0 : counts[kind];
  }

  /**
   * Run a write transaction. Collects all repository writes into one batch and
   * submits it as a single idempotent Loop import request on success. A deterministic
   * idempotency key derived from dataset identity+version means retries never
   * double-write. On callback error nothing is sent (rollback is trivial: no
   * request is made).
   */
  async transaction(fn) {
    const batch = new LoopWriteBatch();
    const result = await fn(batch.scoped());
    if (batch.size() > 0) {
      const idempotencyKey = 'pimc:' + this.platform + ':' + this.datasetVersion;
      await this.client.post('/api/v1/knowledge/import', {
        scope: this._scope(),
        idempotency_key: idempotencyKey,
        batch: batch.toPayload(),
      }, { idempotencyKey });
    }
    return result;
  }

  /** Aggregate counts for health checks. One round trip. */
  async stats() {
    const res = await this.client.get('/api/v1/knowledge/stats?' + this._q());
    const c = (res && res.counts) ? res.counts : {};
    return {
      sources: c.sources || 0, entities: c.entities || 0,
      claims: c.claims || 0, edges: c.relationships || c.edges || 0,
    };
  }

  /**
   * Readiness: confirm Loop is reachable, authenticated, and speaking a compatible
   * knowledge contract version. Never exposes secrets. Returns a non-secret report.
   */
  async readiness() {
    const res = await this.client.get('/api/v1/knowledge/readiness?' + this._q());
    const ok = !!(res && res.ok);
    const version = res && res.contract_version;
    const compatible = version === KNOWLEDGE_CONTRACT_VERSION;
    return {
      reachable: ok,
      migrated: ok && compatible,
      contractVersion: version || null,
      expected: KNOWLEDGE_CONTRACT_VERSION,
    };
  }

  /** No persistent connection to close (stateless HTTP). Present for parity. */
  async close() { /* no-op */ }
}

module.exports = { LoopKnowledgeStore, normalizeClaim, normalizeSource, KNOWLEDGE_CONTRACT_VERSION };
