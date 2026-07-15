# PetsInMyCity — Implementation Epics (Phase II)

> Companion to `ROADMAP.md`. Each Epic is a coherent unit of implementation work with explicit acceptance criteria. Estimates are relative order, not calendar dates.

Dependency spine (strict): **Epic 1 → Epic 2 → Epic 3 → Epic 4 → Epic 5**. Epic 6 (infra) can start in parallel once Epic 1 lands. Epic 7 (testing) runs continuously and gates every merge. Epic 8 (Texas) starts only after Austin is production-ready.

---

## Epic 1 — Knowledge Graph Foundation

**Objective.** Turn the verified Austin YAML into a queryable, versioned store that is the single system of record for knowledge.

**Scope.** Entity storage; relationships (edges); claims (subject/predicate/value); sources; verification status; confidence; versioning; change history. A validated **YAML → store loader** using the existing `research/austin/pilot/data/*.yaml` as input. Idempotent re-load.

**Dependencies.** Machine Schema (frozen); Austin verified dataset (exists).

**Repository impact.** New `services/knowledge/` (loader, models, migrations). No changes to existing site pages.

**Database impact.** First tables: `entities`, `claims`, `edges`, `sources`, `verifications`, plus a `claim_versions` history table. Primary keys on stable IDs already present in the YAML. Indexes on `(subject, predicate)` for claims, `entity.type`, and `safety_critical`. Constraints: every claim references a source; confidence enumerated; verification status enumerated.

**API impact.** None yet (Epic 3). Loader is a CLI/background task.

**Frontend impact.** None.

**Backend impact.** New Knowledge Service module owning all writes.

**Testing strategy.** Schema-validation of every YAML file; loader round-trip test (load → read back → equals source); history test (re-load with a changed claim creates a new version, preserves the old).

**Risks.** Store choice lock-in (mitigate with an abstract repository interface — ADR-0026); serverless DB connection model.

**Acceptance criteria.** (1) All Austin YAML loads with zero validation errors. (2) A claim can be fetched by `(subject, predicate)` returning value + confidence + verification + sources. (3) Changing one claim and re-loading produces a new version and retains history.

**Order.** First. Nothing works without it.

---

## Epic 2 — Knowledge Delivery Engine

**Objective.** Implement the KDP as the only read path over the graph. No consumer touches raw storage.

**Scope.** Knowledge queries; dependency resolution; rule execution; freshness evaluation; context assembly; delivery envelopes; caching. Implements the pipeline defined in `delivery/DELIVERY_ENGINE.md` (validation → rule evaluation → dependency resolution → context assembly → formatting → envelope).

**Dependencies.** Epic 1.

**Repository impact.** New `services/delivery/` (query planner, rule runner, freshness, envelope builder, cache).

**Database impact.** Read paths + a `dependencies` edge view; optional materialized freshness fields. Cache is out-of-DB (in-memory / edge cache to start).

**API impact.** Defines the internal query contract consumed by Epic 3.

**Frontend impact.** None.

**Backend impact.** Delivery Service; Rule Engine as a library invoked by the delivery pipeline (framework only — no hardcoded rules; rules are data per `delivery/RULE_ENGINE.md`).

**Testing strategy.** Query correctness tests; freshness/expiry tests; delivery-envelope shape tests; rule-execution unit tests with data-driven rule fixtures; cache invalidation tests.

**Risks.** Over-building the engine before a consumer needs it — mitigate by implementing only what Lucy + the Austin page require for MVP.

**Acceptance criteria.** (1) A single call returns a delivery envelope for "Austin leash rule" containing the value, confidence, freshness, and source citations. (2) An expired claim is flagged stale in the envelope. (3) A data-defined rule transforms a claim into a recommendation with a traceable reason.

**Order.** Second.

---

## Epic 3 — Internal APIs

**Objective.** Expose the delivery engine over HTTP so consumers integrate without linking the engine directly.

**Scope.** Internal endpoints for Knowledge, Lucy, Search, Recommendations, Maps, Notifications, My Pets. Implemented as Netlify Functions initially (matches current deployment), behind a stable `/api/*` contract.

**Dependencies.** Epic 2.

**Repository impact.** New/renamed functions under `netlify/functions/` (e.g. `knowledge.js`, extend `lucy-chat.js`). No new framework required for MVP.

**Database/Backend impact.** Each function calls the Delivery Service; none reads the store directly.

**Frontend impact.** Pages begin calling `/api/knowledge` instead of embedding facts.

**Testing strategy.** Contract tests per endpoint; auth/rate-limit smoke tests; integration test from HTTP → delivery → store.

**Risks.** Serverless cold-start + DB connections at scale (defer pooling optimization; acceptable for Austin MVP).

**Acceptance criteria.** (1) `GET /api/knowledge?subject=...&predicate=...` returns a delivery envelope. (2) Every MVP consumer has at least one working endpoint. (3) No endpoint bypasses the KDP.

**Order.** Third. Prioritize `/api/knowledge` (the vertical slice), then Lucy, then the rest.

---

## Epic 4 — Lucy Integration

**Objective.** Replace Lucy's hardcoded knowledge with retrieval-grounded answers.

**Scope.** Add a knowledge-injection slot to the Lucy system prompt; retrieve verified claims via `/api/knowledge` before answering; forbid inventing facts; expose confidence; surface uncertainty honestly; decline when the graph has no verified answer. Implements `delivery/LUCY_INTEGRATION.md`.

