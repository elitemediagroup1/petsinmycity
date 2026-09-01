'use strict';

/**
 * Google Places / Geocoding proxy for PetsInMyCity.
 *
 * This endpoint spends real money on a hard-capped Google Cloud quota
 * (Geocoding 25/day + 5/min, legacy Places 20/day + 5/min, key restricted to
 * those two APIs). Everything here is built around not letting a stranger burn
 * that budget:
 *
 *   - POST/OPTIONS only, small body limit, strict shape validation;
 *   - CORS limited to petsinmycity.com and approved preview origins;
 *   - a closed category allow-list, so this can never be used as a generic
 *     Places proxy;
 *   - BOTH a per-client and a site-wide (global) durable rate limit, sized to
 *     stay inside the Google daily/minute quotas;
 *   - timeouts on both upstream calls;
 *   - provider status codes checked and translated into stable public codes.
 *
 * Runtime: Node 20 (see netlify.toml [build.environment] NODE_VERSION and
 * .nvmrc). Uses the runtime's built-in global fetch - the previous
 * `require('node-fetch')` was an undeclared dependency of this file and has
 * been removed.
 *
 * CACHING: nothing from the Google Places response is cached or stored. Google's
 * terms allow caching place_id essentially indefinitely but restrict retention
 * of other Places content; rather than track that per field we keep the endpoint
 * fully pass-through. See docs/SECURITY_OPERATIONS.md ("Places caching").
 */

const cors = require('../lib/cors');
const guard = require('../lib/request-guard');
const { errorResponse, jsonResponse } = require('../lib/errors');
const rateLimit = require('../lib/rate-limit');
const log = require('../lib/log');
const validate = require('../lib/validate');
const places = require('../lib/places/categories');
const { fetchWithTimeout, UpstreamTimeoutError } = require('../lib/fetch-timeout');

const ENDPOINT = 'places-search';
const MAX_BODY_BYTES = 2 * 1024;
// Overridable so the test suite can exercise the timeout path quickly.
function timeoutMs(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
const GEOCODE_TIMEOUT_MS = function () { return timeoutMs('PLACES_GEOCODE_TIMEOUT_MS', 6000); };
const PLACES_TIMEOUT_MS = function () { return timeoutMs('PLACES_SEARCH_TIMEOUT_MS', 6000); };
const SEARCH_RADIUS_M = 8000;
const MAX_RESULTS = 6;

/**
 * Sized against the active Google quotas (Geocoding 25/day + 5/min, legacy
 * Places 20/day + 5/min). One request spends one of each, so the global daily
 * cap sits under the smaller of the two with headroom for retries.
 */
function limits(env) {
  return {
    client: [
      { name: 'ten_minutes', windowSeconds: 600, max: rateLimit.envLimit(env, 'PLACES_CLIENT_PER_10MIN', 3) },
      { name: 'day', windowSeconds: 86400, max: rateLimit.envLimit(env, 'PLACES_CLIENT_PER_DAY', 6) },
    ],
    global: [
      { name: 'minute', windowSeconds: 60, max: rateLimit.envLimit(env, 'PLACES_GLOBAL_PER_MIN', 4) },
      { name: 'day', windowSeconds: 86400, max: rateLimit.envLimit(env, 'PLACES_GLOBAL_PER_DAY', 18) },
    ],
  };
}

/**
 * Accept either a 5-digit US ZIP or a tightly validated city string, under
 * `zip`, `location` or `city`.
 */
function readLocation(body) {
  const raw = body.zip != null ? body.zip : (body.location != null ? body.location : body.city);
  if (typeof raw !== 'string' || !raw.trim()) return { ok: false, reason: 'location_missing' };
  const trimmed = raw.trim();
  if (/^\d/.test(trimmed)) {
    const zip = validate.usZip(trimmed);
    if (!zip.ok) return { ok: false, reason: 'bad_zip' };
    return { ok: true, kind: 'zip', value: zip.value };
  }
  const city = validate.cityName(trimmed);
  if (!city.ok) return { ok: false, reason: 'bad_city' };
  return { ok: true, kind: 'city', value: city.value };
}

/** Google Geocoding statuses that mean "no result", not "we broke". */
const GEOCODE_EMPTY = ['ZERO_RESULTS'];
const QUOTA_STATUSES = ['OVER_QUERY_LIMIT', 'OVER_DAILY_LIMIT', 'RESOURCE_EXHAUSTED'];

async function geocode(location, apiKey) {
  const query = location.kind === 'zip'
    ? location.value + ', USA'
    : location.value + ', USA';
  const url = 'https://maps.googleapis.com/maps/api/geocode/json'
    + '?address=' + encodeURIComponent(query)
    + '&components=country:US'
    + '&key=' + encodeURIComponent(apiKey);

  const res = await fetchWithTimeout(url, { method: 'GET' }, GEOCODE_TIMEOUT_MS());
  if (!res.ok) return { ok: false, code: 'upstream_unavailable', httpStatus: res.status };

  let data;
  try {
    data = await res.json();
  } catch (_) {
    return { ok: false, code: 'upstream_unavailable' };
  }
  const status = data && data.status;
  if (QUOTA_STATUSES.indexOf(status) !== -1) return { ok: false, code: 'quota_exhausted', providerStatus: status };
  if (GEOCODE_EMPTY.indexOf(status) !== -1) return { ok: false, code: 'no_results', providerStatus: status };
  if (status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
    return { ok: false, code: 'upstream_unavailable', providerStatus: status };
  }

  const top = data.results[0];
  const loc = top.geometry && top.geometry.location;
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
    return { ok: false, code: 'upstream_unavailable', providerStatus: status };
  }
  const components = Array.isArray(top.address_components) ? top.address_components : [];
  const locality = components.find(function (c) {
    return Array.isArray(c.types) && (c.types.indexOf('locality') !== -1 || c.types.indexOf('postal_town') !== -1);
  });
  const state = components.find(function (c) {
    return Array.isArray(c.types) && c.types.indexOf('administrative_area_level_1') !== -1;
  });
  return {
    ok: true,
    lat: loc.lat,
    lng: loc.lng,
    city: (locality && locality.long_name) || (location.kind === 'city' ? location.value : location.value),
    state: (state && state.short_name) || null,
  };
}

