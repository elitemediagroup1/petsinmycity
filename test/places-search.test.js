'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const handlerModule = require('../netlify/functions/places-search');
const handler = handlerModule.handler;
const categories = require('../netlify/lib/places/categories');
const {
  makeEvent, parseBody, resetRateLimits, stubFetch, jsonResponse, hangingFetch, withEnv, muteLogs, FAKE_KEY,
} = require('./helpers');

const GEO_OK = {
  status: 'OK',
  results: [{
    geometry: { location: { lat: 41.88, lng: -87.62 } },
    address_components: [
      { types: ['locality'], long_name: 'Chicago' },
      { types: ['administrative_area_level_1'], short_name: 'IL' },
    ],
  }],
};

const PLACES_OK = {
  status: 'OK',
  results: [
    {
      name: 'Lakeview Animal Hospital',
      vicinity: '123 W Belmont Ave, Chicago',
      rating: 4.7,
      user_ratings_total: 212,
      opening_hours: { open_now: true },
      place_id: 'ChIJtestplaceid',
    },
  ],
};

function setup(t, extraEnv) {
  const unmute = muteLogs();
  const restoreEnv = withEnv(Object.assign({
    GOOGLE_PLACES_API_KEY: FAKE_KEY,
    RATE_LIMIT_BACKEND: 'memory',
    PLACES_CLIENT_PER_10MIN: '50',
    PLACES_CLIENT_PER_DAY: '50',
    PLACES_GLOBAL_PER_MIN: '50',
    PLACES_GLOBAL_PER_DAY: '50',
    CONTEXT: 'production',
  }, extraEnv || {}));
  resetRateLimits();
  t.after(function () { restoreEnv(); unmute(); resetRateLimits(); });
}

/** Route the two upstream calls by URL. */
function googleStub(geo, places) {
  return stubFetch(function (url) {
    if (url.indexOf('/geocode/') !== -1) return jsonResponse(200, geo);
    return jsonResponse(200, places);
  });
}

test('places: a valid ZIP + category returns normalized results', async (t) => {
  setup(t);
  const restore = googleStub(GEO_OK, PLACES_OK);
  t.after(restore);

  const res = await handler(makeEvent({ body: { zip: '60601', category: 'veterinarian' } }));
  assert.equal(res.statusCode, 200);
  const body = parseBody(res);
  assert.equal(body.ok, true);
  assert.equal(body.city, 'Chicago');
  assert.equal(body.category, 'veterinarian');
  assert.equal(body.results.length, 1);
  assert.deepEqual(Object.keys(body.results[0]).sort(),
    ['address', 'maps_url', 'name', 'open_now', 'place_id', 'rating', 'total_ratings']);
  assert.equal(body.results[0].maps_url, 'https://www.google.com/maps/place/?q=place_id:ChIJtestplaceid');
});

test('places: the API key is never echoed to the browser', async (t) => {
  setup(t);
  t.after(googleStub(GEO_OK, PLACES_OK));
  const res = await handler(makeEvent({ body: { zip: '60601', category: 'veterinarian' } }));
  assert.ok(!res.body.includes(FAKE_KEY));
});

test('places: legacy front-end category spellings still work', async (t) => {
  setup(t);
  t.after(googleStub(GEO_OK, PLACES_OK));
  for (const legacy of ['emergency vet', 'pet groomer', 'dog boarding', 'dog trainer', 'animal shelter', 'pet store']) {
    const res = await handler(makeEvent({ body: { zip: '60601', type: legacy } }));
    assert.equal(res.statusCode, 200, legacy);
  }
});

test('places: only POST and OPTIONS', async (t) => {
  setup(t);
  for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
    const res = await handler(makeEvent({ method: method, body: { zip: '60601' } }));
    assert.equal(res.statusCode, 405, method);
    assert.equal(parseBody(res).error, 'method_not_allowed');
  }
  const preflight = await handler(makeEvent({ method: 'OPTIONS' }));
  assert.equal(preflight.statusCode, 204);
  assert.equal(preflight.headers['Access-Control-Allow-Origin'], 'https://petsinmycity.com');
});

test('places: a disallowed origin is refused before any upstream call', async (t) => {
  setup(t);
  const restore = stubFetch(function () { throw new Error('upstream must not be called'); });
  t.after(restore);
  const res = await handler(makeEvent({ origin: 'https://evil.example', body: { zip: '60601' } }));
  assert.equal(res.statusCode, 403);
  assert.equal(parseBody(res).error, 'origin_not_allowed');
  assert.equal(globalThis.fetch.calls.length, 0);
});

