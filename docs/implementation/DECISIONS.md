

---

## ADR-0027 — Durable serverless storage: make the knowledge layer asynchronous and add a libSQL/Turso driver

**Status:** Accepted (implementation amendment under frozen Architecture v1.0; approved on a proven blocker).

**Context / production runtime problem.** ADR-0026 abstracted storage behind the KnowledgeStore repository interface, and the first concrete backend was SQLite via `better-sqlite3` (synchronous, file-based). On Netlify Functions the filesystem is ephemeral and effectively read-only at runtime, so the deployed API had to build a throwaway in-memory store from packaged Austin YAML on every cold start. That is not durable production storage: it cannot accept verified updates, it is rebuilt on every deploy and cold start, and it ties the deployed runtime to the native `better-sqlite3` binary. Durable serverless storage requires a *remote* database.

**The blocker.** Every genuinely durable remote serverless database exposes an **asynchronous** client (network I/O), while the existing repositories were **synchronous** (`db.prepare(sql).get()`, `db.transaction(fn)()`). There is no correct way to expose remote async I/O behind a synchronous method: blocking wrappers, child processes, busy-waiting, `deasync`, and fake synchronous adapters are fragile and serverless-inappropriate. Embedded replicas were also rejected: they require asynchronous initialization and sync, rely on a local filesystem replica, and are the wrong durable foundation for disposable Function instances.

**Decision.** Make all knowledge-layer repository, store, importer, migration, readiness, delivery, and API-handler interfaces **promise-based**, and add a durable remote KnowledgeStore driver built on **`@libsql/client`** (libSQL / Turso). SQLite is retained for local development and tests by adapting the existing repositories to the same asynchronous contract (the SQLite work completes immediately but is awaited for interface parity). A single `createKnowledgeStore()` factory selects the driver from configuration and fails closed in production.

**Why `@libsql/client` / libSQL.** It is the smallest durable backend that preserves the existing contracts: libSQL is a SQLite fork, so the existing SQL dialect ports without a rewrite (`strftime`, `INSERT OR REPLACE`/`INSERT OR IGNORE`, `ON CONFLICT DO UPDATE`, `AUTOINCREMENT`, and named `@param` bindings are all supported); it offers a secret-free local mode (`:memory:` and `file:`) for CI plus durable remote access (`libsql://` + auth token) for Netlify; it has zero native-binary requirement in the deployed path; it exposes interactive transactions and atomic write batches sufficient for the repositories' append-only versioning; and it is the production-ready, battle-tested client (per official Turso documentation). Vendor-specific code is confined to one driver module behind KnowledgeStore.

**Why SQLite remains for local/test.** Zero configuration, no credentials, deterministic and fast in CI, and — because libSQL shares SQLite's dialect — the same SQL and migrations exercise both drivers. Removing it would make ordinary CI depend on production secrets, which is disallowed.

**Stable external behavior (unchanged).** The Knowledge Graph and Machine Schema, the `getKnowledge()` request shape, the canonical `kdp.v1` delivery envelope, the typed delivery result states, the Internal Knowledge API request/HTTP-response contract, and all admission, freshness, provenance, ranking, conflict, and safety behavior are unchanged. Only the internal execution model changes from synchronous to asynchronous.

**Rejected alternatives.**
- *Managed PostgreSQL.* Durable and mature, but forces a SQL-dialect and binding rewrite (`strftime`→`to_char`, SQLite upserts→Postgres `ON CONFLICT`, `AUTOINCREMENT`→`SERIAL`/identity, `@name`→`\$1` positional), i.e. two independently evolving schemas — the opposite of the requirement to reuse one schema. Deferred; see trigger conditions below.
- *`@tursodatabase/serverless`.* Promising fetch-only client, but newer and with a different prepare/statement API surface; `@libsql/client` is the battle-tested standard with the closest binding parity. Revisit later.
- *Blocking a remote client behind a fake synchronous interface.* Fragile, serverless-inappropriate. Rejected.
- *Embedded replica solely to preserve synchronous calls.* Still async to init/sync; wrong fit for disposable Functions. Rejected.
- *Parallel synchronous and asynchronous service layers.* Doubles the trusted read path and invites drift. Rejected.
- *Deferring durable storage and keeping runtime YAML/in-memory.* Not durable; fails the mission. Rejected.

