'use strict';
/**
 * SourceRepository — provenance records. Sources are upserted first because
 * entities and claims reference them for trust/provenance.
 *
 * ADR-0027: async, driver/transaction-based. SQL and bindings are unchanged.
 */
class SourceRepository {
  /** @param {object} executor a driver or transaction with async execute() */
  constructor(executor) { this.db = executor; }

  async _all(sql, args) {
    const rs = await this.db.execute({ sql, args });
    return rs.rows;
  }

  /**
   * Insert or update a source by id. Returns the stored source id.
   * @param {object} s { id, tier, kind, url, accessed, quote, captured_by }
   */
  async upsert(s) {
    if (!s || !s.id) throw new Error('SourceRepository.upsert: source.id is required');
    await this.db.execute({
      sql: 'INSERT INTO sources (id, tier, kind, url, accessed, quote, captured_by)'
        + ' VALUES (@id, @tier, @kind, @url, @accessed, @quote, @captured_by)'
        + ' ON CONFLICT(id) DO UPDATE SET'
        + ' tier=excluded.tier, kind=excluded.kind, url=excluded.url,'
        + ' accessed=excluded.accessed, quote=excluded.quote, captured_by=excluded.captured_by',
      args: {
        id: s.id,
        tier: s.tier != null ? s.tier : null,
        kind: s.kind || null,
        url: s.url || null,
        accessed: s.accessed || null,
        quote: s.quote || null,
        captured_by: s.captured_by || null,
      },
    });
    return s.id;
  }

  /** @returns {Promise<object|undefined>} */
  async getById(id) {
    const rs = await this.db.execute({ sql: 'SELECT * FROM sources WHERE id = @id', args: { id } });
    return rs.rows[0];
  }

  /** @returns {Promise<object[]>} sources linked to an entity */
  async forEntity(entityId) {
    return this._all(
      'SELECT s.* FROM sources s JOIN entity_sources es ON es.source_id = s.id WHERE es.entity_id = @entity_id',
      { entity_id: entityId });
  }

  /** @returns {Promise<object[]>} sources linked to a claim */
  async forClaim(claimId) {
    return this._all(
      'SELECT s.* FROM sources s JOIN claim_sources cs ON cs.source_id = s.id WHERE cs.claim_id = @claim_id',
      { claim_id: claimId });
  }

  async count() {
    const rs = await this.db.execute({ sql: 'SELECT COUNT(*) AS n FROM sources' });
    return rs.rows[0].n;
  }
}
module.exports = SourceRepository;
