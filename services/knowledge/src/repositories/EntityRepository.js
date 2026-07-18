'use strict';
/**
 * EntityRepository — identity + trust + stewardship envelope for knowledge objects.
 * All writes are append-only versioned: each mutation snapshots the row into
 * entity_versions and bumps the version counter, preserving full history.
 *
 * ADR-0027: every public method is async and runs against an "executor" (a storage
 * driver or an open transaction) exposing \`async execute({ sql, args })\`. The SQL,
 * bindings and hydration are identical across drivers; only I/O is awaited.
 */
const SAFETY = (v) => (v ? 1 : 0);
const jsonOrNull = (v) => (v == null ? null : JSON.stringify(v));
const parse = (v, d) => { if (v == null) return d; try { return JSON.parse(v); } catch (e) { return d; } };

class EntityRepository {
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

  async _snapshot(id) {
    const row = await this._get('SELECT * FROM entities WHERE id = @id', { id });
    if (!row) return;
    await this.db.execute({
      sql: 'INSERT OR REPLACE INTO entity_versions (entity_id, version, snapshot) VALUES (@entity_id, @version, @snapshot)',
      args: { entity_id: id, version: row.version, snapshot: JSON.stringify(row) },
    });
  }

  /**
   * Insert or update an entity by id. On update the previous state is snapshotted
   * and the version is incremented. Returns the entity id.
   */
  async upsert(e) {
    if (!e || !e.id) throw new Error('EntityRepository.upsert: entity.id is required');
    if (!e.type) throw new Error('EntityRepository.upsert: entity.type is required');
    if (!e.name) throw new Error('EntityRepository.upsert: entity.name is required');
    const existing = await this._get('SELECT version FROM entities WHERE id = @id', { id: e.id });
    if (existing) {
      await this._snapshot(e.id);
      await this.db.execute({
        sql: 'UPDATE entities SET type=@type, name=@name, aliases=@aliases, parent=@parent,'
          + ' geo=@geo, status=@status, role=@role, attributes=@attributes, confidence=@confidence,'
          + ' verification=@verification, safety_critical=@safety_critical, owner=@owner,'
          + ' last_reviewed=@last_reviewed, review_cadence=@review_cadence, next_review=@next_review,'
          + " version=version+1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=@id",
        args: this._params(e),
      });
    } else {
      await this.db.execute({
        sql: 'INSERT INTO entities (id, type, name, aliases, parent, geo, status, role, attributes,'
          + ' confidence, verification, safety_critical, owner, last_reviewed, review_cadence, next_review)'
          + ' VALUES (@id, @type, @name, @aliases, @parent, @geo, @status, @role, @attributes,'
          + ' @confidence, @verification, @safety_critical, @owner, @last_reviewed, @review_cadence, @next_review)',
        args: this._params(e),
      });
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

  async getById(id) {
    return this._hydrate(await this._get('SELECT * FROM entities WHERE id = @id', { id }));
  }

  async findByType(type) {
    const rows = await this._all('SELECT * FROM entities WHERE type = @type ORDER BY id', { type });
    return rows.map((r) => this._hydrate(r));
  }

  /** Attach a source to an entity (provenance). */
  async addSource(entityId, sourceId) {
    await this.db.execute({
      sql: 'INSERT OR IGNORE INTO entity_sources (entity_id, source_id) VALUES (@entity_id, @source_id)',
      args: { entity_id: entityId, source_id: sourceId },
    });
  }

  /** Full version history (oldest first) for an entity. */
  async history(id) {
    const rows = await this._all(
      'SELECT version, snapshot, changed_at FROM entity_versions WHERE entity_id = @id ORDER BY version',
      { id });
    return rows.map((r) => Object.assign({}, r, { snapshot: parse(r.snapshot, {}) }));
  }

  async count() {
    const row = await this._get('SELECT COUNT(*) AS n FROM entities');
    return row.n;
  }
}
module.exports = EntityRepository;