async function nearbySearch(coords, category, apiKey) {
  let url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
    + '?location=' + encodeURIComponent(coords.lat + ',' + coords.lng)
    + '&radius=' + SEARCH_RADIUS_M
    + '&keyword=' + encodeURIComponent(category.keyword)
    + '&key=' + encodeURIComponent(apiKey);
  if (category.type) url += '&type=' + encodeURIComponent(category.type);

  const res = await fetchWithTimeout(url, { method: 'GET' }, PLACES_TIMEOUT_MS());
  if (!res.ok) return { ok: false, code: 'upstream_unavailable', httpStatus: res.status };

  let data;
  try {
    data = await res.json();
  } catch (_) {
    return { ok: false, code: 'upstream_unavailable' };
  }
  const status = data && data.status;
  if (QUOTA_STATUSES.indexOf(status) !== -1) return { ok: false, code: 'quota_exhausted', providerStatus: status };
  if (status === 'ZERO_RESULTS') return { ok: true, results: [] };
  if (status !== 'OK') return { ok: false, code: 'upstream_unavailable', providerStatus: status };

  const results = (Array.isArray(data.results) ? data.results : [])
    .slice(0, MAX_RESULTS)
    .map(function (place) {
      return {
        name: typeof place.name === 'string' ? place.name : '',
        address: typeof place.vicinity === 'string' ? place.vicinity : '',
        rating: typeof place.rating === 'number' ? place.rating : null,
        total_ratings: typeof place.user_ratings_total === 'number' ? place.user_ratings_total : 0,
        open_now: place.opening_hours && typeof place.opening_hours.open_now === 'boolean'
          ? place.opening_hours.open_now
          : null,
        place_id: typeof place.place_id === 'string' ? place.place_id : null,
        maps_url: typeof place.place_id === 'string'
          ? 'https://www.google.com/maps/place/?q=place_id:' + encodeURIComponent(place.place_id)
          : null,
      };
    })
    .filter(function (p) { return p.name && p.place_id; });

  return { ok: true, results: results };
}

/** Non-technical fallback shown when the provider is unavailable or capped. */
function fallbackFor(location, category) {
  const where = location ? location.value : 'you';
  const term = (category && category.keyword) || 'pet services';
  return {
    message: 'We could not run the live search just now. You can still find ' + term + ' near ' + where + ' on Google Maps.',
    maps_url: 'https://www.google.com/maps/search/' + encodeURIComponent(term + ' near ' + where),
  };
}

