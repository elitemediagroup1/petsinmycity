'use strict';

/**
 * Stable, public JSON error codes for the PetsInMyCity Netlify Functions.
 *
 * These strings are part of the browser-facing contract: they are safe to show,
 * safe to branch on in the client, and never contain provider messages, stack
 * traces, credentials, configuration values, or runtime internals.
 *
 * Anything sensitive goes to the server log through lib/log.js instead.
 */

const ERROR_CODES = Object.freeze({
  method_not_allowed: { status: 405, message: 'This endpoint only accepts POST requests.' },
  origin_not_allowed: { status: 403, message: 'This request came from an origin that is not allowed.' },
  payload_too_large: { status: 413, message: 'That request was too large. Please shorten it and try again.' },
  invalid_json: { status: 400, message: 'The request body was not valid JSON.' },
  invalid_request: { status: 400, message: 'The request was missing required information or contained a value we cannot accept.' },
  unauthorized: { status: 401, message: 'This endpoint requires authorization.' },
  rate_limited: { status: 429, message: 'Too many requests. Please wait a moment and try again.' },
  service_unavailable: { status: 503, message: 'This feature is temporarily unavailable. Please try again shortly.' },
  upstream_unavailable: { status: 502, message: 'We could not reach the service that powers this feature. Please try again shortly.' },
  upstream_timeout: { status: 504, message: 'That took too long to come back. Please try again.' },
  quota_exhausted: { status: 503, message: 'We have hit today’s lookup limit for this feature. Please try again later, or search on Google Maps in the meantime.' },
  internal_error: { status: 500, message: 'Something went wrong on our end. Please try again.' },
});

/**
 * Build a browser-safe JSON error response.
 *
 * @param {string} code       one of ERROR_CODES
 * @param {object} [headers]  response headers to merge (CORS, Retry-After, ...)
 * @param {object} [extra]    additional NON-SENSITIVE fields (e.g. retry_after_seconds)
 */
function errorResponse(code, headers, extra) {
  const def = ERROR_CODES[code] || ERROR_CODES.internal_error;
  const safeCode = ERROR_CODES[code] ? code : 'internal_error';
  const body = Object.assign({ ok: false, error: safeCode, message: def.message }, extra || {});
  return {
    statusCode: def.status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, headers || {}),
    body: JSON.stringify(body),
  };
}

function jsonResponse(statusCode, payload, headers) {
  return {
    statusCode: statusCode,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, headers || {}),
    body: JSON.stringify(payload),
  };
}

module.exports = { ERROR_CODES, errorResponse, jsonResponse };
