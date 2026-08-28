'use strict';

/**
 * Browser-side tests for the vet lead form in assets/script.js.
 *
 * Regression targets:
 *   - the old code showed "A local vet will be in touch shortly" immediately,
 *     before the HubSpot request resolved, and swallowed every failure with an
 *     empty .catch();
 *   - there was no consent control at all.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = fs.readFileSync(path.join(ROOT, 'assets/script.js'), 'utf8');

const FORM_HTML = `
<div id="site-header"></div>
<form class="vet-form" data-vet-lead novalidate>
  <label for="vet-name">Your name</label>
  <input type="text" id="vet-name" autocomplete="name" aria-describedby="vet-name-error">
  <p class="vet-field-error" id="vet-name-error"></p>
  <label for="vet-phone">Phone number</label>
  <input type="tel" id="vet-phone" autocomplete="tel" aria-describedby="vet-phone-error">
  <p class="vet-field-error" id="vet-phone-error"></p>
  <label for="vet-zip">ZIP code</label>
  <input type="text" id="vet-zip" autocomplete="postal-code" aria-describedby="vet-zip-error">
  <p class="vet-field-error" id="vet-zip-error"></p>
  <label for="vet-pet">Pet type</label>
  <select id="vet-pet" aria-describedby="vet-pet-error">
    <option value="">Select pet type</option>
    <option value="dog">Dog</option>
    <option value="cat">Cat</option>
    <option value="other">Other</option>
  </select>
  <p class="vet-field-error" id="vet-pet-error"></p>
  <div class="vet-consent">
    <input type="checkbox" id="vet-consent" aria-describedby="vet-consent-error">
    <label for="vet-consent">I agree ... <a href="/privacy/">Privacy Policy</a></label>
  </div>
  <p class="vet-field-error" id="vet-consent-error"></p>
  <button type="submit">Find Vets</button>
  <div class="vet-status" role="status" aria-live="polite"></div>
</form>
<div id="site-footer"></div>`;

/**
 * Boot a page with the real assets/script.js and a controllable fetch.
 *
 * @param {Function} fetchImpl (url, init) => Promise
 */
async function boot(fetchImpl) {
  const dom = new JSDOM('<!doctype html><body>' + FORM_HTML + '</body>', {
    url: 'https://petsinmycity.com/cities/chicago/',
    runScripts: 'outside-only',
  });
  const win = dom.window;
  const fetchCalls = [];
  win.fetch = function (url, init) {
    fetchCalls.push({ url: String(url), init: init });
    return fetchImpl(String(url), init);
  };
  const events = [];
  win.gtag = function (kind, name, params) { events.push({ name: name, params: params }); };
  win.eval(SCRIPT);
  // script.js binds the form from mount(), which runs on DOMContentLoaded.
  if (win.document.readyState === 'loading') {
    await new Promise(function (resolve) { win.document.addEventListener('DOMContentLoaded', resolve); });
  }
  const form = win.document.querySelector('form.vet-form');
  assert.equal(form.dataset.pimcVetBound, '1', 'script.js bound the form without an inline handler');
  return { dom: dom, win: win, fetchCalls: fetchCalls, events: events };
}

function fill(win, overrides) {
  const values = Object.assign({
    name: 'Sam Rivera', phone: '(312) 555-0142', zip: '60601', pet: 'dog', consent: true,
  }, overrides || {});
  win.document.getElementById('vet-name').value = values.name;
  win.document.getElementById('vet-phone').value = values.phone;
  win.document.getElementById('vet-zip').value = values.zip;
  win.document.getElementById('vet-pet').value = values.pet;
  win.document.getElementById('vet-consent').checked = values.consent;
}

function submit(win) {
  const form = win.document.querySelector('form.vet-form');
  form.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
  return form;
}

function status(win) {
  return win.document.querySelector('.vet-status');
}

const never = function () { return new Promise(function () {}); };

test('the consent checkbox ships unchecked', async () => {
  const { win } = await boot(never);
  assert.equal(win.document.getElementById('vet-consent').checked, false);
});

test('nothing is sent until consent is given', async () => {
  const { win, fetchCalls, events } = await boot(never);
  fill(win, { consent: false });
  submit(win);
  assert.equal(fetchCalls.length, 0, 'no request without consent');
  assert.match(status(win).textContent, /fix the highlighted fields/i);
  assert.equal(win.document.getElementById('vet-consent').getAttribute('aria-invalid'), 'true');
  assert.match(win.document.getElementById('vet-consent-error').textContent, /tick the box/i);
  assert.ok(events.some(function (e) { return e.name === 'form_submission_failure'; }));
  assert.ok(!events.some(function (e) { return e.name === 'form_submission_success'; }));
});