exports.handler = async function handler(event) {
  const env = process.env;
  const corsResult = cors.evaluate(event, env);

  if (!corsResult.allowed) {
    log.emit({ endpoint: ENDPOINT, outcome: 'origin_rejected', status: 403 });
    return errorResponse('origin_not_allowed', corsResult.headers);
  }

  const checked = guard.guard(event, { maxBodyBytes: MAX_BODY_BYTES });
  if (checked.preflight) return { statusCode: 204, headers: corsResult.headers, body: '' };
  if (checked.error) {
    log.emit({ endpoint: ENDPOINT, outcome: checked.error });
    return errorResponse(checked.error, corsResult.headers);
  }

  const body = checked.body;

  const location = readLocation(body);
  if (!location.ok) {
    log.emit({ endpoint: ENDPOINT, outcome: 'invalid_request', reason: location.reason });
    return errorResponse('invalid_request', corsResult.headers, { field: 'location' });
  }

  const rawCategory = body.category != null ? body.category : body.type;
  const category = places.resolve(rawCategory == null ? 'veterinarian' : rawCategory);
  if (!category.ok) {
    log.emit({ endpoint: ENDPOINT, outcome: 'invalid_request', reason: category.reason });
    return errorResponse('invalid_request', corsResult.headers, {
      field: 'category',
      supported: places.CATEGORY_IDS,
    });
  }

  const apiKey = env.GOOGLE_PLACES_API_KEY;
  if (typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    // Existence only. The value is never logged, echoed or measured beyond this.
    log.emit({ endpoint: ENDPOINT, outcome: 'missing_configuration', status: 503 });
    return errorResponse('service_unavailable', corsResult.headers);
  }

  const rules = limits(env);
  const globalCheck = await rateLimit.consume({
    endpoint: ENDPOINT, scope: 'global', identifier: 'all', rules: rules.global, env: env,
  });
  if (!globalCheck.allowed) {
    log.emit({ endpoint: ENDPOINT, outcome: 'rate_limited', limit_scope: 'global', status: 429 });
    return errorResponse('rate_limited',
      Object.assign({ 'Retry-After': String(globalCheck.retryAfterSeconds) }, corsResult.headers),
      { retry_after_seconds: globalCheck.retryAfterSeconds, fallback: fallbackFor(location, category.category) });
  }

  const clientCheck = await rateLimit.consume({
    endpoint: ENDPOINT, scope: 'client', identifier: guard.clientKey(event, env), rules: rules.client, env: env,
  });
  if (!clientCheck.allowed) {
    log.emit({ endpoint: ENDPOINT, outcome: 'rate_limited', limit_scope: 'client', status: 429 });
    return errorResponse('rate_limited',
      Object.assign({ 'Retry-After': String(clientCheck.retryAfterSeconds) }, corsResult.headers),
      { retry_after_seconds: clientCheck.retryAfterSeconds, fallback: fallbackFor(location, category.category) });
  }

  try {
    const geo = await geocode(location, apiKey);
    if (!geo.ok) {
      if (geo.code === 'no_results') {
        log.emit({ endpoint: ENDPOINT, outcome: 'no_results', upstream: 'geocode' });
        return jsonResponse(200, {
          ok: true,
          category: category.id,
          city: null,
          results: [],
          message: 'We could not find that ZIP code or city. Please check it and try again.',
        }, corsResult.headers);
      }
      log.emit({
        endpoint: ENDPOINT, outcome: geo.code, upstream: 'geocode',
        upstream_status: geo.httpStatus, provider_status: geo.providerStatus,
      });
      return errorResponse(geo.code, corsResult.headers, { fallback: fallbackFor(location, category.category) });
    }

    const search = await nearbySearch(geo, category.category, apiKey);
    if (!search.ok) {
      log.emit({
        endpoint: ENDPOINT, outcome: search.code, upstream: 'places',
        upstream_status: search.httpStatus, provider_status: search.providerStatus,
      });
      return errorResponse(search.code, corsResult.headers, { fallback: fallbackFor(location, category.category) });
    }

    log.emit({ endpoint: ENDPOINT, outcome: 'ok', status: 200, category: category.id });
    return jsonResponse(200, {
      ok: true,
      category: category.id,
      category_label: category.category.label,
      city: geo.city,
      state: geo.state,
      lat: geo.lat,
      lng: geo.lng,
      results: search.results,
      message: search.results.length
        ? null
        : 'We did not find any ' + category.category.label.toLowerCase() + ' within range of ' + geo.city + '. Try a nearby ZIP code.',
    }, corsResult.headers);
  } catch (err) {
    const timedOut = err instanceof UpstreamTimeoutError || (err && err.timeout === true);
    log.emit({ endpoint: ENDPOINT, outcome: timedOut ? 'upstream_timeout' : 'upstream_error', error_class: log.errorClass(err) });
    return errorResponse(timedOut ? 'upstream_timeout' : 'upstream_unavailable', corsResult.headers, {
      fallback: fallbackFor(location, category.category),
    });
  }
};

// Exported for tests only.
exports._internal = { readLocation, geocode, nearbySearch, fallbackFor, limits };
