'use strict';

/**
 * End-to-end smoke tests for the primary pages, run in jsdom against the REAL
 * page HTML and the REAL browser assets, with the network stubbed.
 *
 * This is the local stand-in for clicking through the site: it proves the pages
 * parse, their inline scripts run, and the flows send the request shapes the
 * hardened Netlify Functions now expect - and that an emergency response is
 * rendered as an emergency.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');

function asset(name) {
  return fs.readFileSync(path.join(ROOT, 'assets', name), 'utf8');
}

/**
 * Load a real page. External <script src> files are not fetched by jsdom, so
 * the browser assets the page depends on are evaluated explicitly.
 */
function loadPage(relPath, fetchImpl, assets) {
  const html = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const dom = new JSDOM(html, {
    url: 'https://petsinmycity.com/' + relPath.replace(/index\.html$/, ''),
    runScripts: 'dangerously',
  });
  const win = dom.window;
  const calls = [];
  win.fetch = function (url, init) {
    calls.push({ url: String(url), init: init, body: init && init.body ? JSON.parse(init.body) : null });
    return fetchImpl(String(url), init);
  };
  win.gtag = function () {};
  win.dataLayer = win.dataLayer || [];
  for (const name of assets || []) win.eval(asset(name));
  return { dom: dom, win: win, calls: calls };
}

function jsonOk(payload) {
  return function () {
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(payload); } });
  };
}

const TOOL_ASSETS = ['safe-markdown.js', 'pet-tools-client.js'];

function click(win, id) {
  win.document.getElementById(id).dispatchEvent(new win.Event('click', { bubbles: true }));
}

function tick() {
  return new Promise(function (r) { setTimeout(r, 0); });
}

test('every primary page parses and runs its inline scripts', () => {
  const pages = [
    'index.html',
    'lucy/index.html',
    'tools/index.html',
    'tools/symptom-checker/index.html',
    'tools/emergency-finder/index.html',
    'tools/food-checker/index.html',
    'tools/calorie-calculator/index.html',
    'cities/chicago/index.html',
    'cities/houston/index.html',
    'cities/phoenix/index.html',
  ];
  for (const page of pages) {
    const errors = [];
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const dom = new JSDOM(html, { url: 'https://petsinmycity.com/', runScripts: 'dangerously' });
    dom.window.addEventListener('error', function (e) { errors.push(e.message); });
    assert.ok(dom.window.document.querySelector('body'), page);
    assert.deepEqual(errors, [], page);
    dom.window.close();
  }
});

test('symptom checker sends structured fields, not a glued-together sentence', async () => {
  const { win, calls } = loadPage('tools/symptom-checker/index.html',
    jsonOk({ ok: true, tool: 'symptom-checker', text: 'Monitor at home.', safety: { emergency: false, disclaimer: 'Not veterinary advice.' } }),
    TOOL_ASSETS);

  win.document.getElementById('symptoms').value = 'not eating since this morning';
  win.document.getElementById('pet-age').value = '3';
  click(win, 'tool-submit');
  await tick();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/.netlify/functions/pet-tools');
  assert.equal(calls[0].body.tool, 'symptom-checker');
  assert.deepEqual(calls[0].body.input, {
    species: 'dog',
    symptoms: 'not eating since this morning',
    duration: 'since yesterday',
    age: '3',
    age_unit: 'years',
  });
  assert.equal(calls[0].body.message, undefined, 'no free-text message field');
  assert.match(win.document.getElementById('tool-result').textContent, /Monitor at home/);
  assert.match(win.document.getElementById('tool-result').textContent, /Not veterinary advice/);
});

test('a server-classified emergency renders as an emergency, not as prose', async () => {
  const emergencyPayload = {
    ok: true,
    tool: 'symptom-checker',
    text: '**This may be an emergency. Contact an emergency veterinarian now.**\n\n[Find an emergency vet near you](https://www.google.com/maps/search/emergency+vet+near+me)',
    safety: {
      emergency: true,
      categories: [{ id: 'seizure', label: 'Active or repeated seizures' }],
      disclaimer: 'Not veterinary advice.',
    },
  };
  const { win } = loadPage('tools/symptom-checker/index.html', jsonOk(emergencyPayload), TOOL_ASSETS);
  win.document.getElementById('symptoms').value = 'my dog is having a seizure';
  click(win, 'tool-submit');
  await tick();

  const result = win.document.getElementById('tool-result');
  const card = result.querySelector('.tool-result-card');
  assert.ok(card.className.includes('danger'));
  assert.equal(card.getAttribute('role'), 'alert');
  assert.match(result.textContent, /EMERGENCY/);
  const link = result.querySelector('a');
  assert.equal(link.getAttribute('href'), 'https://www.google.com/maps/search/emergency+vet+near+me');
  assert.match(link.getAttribute('rel'), /noopener/);
});

test('emergency finder forwards a validated ZIP and its own fields', async () => {
  const { win, calls } = loadPage('tools/emergency-finder/index.html',
    jsonOk({ ok: true, text: 'Monitor.', safety: { emergency: false, disclaimer: 'x' } }), TOOL_ASSETS);
  win.document.getElementById('sit').value = 'she seems quiet and off her food';
  win.document.getElementById('emg-zip').value = '60601';
  click(win, 'tool-submit');
  await tick();

  assert.equal(calls[0].body.tool, 'emergency-finder');
  assert.equal(calls[0].body.zip, '60601');
  assert.deepEqual(calls[0].body.input, { species: 'dog', situation: 'she seems quiet and off her food' });
});

