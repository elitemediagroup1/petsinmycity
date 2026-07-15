# Knowledge Graph Storage Foundation

Production storage layer for the PetsInMyCity Knowledge Graph. This is PR #9 of Phase II — the first real production code. It implements **only** persistent storage; retrieval/delivery, rules, Lucy, recommendations, search, and UI are explicitly out of scope and come in later PRs.

It implements the frozen **Machine Schema** envelope (`docs/editorial/knowledge-graph/MACHINE_SCHEMA.yaml`) — identity, trust, stewardship, provenance — as a relational schema. No parallel schema was invented.

## Why SQLite (for now)

The repository audit found a static site plus stateless Netlify Functions, no database, no build step, no tests. Given the mission (a durable foundation optimized for correctness, maintainability, and a clear migration path — not premature optimization), the first concrete backend is **SQLite via `better-sqlite3`**:

- Zero-config and file-based — no server to run for local dev, CI, or build-time loading.
- Synchronous API — simple, correct, easy to test.
- Plain-SQL migrations that **port directly to PostgreSQL or libSQL/Turso** for serverless production, with no schema rewrite.

The concrete backend is hidden behind the `KnowledgeStore` abstraction (ADR-0026), so it can be swapped without changing any consumer.

## Layout

```
services/knowledge/
  migrations/0001_init.sql        SQL schema (envelope -> tables, indexes, versioning)
  src/db.js                       connection + migration runner
  src/KnowledgeStore.js           storage abstraction facade (the seam services build on)
  src/index.js                    public entry point
  src/repositories/               EntityRepository, ClaimRepository,
                                  RelationshipRepository, SourceRepository
  src/import/importDataset.js     YAML -> store importer (reuses existing data)
  scripts/migrate.js              apply migrations to a db file
  scripts/load-austin.js          load research/austin/pilot/data into the store
  test/                           automated tests (node --test)
```

## Data model

Every knowledge object carries the envelope: **identity** (`id`, `type`, `name`, `aliases`, `parent`, `geo`, `status`), **trust** (`confidence`, `verification`, `safety_critical`), **stewardship** (`owner`, `last_reviewed`, `review_cadence`, `next_review`), and **provenance** (`sources`).

- `entities` — identity/trust/stewardship for a knowledge object.
- `claims` — `(subject, predicate, value)` statements with trust + validity/freshness.
- `edges` — typed relationships between entities.
- `sources` — provenance records, linked many-to-many via `entity_sources` / `claim_sources`.
- `entity_versions` / `claim_versions` — append-only snapshots preserving full history.

## Usage

```js
const { KnowledgeStore } = require('./services/knowledge/src');
const store = KnowledgeStore.open(':memory:'); // or a file path
store.entities.upsert({ id: 'city_austin', type: 'place', name: 'Austin' });
store.claims.findBySubject('city_austin', 'leash_rule');
```

Load the verified Austin dataset (reuses `research/austin/pilot/data/`):

```
cd services/knowledge
npm install
npm run load:austin
npm test
```

## Guarantees

- **Idempotent load** — re-running the importer upserts records and ignores duplicate edges; the YAML files remain the source of record.
- **Full history** — every mutation snapshots the prior state and bumps a version counter.
- **Provenance preserved** — sources are never lost; entities and claims always resolve their sources.
- **Portable** — the SQL migrations move to Postgres/libSQL unchanged.

## Migration strategy

Migrations are forward-only SQL files in `migrations/`, applied in lexical order and recorded in `schema_migrations` (so re-running is safe). Moving to a server database later means pointing `openDatabase` at the new driver and running the same migration files; the repositories and all consumers are unaffected.