test('invalid fields block submission and are announced', async () => {
  const cases = [
    [{ name: '' }, 'vet-name'],
    [{ phone: '123' }, 'vet-phone'],
    [{ zip: 'abcde' }, 'vet-zip'],
    [{ zip: '606' }, 'vet-zip'],
    [{ pet: '' }, 'vet-pet'],
  ];
  for (const [overrides, fieldId] of cases) {
    const { win, fetchCalls } = await boot(never);
    fill(win, overrides);
    submit(win);
    assert.equal(fetchCalls.length, 0, JSON.stringify(overrides));
    assert.equal(win.document.getElementById(fieldId).getAttribute('aria-invalid'), 'true', fieldId);
    assert.ok(win.document.getElementById(fieldId + '-error').textContent.length > 0, fieldId);
  }
});

test('a valid submission posts to HubSpot and waits for the response', async () => {
  let resolveRequest;
  const { win, fetchCalls } = await boot(function () {
    return new Promise(function (resolve) { resolveRequest = resolve; });
  });
  fill(win);
  submit(win);

  assert.equal(fetchCalls.length, 1);
  assert.match(fetchCalls[0].url, /api\.hsforms\.com/);
  const sent = JSON.parse(fetchCalls[0].init.body);
  assert.ok(sent.fields.some(function (f) { return f.name === 'phone'; }));
  assert.equal(sent.legalConsentOptions.consent.consentToProcess, true);

  // While in flight: busy, not successful.
  const button = win.document.querySelector('button[type="submit"]');
  assert.equal(button.disabled, true);
  assert.equal(button.getAttribute('aria-busy'), 'true');
  assert.ok(!/in touch|thanks/i.test(status(win).textContent), status(win).textContent);

  resolveRequest({ ok: true, status: 200 });
  await new Promise(function (r) { setTimeout(r, 0); });

  assert.match(status(win).textContent, /Thanks/i);
  assert.equal(status(win).className, 'vet-status success');
  assert.equal(button.disabled, true, 'the form locks after a confirmed success');
});

test('a failed submission never shows success', async () => {
  for (const failure of [
    function () { return Promise.resolve({ ok: false, status: 500 }); },
    function () { return Promise.resolve({ ok: false, status: 400 }); },
    function () { return Promise.reject(new Error('network down')); },
  ]) {
    const { win, events } = await boot(failure);
    fill(win);
    submit(win);
    await new Promise(function (r) { setTimeout(r, 0); });

    const text = status(win).textContent;
    assert.ok(!/thanks/i.test(text), text);
    assert.ok(!/in touch/i.test(text), text);
    assert.equal(status(win).className, 'vet-status error');
    assert.equal(status(win).getAttribute('role'), 'alert');
    assert.match(text, /press the button again/i);
    assert.ok(events.some(function (e) { return e.name === 'form_submission_failure'; }));
    assert.ok(!events.some(function (e) { return e.name === 'form_submission_success'; }));
  }
});

test('a failure leaves the form usable and the answers intact', async () => {
  const { win } = await boot(function () { return Promise.reject(new Error('offline')); });
  fill(win);
  submit(win);
  await new Promise(function (r) { setTimeout(r, 0); });

  const button = win.document.querySelector('button[type="submit"]');
  assert.equal(button.disabled, false, 'retryable');
  assert.equal(button.textContent, 'Find Vets', 'the label is restored');
  assert.equal(win.document.getElementById('vet-name').value, 'Sam Rivera');
  assert.equal(win.document.getElementById('vet-zip').value, '60601');
});

test('a timeout is reported as retryable, not as success', async () => {
  const { win } = await boot(function () {
    const err = new Error('aborted');
    err.name = 'AbortError';
    return Promise.reject(err);
  });
  fill(win);
  submit(win);
  await new Promise(function (r) { setTimeout(r, 0); });
  assert.match(status(win).textContent, /took too long/i);
  assert.equal(status(win).className, 'vet-status error');
});