**Dependencies.** Epic 3 (at minimum `/api/knowledge`).

**Repository impact.** `netlify/functions/lucy-chat.js` (retrieval step + prompt slot); `assets/lucy*.js` (render confidence/citations).

**Frontend impact.** Lucy UI shows confidence and source attribution; uncertainty stated plainly.

**Backend impact.** Lucy function orchestrates retrieve → assemble context → generate.

**Testing strategy.** Grounding tests (answer matches retrieved claim); refusal tests (no verified data → Lucy declines, does not invent); safety tests (safety-critical claims never softened); editorial-tone tests.

**Risks.** Perceived fluency regression vs. free-form prompt — mitigate via editorial tests and honest-uncertainty UX rather than reverting to invention.

**Acceptance criteria.** (1) An Austin question is answered only from retrieved verified knowledge, with confidence shown. (2) With no verified answer, Lucy says so instead of guessing. (3) Zero hardcoded facts remain in the Lucy prompt path.

**Order.** Fourth. First real consumer; proves the whole spine end-to-end.

---

## Epic 5 — Austin MVP

**Objective.** Make every Austin surface graph-driven from one source of truth.

**Scope.** Knowledge-driven Austin city page; knowledge-driven Lucy (from Epic 4); knowledge-driven recommendations; knowledge-driven search; knowledge-driven map data; knowledge-driven My Pets alerts. Nothing hardcoded.

**Dependencies.** Epics 1–4; parts of Epic 6 for My Pets alerts.

**Repository impact.** `cities/austin/index.html` becomes a template hydrated from `/api/knowledge`; recommendation/search/map data sourced from delivery envelopes; `assets/my-pets.js` consumes alert events.

**Database/Backend impact.** Read-heavy; relies on Epics 1–3.

**Frontend impact.** Austin page rewired to fetch + render; other city pages untouched until Epic 8.

**Testing strategy.** End-to-end: change one verified claim → confirm it propagates to page, Lucy, recommendation, search, map, and My Pets alert with no code change. Regression tests on the Austin page.

**Risks.** Hidden hardcoded content in the existing 33 KB Austin HTML — audit and replace incrementally, section by section.

**Acceptance criteria.** (1) Austin page renders entirely from the KDP. (2) A single claim change propagates to all six Austin surfaces. (3) No Austin fact is authored in HTML/JS.

**Order.** Fifth. This is the MVP milestone.

---

## Epic 6 — Operational Infrastructure

**Objective.** Keep knowledge fresh and observable in production.

**Scope.** Background jobs; review queues; knowledge refresh; verification reminders; expiration processing; event bus; monitoring; logging; metrics. Implements `production/MAINTENANCE_SYSTEM.md` + `delivery/EVENT_SYSTEM.md` + `delivery/FRESHNESS_ENGINE.md`.

**Dependencies.** Epic 1 (can begin in parallel after it lands).

**Repository impact.** New `services/workers/` (scheduled functions), `services/events/` (bus abstraction).

**Database impact.** `review_queue`, `event_log` tables; freshness fields updated by workers.

**Frontend/Backend impact.** Events drive My Pets alerts and cache invalidation.

**Testing strategy.** Job idempotency tests; event delivery + ordering tests; expiration-triggers-review tests; monitoring alert tests.

**Risks.** Event-bus over-engineering — start with a minimal in-process/queue bus sufficient for Austin.

**Acceptance criteria.** (1) An expiring claim automatically enters the review queue. (2) A verified change emits an event that invalidates caches and updates dependent surfaces. (3) Metrics + logs exist for every worker.

**Order.** Parallel with Epics 4–5; required before Epic 8.

---

## Epic 7 — Testing

**Objective.** Make quality gates executable and continuous.

**Scope.** Knowledge validation; rule validation; API testing; integration testing; regression testing; safety testing; editorial validation; performance testing. CI runs on every PR.

**Dependencies.** Runs against all epics as they land.

**Repository impact.** `tests/` tree; CI workflow in `.github/workflows/`.

**Testing strategy.** This epic *is* the strategy: layered unit → integration → e2e, plus a safety suite that must pass before any merge touching safety-critical knowledge.

**Risks.** Flaky e2e against serverless — isolate with contract mocks where needed.

**Acceptance criteria.** (1) CI blocks merges on failing knowledge/schema validation. (2) Safety suite gates safety-critical changes. (3) Austin e2e propagation test runs in CI.

**Order.** Continuous from Epic 1 onward.

---

## Epic 8 — Texas Expansion

**Objective.** Prove repeatability: add a second Texas city with no new platform code.

**Scope.** Run the City Production System for one Texas city; load its verified data through the Epic 1 loader; confirm all surfaces work with zero code changes.

**Dependencies.** Austin MVP production-ready (Epics 1–7).

**Repository impact.** New `research/<city>/` data only. No service/API/UI code changes expected.

**Testing strategy.** Re-run the Austin e2e suite parameterized for the new city.

**Risks.** Discovering Austin-specific assumptions baked into code — that is the point of this epic; fix by generalizing, not forking.

**Acceptance criteria.** (1) A second city is fully live from loaded data alone. (2) Zero platform code changed to onboard it. (3) The onboarding runbook is repeatable.

**Order.** Last. Growth is by data, not code.