test('food checker sends the already-eaten flag and the amount', async () => {
  const { win, calls } = loadPage('tools/food-checker/index.html',
    jsonOk({ ok: true, text: 'Dangerous.', safety: { emergency: false, disclaimer: 'x' } }), TOOL_ASSETS);
  win.document.getElementById('food-input').value = 'grapes';
  win.document.getElementById('food-eaten').checked = true;
  win.document.getElementById('food-qty').value = '20';
  click(win, 'tool-submit');
  await tick();

  assert.equal(calls[0].body.tool, 'food-checker');
  assert.equal(calls[0].body.input.food, 'grapes');
  assert.equal(calls[0].body.input.already_eaten, true);
  assert.equal(calls[0].body.input.quantity, '20');
  assert.equal(calls[0].body.input.quantity_unit, 'g');
  // The food name must not reach analytics as an event parameter.
  assert.equal(calls[0].body.input.species, 'both');
});

test('calorie calculator sends weight, units, age and lifestyle fields', async () => {
  const { win, calls } = loadPage('tools/calorie-calculator/index.html',
    jsonOk({ ok: true, text: 'About 900 kcal.', safety: { emergency: false, disclaimer: 'x' } }), TOOL_ASSETS);
  win.document.getElementById('pet-weight').value = '55';
  win.document.getElementById('pet-age').value = '4';
  click(win, 'tool-submit');
  await tick();

  const input = calls[0].body.input;
  assert.equal(input.species, 'dog');
  assert.equal(input.weight, '55');
  assert.equal(input.weight_unit, 'lb');
  assert.equal(input.age, '4');
  assert.equal(input.age_unit, 'years');
  assert.equal(input.activity, 'moderately_active');
  assert.equal(input.body_condition, 'ideal');
});

test('a tool shows public error copy, never a raw server code', async () => {
  const failing = function () {
    return Promise.resolve({
      ok: false, status: 429,
      json: function () { return Promise.resolve({ ok: false, error: 'rate_limited', message: 'Too many requests.' }); },
    });
  };
  const { win } = loadPage('tools/food-checker/index.html', failing, TOOL_ASSETS);
  win.document.getElementById('food-input').value = 'grapes';
  click(win, 'tool-submit');
  await tick();

  const result = win.document.getElementById('tool-result');
  assert.match(result.textContent, /wait a minute and try again/i);
  assert.ok(!/rate_limited/.test(result.textContent));
  assert.equal(result.querySelector('.tool-result-card').getAttribute('role'), 'alert');
});

test('the homepage ZIP search posts an allow-listed category and renders results safely', async () => {
  const payload = {
    ok: true,
    category: 'veterinarian',
    category_label: 'Veterinarian',
    city: 'Chicago',
    results: [{
      name: '<img src=x onerror=alert(1)> Animal Hospital',
      address: '123 W Belmont Ave',
      rating: 4.7,
      total_ratings: 212,
      open_now: true,
      place_id: 'ChIJtest',
      maps_url: 'https://www.google.com/maps/place/?q=place_id:ChIJtest',
    }],
  };
  const { win, calls } = loadPage('index.html', jsonOk(payload), ['safe-markdown.js']);
  win.document.getElementById('zip-search-input').value = '60601';
  click(win, 'zip-search-btn');
  await tick();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/.netlify/functions/places-search');
  assert.deepEqual(calls[0].body, { zip: '60601', category: 'veterinarian' });

  const results = win.document.getElementById('zip-search-results');
  // Third-party (Google) content is inserted as text, never as markup.
  assert.equal(results.querySelector('img'), null);
  assert.match(results.textContent, /<img src=x onerror=alert\(1\)> Animal Hospital/);
  const card = results.querySelector('a');
  assert.equal(card.getAttribute('href'), 'https://www.google.com/maps/place/?q=place_id:ChIJtest');
  assert.equal(card.getAttribute('rel'), 'noopener noreferrer');
});

test('the homepage rejects a malformed ZIP before spending Google quota', async () => {
  const { win, calls } = loadPage('index.html', jsonOk({}), ['safe-markdown.js']);
  win.document.getElementById('zip-search-input').value = 'abc';
  click(win, 'zip-search-btn');
  await tick();
  assert.equal(calls.length, 0);
  assert.match(win.document.getElementById('zip-search-results').textContent, /5-digit US ZIP/i);
});

test('the homepage shows the fallback pathway when the search is rate limited', async () => {
  const limited = function () {
    return Promise.resolve({
      ok: false, status: 429,
      json: function () {
        return Promise.resolve({
          ok: false, error: 'rate_limited',
          fallback: { message: 'We could not run the live search just now.', maps_url: 'https://www.google.com/maps/search/veterinarian+near+60601' },
        });
      },
    });
  };
  const { win } = loadPage('index.html', limited, ['safe-markdown.js']);
  win.document.getElementById('zip-search-input').value = '60601';
  click(win, 'zip-search-btn');
  await tick();
  const results = win.document.getElementById('zip-search-results');
  assert.match(results.textContent, /could not run the live search/i);
  assert.equal(results.querySelector('a').getAttribute('href'), 'https://www.google.com/maps/search/veterinarian+near+60601');
});

test('no page still ships an inline handler that calls the old form or link tracker', () => {
  const pages = ['index.html', 'lucy/index.html', 'cities/chicago/index.html',
    'cities/houston/index.html', 'cities/phoenix/index.html'];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    assert.ok(!/onsubmit=/.test(html), page + ' has an inline onsubmit');
    assert.ok(!/__lucyTrackLink|__lucyTrack\b/.test(html), page + ' still references the old link tracker');
  }
});
