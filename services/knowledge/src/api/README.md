# Internal Knowledge API

A thin, internal serverless boundary over the Knowledge Delivery read path
(PR #10). It wraps `KnowledgeDeliveryService.getKnowledge()` and returns the
canonical `kdp.v1` delivery envelope across a runtime boundary.

This is an **internal** API. It is not a public developer API, and it is not a
Lucy integration. It duplicates no delivery policy: admission, freshness,
ranking, conflict resolution, provenance and the safety floor all remain in the
delivery layer and are called through the store abstraction only.

## Route and methods

- Route: `/.netlify/functions/knowledge`
- `POST` - canonical JSON request body (preferred; context may expand later)
- `GET` - limited query form (`subjectId`, `predicate`, `asOf`, `consumer`)
- `OPTIONS` - returns `204`; no permissive CORS (internal endpoint)

## Data flow

```
Netlify Function -> KnowledgeDeliveryService -> KnowledgeStore -> storage driver
```

The function never queries SQLite directly and never imports `better-sqlite3` as
a second data path.

## Request

```json
{
  "subjectId": "place/tx/austin",
  "predicate": "located_in_county",
  "consumer": "internal",
  "asOf": "2026-07-15T20:00:00-04:00",
  "context": {}
}
```

`subjectId` and `predicate` are required nonempty strings. `asOf` must be a valid
ISO-8601 timestamp. `consumer` must be one of the enumerated identifiers
(`internal`, `lucy`, `article`, `search`, `map`, `recommendations`, `my_pets`).
Unknown top-level fields are rejected. Bodies larger than 16 KiB are rejected.

## Response

Every response is JSON and includes `api_version`, `result`, `ok`, `trace_id`,
and a `state`. A resolved response wraps the unchanged `kdp.v1` envelope under
`envelope`; confidence, verification and provenance are never stripped or
rewritten.

## Result-state to HTTP mapping

| Delivery state | HTTP | Notes |
|----------------|------|-------|
| resolved       | 200  | Canonical `kdp.v1` envelope returned |
| conflict       | 409  | Conflict details + trace preserved; no winner chosen |
| not_found      | 404  | Stable machine-readable code |
| inadmissible   | 404  | Non-disclosing by default; `422` only in authorized diagnostic mode |
| expired        | 410  | Expired fact never returned as usable knowledge |
| invalid request| 400  | Validation failure |
| oversized body | 413  | Body exceeds limit |
| unsupported method | 405 | Only GET/POST/OPTIONS |
| unauthorized   | 401  | Missing/incorrect internal credential |
| storage/service error | 500 | No stack traces, paths, SQL or env leaked |

## Transport vs envelope versioning

- `api_version: knowledge-api.v1` is the **HTTP transport** version.
- `contract_version: kdp.v1` is the **delivery envelope** schema version.

These are intentionally distinct and evolve independently.

## Authentication

Set an internal shared secret via environment variable:

```
KNOWLEDGE_API_INTERNAL_SECRET=<random-secret>
```

Present it as `x-internal-key: <secret>` or `Authorization: Bearer <secret>`.
The endpoint **fails closed**: if no secret is configured, all requests are
denied. For local development only, `KNOWLEDGE_API_ALLOW_INSECURE=1` bypasses
auth; it must never be set in production. Authorized callers may add
`x-internal-diagnostics: 1` to receive typed suppression reasons.

## Local development

Invoke the exported handler directly (no framework required):

```js
const { getService } = require('./bootstrap');
const { handle } = require('./http-handler');
const { service } = getService();
const res = handle({
  method: 'POST',
  headers: { 'x-internal-key': process.env.KNOWLEDGE_API_INTERNAL_SECRET },
  body: JSON.stringify({ subjectId: 'place/tx/austin', predicate: 'located_in_county' }),
}, { service, env: process.env, diag: () => {} });
console.log(res.statusCode, res.body);
```

Or via curl against `netlify dev`:

```
curl -s -X POST http://localhost:8888/.netlify/functions/knowledge \
  -H 'x-internal-key: '"$KNOWLEDGE_API_INTERNAL_SECRET" \
  -H 'content-type: application/json' \
  -d '{"subjectId":"place/tx/austin","predicate":"located_in_county"}'
```

## Tests

```
cd services/knowledge && npm test
```

CI runs storage, delivery and API tests. No secrets are required; API tests
supply a temporary secret in-process and use in-memory fixtures.

## Known deployment constraint: Netlify + SQLite

PR #9 intentionally used SQLite as the first concrete backend behind a swappable
`KnowledgeStore`. Netlify Functions run on an ephemeral, effectively read-only
filesystem, so a **writable SQLite database is not durable** in that runtime and
local writes do not persist across cold starts or instances.

This endpoint is therefore deployed as an **internal proof / read-only fixture**:
the store is built in memory from the packaged, verified Austin YAML at cold
start. This is correct for validating the API boundary and remains fully
storage-driver independent.

For durable serverless production storage, the smallest next step is a new
`KnowledgeStore` driver against a networked database - libSQL/Turso (closest to
the current SQLite semantics) or PostgreSQL - per ADR-0026. `KnowledgeStore` and
the delivery/API layers do not change; only the driver behind `open()` does.
