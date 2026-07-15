# PetsInMyCity — Database Implementation Plan (Phase II)

> Not a new schema. The Machine Schema is frozen. This is the **implementation order** for turning the verified Austin YAML into a queryable, versioned store.

The verified data already has a clear shape (from `research/austin/pilot/data/*.yaml`): entities carry `type`, `name`, `aliases`, `status`, `confidence`, `verification`, `safety_critical`, `attributes`, `sources`; claims carry `subject`, `predicate`, `value`, `confidence`, `verification`, `safety_critical`, `sources`, `valid_from`, `review_by`, `expires`; edges connect entities. The store mirrors this exactly.

## Persistence choice

The KDP query interface must stay abstract so the store is swappable (ADR-0026). Start with a **serverless-friendly relational store** (Postgres-compatible with pooling, or an HTTP data layer) because claims/edges are relational and verification/freshness need constraints and indexes. A document store remains an option behind the same repository interface if implementation shows relational joins are a bottleneck.

## Tables (build order)

1. `sources` — id, url, publisher, kind, retrieved_at, notes. **Built first** because every claim/entity references a source (FK integrity).
2. `entities` — id, type, name, aliases (json), status, confidence, verification, safety_critical, attributes (json), owner, review_cadence, next_review.
3. `claims` — id, subject (entity id), predicate, value (json), confidence, verification, safety_critical, valid_from, valid_until, expires, review_by, note.
4. `edges` — id, from_entity, to_entity, relationship, confidence, sources.
5. `claim_sources` / `entity_sources` — join tables (many-to-many to `sources`).
6. `claim_versions` — full history rows written on every change (append-only).
7. (Epic 6) `review_queue`, `event_log`.

## Indexes

- `claims (subject, predicate)` — the primary read pattern (Lucy/page lookups). Build with the table.
- `claims (expires)` and `claims (review_by)` — freshness/expiration jobs.
- `claims (safety_critical)` and `entities (safety_critical)` — safety gating.
- `entities (type)`; `edges (from_entity)`, `edges (to_entity)`.

## Constraints

- Every `claim` and `entity` must reference at least one `source` (enforced via join + application check).
- `confidence` and `verification` are enumerated (match Machine Schema values).
- `safety_critical` claims cannot be soft-deleted; changes always version.
- Append-only history: no in-place edits without a `claim_versions` row.

## Migrations

Ordered, forward-only, checked into `services/knowledge/migrations/`. Migration 0001 creates `sources`; 0002 `entities`; 0003 `claims`; 0004 `edges`; 0005 join tables; 0006 `claim_versions` + triggers/app-hooks for history. Each migration is independently reversible in dev.

## Seed data — loading Austin

1. Validate every `research/austin/**.yaml` against the Machine Schema (fail closed).
2. Upsert `sources`, then `entities`, then `claims`, then `edges` (dependency order).
3. Record a load manifest (dataset id + content hash) so re-loads are idempotent and diffable.
4. Re-running the loader after a YAML change writes new `claim_versions` and updates freshness fields — no manual DB edits ever.

Austin is the reference load. Every future city repeats steps 1–4 with its own `research/<city>/` data and **zero schema changes**.
