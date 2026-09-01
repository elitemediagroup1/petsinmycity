'use strict';

/**
 * Shared test scaffolding for the Netlify Function suites.
 *
 * Everything here keeps the tests hermetic: no real network call, no real
 * Netlify Blobs, no real API key. `RATE_LIMIT_BACKEND=memory` plus
 * `resetRateLimits()` gives every test a clean counter.
 */

const store = require('../netlify/lib/rate-limit-store');

const ALLOWED_ORIGIN = 'https://petsinmycity.com';

/** Build a Netlify-shaped event. */
function makeEvent(options) {
  const o = options || {};
  const headers = Object.assign(
    { 'content-type': 'application/json', 'x-nf-client-connection-ip': o.ip || '203.0.113.10' },
    o.headers || {}
  );
  if (o.origin !== null) headers.origin = o.origin || ALLOWED_ORIGIN;
  const body = o.rawBody !== undefined
    ? o.rawBody
    : (o.body === undefined ? undefined : JSON.stringify(o.body));
  return {
    httpMethod: o.method || 'POST',
    headers: headers,
    body: body,
    queryStringParameters: o.query || {},
  };
}

function parseBody(response) {
  try {
    return JSON.parse(response.body);
  } catch (_) {
    return null;
  }
}

/** Drop all rate-limit state and force the in-memory backend. */
function resetRateLimits() {
  process.env.RATE_LIMIT_BACKEND = 'memory';
  store.resetBackend();
}

/**
 * Install a fake global fetch.
 *
 * @param {Function} impl  (url, init) => Response-like, or a thrown error
 * @returns {Function} restore
 */
function stubFetch(impl) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async function (url, init) {
    calls.push({ url: String(url), init: init });
    return impl(String(url), init);
  };
  globalThis.fetch.calls = calls;
  return function restore() { globalThis.fetch = original; };
}

/** A minimal Response stand-in good enough for the handlers. */
function jsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status: status,
    async json() { return payload; },
    async text() { return JSON.stringify(payload); },
  };
}

/** A fetch that never settles until aborted - exercises the timeout path. */
function hangingFetch() {
  return function (url, init) {
    return new Promise(function (_resolve, reject) {
      const signal = init && init.signal;
      if (!signal) return;
      if (signal.aborted) {
        const err = new Error('aborted');
        err.name = 'AbortError';
        reject(err);
        return;
      }
      signal.addEventListener('abort', function () {
        const err = new Error('aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });
  };
}

/** Set env vars for the duration of a test and return a restore function. */
function withEnv(values) {
  const saved = {};
  for (const key of Object.keys(values)) {
    saved[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  return function restore() {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  };
}

/** Silence the sanitized JSON log lines so test output stays readable. */
function muteLogs() {
  const original = console.log;
  console.log = function () {};
  return function restore() { console.log = original; };
}

const FAKE_KEY = 'test-key-not-a-real-credential';

module.exports = {
  ALLOWED_ORIGIN,
  FAKE_KEY,
  makeEvent,
  parseBody,
  resetRateLimits,
  stubFetch,
  jsonResponse,
  hangingFetch,
  withEnv,
  muteLogs,
};
