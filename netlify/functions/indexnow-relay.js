'use strict';

/**
 * IndexNow relay for petsinmycity.com.
 *
 * This is a DEPLOYMENT / OPERATIONS endpoint, not a public one. It used to be
 * open to the whole internet with wildcard CORS and a committed fallback key,
 * which let anyone submit arbitrary URL lists under our host identity.
 *
 * It now requires:
 *   - a shared server-side secret in `x-indexnow-token` (constant-time compared);
 *   - POST only, with no CORS headers at all, so no browser page can call it
 *     cross-origin regardless of what it sends;
 *   - INDEXNOW_KEY supplied by the environment. There is deliberately no
 *     fallback key in this file.
 *   - every submitted URL to be a canonical https://petsinmycity.com/ URL.
 *
 * The public key-verification file at the site root (required by the IndexNow
 * protocol) is untouched and must stay published.
 */

const crypto = require('crypto');

const guard = require('../lib/request-guard');
const { errorResponse, jsonResponse } = require('../lib/errors');
const rateLimit = require('../lib/rate-limit');
const log = require('../lib/log');
const { fetchWithTimeout, UpstreamTimeoutError } = require('../lib/fetch-timeout');

const ENDPOINT = 'indexnow-relay';
const MAX_BODY_BYTES = 64 * 1024;
const MAX_BATCH = 100;
const MAX_URL_LENGTH = 2000;
const CANONICAL_HOST = 'petsinmycity.com';
const UPSTREAM_TIMEOUT_MS = 10000;
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F-\\u009F\\u2028\\u2029]');

function limits(env) {
  return [
    { name: 'minute', windowSeconds: 60, max: rateLimit.envLimit(env, 'INDEXNOW_PER_MIN', 5) },
    { name: 'day', windowSeconds: 86400, max: rateLimit.envLimit(env, 'INDEXNOW_PER_DAY', 50) },
  ];
}

