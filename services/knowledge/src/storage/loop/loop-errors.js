'use strict';
/**
 * loop-errors.js — typed failure taxonomy for the Loop knowledge provider.
 *
 * Every failure crossing the Loop boundary is a LoopError with a stable, non-secret
 * `code`. Codes let the store, importer, readiness check and API map failures to safe
 * outcomes WITHOUT leaking Loop internals, credentials, urls, or stack traces.
 *
 * Retryable codes describe TRANSIENT conditions only. Permanent codes (auth,
 * validation, schema_incompatible, conflict, forbidden) are never retried.
 */

/** Codes considered transient and therefore safe to retry (idempotent ops only). */
const RETRYABLE_CODES = new Set(['timeout', 'unavailable', 'rate_limited', 'loop_error']);

class LoopError extends Error {
  /**
   * @param {string} code stable, non-secret classification code
   * @param {string} message human-readable, non-secret message
   * @param {object} [meta] { status?, retryable?, code? (loop-supplied) }
   */
  constructor(code, message, meta) {
    super(message);
    this.name = 'LoopError';
    this.code = code;
    const m = meta || {};
    this.status = m.status;
    // Explicit override wins; otherwise infer from the code taxonomy.
    this.retryable = (m.retryable != null) ? !!m.retryable : RETRYABLE_CODES.has(code);
    // A loop-supplied error string (never a secret) for diagnostics only.
    this.loopCode = m.code;
  }

  /** Non-secret shape safe for logs/diagnostics (never includes token or url). */
  toDiagnostic() {
    return { error: 'loop_error', code: this.code, status: this.status || null };
  }
}

module.exports = { LoopError, RETRYABLE_CODES };
