'use strict';

/**
 * Browser CORS policy for the paid public endpoints.
 *
 * Policy
 *  - The production origin https://petsinmycity.com is always allowed.
 *  - Netlify deploy previews are allowed ONLY when this deploy is not the
 *    production context, and only for the origins Netlify itself injects
 *    (URL / DEPLOY_PRIME_URL / DEPLOY_URL) or origins explicitly listed in the
 *    ALLOWED_ORIGINS environment variable.
 *  - `Access-Control-Allow-Origin: *` is never emitted.
 *  - A request with NO Origin header is not a cross-origin browser request
 *    (browsers always attach Origin to cross-origin fetches, and to any
 *    same-origin non-GET fetch). Those are allowed through but receive no
 *    Access-Control-Allow-Origin header, so a hostile page still cannot read
 *    the response.
 */

const PRODUCTION_ORIGIN = 'https://petsinmycity.com';

function parseList(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeOrigin(value) {
  if (!value || typeof value !== 'string') return null;
  let url;
  try {
    url = new URL(value.trim());
  } catch (_) {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  return url.origin;
}

/** The full set of origins this deploy will answer CORS for. */
function allowedOrigins(env) {
  const e = env || process.env;
  const set = new Set([PRODUCTION_ORIGIN]);

  for (const raw of parseList(e.ALLOWED_ORIGINS)) {
    const o = normalizeOrigin(raw);
    if (o) set.add(o);
  }

  // Netlify-injected deploy URLs, preview contexts only.
  if (e.CONTEXT && e.CONTEXT !== 'production') {
    for (const key of ['URL', 'DEPLOY_PRIME_URL', 'DEPLOY_URL']) {
      const o = normalizeOrigin(e[key]);
      if (o) set.add(o);
    }
  }
  return set;
}

/** Case-insensitive header lookup (Netlify lowercases, tests may not). */
function header(event, name) {
  const headers = (event && event.headers) || {};
  const lower = name.toLowerCase();
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === lower) return headers[k];
  }
  return undefined;
}

/**
 * @returns {{ allowed: boolean, origin: string|null, headers: object }}
 */
function evaluate(event, env) {
  const origin = header(event, 'origin');
  const base = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };

  if (!origin) {
    // Same-origin / non-browser. No ACAO is emitted.
    return { allowed: true, origin: null, headers: base };
  }
  if (allowedOrigins(env).has(origin)) {
    return {
      allowed: true,
      origin: origin,
      headers: Object.assign({ 'Access-Control-Allow-Origin': origin }, base),
    };
  }
  return { allowed: false, origin: origin, headers: base };
}

module.exports = { evaluate, allowedOrigins, header, PRODUCTION_ORIGIN };
