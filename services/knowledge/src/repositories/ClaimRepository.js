'use strict';
/**
 * ClaimRepository — verifiable statements (subject, predicate, value) carrying the
 * trust envelope and validity/freshness metadata. Append-only versioned like entities.
 *
 * ADR-0027: async, driver/transaction-based. SQL and bindings are unchanged.
 */
const SAFETY = (v) => (v ? 1 : 0);
const enc = (v) => JSON.stringify(v == null ? null : v);
const parse = (v, d) => { if (v == null) return d; try { return JSON.parse(v); } catch (e) { return d; } };

class ClaimRepository {
  /** @param {object} executor a driver or transaction with async execute() */
  constructor(executor) { this.db = executor; }

  async _get(sql, args) {
    const rs = await this.db.execute({ sql, args });
    return rs.rows[0];
  }
  async _all(sql, args) {
    const rs = await this.db.execute({ sql, args });
    return rs.rows;
  }

  _hydrate(row) {
    if (!row) return undefined;
    return Object.assign({}, row, {
      value: parse(row.value, null),
      safety_critical: !!row.safety_critical,
    });
  }

  async _snapshot(id) {
    const row = await this._get('SELECT * FROM claims WHERE id = @id', { id });
    if (!row) return;
    await this.db.execute({
      sql: 'INSERT OR REPLACE INTO claim_versions (claim_id, version, snapshot) VALUES (@claim_id, @version, @snapshot)',
      args: { claim_id: id, version: row.version, snapshot: JSON.stringify(row) },
    });
  }

  async upsert(c) {
    if (!c || !c.id) throw new Error('ClaimRepository.upsert: claim.id is required');
    if (!c.subject) throw new Error('ClaimRepository.upsert: claim.subject is required');
    if (!c.predicate) throw new Error('ClaimRepository.upsert: claim.predicate is required');
    const existing = await this._get('SELECT version FROM claims WHERE id = @id', { id: c.id });
    if (existing) {
      await this._snapshot(c.id);
      await this.db.execute({
        sql: 'UPDATE claims SET subject=@subject, predicate=@predicate, value=@value,'
          + ' confidence=@confidence, verification=@verification, safety_critical=@safety_critical,'
          + ' valid_from=@valid_from, valid_until=@valid_until, expires=@expires, review_by=@review_by,'
          + " note=@note, version=version+1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=@id",
        args: this._params(c),
      });
    } else {
      await this.db.execute({
        sql: 'INSERT INTO claims (id, subject, predicate, value, confidence, verification,'
          + ' safety_critical, valid_from, valid_until, expires, review_by, note)'
          + ' VALUES (@id, @subject, @predicate, @value, @confidence, @verification,'
          + ' @safety_critical, @valid_from, @valid_until, @expires, @review_by, @note)',
        args: this._params(c),
      });
    }
    return c.id;
  }

  _params(c) {
    return {
      id: c.id, subject: c.subject, predicate: c.predicate, value: enc(c.value),
      confidence: c.confidence || null, verification: c.verification || null,
      safety_critical: SAFETY(c.safety_critical),
      valid_from: c.valid_from || null, valid_until: c.valid_until || null,
      expires: c.expires || null, review_by: c.review_by || null, note: c.note || null,
    };
  }

  async getById(id) {
    return this._hydrate(await this._get('SELECT * FROM claims WHERE id = @id', { id }));
  }

  /** Primary read pattern: claims about a subject, optionally a single predicate. */
  async findBySubject(subject, predicate) {
    if (predicate) {
      const rows = await this._all(
        'SELECT * FROM claims WHERE subject = @subject AND predicate = @predicate ORDER BY id',
        { subject, predicate });
      return rows.map((r) => this._hydrate(r));
    }
    const rows = await this._all('SELECT * FROM claims WHERE subject = @subject ORDER BY predicate', { subject });
    return rows.map((r) => this._hydrate(r));
  }

  /** Update just the verification state, versioned. Supports the verification lifecycle. */
  async setVerification(id, verification, confidence) {
    const existing = await this.getById(id);
    if (!existing) throw new Error('ClaimRepository.setVerification: unknown claim ' + id);
    return this.upsert(Object.assign({}, existing, {
      verification: verification,
      confidence: confidence != null ? confidence : existing.confidence,
    }));
  }

  async addSource(claimId, sourceId) {
    await this.db.execute({
      sql: 'INSERT OR IGNORE INTO claim_sources (claim_id, source_id) VALUES (@claim_id, @source_id)',
      args: { claim_id: claimId, source_id: sourceId },
    });
  }

  async history(id) {
    const rows = await this._all(
      'SELECT version, snapshot, changed_at FROM claim_versions WHERE claim_id = @id ORDER BY version',
      { id });
    return rows.map((r) => Object.assign({}, r, { snapshot: parse(r.snapshot, {}) }));
  }

  async count() {
    const row = await this._get('SELECT COUNT(*) AS n FROM claims');
    return row.n;
  }
}
module.exports = ClaimRepository;
