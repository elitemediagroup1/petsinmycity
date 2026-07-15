# PetsInMyCity — Technical Debt Assessment (Phase II)

> Classified as Must fix (blocks MVP), Should fix (medium-term), Nice to have (long-term).

## Must fix (immediate blockers)

- **No queryable store.** Knowledge is trapped in flat files; nothing can read it at runtime. (Epic 1)
- **Lucy invents facts.** Hardcoded system prompt with no knowledge-injection slot; violates the core rule that consumers read verified knowledge. (Epic 4)
- **No knowledge API / delivery engine.** The mandated single read path does not exist. (Epics 2–3)
- **No tests or CI.** No way to gate safety-critical or knowledge changes before shipping. (Epic 7)

## Should fix (medium-term)

- **Hardcoded map URL templates in Lucy** — replace with verified place entities + `places-search` plumbing.
- **Facts embedded in city-page HTML** — migrate to KDP hydration (Austin first; others in Epic 8).
- **Serverless DB connection model** — introduce pooling / HTTP data layer before scale.
- **No event bus / freshness jobs** — stale knowledge cannot auto-enter review. (Epic 6)
- **No build/deploy pipeline for services** — needed once `services/` exists; keep additive so the static site keeps deploying.

## Nice to have (long-term)

- External/developer API surface, versioning contracts, rate-limit tiers.
- Advanced caching + performance tuning beyond MVP needs.
- Generalizing all six existing city pages to the KDP (folds into repeatable onboarding).
- Observability depth (tracing, dashboards) beyond baseline metrics/logs.

## Principle

Never rewrite a working system for cleanliness. Pay down debt incrementally, guided by what the Austin MVP actually requires. Architecture changes require evidence and an ADR.
