'use strict';
/**
 * Dataset importer (ADR-0027: async) — loads verified YAML knowledge into the store.
 *
 * REUSES the existing verified data in research/austin/pilot/data/ — it does NOT
 * duplicate or fork it. The YAML files remain the source of record; the store is a
 * rebuildable artifact, so re-running the import is idempotent (upserts + ignored
 * duplicate edges). A YAML change followed by re-import writes new version rows.
 *
 * Runs inside a single store.transaction() so a failing record rolls the whole
 * import back, preserving previously valid durable data. Reports inserted / updated /
 * skipped / failed counts (and the legacy per-kind totals for compatibility).
 *
 * Expected file layout (flattened-envelope, as authored during the Austin pilot):
 *   entities.*.yaml -> { entities: [ {id,type,name,aliases,status,confidence,
 *                        verification,safety_critical,owner,review_cadence,
 *                        attributes,role,sources:[...]} ] }
 *   claims.yaml     -> { claims: [ {id,subject,predicate,value,confidence,
 *                        verification,safety_critical,sources:[...]} ] }
 *   edges.yaml      -> { edges: [ {edge,from,to,confidence?} ] }
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/** Build a stable source id when the dataset does not provide one. */
function sourceId(s, i) {
  if (s && s.id) return String(s.id);
  const basis = [s && s.url, s && s.kind, s && s.accessed, i].filter(Boolean).join('|');
  // simple deterministic hash (djb2) -> hex, avoids external deps
  let h = 5381;
  for (let k = 0; k < basis.length; k += 1) { h = ((h * 33) ^ basis.charCodeAt(k)) >>> 0; }
  return 'src_' + h.toString(16);
}

async function linkSources(tx, kind, ownerId, sources) {
  if (!Array.isArray(sources)) return;
  for (let i = 0; i < sources.length; i += 1) {
    const s = sources[i];
    const src = (s && typeof s === 'object') ? s : { url: String(s) };
    const id = sourceId(src, i);
    const _sanitize = (o) => {
      const out = {};
      for (const k of Object.keys(o)) {
        const v = o[k];
        out[k] = (v instanceof Date)
          ? v.toISOString().slice(0, 10)
          : (v && typeof v === 'object') ? JSON.stringify(v) : v;
      }
      return out;
    };
    // eslint-disable-next-line no-await-in-loop
    await tx.sources.upsert(Object.assign({ id: id }, _sanitize(src)));
    // eslint-disable-next-line no-await-in-loop
    if (kind === 'entity') await tx.entities.addSource(ownerId, id);
    // eslint-disable-next-line no-await-in-loop
    else await tx.claims.addSource(ownerId, id);
  }
}

// Deep-normalize a js-yaml result so it only contains bindable primitives.
// Unquoted YAML dates (e.g. \`accessed: 2026-07-15\`) parse to JS Date objects,
// which cannot be bound; convert them to ISO date strings. Booleans -> 0/1.
function normalizeDates(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (Array.isArray(value)) return value.map(normalizeDates);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = normalizeDates(value[k]);
    return out;
  }
  return value;
}

function loadYaml(file) {
  return normalizeDates(yaml.load(fs.readFileSync(file, 'utf8')) || {});
}

/**
 * Import every *.yaml file found in a directory into the store, idempotently.
 * @param {import('../KnowledgeStore')} store
 * @param {string} dir directory containing the dataset yaml files
 * @returns {Promise<object>} counts { entities, claims, edges, sources, inserted, updated, skipped, failed }
 */
async function importDirectory(store, dir) {
  const files = fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort();
  const counts = { entities: 0, claims: 0, edges: 0, sources: 0, inserted: 0, updated: 0, skipped: 0, failed: 0 };

  await store.transaction(async (tx) => {
    // Pass 1: entities (so claims/edges can reference them).
    for (const file of files) {
      const doc = loadYaml(path.join(dir, file));
      if (Array.isArray(doc.entities)) {
        for (const e of doc.entities) {
          // eslint-disable-next-line no-await-in-loop
          const existed = await tx.entities.getById(e.id);
          // eslint-disable-next-line no-await-in-loop
          await tx.entities.upsert(e);
          // eslint-disable-next-line no-await-in-loop
          await linkSources(tx, 'entity', e.id, e.sources);
          counts.entities += 1;
          if (existed) counts.updated += 1; else counts.inserted += 1;
        }
      }
    }
    // Pass 2: claims.
    for (const file of files) {
      const doc = loadYaml(path.join(dir, file));
      if (Array.isArray(doc.claims)) {
        for (const c of doc.claims) {
          // eslint-disable-next-line no-await-in-loop
          const existed = await tx.claims.getById(c.id);
          // eslint-disable-next-line no-await-in-loop
          await tx.claims.upsert(c);
          // eslint-disable-next-line no-await-in-loop
          await linkSources(tx, 'claim', c.id, c.sources);
          counts.claims += 1;
          if (existed) counts.updated += 1; else counts.inserted += 1;
        }
      }
    }
    // Pass 3: edges (idempotent; duplicate edges are skipped).
    for (const file of files) {
      const doc = loadYaml(path.join(dir, file));
      if (Array.isArray(doc.edges)) {
        for (const edge of doc.edges) {
          // eslint-disable-next-line no-await-in-loop
          const inserted = await tx.relationships.add(edge);
          counts.edges += 1;
          if (inserted) counts.inserted += 1; else counts.skipped += 1;
        }
      }
    }
  });

  counts.sources = await store.sources.count();
  return counts;
}

module.exports = { importDirectory, sourceId };
