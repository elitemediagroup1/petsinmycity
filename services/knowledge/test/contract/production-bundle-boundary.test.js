'use strict';

/**
* Production bundle-boundary regression tests (ADR-0027).
*
* These lock in the fix that keeps the deployed Netlify knowledge function free of
* the YAML importer, js-yaml, the SQLite driver, better-sqlite3 and the Austin
* research dataset. The production bootstrap (src/api/bootstrap.js) is the ONLY
* module the deployed function imports; the ephemeral bootstrap
* (src/api/bootstrap-ephemeral.js) owns all seeding / importer concerns.
*
* We assert on the real module graph via require.cache: after a clean require of
* the production bootstrap, none of the forbidden modules may have been evaluated.
* We also prove the Loop runtime initializes with js-yaml and better-sqlite3 forced
* unresolvable, and that the ephemeral path DOES exercise them.
*/

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const Module = require('module');

const API_DIR = path.resolve(__dirname, '..', '..', 'src', 'api');
const PROD_BOOTSTRAP = path.join(API_DIR, 'bootstrap.js');
const EPHEMERAL_BOOTSTRAP = path.join(API_DIR, 'bootstrap-ephemeral.js');

const FORBIDDEN_FILE = /(importDataset\.js|sqlite-driver\.js)$/;
const FORBIDDEN_PKG = /node_modules[\\/](js-yaml|better-sqlite3)[\\/]/;
const RESEARCH = /research[\\/]austin/;

/** Remove every cached module so a fresh require reflects only its own graph. */
function clearModuleCache() {
  for (const key of Object.keys(require.cache)) delete require.cache[key];
}

// ---------------- Production static graph (via require.cache) ----------------

test('production bootstrap graph excludes importer, js-yaml, sqlite-driver, better-sqlite3, research', () => {
  clearModuleCache();
  require(PROD_BOOTSTRAP);
  const loaded = Object.keys(require.cache);
  const offenders = loaded.filter((f) => FORBIDDEN_FILE.test(f) || FORBIDDEN_PKG.test(f) || RESEARCH.test(f));
  assert.deepEqual(offenders, [], 'production bootstrap must not load importer/js-yaml/sqlite/research: ' + offenders.join(', '));
  clearModuleCache();
});

// ---------------- Production runtime (Loop) without native/import deps ----------------

test('Loop init succeeds while js-yaml and better-sqlite3 are unresolvable', async () => {
  clearModuleCache();
  const origLoad = Module._load;
  Module._load = function guard(request, parent, isMain) {
    if (request === 'better-sqlite3' || request === 'js-yaml') {
      throw new Error('module "' + request + '" must not be loaded on the Loop path');
    }
    return origLoad.call(this, request, parent, isMain);
  };
  try {
    const bootstrap = require(PROD_BOOTSTRAP);
    const fakeClient = {
      async get() { return { counts: { sources: 0, entities: 0, claims: 0, relationships: 0 } }; },
      async post() { return { ok: true }; },
    };
    const { service, store } = await bootstrap.build({
      config: { driver: 'loop', baseUrl: 'https://loop.example.invalid', serviceToken: 't', client: fakeClient },
      env: {},
    });
    assert.equal(store.constructor.name, 'LoopKnowledgeStore');
    assert.ok(service, 'delivery service built on the Loop store');
    const importerLoaded = Object.keys(require.cache).some((k) => FORBIDDEN_FILE.test(k));
    assert.equal(importerLoaded, false, 'importer/sqlite-driver must not be evaluated on the Loop path');
    await store.close();
  } finally {
    Module._load = origLoad;
    clearModuleCache();
  }
});

// ---------------- Ephemeral path DOES use importer + js-yaml ----------------

test('ephemeral bootstrap loads the importer and js-yaml and seeds Austin YAML', async () => {
  clearModuleCache();
  const eph = require(EPHEMERAL_BOOTSTRAP);
  const { store, stats } = await eph.build();
  assert.ok(stats.claims > 0, 'ephemeral seed imported Austin claims');
  const loaded = Object.keys(require.cache);
  assert.ok(loaded.some((k) => /importDataset\.js$/.test(k)), 'importer evaluated on the ephemeral path');
  assert.ok(loaded.some((k) => /node_modules[\\/]js-yaml[\\/]/.test(k)), 'js-yaml evaluated on the ephemeral path');
  await store.close();
  clearModuleCache();
});
