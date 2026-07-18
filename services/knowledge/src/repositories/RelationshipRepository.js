'use strict';
/**
 * RelationshipRepository — typed edges between entities. Edges are immutable facts;
 * re-inserting the same (edge, from, to) is a no-op (idempotent load).
 *
 * ADR-0027: async, driver/transaction-based. SQL and bindings are unchanged.
 */
class RelationshipRepository {
  /** @param {object} executor a driver or transaction with async execute() */
  constructor(executor) { this.db = executor; }

  async _all(sql, args) {
    const rs = await this.db.execute({ sql, args });
    return rs.rows;
  }

  /** @param {object} e { edge, from, to, confidence? } @returns {boolean} inserted */
  async add(e) {
    if (!e || !e.edge) throw new Error('RelationshipRepository.add: edge type is required');
    if (!e.from || !e.to) throw new Error('RelationshipRepository.add: from and to are required');
    const rs = await this.db.execute({
      sql: 'INSERT OR IGNORE INTO edges (edge, from_id, to_id, confidence) VALUES (@edge, @from_id, @to_id, @confidence)',
      args: { edge: e.edge, from_id: e.from, to_id: e.to, confidence: e.confidence || null },
    });
    return rs.rowsAffected > 0;
  }

  /** Outgoing edges from an entity, optionally filtered by edge type. */
  async from(entityId, edgeType) {
    if (edgeType) {
      return this._all('SELECT * FROM edges WHERE from_id = @from_id AND edge = @edge', { from_id: entityId, edge: edgeType });
    }
    return this._all('SELECT * FROM edges WHERE from_id = @from_id', { from_id: entityId });
  }

  /** Incoming edges to an entity, optionally filtered by edge type. */
  async to(entityId, edgeType) {
    if (edgeType) {
      return this._all('SELECT * FROM edges WHERE to_id = @to_id AND edge = @edge', { to_id: entityId, edge: edgeType });
    }
    return this._all('SELECT * FROM edges WHERE to_id = @to_id', { to_id: entityId });
  }

  async byType(edgeType) {
    return this._all('SELECT * FROM edges WHERE edge = @edge', { edge: edgeType });
  }

  async count() {
    const rs = await this.db.execute({ sql: 'SELECT COUNT(*) AS n FROM edges' });
    return rs.rows[0].n;
  }
}
module.exports = RelationshipRepository;
