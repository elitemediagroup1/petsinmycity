

---

## ADR-0027 — Async knowledge layer + EMG Loop as the production durable-storage provider

**Status:** Accepted (implementation amendment under frozen Architecture v1.0). Supersedes the interim Turso/libSQL decision previously recorded under this number.

### Context

ADR-0026 abstracted storage behind the KnowledgeStore repository interface; the first concrete backend was synchronous SQLite via `better-sqlite3`. On Netlify Functions the filesystem is ephemeral, so the deployed API rebuilt a throwaway in-memory store from packaged Austin YAML on every cold start — not durable production storage.

An initial amendment made the whole knowledge layer asynchronous (correct, and retained) and selected a PetsInMyCity-owned Turso/libSQL database as the durable backend. That storage-ownership decision was locally reasonable but **incomplete**: it did not account for **EMG Loop**, the shared operating and persistence platform for all InMyCity properties. Loop — not each individual property — owns the durable data relationship (Loop persists through Neon). A PetsInMyCity-owned Turso database would be a competing, siloed system of record.

A Loop audit (emgloop-platform, at the time of writing) confirmed: a multi-tenant PostgreSQL/Prisma core scoped by `organizationId`; a versioned `/api/v1/` HTTP surface; a live **Loop Event Gateway** (`POST /api/v1/events`) that already ingests events from InMyCity producer sites using an `x-emg-loop-secret` shared-secret header and a producer-supplied `eventId` for idempotency; a domain event bus; and audit models. It also confirmed Loop has **no verified knowledge-graph service yet** (its planned `KnowledgeSource`/`KnowledgeChunk` models are an embedding-backed RAG document store, a different concept from PetsInMyCity's verified entity/claim/relationship graph). Loop is therefore the correct production system of record, but the specific knowledge endpoints must still be built on the Loop side.

### Decision

- **Retain** the fully asynchronous knowledge interfaces (store, repositories, transactions, importer, migrations, readiness, delivery service, API handler). Remote Loop communication is asynchronous, so the async migration remains correct and is kept.
- **Retain** SQLite (`better-sqlite3`) for isolated local development and automated tests only. It is an optional dependency and never ships in the deployed serverless path.
- **Use EMG Loop as the production durable-storage provider**, reached through a new `LoopKnowledgeStore` that implements the existing KnowledgeStore surface over an authenticated Loop HTTP client (`x-emg-loop-secret`, `/api/v1/knowledge/*`). Loop persists through Neon internally.
- **Prohibit** direct PetsInMyCity access to Neon (no connection strings, table names, or Prisma models leak into this repository). The boundary is the Loop service contract.
- **Keep the KDP (KnowledgeDeliveryService) as the sole delivery-policy authority.** Loop returns stored knowledge objects; PetsInMyCity's KDP alone enforces admission, freshness, ranking, conflict, provenance and safety-floor, and assembles the `kdp.v1` envelope. Delivery policy is NOT moved into Loop in this phase.
- **Fail closed.** A `loop` driver with missing base url or service token is rejected at config time; production never silently falls back to SQLite or an in-memory fixture.

### Stable external behavior (unchanged)

The Knowledge Graph and Machine Schema, the `getKnowledge()` request shape, the canonical `kdp.v1` delivery envelope, the typed delivery result states, the Internal Knowledge API request/HTTP-response contract, and all admission, freshness, provenance, ranking, conflict and safety behavior are unchanged. The Austin verified dataset and its factual meaning are unchanged. Only the internal execution model (async) and the production backend (Loop instead of Turso) change.

### Rejected alternatives

- **PetsInMyCity-owned Turso/libSQL** (the interim decision). Rejected: it makes a single property the durable system of record and competes with Loop, the shared persistence platform. Duplicating knowledge in Loop and Turso is explicitly rejected.
- **Direct Neon access from PetsInMyCity.** Rejected: leaks Loop's internal schema and credentials across a product boundary; breaks tenancy and ownership.
- **Synchronous remote wrappers / embedded-replica workarounds.** Rejected: fragile and serverless-inappropriate; embedded replicas still require async init/sync and a local filesystem replica.
- **Parallel synchronous and asynchronous service layers.** Rejected: doubles the trusted read path and invites drift.
- **Moving KDP delivery policy into Loop now.** Rejected until a shared-KDP-for-all-EMG-properties architecture is deliberately approved; for this phase PetsInMyCity remains the single delivery authority.
- **Deferring durable storage (runtime YAML/in-memory).** Rejected: not durable.

### Consequences

- PetsInMyCity PR #12 implements and tests the full provider contract now, against a mocked Loop (no credentials in CI).
- Production activation depends on a **separate, scoped Loop implementation PR** that adds the `/api/v1/knowledge/*` endpoints and a service-auth path (see docs/implementation/LOOP_KNOWLEDGE_CONTRACT.md).
- The async work is fully reusable; no duplicate database silo is created.
- Until Loop implements the contract, the `loop` driver is production-disabled by absence of configuration and fails closed; the integration is NOT production-operational yet, and the documentation says so.

### Migration impact & rollback

All internal callers use `await`; the delivery service and API handler are async; the Netlify function awaits a module-scoped initialization promise (warm reuse) and fails closed on init error. Drivers are switched by configuration; production never silently switches to temporary storage. Rollback is a normal code revert; imports are idempotent (deterministic idempotency key) and append-only history is preserved, so re-running an import after rollback does not double-write.
# PetsInMyCity — Implementation Decisions (ADRs, Phase II)

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
