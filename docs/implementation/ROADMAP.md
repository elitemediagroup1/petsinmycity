# PetsInMyCity — Platform Implementation Roadmap (Phase II)

> Status: Phase II — Implementation. Architecture v1.0 is frozen (Editorial OS, Knowledge OS, Knowledge Graph, Machine Schema, Austin Pilot, City Production System, Knowledge Delivery Platform). This document plans the build, not new architecture.

This roadmap converts the approved architecture into working software. The mindset from here forward is: **build, don't design**. Architecture changes are permitted only when implementation reveals a genuine technical limitation, and only via an ADR (blocker → why current architecture fails → alternatives → recommendation → migration impact).

See also: `EPICS.md`, `REPOSITORY_AUDIT.md`, `DATABASE_PLAN.md`, `SERVICES.md`, `API_PLAN.md`, `UI_PLAN.md`, `TECHNICAL_DEBT.md`.

---

## 1. Where we are today (implementation reality)

The platform is a **static website deployed on Netlify** with a thin layer of **serverless functions**. There is no application server, no database, and no build pipeline. The verified Austin knowledge exists only as flat YAML/Markdown files in `research/austin/`.

Concretely:

- **Frontend:** hand-authored static HTML per route (`cities/austin/index.html`, `lucy/`, `my-pets/`, `tools/*`, service pages). Client JS in `assets/` (`lucy.js`, `lucy-decision-engine.js`, `my-pets.js`, `analytics.js`).
- **Backend:** four Netlify Functions — `lucy-chat.js` (Anthropic SDK), `places-search.js` (Google Places), `pet-tools.js`, `indexnow-relay.js`.
- **Data store:** none. Verified knowledge lives in `research/austin/pilot/data/*.yaml` (entities, claims, edges, hazards) and `research/austin/graph/*.yaml`.
- **Stack:** Node serverless, `@anthropic-ai/sdk`, `node-fetch`. No framework, no ORM, no DB, no test suite.

### The core problem

Lucy today runs on a ~7.4 KB **hardcoded system prompt** with no slot for injecting verified knowledge. She answers from the model's parametric memory and emits hardcoded Google Maps URL templates. **Nothing reads from the Knowledge Graph, because there is no queryable Knowledge Graph yet — only files.** The architecture describes a graph-driven platform; the software to make that real does not exist.

### The one-sentence gap

> To make the approved architecture real we must: (1) load verified knowledge into a queryable store, (2) put the Knowledge Delivery Platform in front of it as the only read path, and (3) rewire every consumer — starting with Lucy and the Austin page — to read from the KDP instead of hardcoded content.

---

## 2. MVP definition

**Austin, fully graph-driven.** The MVP is complete when every Austin-facing surface is rendered from one source of truth (the Knowledge Graph, served through the KDP) with zero hardcoded facts:

- Austin city page content assembled from verified knowledge objects.
- Lucy answers Austin questions from retrieved verified knowledge, cites confidence, and refuses to invent facts.
- Austin recommendations, search results, and map data all trace back to verified claims.
- My Pets alerts for Austin derive from event-driven knowledge changes.

Austin is not special — it is the **reference implementation**. The MVP's real deliverable is a repeatable loading + delivery pipeline so that adding a city means loading its verified data, not writing new code.

**Explicitly out of MVP scope:** Texas/multi-city rollout, external developer APIs, mobile apps, other EMG properties, real-time push notifications infrastructure, and any UI redesign beyond wiring existing pages to the KDP.

---

## 3. Recommended build order (epics)

The dependency chain is strict at the bottom and parallelizable at the top:

1. **Epic 1 — Knowledge Graph Foundation** (storage for entities, relationships, claims, sources, verification, confidence, versioning, history). *Everything depends on this.*
2. **Epic 2 — Knowledge Delivery Engine** (queries, dependency resolution, rule execution, freshness, context assembly, delivery envelopes, caching). *The only read path.*
3. **Epic 3 — Internal APIs** (thin HTTP layer over the delivery engine for each consumer).
4. **Epic 4 — Lucy Integration** (retrieval-grounded Lucy; no invented facts; exposes confidence + uncertainty). *First real consumer.*
5. **Epic 5 — Austin MVP** (city page, recommendations, search, maps, My Pets alerts — all graph-driven).
6. **Epic 6 — Operational Infrastructure** (background jobs, review queues, refresh, expiration, event bus, monitoring). *Can begin in parallel with Epic 4/5.*
7. **Epic 7 — Testing** (validation, integration, regression, safety, performance). *Runs continuously; gated before each merge.*
8. **Epic 8 — Texas Expansion** (only after Austin is production-ready).

Full breakdown with acceptance criteria in `EPICS.md`.

---

## 4. Implementation phases

**Phase A — Data spine (Epics 1–2).** Stand up the store, load Austin's verified YAML through a validated import, and expose a single internal read path (the KDP query surface). Exit criterion: a query for "Austin leash rule" returns a verified claim with confidence + sources, in code.

**Phase B — First consumer (Epics 3–4).** Wrap the delivery engine in internal APIs and rewire Lucy to retrieve instead of recall. Exit criterion: Lucy answers an Austin question using only retrieved knowledge and declines when the graph has no verified answer.

**Phase C — Austin surfaces (Epic 5 + relevant parts of 6/7).** Make the Austin page, recommendations, search, and maps graph-driven; wire one event-driven My Pets alert path. Exit criterion: changing one verified claim propagates to every Austin surface with no code change.

**Phase D — Harden + repeat (Epics 6–7, then 8).** Complete operational infra and the test suite, then prove repeatability by loading a second Texas city through the identical pipeline.

---

## 5. Risks

- **Store choice lock-in.** Picking the wrong persistence model early is expensive. Mitigation: keep the KDP query interface abstract so storage is swappable (ADR-0026).
- **Lucy grounding regressions.** Retrieval-grounded Lucy may feel less fluent than the current free-form prompt. Mitigation: safety + editorial tests gate every change; uncertainty is surfaced honestly rather than hidden.
- **Serverless + database mismatch.** Netlify Functions are stateless and short-lived; a naive DB connection per invocation will not scale. Mitigation: connection pooling / serverless-friendly store; evaluate in Epic 1.
- **Data drift between files and store.** During transition, YAML files and the loaded store can diverge. Mitigation: treat YAML as the source of record and the store as a built artifact; re-load is idempotent.
- **Scope creep back into architecture.** The temptation to redesign. Mitigation: the ADR gate — no architecture change without a proven blocker.

---

## 6. Quick wins (low effort, high signal)

- Add a **knowledge-injection slot** to the Lucy system prompt so retrieved claims can be passed in before the full engine exists (unblocks Epic 4 incrementally).
- Write a **YAML → store loader** for the existing Austin data; it doubles as the schema-validation harness.
- Add a **`/api/knowledge` read endpoint** returning a verified claim by subject+predicate — the smallest end-to-end vertical slice through the whole architecture.
- Stand up a **CI check** that validates all `*.yaml` knowledge files against the Machine Schema on every PR (catches bad data before it ships).

---

## 7. Long-term implementation strategy

After Austin MVP, the platform grows by **data, not code**. City onboarding becomes a City Production System run that ends in a validated load; the KDP and consumers are untouched. New consumers (external APIs, mobile, other EMG properties) attach to the same delivery envelopes without changing the core. The permanent operating rhythm is: verify knowledge → load it → the platform delivers it everywhere. Working software over documentation; incremental change over rewrites; evidence-gated architecture only.
