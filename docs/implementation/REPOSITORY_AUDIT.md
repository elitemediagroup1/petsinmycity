# PetsInMyCity — Repository & Implementation Audit (Phase II)

> One-time implementation audit. The question is not "what does the documentation say?" but "what software is missing to make the approved architecture actually work?"

## Current technology stack

- **Hosting/deploy:** Netlify. `netlify.toml` defines a publish directory, a functions directory, one plugin, headers, and a redirect rule.
- **Frontend:** hand-authored static HTML per route. No framework, no bundler, no build step. Client JS in `assets/` (`lucy.js`, `lucy-decision-engine.js`, `lucy-welcome.js`, `my-pets.js`, `analytics.js`).
- **Backend:** four Netlify serverless functions — `lucy-chat.js`, `places-search.js`, `pet-tools.js`, `indexnow-relay.js`.
- **Dependencies:** `@anthropic-ai/sdk` (Lucy), `node-fetch` (Places). Nothing else.
- **Data store:** none. Knowledge lives as YAML/Markdown in `research/austin/`.
- **Tests:** none. **CI:** none.

## What code already exists

- **Lucy chat function** (~241 lines): calls Anthropic with a ~7.4 KB hardcoded `SYSTEM_PROMPT`. Env: `LUCY_MODEL`, `ANTHROPIC_API_KEY`. Model: `claude-sonnet-4-5`. Emits hardcoded Google Maps URL templates. No knowledge retrieval; no injection slot.
- **Places search function** (~78 lines): geocodes a city then queries Google Places. Env: `GOOGLE_PLACES_API_KEY`. This is real map data plumbing worth reusing.
- **Pet tools + IndexNow functions:** utility endpoints; peripheral to the knowledge platform.
- **City pages:** `cities/austin` (33 KB, richest), plus chicago/denver/houston/phoenix/seattle (~22 KB each) — all static, hand-authored.
- **Verified Austin knowledge:** `research/austin/pilot/data/` — `entities.orgs.yaml`, `entities.places.yaml`, `claims.yaml`, `edges.yaml`, `concepts.hazards.yaml`; plus `graph/austin.entities.yaml`, `austin.relationships.yaml`, `austin.skeleton.yaml`. This is the seed dataset for the store.
- **Architecture docs:** `docs/` (Editorial OS, Knowledge OS, Knowledge Graph, Machine Schema), `production/` (City Production System), `delivery/` (Knowledge Delivery Platform). Frozen; the blueprint to implement against.

## What software is missing (the real gap)

1. **A queryable store.** Knowledge exists only as files. Nothing can query "Austin leash rule" at runtime.
2. **A loader.** No path from verified YAML into a store; no validation-on-load.
3. **The delivery engine.** The KDP is fully specified but unimplemented — no query/rule/freshness/envelope code.
4. **A knowledge API.** No `/api/knowledge` endpoint; consumers cannot read verified data.
5. **Retrieval-grounded Lucy.** Lucy invents/recalls instead of retrieving; no injection slot; no confidence/uncertainty surfacing.
6. **Graph-driven pages.** City pages embed facts in HTML instead of hydrating from the KDP.
7. **Operational infra.** No workers, event bus, review queues, freshness jobs, monitoring.
8. **Tests + CI.** No automated validation, safety gating, or regression coverage.

## Reuse / replace / refactor / leave-alone

- **Reuse:** Netlify Functions deployment model; `places-search.js` (map plumbing); Anthropic integration in `lucy-chat.js`; the verified Austin YAML (becomes seed data); all frozen architecture docs.
- **Refactor:** `lucy-chat.js` — keep the transport + Anthropic call, replace the hardcoded knowledge with retrieval. `cities/austin/index.html` — convert to a template hydrated from the KDP.
- **Replace:** hardcoded facts and Google Maps URL templates inside Lucy's prompt (superseded by graph-sourced answers + real map data).
- **Leave untouched (for now):** other city pages, service pages, tools, `indexnow-relay.js`, `pet-tools.js`. Do not rewrite working systems for cleanliness — prefer incremental change.

## Technical constraints discovered

- **Serverless statelessness:** functions are short-lived; a naive per-invocation DB connection will not scale. The store choice must be serverless-friendly (pooling or an HTTP/edge data layer).
- **No build step today:** introducing a store + services likely introduces a build/deploy step for `services/`. Keep it minimal and additive so the static site keeps deploying as-is.
- **Content is the source of record:** treat `research/*/**.yaml` as authoritative and the store as a rebuildable artifact, so loads are idempotent and safe to re-run.
