# API Architecture

> How current and future products consume the KDP over stable, versioned APIs — and how the same platform can eventually serve other EMG properties without changing the core. This is the outward-facing contract layer in front of the Delivery Engine.

## 1. Layering

```
Consumers (Lucy, web pages, mobile, partners, EMG products)
        │  (HTTP/gRPC, versioned contracts)
   API Gateway  – authn/z, rate limits, versioning, caching, quotas
        │
   Delivery Engine (10-stage pipeline)
        │
   Knowledge Graph (source of truth)
```
Nothing reaches the graph except through the Delivery Engine behind the gateway.

## 2. Internal vs external APIs

| | Internal | External |
|---|---|---|
| Consumers | Lucy, article build, Search index, Maps, Recs, My Pets, Notifications | Future partners, developer platform, other EMG properties |
| Trust | first-party services | scoped, contracted |
| Surface | full delivery contract | curated, permissioned subset |
| Auth | service identity (mTLS/service tokens) | OAuth2 client-credentials + scopes |
| Limits | high, monitored | per-plan rate limits + quotas |

## 3. Core endpoints (v1 sketch)

```
POST /v1/deliver           body: DeliveryContext        → delivery envelope
GET  /v1/places/{id}                                     → gated place knowledge
GET  /v1/places/{id}/rules                               → leash/policy claims
GET  /v1/places/{id}/hazards?season=&as_of=              → hazard knowledge (currency-tagged)
GET  /v1/emergency-care?place=&open_now=                 → safety-floor-approved only
POST /v1/recommendations   body: {family, context}       → explainable recommendations
GET  /v1/events/active?place=                            → in-window dynamic events
SUB  /v1/stream            (websocket/SSE)                → knowledge.changed / event.* push
POST /v1/feedback          body: {object_id, note}       → routes signal to CPS (never edits)
```
All reads return the standard envelope (facts + provenance + currency).

## 4. Versioning

1. **Contract-versioned** (`kdp.v1`): additive changes are non-breaking; breaking changes bump the major version and run in parallel.
2. Consumers pin a version; deprecation follows a published window with telemetry on remaining users.
3. Object *content* versions (Freshness) are independent of API contract versions and travel in provenance.

## 5. Authentication, permissions, rate limiting

- **Auth:** service identity internally; OAuth2 + scopes externally. No credentials embedded in URLs.
- **Permissions:** scopes gate *which surfaces/domains* a client may read; safety-floor and personal data require elevated, audited scopes. Personal/pet data is never exposed to external clients without explicit user consent scopes.
- **Rate limiting + quotas:** per-client token buckets; safety endpoints exempt from aggressive throttling for first-party emergency use.

## 6. Caching & response formats

Gateway honors the delivery cache validity windows; `ETag`/`Cache-Control` reflect `expires_at`. Default format JSON; the envelope is stable across formats so a future gRPC/protobuf surface maps 1:1.

## 7. EMG integration strategy (serve other properties without core changes)

The KDP is pet-knowledge-specific in *content* but generic in *shape* (verified objects + provenance + delivery). Other EMG properties — CareInMyCity, ServicesInMyCity, FoodInMyCity, FamiliesInMyCity, MarriageInMyCity, ArtistsInMyCity, GameDayInMyCity, and future ones — can reuse the **same delivery platform** by:

1. **Bringing their own knowledge graph** conforming to the machine-schema pattern (entities + claims + edges + provenance + lifecycle).
2. **Reusing the Delivery Engine, Event/Dependency/Freshness/Rule/Context engines unchanged** — they are domain-agnostic.
3. **Adding domain formatters** (stage 8) and **domain rule data** — configuration, not core changes.
4. **Sharing cross-property context** (location, user) via the same `DeliveryContext` shape, so a user’s city resolves once across properties.
5. **Federating via the external API**: one property can consume another’s verified knowledge through scoped API access.

This is why the core is deliberately content-neutral: the expensive, safety-critical machinery (gating, freshness, provenance, events) is built once and reused; each new property supplies data + formatters, never a new platform.

## 8. Scale & the next decade

Stateless gateway + Delivery Engine scale horizontally; the event bus partitions by region; the graph and version store shard by place. The contract-versioned envelope means consumers built years apart interoperate. New consumers (mobile apps, partner APIs, EMG properties) attach at the edge without touching the core — the architecture target for the next decade.
