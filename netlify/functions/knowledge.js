'use strict';

/**
 * Internal Knowledge API - thin Netlify Function boundary.
 *
 * This function does NOTHING except adapt the Netlify event/response contract to
 * the transport-agnostic handler in services/knowledge/src/api. All knowledge
 * policy (admission, freshness, ranking, conflict, provenance, safety) lives in the
 * delivery layer (PR #10) and is called through KnowledgeDeliveryService only.
 *
 * Route: /.netlify/functions/knowledge  (internal; not a public developer API).
 * Methods: POST (canonical JSON body), GET (limited query form), OPTIONS (204).
 * Auth: env KNOWLEDGE_API_INTERNAL_SECRET via 'x-internal-key' or Bearer.
 *
 * Deployment note: the store is an in-memory read-only Austin fixture built from
 * packaged YAML. Netlify's filesystem is ephemeral and read-only at runtime, so a
 * writable SQLite database is NOT durable here. This endpoint is an internal proof
 * of the API boundary; see services/knowledge/src/api/README.md for the migration
 * path (libSQL/Turso or PostgreSQL) needed for durable serverless storage.
 */

const { handle } = require('../../services/knowledge/src/api/http-handler');
const { getService } = require('../../services/knowledge/src/api/bootstrap');
const { makeDiagnostics } = require('../../services/knowledge/src/api/diagnostics');

const diag = makeDiagnostics();

exports.handler = async (event) => {
  let service;
  try {
    service = getService().service;
  } catch (err) {
    // Initialization failure must be safe: no filesystem paths, no stack traces.
    diag.emit({ endpoint: '/.netlify/functions/knowledge', outcome: 'init_failure', status: 500 });
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        api_version: 'knowledge-api.v1',
        result: 'internal_error',
        ok: false,
        trace_id: null,
        error: { code: 'internal_error', message: 'service initialization failed' },
      }),
    };
  }

  const input = {
    method: event.httpMethod,
    headers: event.headers || {},
    body: event.body,
    query: event.queryStringParameters || {},
  };

  const res = handle(input, { service, env: process.env, diag: diag.emit });
  return res;
};