/** Constant-time secret comparison that does not leak length via early return. */
function secretMatches(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string' || !expected) return false;
  const a = crypto.createHash('sha256').update(provided).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Accept only canonical, indexable URLs on our own apex host.
 *
 * Rejected: any other host (including www. and subdomains), http, credentials
 * in the URL, fragments, control characters, and anything over the length cap.
 */
function validateUrl(value) {
  if (typeof value !== 'string') return { ok: false, reason: 'not_a_string' };
  const raw = value.trim();
  if (!raw || raw.length > MAX_URL_LENGTH) return { ok: false, reason: 'bad_length' };
  if (CONTROL_CHARS.test(raw)) return { ok: false, reason: 'control_characters' };

  let url;
  try {
    url = new URL(raw);
  } catch (_) {
    return { ok: false, reason: 'malformed' };
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'not_https' };
  if (url.username || url.password) return { ok: false, reason: 'credentials' };
  if (url.hash) return { ok: false, reason: 'fragment' };
  if (url.port) return { ok: false, reason: 'port' };
  if (url.hostname !== CANONICAL_HOST) return { ok: false, reason: 'foreign_host' };
  if (!url.pathname.startsWith('/')) return { ok: false, reason: 'bad_path' };
  return { ok: true, value: url.toString() };
}

function readUrls(body) {
  const raw = Array.isArray(body.urls) ? body.urls : (Array.isArray(body.urlList) ? body.urlList : null);
  if (!raw) return { ok: false, reason: 'urls_not_array' };
  if (raw.length === 0) return { ok: false, reason: 'urls_empty' };
  if (raw.length > MAX_BATCH) return { ok: false, reason: 'batch_too_large' };

  const seen = new Set();
  const out = [];
  for (const candidate of raw) {
    const checked = validateUrl(candidate);
    if (!checked.ok) return { ok: false, reason: 'url_' + checked.reason };
    if (seen.has(checked.value)) continue;
    seen.add(checked.value);
    out.push(checked.value);
  }
  return { ok: true, value: out };
}

exports.handler = async function handler(event) {
  const env = process.env;
  // No CORS headers: this endpoint is not callable from a browser page.
  const headers = {};

  const method = (event && event.httpMethod ? String(event.httpMethod) : '').toUpperCase();
  if (method !== 'POST') {
    log.emit({ endpoint: ENDPOINT, outcome: 'method_not_allowed', status: 405 });
    return errorResponse('method_not_allowed', headers);
  }

  const expectedSecret = env.INDEXNOW_RELAY_SECRET;
  if (!expectedSecret) {
    // Fail closed. An unconfigured relay must not be an open relay.
    log.emit({ endpoint: ENDPOINT, outcome: 'missing_configuration', reason: 'relay_secret', status: 503 });
    return errorResponse('service_unavailable', headers);
  }
  const providedSecret = require('../lib/cors').header(event, 'x-indexnow-token');
  if (!secretMatches(providedSecret == null ? '' : String(providedSecret), expectedSecret)) {
    log.emit({ endpoint: ENDPOINT, outcome: 'unauthorized', status: 401 });
    return errorResponse('unauthorized', headers);
  }

  const sizeError = guard.checkBodySize(event, MAX_BODY_BYTES);
  if (sizeError) {
    log.emit({ endpoint: ENDPOINT, outcome: 'payload_too_large', status: 413 });
    return errorResponse('payload_too_large', headers);
  }
  const parsed = guard.parseJsonObject(event);
  if (!parsed.ok) {
    log.emit({ endpoint: ENDPOINT, outcome: parsed.code });
    return errorResponse(parsed.code, headers);
  }

  const urls = readUrls(parsed.value);
  if (!urls.ok) {
    log.emit({ endpoint: ENDPOINT, outcome: 'invalid_request', reason: urls.reason });
    return errorResponse('invalid_request', headers, { field: 'urls' });
  }

  const indexNowKey = env.INDEXNOW_KEY;
  const indexNowHost = env.INDEXNOW_HOST || CANONICAL_HOST;
  if (!indexNowKey) {
    log.emit({ endpoint: ENDPOINT, outcome: 'missing_configuration', reason: 'indexnow_key', status: 503 });
    return errorResponse('service_unavailable', headers);
  }

  const limited = await rateLimit.consume({
    endpoint: ENDPOINT, scope: 'global', identifier: 'all', rules: limits(env), env: env,
  });
  if (!limited.allowed) {
    log.emit({ endpoint: ENDPOINT, outcome: 'rate_limited', status: 429 });
    return errorResponse('rate_limited',
      Object.assign({ 'Retry-After': String(limited.retryAfterSeconds) }, headers),
      { retry_after_seconds: limited.retryAfterSeconds });
  }

  const payload = JSON.stringify({
    host: indexNowHost,
    key: indexNowKey,
    keyLocation: 'https://' + indexNowHost + '/' + indexNowKey + '.txt',
    urlList: urls.value,
  });

  try {
    const res = await fetchWithTimeout('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: payload,
    }, UPSTREAM_TIMEOUT_MS);

    // The upstream body is never forwarded: it can echo the key back.
    if (res.status >= 200 && res.status < 300) {
      log.emit({ endpoint: ENDPOINT, outcome: 'ok', status: 200, upstream_status: res.status });
      return jsonResponse(200, { ok: true, submitted: urls.value.length }, headers);
    }
    log.emit({ endpoint: ENDPOINT, outcome: 'upstream_rejected', upstream_status: res.status });
    return errorResponse('upstream_unavailable', headers);
  } catch (err) {
    const timedOut = err instanceof UpstreamTimeoutError || (err && err.timeout === true);
    log.emit({ endpoint: ENDPOINT, outcome: timedOut ? 'upstream_timeout' : 'upstream_error', error_class: log.errorClass(err) });
    return errorResponse(timedOut ? 'upstream_timeout' : 'upstream_unavailable', headers);
  }
};

exports._internal = { validateUrl, readUrls, secretMatches, MAX_BATCH, MAX_BODY_BYTES };
