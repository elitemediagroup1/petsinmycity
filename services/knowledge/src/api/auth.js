'use strict';

/**
 * Internal access control for the Knowledge API.
 *
 * This endpoint is INTERNAL. It is not an anonymous, unrestricted graph-query API.
 * We enforce the smallest safe control compatible with the current platform: a
 * shared internal secret supplied via an environment variable and presented on the
 * request. No user-authentication platform, no credentials are committed, and no
 * secret value is ever logged or returned.
 *
 * Env var: KNOWLEDGE_API_INTERNAL_SECRET
 *   - Production: required. If unset, ALL requests are denied (fail closed).
 *   - Local dev:  set KNOWLEDGE_API_ALLOW_INSECURE=1 to bypass (never in prod).
 *
 * Header: 'x-internal-key' (case-insensitive) OR 'authorization: Bearer <secret>'.
 */

const SECRET_ENV = 'KNOWLEDGE_API_INTERNAL_SECRET';
const INSECURE_ENV = 'KNOWLEDGE_API_ALLOW_INSECURE';

/** Constant-time string comparison to avoid leaking secret length/prefix via timing. */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function headerLookup(headers, name) {
  if (!headers) return undefined;
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return headers[key];
  }
  return undefined;
}

/** Extract a presented credential from either header form. */
function presentedKey(headers) {
  const direct = headerLookup(headers, 'x-internal-key');
  if (direct) return String(direct);
  const authz = headerLookup(headers, 'authorization');
  if (authz && /^Bearer\s+/i.test(authz)) return String(authz).replace(/^Bearer\s+/i, '');
  return undefined;
}

/**
 * Authorize a request.
 * @param {object} headers  request headers
 * @param {object} [env]    environment (defaults to process.env)
 * @returns {{ ok: boolean, reason?: string }}
 */
function authorize(headers, env) {
  const e = env || process.env;
  const secret = e[SECRET_ENV];
  const insecure = e[INSECURE_ENV] === '1' || e[INSECURE_ENV] === 'true';

  if (insecure) return { ok: true, reason: 'insecure_bypass' };

  if (!secret) {
    // Fail closed: no configured secret means no access (never open by default).
    return { ok: false, reason: 'secret_not_configured' };
  }
  const presented = presentedKey(headers);
  if (!presented) return { ok: false, reason: 'missing_credential' };
  if (!safeEqual(presented, secret)) return { ok: false, reason: 'invalid_credential' };
  return { ok: true };
}

/** True when an authorized caller is permitted internal diagnostic disclosure. */
function diagnosticAllowed(headers, env) {
  const e = env || process.env;
  const flag = headerLookup(headers, 'x-internal-diagnostics');
  return authorize(headers, e).ok && (flag === '1' || flag === 'true');
}

module.exports = { authorize, diagnosticAllowed, safeEqual, SECRET_ENV, INSECURE_ENV };