**Migration impact.** All internal callers use `await`. The delivery service and API handler become `async`; the Netlify function awaits a module-scoped initialization promise (warm reuse) and awaits the handler. Tests are updated to await the interfaces. No consumer above the KnowledgeStore boundary learns which driver is active.

**Rollback strategy.** Code reverts to the previous release independently. Migrations are versioned and tracked in `schema_migrations`; imports are idempotent; append-only history is preserved; no destructive down-migration is required for ordinary rollback. Drivers can be switched by configuration in non-production environments; production never silently switches to temporary storage. If the durable driver fails after deployment, the API fails closed with a safe typed 500/service-unavailable rather than serving stale or ephemeral data.

**Vendor-specific risks.** Turso is a managed vendor (availability, pricing, and account dependency). Risk is bounded because the SQL is standard SQLite dialect and the code is isolated to one driver module; a move to PostgreSQL or another libSQL host is a driver-scoped change.

**Conditions that would trigger a future move to PostgreSQL (or another backend).** Sustained need for high-concurrency writes, relational features beyond SQLite's dialect, multi-region primaries, or provider/cost constraints that libSQL/Turso cannot meet. Such a move would be a new ADR and would remain behind the same KnowledgeStore interface.# PetsInMyCity — Implementation Decisions (ADRs, Phase II)

> Architecture v1.0 is frozen. Implementation-level decisions are recorded here. Numbering continues the project sequence (…0025 in `delivery/DECISIONS.md`).

---

## ADR-0026 — Abstract the storage layer behind the KDP query interface

**Status:** Accepted (implementation decision; does not change frozen architecture).

**Context / implementation reality.** The Knowledge Graph and Machine Schema define *what* knowledge is, not *which database* stores it. Implementation must pick a concrete store, but the platform is deployed on stateless Netlify Functions where a naive per-invocation database connection will not scale, and the correct long-term store (relational vs. document vs. graph vs. HTTP data layer) is not yet proven by real query patterns.

**Why deciding the store now (and hardcoding it) fails.** Committing consumers directly to a specific database would (1) risk lock-in before query patterns are known, (2) couple every consumer to storage in violation of the KDP's single-read-path rule, and (3) make a later store change a platform-wide rewrite.

**Alternatives considered.**
- *Pick a store and let services query it directly.* Fastest short-term; violates KDP boundary; expensive to change. Rejected.
- *Defer all persistence and keep reading YAML at runtime.* No lock-in but cannot meet query/freshness/versioning needs; not a real platform. Rejected.
- *Abstract storage behind a repository interface owned by the Knowledge Service, with the KDP as the sole read path.* Preserves the frozen architecture, allows the concrete store to change without touching consumers, and lets query patterns from the Austin MVP inform the eventual choice. **Selected.**

**Decision.** All persistence lives behind a repository interface inside the Knowledge Service. Consumers read only through the KDP delivery envelopes. The first concrete implementation is a serverless-friendly relational store; it may be replaced later behind the same interface without consumer changes.

**Trade-offs.** A thin abstraction layer adds indirection and a small amount of up-front code. Accepted, because it protects the frozen architecture and keeps the store swappable.

**Migration impact.** None to existing pages during MVP. Future store changes are isolated to the Knowledge Service; the loader (YAML → store) and repository interface absorb the change. The KDP, APIs, Lucy, and UI are unaffected.

**Future implications.** Enables evidence-based re-evaluation of the store after Austin without redesign, and lets future EMG properties and external APIs attach at the KDP layer regardless of the underlying database.
