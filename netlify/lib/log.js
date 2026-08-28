'use strict';

/**
 * Sanitized server-side logging.
 *
 * Rules enforced here:
 *  - never log request bodies, user text, IP addresses, API keys or tokens;
 *  - never log an upstream error object verbatim (message text can echo a URL
 *    that contains a key);
 *  - only log a short, allow-listed set of fields plus a coarse error class.
 */

const SECRET_HINT = /(key|token|secret|password|authorization|bearer|api[-_]?key)/i;

/** Reduce any thrown value to a short, non-sensitive class name. */
function errorClass(err) {
  if (!err) return 'unknown';
  if (err.name === 'AbortError' || err.name === 'TimeoutError') return 'timeout';
  if (typeof err.code === 'string' && !SECRET_HINT.test(err.code)) return String(err.code).slice(0, 40);
  if (typeof err.name === 'string') return String(err.name).slice(0, 40);
  return 'error';
}

/** Strip anything that looks like a credential out of a short label. */
function scrub(value) {
  if (value == null) return null;
  const s = String(value).slice(0, 200);
  if (SECRET_HINT.test(s)) return '[redacted]';
  // Redact query strings entirely: Google/Anthropic URLs carry keys there.
  return s.replace(/\?.*$/, '?[redacted]');
}

/**
 * @param {object} fields  { endpoint, outcome, status, error_class, ... }
 */
function emit(fields) {
  const safe = {};
  const allowed = ['endpoint', 'outcome', 'status', 'error_class', 'upstream', 'upstream_status',
    'provider_status', 'limit_scope', 'category', 'reason', 'duration_ms', 'client_hash'];
  for (const k of allowed) {
    if (fields && fields[k] !== undefined && fields[k] !== null) {
      safe[k] = typeof fields[k] === 'number' ? fields[k] : scrub(fields[k]);
    }
  }
  safe.ts = new Date().toISOString();
  try {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(safe));
  } catch (_) {
    /* logging must never throw */
  }
}

module.exports = { emit, errorClass, scrub };
