'use strict';

/**
 * Persistence backends for the rate limiter.
 *
 * Durable backend: Netlify Blobs (strong consistency). Blobs survive cold
 * starts, redeploys and scale-out, which an in-process Map does not.
 *
 * The in-memory backend is kept only as a *last resort* for local development
 * and for the case where Blobs is unavailable at runtime; when that happens the
 * limiter still works per instance and the degradation is logged once. It is
 * never the only line of defence in a correctly configured deploy — see
 * docs/SECURITY_OPERATIONS.md for the required Netlify setup.
 */

const log = require('./log');

const STORE_NAME = 'pimc-rate-limits';

/** Simple per-instance Map backend. */
function createMemoryBackend() {
  const map = new Map();
  return {
    kind: 'memory',
    async get(key) {
      const hit = map.get(key);
      return hit ? JSON.parse(hit) : null;
    },
    async set(key, value) {
      map.set(key, JSON.stringify(value));
    },
  };
}

let blobsWarned = false;

/**
 * @returns {object|null} a Blobs-backed store, or null when unavailable.
 */
function createBlobsBackend(env) {
  const e = env || process.env;
  if (String(e.RATE_LIMIT_BACKEND || '').toLowerCase() === 'memory') return null;
  let getStore;
  try {
    // Optional dependency: resolved at runtime so tests and local dev do not
    // need the Netlify Blobs runtime present.
    ({ getStore } = require('@netlify/blobs'));
  } catch (_) {
    if (!blobsWarned) {
      blobsWarned = true;
      log.emit({ endpoint: 'rate-limit', outcome: 'blobs_unavailable', reason: 'module_missing' });
    }
    return null;
  }
  let store;
  try {
    store = getStore({ name: STORE_NAME, consistency: 'strong' });
  } catch (_) {
    if (!blobsWarned) {
      blobsWarned = true;
      log.emit({ endpoint: 'rate-limit', outcome: 'blobs_unavailable', reason: 'context_missing' });
    }
    return null;
  }
  return {
    kind: 'blobs',
    async get(key) {
      const value = await store.get(key, { type: 'json' });
      return value || null;
    },
    async set(key, value) {
      await store.setJSON(key, value);
    },
  };
}

let cached = null;

/**
 * Durable-first backend with an in-memory mirror.
 *
 * Reads take the higher of the two counts so a burst handled entirely by one
 * warm instance is still counted exactly even if a Blobs write lost a race.
 */
function getBackend(env) {
  if (cached) return cached;
  const durable = createBlobsBackend(env);
  const memory = createMemoryBackend();
  cached = {
    kind: durable ? durable.kind : memory.kind,
    durable: durable,
    memory: memory,
  };
  return cached;
}

/** Test hook: drop the cached backend so a new env can be applied. */
function resetBackend() {
  cached = null;
  blobsWarned = false;
}

/** Test hook: install a backend directly. */
function setBackend(backend) {
  cached = backend;
}

module.exports = { getBackend, resetBackend, setBackend, createMemoryBackend, STORE_NAME };
