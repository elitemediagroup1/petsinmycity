'use strict';

/**
 * Shared request hardening for the public Netlify Functions.
 *
 *  - POST / OPTIONS only; everything else is 405.
 *  - The body-size limit is enforced BEFORE JSON.parse, using the declared
 *    Content-Length when present and the actual byte length otherwise, so an
 *    oversized payload never reaches the parser.
 *  - The client identifier is a truncated HMAC of the connecting IP. The raw IP
 *    is never stored, logged, or returned.
 */

const crypto = require('crypto');
const { header } = require('./cors');

const DEFAULT_MAX_BODY_BYTES = 8 * 1024; // 8 KB

/** Byte length of the request body as Netlify delivered it. */
function bodyByteLength(event) {
  if (!event || event.body == null) return 0;
  if (event.isBase64Encoded) {
    // Netlify only base64-encodes binary bodies; measure the decoded size.
    return Buffer.from(String(event.body), 'base64').length;
  }
  return Buffer.byteLength(String(event.body), 'utf8');
}

/**
 * @returns {null | { code: string }}  null when the size is acceptable.
 */
function checkBodySize(event, maxBytes) {
  const limit = maxBytes || DEFAULT_MAX_BODY_BYTES;
  const declared = Number(header(event, 'content-length'));
  if (Number.isFinite(declared) && declared > limit) return { code: 'payload_too_large' };
  if (bodyByteLength(event) > limit) return { code: 'payload_too_large' };
  return null;
}

/**
 * Parse a JSON object body. Only a plain JSON object is accepted; arrays,
 * scalars and null are rejected as invalid_request.
 *
 * @returns {{ ok: true, value: object } | { ok: false, code: string }}
 */
function parseJsonObject(event) {
  const raw = event && event.body ? String(event.body) : '';
  if (!raw.trim()) return { ok: false, code: 'invalid_request' };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_) {
    return { ok: false, code: 'invalid_json' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, code: 'invalid_request' };
  }
  return { ok: true, value: parsed };
}

/** Best-effort connecting IP from the Netlify edge headers. */
function clientIp(event) {
  const candidates = ['x-nf-client-connection-ip', 'client-ip', 'x-real-ip', 'x-forwarded-for'];
  for (const name of candidates) {
    const value = header(event, name);
    if (value) return String(value).split(',')[0].trim();
  }
  return '';
}

/**
 * A short, salted, one-way identifier for rate limiting.
 *
 * Privacy: the raw IP never leaves this function. The digest is truncated to 16
 * hex characters, which is enough to key a counter but is not a stable global
 * identifier, and it is re-salted whenever RATE_LIMIT_HMAC_SECRET is rotated.
 * When no secret is configured the hash is still one-way, just not secret —
 * that degradation is documented in docs/SECURITY_OPERATIONS.md.
 */
function clientKey(event, env) {
  const e = env || process.env;
  const secret = e.RATE_LIMIT_HMAC_SECRET || 'petsinmycity-unsalted-fallback';
  const ip = clientIp(event);
  const ua = header(event, 'user-agent') || '';
  const material = ip ? ip : 'noip:' + ua;
  return crypto.createHmac('sha256', secret).update(material).digest('hex').slice(0, 16);
}

/**
 * Run the method + size checks common to every public endpoint.
 *
 * @returns {{ preflight: true } | { error: string } | { ok: true, body: object }}
 */
function guard(event, options) {
  const opts = options || {};
  const method = (event && event.httpMethod ? String(event.httpMethod) : '').toUpperCase();

  if (method === 'OPTIONS') return { preflight: true };
  if (method !== 'POST') return { error: 'method_not_allowed' };

  const tooBig = checkBodySize(event, opts.maxBodyBytes);
  if (tooBig) return { error: tooBig.code };

  const parsed = parseJsonObject(event);
  if (!parsed.ok) return { error: parsed.code };
  return { ok: true, body: parsed.value };
}

module.exports = {
  DEFAULT_MAX_BODY_BYTES,
  bodyByteLength,
  checkBodySize,
  parseJsonObject,
  clientIp,
  clientKey,
  guard,
};
