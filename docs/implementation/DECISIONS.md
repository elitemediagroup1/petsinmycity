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
