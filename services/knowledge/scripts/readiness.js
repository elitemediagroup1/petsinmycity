#!/usr/bin/env node
'use strict';
/**
 * Deployment readiness check (ADR-0027, revised).
 *
 * Confirms, WITHOUT exposing secrets, that the configured knowledge store is ready:
 *   1. driver configuration exists and is valid (fail-closed),
 *   2. the backend is reachable,
 *   3. the backend is at a compatible schema / contract version,
 *   4. Austin data is loaded when the environment expects it (--expect-data).
 *
 * Works for both backends via the store's own readiness():
 *   - sqlite: reachable=true; migrated = schema migrations applied.
 *   - loop:   reachable = Loop responded ok; migrated = Loop knowledge contract
 *             version matches the version PetsInMyCity expects.
 *
 * Usage:
 *   node scripts/readiness.js                 # env-configured store
 *   node scripts/readiness.js --expect-data   # also require Austin rows > 0
 *   node scripts/readiness.js ':memory:'      # explicit local sqlite target
 *
 * Exit code 0 = ready, 1 = not ready / misconfigured. Prints a compact JSON report
 * with the driver name and non-secret status only (never urls or tokens). This is a
 * controlled admin/CI command; it is NOT a public health endpoint.
 */
const KnowledgeStore = require('../src/KnowledgeStore');
const { resolveConfig, StorageConfigError } = require('../src/storage/create-store');

function parseArgs(argv) {
  const out = { expectData: false, target: undefined };
  for (const a of argv) {
    if (a === '--expect-data') out.expectData = true;
    else if (!a.startsWith('--')) out.target = a;
  }
  return out;
}

async function check(opts) {
  const options = opts || {};
  const report = { ready: false, driver: null, config: false, reachable: false, migrated: false, dataLoaded: null };

  // 1. Config (fail-closed). Never echo values.
  let cfg;
  try {
    cfg = resolveConfig(options.target ? { driver: 'sqlite', filename: options.target } : undefined, options.env);
    report.driver = cfg.driver;
    report.config = true;
  } catch (err) {
    report.configError = (err instanceof StorageConfigError) ? err.code : 'invalid_config';
    return report;
  }

  // 2. Reachability + 3. schema/contract version + 4. optional data.
  let store;
  try {
    store = await KnowledgeStore.create(cfg, options.env);
    const r = await store.readiness();
    report.reachable = !!r.reachable;
    report.migrated = !!r.migrated;
    report.contract = { version: r.contractVersion || null, expected: r.expected || null };
    if (options.expectData) {
      const stats = await store.stats();
      report.stats = stats;
      report.dataLoaded = stats.claims > 0 && stats.entities > 0;
    }
  } catch (err) {
    // Map any failure to a non-secret code. LoopError / config errors carry .code.
    report.reachError = (err && err.code) ? String(err.code) : 'unreachable_or_error';
    return report;
  } finally {
    if (store) { try { await store.close(); } catch (e) { /* ignore */ } }
  }

  report.ready = report.config && report.reachable && report.migrated
    && (!options.expectData || report.dataLoaded === true);
  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = await check({ expectData: args.expectData, target: args.target });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ready ? 0 : 1);
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('readiness check failed:', err && err.message ? err.message : String(err));
    process.exit(1);
  });
}

module.exports = { check, parseArgs };
