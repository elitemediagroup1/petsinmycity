# Loop Knowledge Contract — required EMG Loop endpoints for PetsInMyCity

> Status: **build-ready specification / dependency handoff.** This documents the
> exact EMG Loop (`emgloop-platform`) endpoints PetsInMyCity's `LoopKnowledgeStore`
> calls. Loop does not implement these yet; PR #12 is production-disabled until it
> does. This file is the source for the separate, scoped Loop implementation sprint.
> It does not modify the Loop repository.

## Why

EMG Loop is the production system of record for verified knowledge (Loop persists
through Neon). PetsInMyCity creates and consumes verified knowledge but must not own
durable storage or touch Neon. See PetsInMyCity ADR-0027.

These endpoints let Loop **store** and **return** knowledge objects. Loop is NOT the
delivery authority: PetsInMyCity's Knowledge Delivery Platform (KDP) alone decides
admissibility, freshness, ranking, conflicts, provenance sufficiency and the safety
floor, and assembles the `kdp.v1` consumer envelope. Loop returns stored objects and
their metadata verbatim; it must not filter or rank for delivery in this phase.

## Alignment with existing Loop conventions (verified in emgloop-platform)

- Versioned routes under `/api/v1/...` (as with the Loop Event Gateway `POST /api/v1/events`).
- Service auth via a shared-secret header `x-emg-loop-secret`, compared against a Loop
  env var. Producer sites already send `EMG_LOOP_WEBHOOK_SECRET`; the knowledge
  endpoints should accept the same service-token mechanism (a dedicated
  `LOOP_KNOWLEDGE_SECRET` or the platform's service-to-service auth once it exists).
- JSON request/response; success `{ ok: true, ... }`, failure `{ ok: false, error, message }`.
- Idempotency via a caller-supplied key (as `eventId` is used by the event gateway).
- Multi-tenant scoping via `organizationId` (row-level, Prisma), plus a producer
  `platform`/`property` attribution consistent with `Organization.sourceKey` and the
  `LoopEvent.platform`/`site` fields.
- Errors modeled on the gateway's 400/401/405 + typed `error` codes.

## Tenancy & scope (every request)

All requests carry scope. Loop MUST isolate by it and never return one property's
knowledge to another organization/property/environment.

| Field | Meaning | Source on Loop side |
|-------|---------|---------------------|
| `platform` | producer slug, e.g. `petsinmycity` | maps to `Organization.sourceKey` / attribution |
| `property` | product/property id | producer-defined; defaults to platform |
| `organization_id` | Loop tenant id (once provisioned) | `Organization.id` |
| `workspace_id` | optional finer scope | Loop-defined if used |

Reads send scope as query params; writes send it in the JSON `scope` object.

## Contract version

Requests/readiness use `contract_version: "kg.v1"`. Loop advertises the version it
implements via `readiness`; PetsInMyCity fails readiness closed on a mismatch.

## Endpoints

### 1. `GET /api/v1/knowledge/query`
Primary read path. Returns the stored claims for a subject (+ optional predicate),
each with its linked sources. No delivery filtering.

Query params: `platform`, `property`, `organization_id`, `workspace_id?`, `subject`
(required), `predicate` (optional).

Response `200`:
```json
{
  "ok": true,
  "claims": [
    {
      "id": "clm_...", "subject": "aac", "predicate": "adoption_fee",
      "value": { "any": "json" }, "confidence": "high", "verification": "verified",
      "safety_critical": false, "valid_from": "2025-01-01", "valid_until": null,
      "expires": null, "review_by": "2025-07-01", "note": null, "version": 3,
      "sources": [
        { "id": "src_...", "tier": 1, "kind": "government", "url": "https://...",
          "accessed": "2025-01-02", "quote": "...", "captured_by": "editor" }
      ]
    }
  ]
}
```
Notes: `value` is the stored JSON value (not a string). Field names/shape MUST match
exactly (PetsInMyCity's KDP consumes these). Empty result: `{ ok: true, claims: [] }`.

### 2. `GET /api/v1/knowledge/claims/{id}`
Single claim by stable id, with its sources and current version. `404` typed
`not_found` when absent. Response: `{ ok: true, claim: { ...as above... } }`.

### 3. `GET /api/v1/knowledge/entities/{id}`
Single entity by stable id, with its sources. `404` typed `not_found` when absent.
Response: `{ ok: true, entity: { id, type, name, aliases, status, confidence,
verification, safety_critical, attributes, sources:[...] } }`.

### 4. `GET /api/v1/knowledge/stats`
Counts for health/verification. Response:
`{ ok: true, counts: { entities, claims, relationships, sources } }`.

### 5. `GET /api/v1/knowledge/readiness`
Readiness + contract advertisement. Response:
`{ ok: true, contract_version: "kg.v1", schema_ready: true }`.

### 6. `POST /api/v1/knowledge/import`
Batch, idempotent import used by PetsInMyCity's controlled admin tooling (Austin
import). Prefer ONE cohesive batch over chatty per-record calls. Applied atomically
(all-or-nothing) or as a safe idempotent upsert set; MUST NOT partially apply and
report success.

Headers: `x-emg-loop-secret`, `x-idempotency-key` (also echoed in the body).

Request body:
```json
{
  "scope": { "platform": "petsinmycity", "property": "petsinmycity", "organization_id": "org_..." },
  "idempotency_key": "pimc:petsinmycity:austin-pilot",
  "batch": {
    "contract_version": "kg.v1",
    "sources": [ { "id": "src_...", "tier": 1, "kind": "...", "url": "...", "accessed": "...", "quote": "...", "captured_by": "..." } ],
    "entities": [ { "id": "...", "type": "...", "name": "...", "aliases": [], "status": "...", "confidence": "...", "verification": "...", "safety_critical": false, "attributes": {} } ],
    "claims": [ { "id": "...", "subject": "...", "predicate": "...", "value": {}, "confidence": "...", "verification": "...", "safety_critical": false, "valid_from": "...", "valid_until": null, "expires": null, "review_by": null, "note": null } ],
    "relationships": [ { "edge": "...", "from": "...", "to": "...", "confidence": "..." } ],
    "entity_sources": [ { "entityId": "...", "sourceId": "..." } ],
    "claim_sources": [ { "claimId": "...", "sourceId": "..." } ]
  }
}
```

Behavior requirements:
- **Idempotent on `idempotency_key`.** Re-submitting the same key + batch MUST NOT
  duplicate rows. Loop should record the key and return a stable result for repeats.
- **Versioning.** Updating an existing entity/claim id appends a new version and
  preserves prior versions (no destructive overwrite); provenance links preserved.
- **Provenance / verification / confidence / safety / validity / review preserved**
  exactly as supplied (Loop does not re-derive or drop them).
- **Partial-failure honesty.** On failure, do NOT report success.

Response `200`:
```json
{ "ok": true, "idempotency_key": "...", "result": { "inserted": 0, "updated": 0, "skipped": 0, "failed": 0 }, "duplicate": false }
```

## Typed errors (all endpoints)

Failure envelope: `{ ok: false, error: "<code>", message: "<non-secret>" }` with the
matching HTTP status. PetsInMyCity maps these to typed `LoopError` codes.

| HTTP | `error` | PetsInMyCity code | Retryable |
|------|---------|-------------------|-----------|
| 400 | `bad_request` | `validation` | no |
| 401 | `unauthorized` | `auth` | no |
| 403 | `forbidden` | `forbidden` | no |
| 404 | `not_found` | `not_found` | no |
| 409 | `conflict` | `conflict` | no |
| 410 | `gone` | `gone` | no |
| 413 | `too_large` | `too_large` | no |
| 422 | `schema_incompatible` | `schema_incompatible` | no |
| 429 | `rate_limited` | `rate_limited` | yes |
| 503 | `unavailable` | `unavailable` | yes |
| 5xx | `internal` | `loop_error` | yes |

## Non-functional requirements

- **Batch limits.** Document a max batch size / payload cap (the event gateway uses
  64 KB per event; the import batch will be larger — pick and document a limit, e.g.
  a few MB or N records, and return `413 too_large` beyond it). PetsInMyCity will
  chunk if required once the limit is known.
- **Timeouts.** Endpoints should respond within a few seconds; PetsInMyCity uses an
  8s client timeout by default and retries only idempotent/safe calls with bounded
  exponential backoff.
- **Retries.** Only `429`/`503`/timeout are retried by the client, and only for GET
  or requests carrying an idempotency key. Loop must therefore make import safe to
  receive more than once under the same key.
- **Request/trace ids.** Accept/emit a trace id for correlation; never log the
  service token or authorization header.
- **Events (future, not required for v1).** When available, Loop should emit domain
  events on knowledge changes following the `entity.verb` convention, e.g.
  `knowledge.entity.versioned`, `knowledge.claim.verified`, `knowledge.import.completed`.
  PetsInMyCity does not depend on these in this phase.

## Acceptance criteria (Loop side)

1. All six endpoints exist under `/api/v1/knowledge/*`, JSON-only, service-auth via
   `x-emg-loop-secret`, tenant-scoped, returning the exact shapes above.
2. `query` returns stored claims + sources unfiltered (no delivery policy applied).
3. `import` is idempotent on `idempotency_key`, version-preserving, provenance-
   preserving, and honest about partial failure.
4. `readiness` advertises `contract_version: "kg.v1"`.
5. Typed errors match the table.
6. A credential-free local/test mode or fixture exists so Loop CI needs no secrets.
7. Tenant isolation is enforced (no cross-organization/property leakage).

## What PetsInMyCity already implements (no Loop work needed)

`LoopKnowledgeStore` + `LoopClient` (auth header, scoping, retry/backoff, timeouts,
typed errors, malformed-response handling), the Austin importer that builds the batch
with a deterministic idempotency key, fail-closed config, readiness tooling, and a
full mocked contract test suite (`test/contract/loop-provider.test.js`). Only the
Loop-side endpoints above remain.
