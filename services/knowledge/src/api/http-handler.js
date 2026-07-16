'use strict';

/**
 * Transport-agnostic HTTP handler for the internal Knowledge API.
 *
 * Thin by design. Responsibilities: validate -> authenticate -> normalize ->
 * call KnowledgeDeliveryService.getKnowledge() -> map typed outcome to HTTP ->
 * return the canonical kdp.v1 envelope -> emit safe diagnostics.
 *
 * It duplicates NO delivery policy. All admission, freshness, ranking, conflict,
 * provenance and safety decisions come from the delivery layer unchanged.
 *
 * The handler accepts a minimal normalized request shape:
 *   { method, headers, body, query }
 * and returns { statusCode, headers, body } (JSON string). This maps directly onto
 * the Netlify Functions event/response contract without importing Netlify types.
 */

const { authorize, diagnosticAllowed } = require('./auth');
const { parseBody, parseQuery, RequestParseError } = require('./request');
const { API_VERSION, ApiCode, mapResultState, mapErrorCode } = require('./errors');
const { ResultState, DeliveryError, ErrorCode } = require('../delivery');

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function traceOf(result) {
  if (!result) return null;
  if (result.trace_id) return result.trace_id;
  if (result.delivery && result.delivery.trace_id) return result.delivery.trace_id;
  return null;
}

/** A resolved delivery result is the kdp.v1 envelope (its state === 'resolved'). */
function isEnvelope(result) {
  return !!result && result.state === ResultState.RESOLVED
    && result.contract_version === 'kdp.v1' && Array.isArray(result.items);
}

function jsonResponse(statusCode, payload, extraHeaders) {
  return {
    statusCode,
    headers: Object.assign({}, JSON_HEADERS, extraHeaders || {}),
    body: JSON.stringify(payload),
  };
}

function errorBody(code, message, traceId, extra) {
  return Object.assign({
    api_version: API_VERSION,
    result: code,
    ok: false,
    trace_id: traceId || null,
    error: { code, message },
  }, extra || {});
}

/**
 * Handle one request.
 * @param {object} input  { method, headers, body, query }
 * @param {object} deps   { service, env, diag }  (service from bootstrap.getService)
 */
function handle(input, deps) {
  const started = Date.now();
  const method = (input && input.method ? String(input.method) : 'GET').toUpperCase();
  const headers = (input && input.headers) || {};
  const env = (deps && deps.env) || process.env;
  const emit = (deps && deps.diag) || function noop() {};

  const log = (fields) => {
    try { emit(Object.assign({ endpoint: '/.netlify/functions/knowledge', method }, fields)); }
    catch (e) { /* diagnostics must never throw into the response path */ }
  };

  // 1. Method gate.
  if (method === 'OPTIONS') {
    // Internal endpoint: no permissive CORS. Answer preflight minimally.
    return { statusCode: 204, headers: {}, body: '' };
  }
  if (method !== 'POST' && method !== 'GET') {
    log({ outcome: 'unsupported_method', status: 405 });
    return jsonResponse(405, errorBody(ApiCode.UNSUPPORTED_METHOD, 'method not allowed', null),
      { allow: 'GET, POST' });
  }

  // 2. Authentication (fail closed).
  const authRes = authorize(headers, env);
  if (!authRes.ok) {
    log({ outcome: 'unauthorized', status: 401, authReason: authRes.reason });
    return jsonResponse(401, errorBody(ApiCode.UNAUTHORIZED, 'internal authorization required', null));
  }
  const diagnostic = diagnosticAllowed(headers, env);

  // 3. Parse + validate.
  let request;
  try {
    request = method === 'POST' ? parseBody(input && input.body) : parseQuery(input && input.query);
  } catch (err) {
    if (err instanceof RequestParseError) {
      const status = err.httpStatus || 400;
      const code = status === 413 ? ApiCode.PAYLOAD_TOO_LARGE : ApiCode.INVALID_REQUEST;
      log({ outcome: code, status });
      return jsonResponse(status, errorBody(code, err.message, null));
    }
    throw err;
  }

  // Diagnostic disclosure only for explicitly authorized internal callers.
  if (diagnostic) request.includeDiagnostics = true;

  // 4. Call the single trusted read path.
  let result;
  try {
    result = deps.service.getKnowledge(request);
  } catch (err) {
    if (err instanceof DeliveryError) {
      const m = mapErrorCode(err.code);
      log({ outcome: m.code, status: m.status, subjectId: request.subjectId, predicate: request.predicate });
      // Never leak internal details on storage failure.
      const msg = err.code === ErrorCode.INVALID_REQUEST ? err.message : 'internal error';
      return jsonResponse(m.status, errorBody(m.code, msg, null));
    }
    log({ outcome: 'internal_error', status: 500 });
    return jsonResponse(500, errorBody(ApiCode.INTERNAL_ERROR, 'internal error', null));
  }

  const traceId = traceOf(result);
  const base = { consumer: request.consumer, subjectId: request.subjectId, predicate: request.predicate,
    durationMs: Date.now() - started, traceId };

  // 5a. Resolved -> canonical envelope, unchanged, at HTTP 200.
  if (isEnvelope(result)) {
    log(Object.assign({ outcome: ResultState.RESOLVED, status: 200,
      selectedClaimId: (result.items[0] && result.items[0].payload && result.items[0].payload.identity && result.items[0].payload.identity.objectId) || null }, base));
    return jsonResponse(200, {
      api_version: API_VERSION,
      result: ApiCode.OK,
      ok: true,
      state: ResultState.RESOLVED,
      trace_id: traceId,
      envelope: result,
    });
  }

  // 5b. Typed non-resolved result -> mapped HTTP status without leaking suppressed values.
  const mapped = mapResultState(result.state, { diagnostic });
  log(Object.assign({ outcome: result.state, status: mapped.status,
    suppressionReason: (result.reasons && result.reasons[0] && result.reasons[0].reason) || null }, base));

  const payload = {
    api_version: API_VERSION,
    result: mapped.code,
    ok: false,
    state: (mapped.status === 404 && !diagnostic) ? ResultState.NOT_FOUND : result.state,
    trace_id: traceId,
    subject: result.subject,
    predicate: result.predicate,
  };

  // Conflict: preserve conflict details + trace, do NOT select a winner here.
  if (result.state === ResultState.CONFLICT) {
    payload.conflicting = result.conflicting || [];
  }
  // Diagnostic mode may expose typed suppression reasons to authorized callers only.
  if (diagnostic && result.reasons) {
    payload.reasons = result.reasons;
  }

  return jsonResponse(mapped.status, payload);
}

module.exports = { handle, isEnvelope, API_VERSION };
