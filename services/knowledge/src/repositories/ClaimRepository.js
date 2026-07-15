'use strict';
/**
 * ClaimRepository — verifiable statements (subject, predicate, value) carrying the
 * trust envelope and validity/freshness metadata. Append-only versioned like entities.
 */
const SAFETY = (v) => (v ? 1 : 0);
const enc = (v) => JSON.stringify(v == null ? null : v);
const parse = (v, d) => { if (v == null) return d; try { return JSON.parse(v); } catch (e) { return d; } };

class ClaimRepository {
  constructor(db) { this.db = db; }

  _hydrate(row) {
    if (!row) return undefined;
    return Object.assign({}, row, {
      value: parse(row.value, null),
      safety_critical: !!row.safety_critical,
    });
  }

  _snapshot(id) {
    const row = this.db.prepare('SELECT * FROM claims WHERE id = ?').get(id);
    if (!row) return;
    this.db.prepare(
      'INSERT OR REPLACE INTO claim_versions (claim_id, version, snapshot) VALUES (?, ?, ?)'
    ).run(id, row.version, JSON.stringify(row));
  }

  upsert(c) {
    if (!c || !c.id) throw new Error('ClaimRepository.upsert: claim.id is required');
    if (!c.subject) throw new Error('ClaimRepository.upsert: claim.subject is required');
    if (!c.predicate) throw new Error('ClaimRepository.upsert: claim.predicate is required');
    const existing = this.db.prepare('SELECT version FROM claims WHERE id = ?').get(c.id);
    if (existing) {
      this._snapshot(c.id);
      this.db.prepare(
        'UPDATE claims SET subject=@subject, predicate=@predicate, value=@value,' +
        ' confidence=@confidence, verification=@verification, safety_critical=@safety_critical,' +
        ' valid_from=@valid_from, valid_until=@valid_until, expires=@expires, review_by=@review_by,' +
        " note=@note, version=version+1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=@id"
      ).run(this._params(c));
    } else {
      this.db.prepare(
        'INSERT INTO claims (id, subject, predicate, value, confidence, verification,' +
        ' safety_critical, valid_from, valid_until, expires, review_by, note)' +
        ' VALUES (@id, @subject, @predicate, @value, @confidence, @verification,' +
        ' @safety_critical, @valid_from, @valid_until, @expires, @review_by, @note)'
      ).run(this._params(c));
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

  getById(id) {
    return this._hydrate(this.db.prepare('SELECT * FROM claims WHERE id = ?').get(id));
  }

  /** Primary read pattern: claims about a subject, optionally a single predicate. */
  findBySubject(subject, predicate) {
    if (predicate) {
      return this.db.prepare('SELECT * FROM claims WHERE subject = ? AND predicate = ? ORDER BY id')
        .all(subject, predicate).map((r) => this._hydrate(r));
    }
    return this.db.prepare('SELECT * FROM claims WHERE subject = ? ORDER BY predicate')
      .all(subject).map((r) => this._hydrate(r));
  }

  /** Update just the verification state, versioned. Supports the verification lifecycle. */
  setVerification(id, verification, confidence) {
    const existing = this.getById(id);
    if (!existing) throw new Error('ClaimRepository.setVerification: unknown claim ' + id);
    return this.upsert(Object.assign({}, existing, {
      verification: verification,
      confidence: confidence != null ? confidence : existing.confidence,
    }));
  }

  addSource(claimId, sourceId) {
    this.db.prepare('INSERT OR IGNORE INTO claim_sources (claim_id, source_id) VALUES (?, ?)')
      .run(claimId, sourceId);
  }

  history(id) {
    return this.db.prepare(
      'SELECT version, snapshot, changed_at FROM claim_versions WHERE claim_id = ? ORDER BY version'
    ).all(id).map((r) => Object.assign({}, r, { snapshot: parse(r.snapshot, {}) }));
  }

  count() { return this.db.prepare('SELECT COUNT(*) AS n FROM claims').get().n; }
}
module.exports = ClaimRepository;