test('places: malformed ZIP codes are rejected', async (t) => {
  setup(t);
  const restore = stubFetch(function () { throw new Error('upstream must not be called'); });
  t.after(restore);
  for (const zip of ['1234', '123456', '60601; DROP', '9 9 9 9 9', '', null, 60601, '0x1234']) {
    const res = await handler(makeEvent({ body: { zip: zip, category: 'veterinarian' } }));
    assert.equal(res.statusCode, 400, JSON.stringify(zip));
    assert.equal(parseBody(res).error, 'invalid_request');
  }
  assert.equal(globalThis.fetch.calls.length, 0);
});

test('places: unsupported categories are rejected and arbitrary keywords cannot pass', async (t) => {
  setup(t);
  const restore = stubFetch(function () { throw new Error('upstream must not be called'); });
  t.after(restore);
  for (const bad of ['casino', 'restaurants near me', 'veterinarian OR pet store OR groomer', 'dog park', '../../etc']) {
    const res = await handler(makeEvent({ body: { zip: '60601', category: bad } }));
    assert.equal(res.statusCode, 400, bad);
    assert.equal(parseBody(res).error, 'invalid_request');
    assert.deepEqual(parseBody(res).supported, categories.CATEGORY_IDS);
  }
  assert.equal(globalThis.fetch.calls.length, 0);
});

test('places: the provider query is built from the allow-list, not from user text', async (t) => {
  setup(t);
  t.after(googleStub(GEO_OK, PLACES_OK));
  await handler(makeEvent({ body: { zip: '60601', category: 'grooming' } }));
  const placesCall = globalThis.fetch.calls.find(function (c) { return c.url.indexOf('nearbysearch') !== -1; });
  assert.ok(placesCall.url.includes('keyword=pet%20groomer'));
});

test('places: an oversized body is rejected', async (t) => {
  setup(t);
  const res = await handler(makeEvent({ body: { zip: '60601', category: 'veterinarian', pad: 'x'.repeat(5000) } }));
  assert.equal(res.statusCode, 413);
  assert.equal(parseBody(res).error, 'payload_too_large');
});

test('places: invalid JSON is rejected', async (t) => {
  setup(t);
  const res = await handler(makeEvent({ rawBody: '{"zip": ' }));
  assert.equal(res.statusCode, 400);
  assert.equal(parseBody(res).error, 'invalid_json');
});

test('places: no geocoding result returns an empty, friendly answer', async (t) => {
  setup(t);
  t.after(googleStub({ status: 'ZERO_RESULTS', results: [] }, PLACES_OK));
  const res = await handler(makeEvent({ body: { zip: '99999', category: 'veterinarian' } }));
  assert.equal(res.statusCode, 200);
  const body = parseBody(res);
  assert.deepEqual(body.results, []);
  assert.match(body.message, /could not find that ZIP code or city/i);
});

test('places: no nearby results returns an empty list with guidance', async (t) => {
  setup(t);
  t.after(googleStub(GEO_OK, { status: 'ZERO_RESULTS', results: [] }));
  const res = await handler(makeEvent({ body: { zip: '60601', category: 'veterinarian' } }));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(parseBody(res).results, []);
  assert.match(parseBody(res).message, /Try a nearby ZIP code/i);
});

test('places: quota exhaustion returns a non-technical fallback', async (t) => {
  setup(t);
  t.after(googleStub({ status: 'OVER_QUERY_LIMIT' }, PLACES_OK));
  const res = await handler(makeEvent({ body: { zip: '60601', category: 'veterinarian' } }));
  assert.equal(res.statusCode, 503);
  const body = parseBody(res);
  assert.equal(body.error, 'quota_exhausted');
  assert.match(body.fallback.message, /Google Maps/);
  assert.ok(!/quota|OVER_QUERY_LIMIT|google api/i.test(body.message));
});

test('places: a provider HTTP error never leaks provider detail', async (t) => {
  setup(t);
  const restore = stubFetch(function (url) {
    if (url.indexOf('/geocode/') !== -1) return jsonResponse(200, GEO_OK);
    return { ok: false, status: 500, async json() { return { error_message: 'internal google failure at key=SECRET' }; } };
  });
  t.after(restore);
  const res = await handler(makeEvent({ body: { zip: '60601', category: 'veterinarian' } }));
  assert.equal(res.statusCode, 502);
  assert.equal(parseBody(res).error, 'upstream_unavailable');
  assert.ok(!res.body.includes('SECRET'));
  assert.ok(!res.body.includes('internal google failure'));
});

test('places: a REQUEST_DENIED provider status is not exposed', async (t) => {
  setup(t);
  t.after(googleStub({ status: 'REQUEST_DENIED', error_message: 'The provided API key is invalid.' }, PLACES_OK));
  const res = await handler(makeEvent({ body: { zip: '60601', category: 'veterinarian' } }));
  assert.equal(res.statusCode, 502);
  assert.ok(!res.body.includes('API key'));
  assert.ok(!res.body.includes('REQUEST_DENIED'));
});

