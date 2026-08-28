'use strict';

/**
 * Durable, endpoint-scoped fixed-window rate limiting.
 *
 * Every paid endpoint declares one or more rules, e.g.
 *   [{ name: 'minute', windowSeconds: 60, max: 5 },
 *    { name: 'day',    windowSeconds: 86400, max: 40 }]
 *
 * Counters are keyed by `<endpoint>:<scope>:<identifier>` so one endpoint can
 * never spend another endpoint's budget, and are persisted through
 * rate-limit-store.js (Netlify Blobs in production).
 *
 * Two identifier scopes are used:
 *   - `client`: the salted one-way hash from request-guard.clientKey()
 *   - `global`: a single shared bucket, used to keep the whole site inside the
 *     hard Google Cloud daily/minute quotas rather than only limiting per user.
 *
 * Fixed windows are used deliberately: they need one read and one write, which
 * keeps the added latency (and Blobs cost) on the paid endpoints small. The
 * trade-off is that a client can send up to 2x `max` across a window boundary;
 * limits below are chosen with that in mind.
 */

const store = require('./rate-limit-store');
const log = require('./log');

function windowStart(nowMs, windowSeconds) {
  const w = windowSeconds * 1000;
  return Math.floor(nowMs / w) * w;
}

function mergeRecord(a, b) {
  const out = {};
  for (const key of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const ra = (a && a[key]) || null;
    const rb = (b && b[key]) || null;
    if (!ra) { out[key] = rb; continue; }
    if (!rb) { out[key] = ra; continue; }
    if (ra.start === rb.start) out[key] = { start: ra.start, count: Math.max(ra.count, rb.count) };
    else out[key] = ra.start > rb.start ? ra : rb;
  }
  return out;
}

/** Drop windows that can no longer matter, so records stay small. */
function prune(record, rules, nowMs) {
  const out = {};
  for (const rule of rules) {
    const entry = record[rule.name];
    if (!entry) continue;
    if (entry.start === windowStart(nowMs, rule.windowSeconds)) out[rule.name] = entry;
  }
  return out;
}

/**
 * Consume one unit against every rule.
 *
 * @param {object} options
 * @param {string} options.endpoint    e.g. 'places-search'
 * @param {string} options.scope       'client' | 'global'
 * @param {string} options.identifier  hashed client key, or 'all' for global
 * @param {Array}  options.rules       [{ name, windowSeconds, max }]
 * @param {number} [options.now]       injectable clock for tests
 * @param {object} [options.env]
 * @returns {Promise<{allowed: boolean, scope?: string, rule?: string, retryAfterSeconds?: number}>}
 */
async function consume(options) {
  const { endpoint, scope, identifier, rules } = options;
  const nowMs = typeof options.now === 'number' ? options.now : Date.now();
  const backend = store.getBackend(options.env);
  const key = endpoint + ':' + scope + ':' + identifier;

  let durableRecord = null;
  if (backend.durable) {
    try {
      durableRecord = await backend.durable.get(key);
    } catch (err) {
      log.emit({ endpoint: endpoint, outcome: 'rate_limit_read_failed', error_class: log.errorClass(err) });
    }
  }
  let memoryRecord = null;
  try {
    memoryRecord = await backend.memory.get(key);
  } catch (_) { /* memory backend cannot fail meaningfully */ }

  let record = prune(mergeRecord(durableRecord || {}, memoryRecord || {}), rules, nowMs);

  // Evaluate before incrementing so a blocked caller does not extend its own window.
  for (const rule of rules) {
    const start = windowStart(nowMs, rule.windowSeconds);
    const entry = record[rule.name];
    const count = entry && entry.start === start ? entry.count : 0;
    if (count >= rule.max) {
      const resetAt = start + rule.windowSeconds * 1000;
      return {
        allowed: false,
        scope: scope,
        rule: rule.name,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - nowMs) / 1000)),
      };
    }
  }

  for (const rule of rules) {
    const start = windowStart(nowMs, rule.windowSeconds);
    const entry = record[rule.name];
    record[rule.name] = {
      start: start,
      count: (entry && entry.start === start ? entry.count : 0) + 1,
    };
  }

  try {
    await backend.memory.set(key, record);
  } catch (_) { /* ignore */ }
  if (backend.durable) {
    try {
      await backend.durable.set(key, record);
    } catch (err) {
      log.emit({ endpoint: endpoint, outcome: 'rate_limit_write_failed', error_class: log.errorClass(err) });
    }
  }
  return { allowed: true };
}

/** Read a positive integer limit from the environment, with a default. */
function envLimit(env, name, fallback) {
  const raw = (env || process.env)[name];
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

module.exports = { consume, envLimit, windowStart };
