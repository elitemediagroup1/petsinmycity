'use strict';

/**
 * Internal Knowledge API - thin Netlify Function boundary.
 *
 * Adapts the Netlify event/response contract to the transport-agnostic handler in
 * services/knowledge/src/api. All knowledge policy (admission, freshness, ranking,
 * conflict, provenance, safety) lives in the delivery layer and is called through
 * KnowledgeDeliveryService only.
 *
 * Route: /.netlify/functions/knowledge (internal; not a public developer API).
 * Methods: POST (canonical JSON body), GET (limited query form), OPTIONS (204).
 * Auth: env KNOWLEDGE_API_INTERNAL_SECRET via 'x-internal-key' or Bearer.
 *
 * Durable storage (ADR-0027, revised): the store is created through the driver
 * factory from KNOWLEDGE_DB_DRIVER. In production this is the EMG Loop provider
 * (KNOWLEDGE_DB_DRIVER=loop, EMG_LOOP_API_BASE_URL + EMG_LOOP_SERVICE_TOKEN); Loop is
 * the durable system of record (it persists through Neon), so knowledge survives cold
 * starts and deploys. PetsInMyCity never connects to Neon. Initialization is async and
 * cached at module scope as a PROMISE, so concurrent cold-start invocations share one
 * store. Initialization failure fails closed with a safe 500 (no urls, no credentials,
 * no stack traces) and NEVER falls back to an in-memory fixture in production.
 */

const { handle } = require('../../services/knowledge/src/api/http-handler');
const { getService } = require('../../services/knowledge/src/api/bootstrap');
const { makeDiagnostics } = require('../../services/knowledge/src/api/diagnostics');

const diag = makeDiagnostics();

exports.handler = async (event) => {
  let service;
  try {
    // getService() returns a cached initialization promise (warm reuse).
    service = (await getService()).service;
  } catch (err) {
    // Fail closed: no urls, no stack traces, no credentials, no internals.
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

  const res = await handle(input, { service, env: process.env, diag: diag.emit });
  return res;
};
