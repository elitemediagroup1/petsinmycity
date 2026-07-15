# PetsInMyCity — Services Implementation Plan (Phase II)

> Which services to build, in what order, and how they map to the frozen architecture. Data flows one way: **Knowledge Graph → Knowledge Delivery Platform → Consumers.** No consumer touches storage directly.

## Services

1. **Knowledge Service** (Epic 1). Owns all writes and the storage abstraction. Provides the loader (YAML → store), versioning, and history. The only component that talks to the database.
2. **Delivery Service / KDP** (Epic 2). The single read path. Query planning, dependency resolution, freshness evaluation, context assembly, delivery-envelope construction, caching. Invokes the Rule Engine.
3. **Rule Engine** (Epic 2, library). Executes data-defined rules (no hardcoded rules) to transform claims into recommendations with traceable reasons. Per `delivery/RULE_ENGINE.md`.
4. **API Gateway / Internal APIs** (Epic 3). Thin HTTP layer (Netlify Functions initially) exposing the Delivery Service to consumers. Owns auth, rate limits, response shape.
5. **Freshness Service** (Epic 6). Evaluates expiry/review windows; flags stale knowledge; enqueues reviews.
6. **Event Bus** (Epic 6). Emits knowledge-change events; drives cache invalidation, My Pets alerts, and dependent-surface refresh. Per `delivery/EVENT_SYSTEM.md`.
7. **Background Workers** (Epic 6). Scheduled jobs: refresh, verification reminders, expiration processing, review-queue population. Per `production/MAINTENANCE_SYSTEM.md`.
8. **Notification Service** (post-MVP for real-time; MVP wires one alert path). Turns events into user-facing alerts.
9. **Recommendation Service** (Epic 5). Explainable recommendations, each tracing to verified knowledge via the Rule Engine.
10. **Search Service** (Epic 5). Queries the KDP; returns verified results with citations.

## Implementation order (and why)

1. **Knowledge Service** — nothing reads or writes without it.
2. **Delivery Service + Rule Engine** — the mandated single read path; build only what MVP consumers need.
3. **Internal APIs** — start with `/api/knowledge` (smallest end-to-end slice), then Lucy.
4. **Lucy** (via the Lucy endpoint) — first real consumer; validates the spine.
5. **Recommendation + Search + Maps wiring** — remaining Austin surfaces.
6. **Event Bus + Freshness + Workers** — in parallel once Knowledge Service exists; required for My Pets alerts and before Texas.

## Boundaries (non-negotiable)

- Only the Knowledge Service touches the database.
- Only the Delivery Service reads knowledge for consumers; **no consumer bypasses the KDP**.
- Rules are data, not code branches; the Rule Engine is a generic evaluator.
- Services align to the frozen architecture — no parallel/competing systems.
