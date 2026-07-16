# Knowledge Storage — Setup, Migration, Import, Readiness & Rollback

This service stores verified knowledge behind the async \`KnowledgeStore\` interface
(see ADR-0027 in \`docs/implementation/DECISIONS.md\`). The concrete backend is chosen
by configuration; consumers never depend on it.

## Drivers

| Driver   | Use                                   | Durable? | Secrets |
|----------|---------------------------------------|----------|---------|
| \`sqlite\` | local dev + automated tests           | no (ephemeral on Netlify) | none |
| \`libsql\` | deployed Netlify Functions (Turso)    | yes      | url + token |

Both speak the SQLite dialect, so there is ONE schema and ONE set of migrations.

## Configuration (environment variables)

See \`.env.example\`. Placeholders only — never commit real values.

- \`KNOWLEDGE_DB_DRIVER\` — \`sqlite\` (default) or \`libsql\`.
- \`KNOWLEDGE_DB_URL\` — libSQL/Turso url (required when driver is \`libsql\`).
- \`KNOWLEDGE_DB_AUTH_TOKEN\` — Turso token (required for a remote \`libsql://\` url).
- \`KNOWLEDGE_DB_FILE\` — optional sqlite file path (driver \`sqlite\`).
- \`KNOWLEDGE_API_INTERNAL_SECRET\` — internal API auth secret.

Configuration is centralized in \`src/storage/create-store.js\` and fails closed:
an unknown driver, a missing url, or a missing token for a remote url throws a safe
typed error. Production never silently falls back to ephemeral storage.

## Local development (SQLite)

\`\`\`bash
cd services/knowledge
npm install
npm run migrate -- ./data/knowledge.db      # apply migrations to a local file
npm run load:austin -- ./data/knowledge.db  # import the verified Austin dataset
npm test                                     # storage + contract + delivery + api
\`\`\`

## Provisioning the durable database (Turso) — manual steps

These steps are performed by a maintainer; the assistant does not create accounts or
generate credentials. Follow the current official Turso documentation:

1. Create a Turso account and a database (Turso CLI or dashboard).
2. Obtain the database URL (\`libsql://<db>-<org>.turso.io\`) and an auth token.
3. Store them ONLY as server-side environment variables (below). Never commit them.

## Netlify environment variables

In the Netlify site settings (server-side, not exposed to the browser), set:

- \`KNOWLEDGE_DB_DRIVER=libsql\`
- \`KNOWLEDGE_DB_URL=libsql://<db>-<org>.turso.io\`
- \`KNOWLEDGE_DB_AUTH_TOKEN=<token>\`
- \`KNOWLEDGE_API_INTERNAL_SECRET=<strong-random-secret>\`

Do not place secrets in \`netlify.toml\`, source, docs, or client-side JavaScript.

## Migrations

Migrations live in \`migrations/*.sql\` and run in deterministic (lexical) order, once
each, tracked in \`schema_migrations\`. They are applied by an EXPLICIT command, never
on an ordinary read request:

\`\`\`bash
# Local sqlite:
npm run migrate -- ./data/knowledge.db
# Durable (env-configured libsql):
KNOWLEDGE_DB_DRIVER=libsql KNOWLEDGE_DB_URL=... KNOWLEDGE_DB_AUTH_TOKEN=... npm run migrate
\`\`\`

## Austin import

Explicit, idempotent, transactional. Reads from \`research/austin/pilot/data/\` (the
source of record) — it does not fork the dataset. Reports inserted / updated /
skipped / failed counts.

\`\`\`bash
KNOWLEDGE_DB_DRIVER=libsql KNOWLEDGE_DB_URL=... KNOWLEDGE_DB_AUTH_TOKEN=... npm run load:austin
\`\`\`

Deploying the repository does NOT by itself overwrite durable knowledge; the import
is a separate, deliberate command.

## Readiness

Confirms driver config, database reachability, applied migrations, and (optionally)
that Austin data is present. Exits non-zero if not ready. Prints non-secret status
only. Not a public endpoint.

\`\`\`bash
npm run readiness                 # env-configured
npm run readiness -- --expect-data
\`\`\`

## Deployment order

1. Set Netlify env vars (above).
2. Run migrations against the durable database.
3. Run the Austin import once.
4. Run the readiness check (\`--expect-data\`).
5. Deploy. The Netlify function initializes the durable store lazily and caches it
   for warm invocations; initialization failure returns a safe 500.

## Rollback

- Code reverts to the previous release independently of data.
- Migrations are versioned and additive; append-only history is preserved.
- Imports are idempotent; re-running is safe.
- No destructive down-migration is required for ordinary rollback.
- Drivers can be switched by configuration in non-production environments; production
  never switches to temporary storage silently.
- If the durable driver fails after deploy, the API fails closed (safe 500 /
  service-unavailable) rather than serving stale or ephemeral data.

## Optional remote smoke test (requires credentials)

Ordinary CI needs no secrets. To exercise a real remote Turso database, provision the
env vars above and run the migration + import + readiness commands against it, then a
single \`getKnowledge\`-backed API request. This is a manual, credentialed check and is
intentionally NOT part of the pull-request CI.

## Security

Tokens are server-only, never logged, never in URLs, never in API responses. SQL uses
bound parameters only; no dynamic table/column names come from requests. There is no
browser-accessible database client and no public write endpoint. The Netlify knowledge
function is read-only.
