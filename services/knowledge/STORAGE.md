# Knowledge Storage — Setup, Migration, Import, Readiness & Rollback

This service stores verified knowledge behind the async `KnowledgeStore` interface
(see ADR-0027 in `docs/implementation/DECISIONS.md`). The concrete backend is chosen
by configuration; consumers never depend on it.

**Production storage is EMG Loop, not a PetsInMyCity-owned database.** Loop is the
system of record and persists through Neon internally. PetsInMyCity talks only to
Loop's authenticated service contract and never connects to Neon. SQLite is retained
for isolated local development and automated tests only.

> **Production status:** the Loop provider is fully implemented and tested here, but
> the Loop-side `/api/v1/knowledge/*` endpoints do not exist yet, so production is
> **not operational** until the Loop dependency ships. Required Loop endpoints are
> specified in `docs/implementation/LOOP_KNOWLEDGE_CONTRACT.md`.

## Drivers

| Driver | Use | Durable? | Owns storage? | Secrets |
|----------|--------------------------------------|----------|----------------|---------|
| `sqlite` | local dev + automated tests | no (ephemeral) | n/a | none |
| `loop`   | deployed Netlify Functions (prod) | yes (via Loop/Neon) | Loop owns it | Loop service token |

The `loop` driver is NOT a SQL driver: it is an HTTP provider (`LoopKnowledgeStore`)
that maps repository operations to Loop knowledge endpoints. There is no
`better-sqlite3` (or any DB SDK) in the deployed path.

## Configuration (environment variables)

See `.env.example`. Placeholders only — never commit real values.

- `KNOWLEDGE_DB_DRIVER` — `sqlite` (default) or `loop`.
- `EMG_LOOP_API_BASE_URL` — Loop base url (required when driver is `loop`).
- `EMG_LOOP_SERVICE_TOKEN` — Loop service token, sent as the `x-emg-loop-secret`
  header (required when driver is `loop`). Server-side only.
- `EMG_LOOP_PLATFORM` — producer slug (default `petsinmycity`).
- `EMG_LOOP_ORGANIZATION_ID`, `EMG_LOOP_WORKSPACE_ID`, `EMG_LOOP_PROPERTY_ID` — tenant
  scope (supplied once Loop confirms tenancy for this property).
- `EMG_LOOP_TIMEOUT_MS` — optional client timeout (default 8000).
- `KNOWLEDGE_DB_FILE` — optional sqlite file path (driver `sqlite`, local/test only).
- `KNOWLEDGE_API_INTERNAL_SECRET` — internal API auth secret.

Configuration is centralized in `src/storage/create-store.js` and **fails closed**:
an unknown driver, or a `loop` driver missing its base url or service token, throws a
safe typed error (`StorageConfigError`) with a stable non-secret code. Production
never silently falls back to SQLite or in-memory storage.

## Local development (SQLite)

```bash
cd services/knowledge
npm install
npm run migrate -- ./data/knowledge.db     # apply migrations to a local file
npm run load:austin -- ./data/knowledge.db # import the verified Austin dataset
npm test                                    # storage + contract + delivery + api
```

Local/test uses SQLite exclusively. The `loop` provider is verified in CI against a
mocked HTTP server (`test/contract/loop-provider.test.js`) — no Loop credentials.

## Provisioning durable storage (EMG Loop) — manual steps

Performed by a maintainer; the assistant does not create accounts or generate
credentials, and PetsInMyCity never provisions Neon directly.

1. Ensure the Loop-side knowledge endpoints exist (see LOOP_KNOWLEDGE_CONTRACT.md).
   This is a separate Loop implementation sprint and a prerequisite for production.
2. In EMG Loop, provision this property's organization/workspace and a
   service-to-service token for PetsInMyCity. Note the org/workspace/property ids.
3. Store the Loop base url and service token ONLY as server-side environment
   variables in Netlify (below). Never commit them; never expose to the browser.

## Netlify environment variables

In the Netlify site settings (server-side, not exposed to the browser), set:

- `KNOWLEDGE_DB_DRIVER=loop`
- `EMG_LOOP_API_BASE_URL=https://<loop-host>`
- `EMG_LOOP_SERVICE_TOKEN=<loop-service-token>`
- `EMG_LOOP_ORGANIZATION_ID=<org-id>` (and `EMG_LOOP_WORKSPACE_ID` / `EMG_LOOP_PROPERTY_ID` if Loop uses them)
- `KNOWLEDGE_API_INTERNAL_SECRET=<strong-random-secret>`

Do not place secrets in `netlify.toml`, source, docs, or client-side JavaScript.

## Migrations

SQLite migrations live in `migrations/*.sql` and run in deterministic (lexical)
order, once each, tracked in `schema_migrations`, applied by an EXPLICIT command
(never on a request). They apply to the **local/test SQLite** store only:

```bash
npm run migrate -- ./data/knowledge.db
```

Production schema is owned and migrated by **Loop** (behind its knowledge endpoints);
PetsInMyCity does not run remote schema migrations. Readiness verifies Loop advertises
a compatible knowledge contract version instead.

## Austin import (production flow through Loop)

Explicit, idempotent, batched, provenance-preserving. Reads from
`research/austin/pilot/data/` (the source of record) — it does not fork the dataset.
The importer builds ONE Loop import batch with a **deterministic idempotency key**
(derived from platform + dataset version), so retries never double-write. Reports
inserted / updated / skipped / failed counts.

```bash
# Local sqlite (dev/test):
npm run load:austin -- ./data/knowledge.db

# Production (through Loop):
KNOWLEDGE_DB_DRIVER=loop EMG_LOOP_API_BASE_URL=... EMG_LOOP_SERVICE_TOKEN=... \
  EMG_LOOP_ORGANIZATION_ID=... npm run load:austin
```

Deploying the repository does NOT import Austin; the import is a separate, deliberate
admin command and is never triggered by ordinary reads or deployments.

## Readiness

Confirms driver config, backend reachability, a compatible schema/contract version,
and (optionally) that Austin data is present. For `loop` this checks Loop's
`readiness` endpoint and contract version; for `sqlite` it checks applied migrations.
Exits non-zero if not ready. Prints non-secret status only. Not a public endpoint.

```bash
npm run readiness              # env-configured (sqlite or loop)
npm run readiness -- --expect-data
```

## Deployment order (once Loop endpoints exist)

1. Confirm the Loop knowledge endpoints are live (LOOP_KNOWLEDGE_CONTRACT.md).
2. Set the Netlify env vars above (`KNOWLEDGE_DB_DRIVER=loop`, Loop url + token + scope).
3. Run the Austin import once, through Loop.
4. Run the readiness check (`--expect-data`).
5. Deploy. The Netlify function initializes the Loop-backed store lazily and caches it
   for warm invocations; initialization/readiness failure returns a safe 500.

## Rollback

- Code reverts to the previous release independently of data (data lives in Loop).
- The Austin import is idempotent (stable idempotency key); re-running is safe and
  does not double-write.
- Loop preserves version history; no destructive down-migration is required here.
- Drivers can be switched by configuration in non-production environments; production
  never switches to temporary storage silently.
- If Loop is unavailable or unconfigured after deploy, the API fails closed (safe 500
  / service-unavailable) rather than serving stale, invented, or ephemeral data.

## Optional remote smoke test (requires credentials)

Ordinary CI needs no secrets and runs the Loop provider against a mock. To exercise a
real Loop instance, provision the env vars above and run the import + readiness
commands against it, then a single `getKnowledge`-backed API request. This is a
manual, credentialed check and is intentionally NOT part of the pull-request CI.

## Security

The Loop service token is server-only, never logged, never in URLs, never in API
responses. PetsInMyCity never receives Neon credentials, connection strings, table
names, or Loop's internal schema. There is no browser-accessible database client and
no public write endpoint; the Netlify knowledge function is read-only. Loop failures
are surfaced as typed, non-secret error codes only.