test('places: an upstream timeout returns 504 with a fallback', async (t) => {
  setup(t, { PLACES_GEOCODE_TIMEOUT_MS: '50', PLACES_SEARCH_TIMEOUT_MS: '50' });
  const restore = stubFetch(hangingFetch());
  t.after(restore);
  const res = await handler(makeEvent({ body: { zip: '60601', category: 'veterinarian' } }));
  assert.equal(res.statusCode, 504);
  assert.equal(parseBody(res).error, 'upstream_timeout');
  assert.ok(parseBody(res).fallback.maps_url);
});

test('places: a missing API key fails closed without revealing configuration', async (t) => {
  setup(t, { GOOGLE_PLACES_API_KEY: undefined });
  const restore = stubFetch(function () { throw new Error('upstream must not be called'); });
  t.after(restore);
  const res = await handler(makeEvent({ body: { zip: '60601', category: 'veterinarian' } }));
  assert.equal(res.statusCode, 503);
  assert.equal(parseBody(res).error, 'service_unavailable');
  assert.ok(!/env|environment|GOOGLE_PLACES_API_KEY|Netlify/i.test(res.body));
});

test('places: the per-client rate limit returns 429 with a stable code', async (t) => {
  setup(t, { PLACES_CLIENT_PER_10MIN: '2', PLACES_CLIENT_PER_DAY: '50' });
  t.after(googleStub(GEO_OK, PLACES_OK));
  const body = { zip: '60601', category: 'veterinarian' };
  assert.equal((await handler(makeEvent({ body: body }))).statusCode, 200);
  assert.equal((await handler(makeEvent({ body: body }))).statusCode, 200);
  const limited = await handler(makeEvent({ body: body }));
  assert.equal(limited.statusCode, 429);
  assert.equal(parseBody(limited).error, 'rate_limited');
  assert.ok(Number(limited.headers['Retry-After']) > 0);
  assert.ok(parseBody(limited).fallback.maps_url);
});

test('places: a different client is not limited by another client', async (t) => {
  setup(t, { PLACES_CLIENT_PER_10MIN: '1', PLACES_GLOBAL_PER_MIN: '50' });
  t.after(googleStub(GEO_OK, PLACES_OK));
  const body = { zip: '60601', category: 'veterinarian' };
  assert.equal((await handler(makeEvent({ body: body, ip: '198.51.100.1' }))).statusCode, 200);
  assert.equal((await handler(makeEvent({ body: body, ip: '198.51.100.1' }))).statusCode, 429);
  assert.equal((await handler(makeEvent({ body: body, ip: '198.51.100.2' }))).statusCode, 200);
});

test('places: the global cap protects the shared Google quota across clients', async (t) => {
  setup(t, { PLACES_GLOBAL_PER_MIN: '2', PLACES_CLIENT_PER_10MIN: '50' });
  t.after(googleStub(GEO_OK, PLACES_OK));
  const body = { zip: '60601', category: 'veterinarian' };
  assert.equal((await handler(makeEvent({ body: body, ip: '198.51.100.1' }))).statusCode, 200);
  assert.equal((await handler(makeEvent({ body: body, ip: '198.51.100.2' }))).statusCode, 200);
  // A third, previously unseen client is still refused: the site-wide budget is spent.
  const limited = await handler(makeEvent({ body: body, ip: '198.51.100.3' }));
  assert.equal(limited.statusCode, 429);
  assert.equal(parseBody(limited).error, 'rate_limited');
});

test('places: rate limiting happens before the paid upstream call', async (t) => {
  setup(t, { PLACES_GLOBAL_PER_MIN: '1' });
  const restore = googleStub(GEO_OK, PLACES_OK);
  t.after(restore);
  const body = { zip: '60601', category: 'veterinarian' };
  await handler(makeEvent({ body: body }));
  const callsAfterFirst = globalThis.fetch.calls.length;
  await handler(makeEvent({ body: body }));
  assert.equal(globalThis.fetch.calls.length, callsAfterFirst, 'no upstream call once limited');
});

test('places: a validated city string is accepted', async (t) => {
  setup(t);
  t.after(googleStub(GEO_OK, PLACES_OK));
  const res = await handler(makeEvent({ body: { location: 'Chicago, IL', category: 'veterinarian' } }));
  assert.equal(res.statusCode, 200);
  const geoCall = globalThis.fetch.calls.find(function (c) { return c.url.indexOf('/geocode/') !== -1; });
  assert.ok(geoCall.url.includes('components=country%3AUS') || geoCall.url.includes('components=country:US'));
});
