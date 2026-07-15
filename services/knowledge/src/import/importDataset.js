'use strict';
/**
 * Dataset importer — loads verified YAML knowledge into the KnowledgeStore.
 *
 * REUSES the existing verified data in research/austin/pilot/data/ — it does NOT
 * duplicate or fork it. The YAML files remain the source of record; the store is a
 * rebuildable artifact, so re-running the import is idempotent (upserts + ignored
 * duplicate edges). A YAML change followed by re-import writes new version rows.
 *
 * Expected file layout (flattened-envelope, as authored during the Austin pilot):
 *   entities.*.yaml -> { entities: [ {id,type,name,aliases,status,confidence,
 *                        verification,safety_critical,owner,review_cadence,
 *                        attributes,role,sources:[...]} ] }
 *   claims.yaml     -> { claims:   [ {id,subject,predicate,value,confidence,
 *                        verification,safety_critical,sources:[...]} ] }
 *   edges.yaml      -> { edges:    [ {edge,from,to,confidence?} ] }
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

function linkSources(store, kind, ownerId, sources) {
  if (!Array.isArray(sources)) return;
  sources.forEach((s, i) => {
    const src = (s && typeof s === 'object') ? s : { url: String(s) };
    const id = sourceId(src, i);
    store.sources.upsert(Object.assign({ id: id }, src));
    if (kind === 'entity') store.entities.addSource(ownerId, id);
    else store.claims.addSource(ownerId, id);
  });
}

function loadYaml(file) {
  return yaml.load(fs.readFileSync(file, 'utf8')) || {};
}

/**
 * Import every *.yaml file found in a directory into the store.
 * @param {import('../KnowledgeStore')} store
 * @param {string} dir directory containing the dataset yaml files
 * @returns {object} counts of imported records
 */
function importDirectory(store, dir) {
  const files = fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort();
  const counts = { entities: 0, claims: 0, edges: 0, sources: 0 };

  store.transaction(() => {
    // Pass 1: entities (so claims/edges can reference them).
    for (const file of files) {
      const doc = loadYaml(path.join(dir, file));
      if (Array.isArray(doc.entities)) {
        for (const e of doc.entities) {
          store.entities.upsert(e);
          linkSources(store, 'entity', e.id, e.sources);
          counts.entities += 1;
        }
      }
    }
    // Pass 2: claims.
    for (const file of files) {
      const doc = loadYaml(path.join(dir, file));
      if (Array.isArray(doc.claims)) {
        for (const c of doc.claims) {
          store.claims.upsert(c);
          linkSources(store, 'claim', c.id, c.sources);
          counts.claims += 1;
        }
      }
    }
    // Pass 3: edges.
    for (const file of files) {
      const doc = loadYaml(path.join(dir, file));
      if (Array.isArray(doc.edges)) {
        for (const edge of doc.edges) {
          store.relationships.add(edge);
          counts.edges += 1;
        }
      }
    }
  });

  counts.sources = store.sources.count();
  return counts;
}

module.exports = { importDirectory, sourceId };
