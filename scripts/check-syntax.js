#!/usr/bin/env node
'use strict';

/**
 * Parse-check every JavaScript file we ship.
 *
 * Covers:
 *   - browser bundles in assets/
 *   - Netlify Functions and their shared library
 *   - build/utility scripts
 *   - inline <script> blocks in the HTML pages, which are otherwise never
 *     parsed by any tool in this repo and are where the historical breakages
 *     have been
 *
 * Exits non-zero on the first parse failure, listing every failure found.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', '.netlify', 'dist', 'coverage']);

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

/** Parse-only check. `new vm.Script` compiles without executing. */
function checkSource(source, label, failures) {
  try {
    new vm.Script(source, { filename: label });
  } catch (err) {
    failures.push({ label: label, message: err.message });
  }
}

const SCRIPT_TAG = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

function inlineScripts(html) {
  const blocks = [];
  let match;
  SCRIPT_TAG.lastIndex = 0;
  while ((match = SCRIPT_TAG.exec(html)) !== null) {
    const attrs = match[1] || '';
    if (/\bsrc\s*=/.test(attrs)) continue;            // external file, checked separately
    if (/type\s*=\s*["'](?!text\/javascript|application\/javascript)/i.test(attrs)) continue; // ld+json etc.
    const body = match[2];
    if (!body.trim()) continue;
    const line = html.slice(0, match.index).split('\n').length;
    blocks.push({ line: line, body: body });
  }
  return blocks;
}

function main() {
  const files = walk(ROOT, []);
  const failures = [];
  let jsCount = 0;
  let htmlCount = 0;
  let inlineCount = 0;

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (file.endsWith('.js')) {
      jsCount += 1;
      checkSource(fs.readFileSync(file, 'utf8'), rel, failures);
    } else if (file.endsWith('.html')) {
      htmlCount += 1;
      const html = fs.readFileSync(file, 'utf8');
      for (const block of inlineScripts(html)) {
        inlineCount += 1;
        checkSource(block.body, rel + ':' + block.line + ' (inline script)', failures);
      }
    }
  }

  if (failures.length) {
    console.error('Syntax check FAILED (' + failures.length + '):');
    for (const failure of failures) {
      console.error('  ' + failure.label + ' -> ' + failure.message);
    }
    process.exit(1);
  }
  console.log('Syntax check passed: ' + jsCount + ' .js files, '
    + inlineCount + ' inline scripts across ' + htmlCount + ' HTML pages.');
}

main();
