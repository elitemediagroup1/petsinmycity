'use strict';
/**
 * SourceRepository — provenance records. Sources are upserted first because
 * entities and claims reference them for trust/provenance.
 */
class SourceRepository {
  constructor(db) { this.db = db; }

  /**
   * Insert or update a source by id. Returns the stored source id.
   * @param {object} s { id, tier, kind, url, accessed, quote, captured_by }
   */
  upsert(s) {
    if (!s || !s.id) throw new Error('SourceRepository.upsert: source.id is required');
    this.db.prepare(
      'INSERT INTO sources (id, tier, kind, url, accessed, quote, captured_by)' +
      ' VALUES (@id, @tier, @kind, @url, @accessed, @quote, @captured_by)' +
      ' ON CONFLICT(id) DO UPDATE SET' +
      '  tier=excluded.tier, kind=excluded.kind, url=excluded.url,' +
      '  accessed=excluded.accessed, quote=excluded.quote, captured_by=excluded.captured_by'
    ).run({
      id: s.id,
      tier: s.tier != null ? s.tier : null,
      kind: s.kind || null,
      url: s.url || null,
      accessed: s.accessed || null,
      quote: s.quote || null,
      captured_by: s.captured_by || null,
    });
    return s.id;
  }

  /** @returns {object|undefined} */
  getById(id) {
    return this.db.prepare('SELECT * FROM sources WHERE id = ?').get(id);
  }

  /** @returns {object[]} sources linked to an entity */
  forEntity(entityId) {
    return this.db.prepare(
      'SELECT s.* FROM sources s JOIN entity_sources es ON es.source_id = s.id' +
      ' WHERE es.entity_id = ?'
    ).all(entityId);
  }

  /** @returns {object[]} sources linked to a claim */
  forClaim(claimId) {
    return this.db.prepare(
      'SELECT s.* FROM sources s JOIN claim_sources cs ON cs.source_id = s.id' +
      ' WHERE cs.claim_id = ?'
    ).all(claimId);
  }

  count() {
    return this.db.prepare('SELECT COUNT(*) AS n FROM sources').get().n;
  }
}
module.exports = SourceRepository;