test('analytics carry no personal data', async () => {
  const { win, events } = await boot(function () { return Promise.resolve({ ok: true, status: 200 }); });
  fill(win, { name: 'Jordan Blake', phone: '(312) 555-0199', zip: '60614', pet: 'cat' });
  submit(win);
  await new Promise(function (r) { setTimeout(r, 0); });

  const success = events.find(function (e) { return e.name === 'form_submission_success'; });
  assert.ok(success, 'success event fired');
  const serialized = JSON.stringify(events);
  for (const secret of ['Jordan', 'Blake', '555-0199', '3125550199', '60614']) {
    assert.ok(!serialized.includes(secret), 'leaked ' + secret + ' -> ' + serialized);
  }
  // The exact key set is the real guarantee - pet type, name, phone and ZIP
  // simply have nowhere to appear. (A substring check for the pet type would
  // false-positive on "cat" inside "/cities/chicago/".)
  assert.deepEqual(Object.keys(success.params).sort(), ['form_location', 'form_name']);
  for (const event of events) {
    for (const value of Object.values(event.params || {})) {
      assert.notEqual(value, 'cat');
      assert.notEqual(value, '60614');
    }
  }
  assert.equal(success.params.form_location, '/cities/chicago/');
});

test('failure analytics carry only a coarse reason', async () => {
  const { win, events } = await boot(function () { return Promise.reject(new Error('boom')); });
  fill(win, { name: 'Jordan Blake', zip: '60614' });
  submit(win);
  await new Promise(function (r) { setTimeout(r, 0); });
  const failure = events.find(function (e) { return e.name === 'form_submission_failure'; });
  assert.deepEqual(Object.keys(failure.params).sort(), ['failure_reason', 'form_location', 'form_name']);
  assert.ok(!JSON.stringify(events).includes('60614'));
  assert.ok(!JSON.stringify(events).includes('Jordan'));
});

test('success copy does not promise that a vet will make contact', async () => {
  const { win } = await boot(function () { return Promise.resolve({ ok: true, status: 200 }); });
  fill(win);
  submit(win);
  await new Promise(function (r) { setTimeout(r, 0); });
  const text = status(win).textContent;
  assert.ok(!/will be in touch/i.test(text), text);
  assert.ok(!/a vet will (call|contact)/i.test(text), text);
  assert.match(text, /cannot guarantee/i);
});

test('the shipped city pages have accessible, consent-gated forms', async () => {
  for (const city of ['chicago', 'houston', 'phoenix']) {
    const html = fs.readFileSync(path.join(ROOT, 'cities', city, 'index.html'), 'utf8');
    const page = new JSDOM(html, { url: 'https://petsinmycity.com/cities/' + city + '/' });
    const doc = page.window.document;
    const form = doc.querySelector('form.vet-form, form[data-vet-lead]');
    assert.ok(form, city + ': lead form present');

    // No inline handler.
    assert.equal(form.getAttribute('onsubmit'), null, city + ': no inline onsubmit');
    assert.ok(!/submitVetForm/.test(html), city + ': no inline submitVetForm attribute');

    for (const [id, autocomplete] of [['vet-name', 'name'], ['vet-phone', 'tel'], ['vet-zip', 'postal-code']]) {
      const field = doc.getElementById(id);
      assert.ok(field, city + ': ' + id);
      assert.equal(field.getAttribute('autocomplete'), autocomplete, city + ': ' + id + ' autocomplete');
      assert.ok(doc.querySelector('label[for="' + id + '"]'), city + ': visible label for ' + id);
      assert.ok(doc.getElementById(id + '-error'), city + ': error region for ' + id);
    }
    assert.ok(doc.querySelector('label[for="vet-pet"]'), city + ': label for pet type');

    const consent = doc.getElementById('vet-consent');
    assert.ok(consent, city + ': consent checkbox');
    assert.equal(consent.type, 'checkbox');
    assert.equal(consent.hasAttribute('checked'), false, city + ': consent must not be pre-checked');
    assert.ok(doc.querySelector('label[for="vet-consent"]'), city + ': consent label');

    const consentLabel = doc.querySelector('label[for="vet-consent"]').textContent;
    // Contact methods must match what the site actually does.
    assert.ok(/phone call or email/i.test(consentLabel), city + ': consent names the real contact methods');
    assert.ok(!/\b(sms|text message|autodial|automated calls?|prerecorded)\b/i.test(consentLabel),
      city + ': no SMS/autodialer language');

    assert.ok(form.querySelector('a[href="/privacy/"]'), city + ': privacy policy linked in the form');
    const live = form.querySelector('[aria-live]');
    assert.ok(live, city + ': live region for status announcements');
  }
});

test('no page still promises "a local vet will be in touch"', async () => {
  const files = [path.join(ROOT, 'assets/script.js')]
    .concat(['chicago', 'houston', 'phoenix'].map(function (c) { return path.join(ROOT, 'cities', c, 'index.html'); }));
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.ok(!/local vet will be in touch/i.test(source), file);
  }
});
