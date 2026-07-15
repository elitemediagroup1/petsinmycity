'use strict';
/**
 * RelationshipRepository — typed edges between entities. Edges are immutable facts;
 * re-inserting the same (edge, from, to) is a no-op (idempotent load).
 */
class RelationshipRepository {
  constructor(db) { this.db = db; }

  /** @param {object} e { edge, from, to, confidence? } */
  add(e) {
    if (!e || !e.edge) throw new Error('RelationshipRepository.add: edge type is required');
    if (!e.from || !e.to) throw new Error('RelationshipRepository.add: from and to are required');
    const info = this.db.prepare(
      'INSERT OR IGNORE INTO edges (edge, from_id, to_id, confidence) VALUES (?, ?, ?, ?)'
    ).run(e.edge, e.from, e.to, e.confidence || null);
    return info.changes > 0;
  }

  /** Outgoing edges from an entity, optionally filtered by edge type. */
  from(entityId, edgeType) {
    if (edgeType) {
      return this.db.prepare('SELECT * FROM edges WHERE from_id = ? AND edge = ?').all(entityId, edgeType);
    }
    return this.db.prepare('SELECT * FROM edges WHERE from_id = ?').all(entityId);
  }

  /** Incoming edges to an entity, optionally filtered by edge type. */
  to(entityId, edgeType) {
    if (edgeType) {
      return this.db.prepare('SELECT * FROM edges WHERE to_id = ? AND edge = ?').all(entityId, edgeType);
    }
    return this.db.prepare('SELECT * FROM edges WHERE to_id = ?').all(entityId);
  }

  byType(edgeType) {
    return this.db.prepare('SELECT * FROM edges WHERE edge = ?').all(edgeType);
  }

  count() { return this.db.prepare('SELECT COUNT(*) AS n FROM edges').get().n; }
}
module.exports = RelationshipRepository;
