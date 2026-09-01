'use strict';

/**
 * Timeout wrapper around the Node runtime's built-in global fetch.
 *
 * Node 20 (the pinned runtime - see netlify.toml and .nvmrc) ships fetch and
 * AbortController, so no `node-fetch` dependency is required or wanted.
 *
 * Errors are normalised to a small, non-sensitive shape so callers never leak a
 * provider message (which can contain a query string, and therefore a key) to
 * the browser.
 */

class UpstreamTimeoutError extends Error {
  constructor(ms) {
    super('upstream timeout after ' + ms + 'ms');
    this.name = 'UpstreamTimeoutError';
    this.timeout = true;
  }
}

class UpstreamNetworkError extends Error {
  constructor() {
    super('upstream request failed');
    this.name = 'UpstreamNetworkError';
  }
}

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * @param {string} url
 * @param {object} [init]
 * @param {number} [timeoutMs]
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, init, timeoutMs) {
  const ms = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, ms);
  try {
    const doFetch = (typeof globalThis.fetch === 'function') ? globalThis.fetch : null;
    if (!doFetch) throw new UpstreamNetworkError();
    return await doFetch(url, Object.assign({}, init, { signal: controller.signal }));
  } catch (err) {
    if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      throw new UpstreamTimeoutError(ms);
    }
    if (err instanceof UpstreamTimeoutError || err instanceof UpstreamNetworkError) throw err;
    throw new UpstreamNetworkError();
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchWithTimeout, UpstreamTimeoutError, UpstreamNetworkError, DEFAULT_TIMEOUT_MS };
