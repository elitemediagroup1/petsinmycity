'use strict';

/**
 * Lightweight structured diagnostics for the API boundary.
 *
 * Reuses the shape/spirit of the delivery diagnostics (PR #10): emit safe, flat,
 * structured records suitable for serverless log aggregation. NEVER logs secrets,
 * authorization headers, personalization/My Pets data, or raw suppressed knowledge.
 *
 * By default it writes one JSON line per event to stderr (visible in Netlify logs).
 * A custom sink can be injected for tests.
 */

/** Fields that must never be logged, even if present on an event object. */
const FORBIDDEN = new Set([
  'authorization', 'x-internal-key', 'secret', 'apiKey', 'api_key',
  'value', 'attributes', 'payload', 'myPets', 'my_pets', 'medical',
]);

function scrub(event) {
  const out = {};
  for (const key of Object.keys(event || {})) {
    if (FORBIDDEN.has(key)) continue;
    out[key] = event[key];
  }
  return out;
}

function makeDiagnostics(opts) {
  const options = opts || {};
  const sink = options.sink || function defaultSink(record) {
    // eslint-disable-next-line no-console
    try { process.stderr.write(JSON.stringify(record) + '\n'); } catch (e) { /* ignore */ }
  };
  return {
    emit(event) {
      const record = Object.assign({ ts: new Date().toISOString(), component: 'knowledge-api' }, scrub(event));
      sink(record);
      return record;
    },
  };
}

module.exports = { makeDiagnostics, scrub, FORBIDDEN };
