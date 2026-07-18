'use strict';
/**
 * loop-client.js — thin authenticated HTTP client for the EMG Loop knowledge API.
 *
 * This is the ONLY module that speaks HTTP to Loop. It knows nothing about the
 * knowledge domain beyond passing typed request bodies through; the domain shaping
 * lives in LoopKnowledgeStore. It uses the platform `fetch` (Node >=18) — there is
 * NO vendor SDK dependency in the deployed path.
 *
 * Conventions (verified against emgloop-platform, PR #80 Loop Event Gateway):
 * - Versioned routes under `/api/v1/...`.
 * - Service auth via the shared-secret header `x-emg-loop-secret`.
 * - JSON request/response; Loop responds `{ ok: true, ... }` or
 *   `{ ok: false, error, message }`.
 * - Idempotency via a producer-supplied key echoed by Loop.
 *
 * Security: the service token is only ever sent in the request header. It is never
 * logged, never placed in a URL, and never returned to callers. Errors carry a
 * stable, non-secret `code` only.
 */

const { LoopError } = require('./loop-errors');

/** Sleep helper for bounded backoff. */
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

/** HTTP status -> stable typed error code. Transient codes are retryable. */
function classifyStatus(status) {
  if (status === 400) return { code: 'validation', retryable: false };
  if (status === 401) return { code: 'auth', retryable: false };
  if (status === 403) return { code: 'forbidden', retryable: false };
  if (status === 404) return { code: 'not_found', retryable: false };
  if (status === 409) return { code: 'conflict', retryable: false };
  if (status === 410) return { code: 'gone', retryable: false };
  if (status === 413) return { code: 'too_large', retryable: false };
  if (status === 422) return { code: 'schema_incompatible', retryable: false };
  if (status === 429) return { code: 'rate_limited', retryable: true };
  if (status === 503) return { code: 'unavailable', retryable: true };
  if (status >= 500) return { code: 'loop_error', retryable: true };
  return { code: 'loop_error', retryable: false };
}

class LoopClient {
  /**
   * @param {object} cfg { baseUrl, serviceToken, timeoutMs?, maxRetries?, fetchImpl? }
   */
  constructor(cfg) {
    const c = cfg || {};
    if (!c.baseUrl) throw new LoopError('config', 'loop baseUrl is required');
    if (!c.serviceToken) throw new LoopError('config', 'loop serviceToken is required');
    this.baseUrl = String(c.baseUrl).replace(/\/+$/, '');
    this._token = c.serviceToken;
    this.timeoutMs = c.timeoutMs || 8000;
    this.maxRetries = c.maxRetries == null ? 2 : c.maxRetries;
    // Dependency-injectable for tests; defaults to global fetch (Node >=18).
    this._fetch = c.fetchImpl || (typeof fetch === 'function' ? fetch : null);
    if (!this._fetch) throw new LoopError('config', 'no fetch implementation available');
  }

  /** Non-secret header set. The service token is added privately per request. */
  _headers(extra) {
    return Object.assign({
      'content-type': 'application/json',
      'accept': 'application/json',
      'x-emg-loop-secret': this._token,
    }, extra || {});
  }

  /**
   * Perform one JSON request with timeout. Returns { status, body }.
   * Never throws for non-2xx; the caller classifies status.
   */
  async _once(method, path, body, extraHeaders) {
    const url = this.baseUrl + path;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res;
    try {
      res = await this._fetch(url, {
        method,
        headers: this._headers(extraHeaders),
        body: body == null ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      const aborted = err && (err.name === 'AbortError' || err.code === 'ABORT_ERR');
      throw new LoopError(aborted ? 'timeout' : 'unavailable',
        aborted ? 'loop request timed out' : 'loop request failed', { retryable: true });
    }
    clearTimeout(timer);

    let parsed = null;
    const text = await res.text();
    if (text) {
      try { parsed = JSON.parse(text); } catch (e) {
        throw new LoopError('malformed_response', 'loop returned a non-JSON body', {
          status: res.status, retryable: false,
        });
      }
    }
    return { status: res.status, body: parsed };
  }

  /**
   * Request with bounded retry + exponential backoff for transient failures only.
   * @returns {Promise<object>} the parsed Loop response body (`ok:true` guaranteed)
   */
  async request(method, path, body, opts) {
    const options = opts || {};
    const idempotent = method === 'GET' || options.idempotencyKey != null;
    const headers = options.idempotencyKey != null
      ? { 'x-idempotency-key': options.idempotencyKey } : undefined;

    let attempt = 0;
    // Only retry when the operation is safe (GET or carries an idempotency key).
    const maxAttempts = idempotent ? this.maxRetries + 1 : 1;

    for (;;) {
      attempt += 1;
      let result;
      try {
        result = await this._once(method, path, body, headers);
      } catch (err) {
        // Transient transport error (timeout / unavailable).
        if (idempotent && err.retryable && attempt < maxAttempts) {
          await delay(Math.min(1000 * (2 ** (attempt - 1)), 4000));
          continue;
        }
        throw err;
      }

      const { status, body: payload } = result;
      if (status >= 200 && status < 300) {
        if (payload && payload.ok === false) {
          // 2xx with an application-level failure envelope — treat as loop error.
          throw new LoopError('loop_error', (payload && payload.message) || 'loop rejected request', {
            status, code: payload && payload.error,
          });
        }
        return payload || { ok: true };
      }

      const cls = classifyStatus(status);
      if (idempotent && cls.retryable && attempt < maxAttempts) {
        await delay(Math.min(1000 * (2 ** (attempt - 1)), 4000));
        continue;
      }
      const message = (payload && payload.message) ? payload.message : ('loop request failed (' + status + ')');
      throw new LoopError(cls.code, message, { status, code: payload && payload.error });
    }
  }

  get(path, opts) { return this.request('GET', path, null, opts); }
  post(path, body, opts) { return this.request('POST', path, body, opts); }
}

module.exports = { LoopClient, classifyStatus };
