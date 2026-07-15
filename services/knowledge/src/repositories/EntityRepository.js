'use strict';
/**
 * EntityRepository — identity + trust + stewardship envelope for knowledge objects.
 * All writes are append-only versioned: each mutation snapshots the row into
 * entity_versions and bumps the version counter, preserving full history.
 */
const SAFETY = (v) => (v ? 1 : 0);
const jsonOrNull = (v) => (v == null ? null : JSON.stringify(v));
const parse = (v, d) => { if (v == null) return d; try { return JSON.parse(v); } catch (e) { return d; } };

class EntityRepository {
  constructor(db) { this.db = db; }

  /** Map a stored row back into a rich object (JSON fields decoded). */
  _hydrate(row) {
    if (!row) return undefined;
    return Object.assign({}, row, {
      aliases: parse(row.aliases, []),
      geo: parse(row.geo, null),
      attributes: parse(row.attributes, {}),
      safety_critical: !!row.safety_critical,
    });
  }

  _snapshot(id) {
    const row = this.db.prepare('SELECT * FROM entities WHERE id = ?').get(id);
    if (!row) return;
    this.db.prepare(
      'INSERT OR REPLACE INTO entity_versions (entity_id, version, snapshot) VALUES (?, ?, ?)'
    ).run(id, row.version, JSON.stringify(row));
  }

  /**
   * Insert or update an entity by id. On update the previous state is snapshotted
   * and the version is incremented. Returns the entity id.
   */
  upsert(e) {
    if (!e || !e.id) throw new Error('EntityRepository.upsert: entity.id is required');
    if (!e.type) throw new Error('EntityRepository.upsert: entity.type is required');
    if (!e.name) throw new Error('EntityRepository.upsert: entity.name is required');
    const existing = this.db.prepare('SELECT version FROM entities WHERE id = ?').get(e.id);
    if (existing) {
      this._snapshot(e.id);
      this.db.prepare(
        'UPDATE entities SET type=@type, name=@name, aliases=@aliases, parent=@parent,' +
        ' geo=@geo, status=@status, role=@role, attributes=@attributes, confidence=@confidence,' +
        ' verification=@verification, safety_critical=@safety_critical, owner=@owner,' +
        ' last_reviewed=@last_reviewed, review_cadence=@review_cadence, next_review=@next_review,' +
        " version=version+1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=@id"
      ).run(this._params(e));
    } else {
      this.db.prepare(
        'INSERT INTO entities (id, type, name, aliases, parent, geo, status, role, attributes,' +
        ' confidence, verification, safety_critical, owner, last_reviewed, review_cadence, next_review)' +
        ' VALUES (@id, @type, @name, @aliases, @parent, @geo, @status, @role, @attributes,' +
        ' @confidence, @verification, @safety_critical, @owner, @last_reviewed, @review_cadence, @next_review)'
      ).run(this._params(e));
    }
    return e.id;
  }

  _params(e) {
    return {
      id: e.id, type: e.type, name: e.name,
      aliases: jsonOrNull(e.aliases), parent: e.parent || null,
      geo: jsonOrNull(e.geo), status: e.status || 'active', role: e.role || null,
      attributes: jsonOrNull(e.attributes),
      confidence: e.confidence || null, verification: e.verification || null,
      safety_critical: SAFETY(e.safety_critical),
      owner: e.owner || null, last_reviewed: e.last_reviewed || null,
      review_cadence: e.review_cadence || null, next_review: e.next_review || null,
    };
  }

  getById(id) {
    return this._hydrate(this.db.prepare('SELECT * FROM entities WHERE id = ?').get(id));
  }

  findByType(type) {
    return this.db.prepare('SELECT * FROM entities WHERE type = ? ORDER BY id').all(type).map((r) => this._hydrate(r));
  }

  /** Attach a source to an entity (provenance). */
  addSource(entityId, sourceId) {
    this.db.prepare(
      'INSERT OR IGNORE INTO entity_sources (entity_id, source_id) VALUES (?, ?)'
    ).run(entityId, sourceId);
  }

  /** Full version history (oldest first) for an entity. */
  history(id) {
    return this.db.prepare(
      'SELECT version, snapshot, changed_at FROM entity_versions WHERE entity_id = ? ORDER BY version'
    ).all(id).map((r) => Object.assign({}, r, { snapshot: parse(r.snapshot, {}) }));
  }

  count() { return this.db.prepare('SELECT COUNT(*) AS n FROM entities').get().n; }
}
module.exports = EntityRepository;
