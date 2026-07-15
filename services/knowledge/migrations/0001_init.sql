-- Knowledge Graph Storage — Migration 0001: initial schema
-- Implements the Machine Schema envelope (identity / trust / stewardship / provenance)
-- as a relational schema. SQLite dialect; portable to PostgreSQL (see MIGRATIONS notes).
--
-- Every knowledge object (entity, claim) carries the same envelope fields.
-- Provenance (sources) is stored once and linked many-to-many.
-- All mutations are append-only versioned via *_versions tables.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- sources: provenance records. Referenced by entities and claims.
-- Built first because trust/provenance requires a source to exist.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sources (
  id           TEXT PRIMARY KEY,          -- stable source id (hash or explicit)
  tier         INTEGER,                   -- source tier (1 = primary/official ...)
  kind         TEXT,                      -- e.g. government, veterinary, news
  url          TEXT,
  accessed     TEXT,                      -- ISO-8601 date the source was accessed
  quote        TEXT,                      -- optional supporting excerpt
  captured_by  TEXT,                      -- who/what captured it
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ---------------------------------------------------------------------------
-- entities: identity + trust + stewardship envelope for a knowledge object.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entities (
  id             TEXT PRIMARY KEY,        -- stable entity id from the dataset
  type           TEXT NOT NULL,           -- place | facility | organization | care_concept | signal
  name           TEXT NOT NULL,
  aliases        TEXT,                    -- JSON array of alternative names
  parent         TEXT,                    -- optional parent entity id (structural)
  geo            TEXT,                    -- JSON: geo descriptor if present
  status         TEXT NOT NULL DEFAULT 'active',  -- lifecycle status
  role           TEXT,                    -- optional role descriptor
  attributes     TEXT,                    -- JSON: free-form verified attributes
  -- trust
  confidence     TEXT,                    -- confidence band (see confidence_bands)
  verification   TEXT,                    -- verification state (see LIFECYCLE)
  safety_critical INTEGER NOT NULL DEFAULT 0,  -- 0/1 boolean
  -- stewardship
  owner          TEXT,
  last_reviewed  TEXT,
  review_cadence TEXT,
  next_review    TEXT,
  -- bookkeeping
  version        INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (parent) REFERENCES entities(id)
);
CREATE INDEX IF NOT EXISTS idx_entities_type            ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_safety_critical ON entities(safety_critical);
CREATE INDEX IF NOT EXISTS idx_entities_parent          ON entities(parent);

-- ---------------------------------------------------------------------------
-- claims: a verifiable statement (subject, predicate, value) with the envelope.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claims (
  id              TEXT PRIMARY KEY,
  subject         TEXT NOT NULL,          -- entity id the claim is about
  predicate       TEXT NOT NULL,          -- relationship/attribute name
  value           TEXT NOT NULL,          -- JSON-encoded value (string/number/object)
  -- trust
  confidence      TEXT,
  verification    TEXT,
  safety_critical INTEGER NOT NULL DEFAULT 0,
  -- validity / freshness
  valid_from      TEXT,
  valid_until     TEXT,
  expires         TEXT,
  review_by       TEXT,
  note            TEXT,
  -- bookkeeping
  version         INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (subject) REFERENCES entities(id)
);
CREATE INDEX IF NOT EXISTS idx_claims_subject_predicate ON claims(subject, predicate);
CREATE INDEX IF NOT EXISTS idx_claims_expires           ON claims(expires);
CREATE INDEX IF NOT EXISTS idx_claims_review_by         ON claims(review_by);
CREATE INDEX IF NOT EXISTS idx_claims_safety_critical   ON claims(safety_critical);

-- ---------------------------------------------------------------------------
-- edges: typed relationships between entities.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS edges (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  edge         TEXT NOT NULL,             -- edge type (see RELATIONSHIPS.md)
  from_id      TEXT NOT NULL,
  to_id        TEXT NOT NULL,
  confidence   TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (from_id) REFERENCES entities(id),
  FOREIGN KEY (to_id)   REFERENCES entities(id),
  UNIQUE (edge, from_id, to_id)
);
CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_id);
CREATE INDEX IF NOT EXISTS idx_edges_to   ON edges(to_id);
CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(edge);

-- ---------------------------------------------------------------------------
-- provenance join tables: entities/claims <-> sources (many-to-many).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entity_sources (
  entity_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  PRIMARY KEY (entity_id, source_id),
  FOREIGN KEY (entity_id) REFERENCES entities(id),
  FOREIGN KEY (source_id) REFERENCES sources(id)
);
CREATE TABLE IF NOT EXISTS claim_sources (
  claim_id  TEXT NOT NULL,
  source_id TEXT NOT NULL,
  PRIMARY KEY (claim_id, source_id),
  FOREIGN KEY (claim_id)  REFERENCES claims(id),
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

-- ---------------------------------------------------------------------------
-- version history: append-only snapshots written on every mutation.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entity_versions (
  entity_id  TEXT NOT NULL,
  version    INTEGER NOT NULL,
  snapshot   TEXT NOT NULL,               -- JSON snapshot of the row
  changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (entity_id, version)
);
CREATE TABLE IF NOT EXISTS claim_versions (
  claim_id   TEXT NOT NULL,
  version    INTEGER NOT NULL,
  snapshot   TEXT NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (claim_id, version)
);

-- ---------------------------------------------------------------------------
-- schema_migrations: which migrations have been applied.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
