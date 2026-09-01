# Security operations — PetsInMyCity

Operational reference for the hardened Netlify Functions and the site security
headers. **This file never contains secret values.** Every variable below is set
in the Netlify UI (Site configuration → Environment variables) or in the
deployment tooling; nothing sensitive belongs in the repository.

---

## 1. Environment variables

### Required — production will not work without these

| Name | Used by | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | `lucy-chat`, `pet-tools` | Server-side Anthropic credential. The browser never sees it, and no handler ever echoes it or a provider error containing it. |
| `GOOGLE_PLACES_API_KEY` | `places-search` | Google key, already restricted to Geocoding API + legacy Places API. Presence is checked; the value is never logged or returned. |
| `KNOWLEDGE_API_INTERNAL_SECRET` | `knowledge` | Pre-existing. Unchanged by this work. |
| `KNOWLEDGE_DB_DRIVER`, `EMG_LOOP_API_BASE_URL`, `EMG_LOOP_SERVICE_TOKEN` | `knowledge` | Pre-existing. Unchanged by this work. |

### Required — new, added by this change

| Name | Used by | Purpose |
| --- | --- | --- |
| `INDEXNOW_KEY` | `indexnow-relay` | The IndexNow key. **There is no longer a committed fallback in the source.** With this unset the relay returns `503 service_unavailable` and submits nothing. Must match the `<key>.txt` verification file published at the site root. |
| `INDEXNOW_RELAY_SECRET` | `indexnow-relay` | Shared secret the caller must send as the `x-indexnow-token` header. With this unset the relay fails closed (`503`) rather than accepting anonymous submissions. Generate a long random value; rotate by changing it in Netlify and in whatever deploy step calls the relay. |

### Recommended

| Name | Used by | Purpose |
| --- | --- | --- |
| `RATE_LIMIT_HMAC_SECRET` | all public endpoints | Salt for the one-way client identifier. Without it hashing still happens, but the digest is not secret. Set it, and rotate it to reset every client bucket. |
| `ALLOWED_ORIGINS` | CORS | Comma-separated **https** origins to allow in addition to `https://petsinmycity.com`. Use for a named preview host. |

### Optional tuning (all have safe defaults — leave unset unless tuning)

| Name | Default | Notes |
| --- | --- | --- |
| `PLACES_CLIENT_PER_10MIN` | 3 | Per-client Places budget. |
| `PLACES_CLIENT_PER_DAY` | 6 | Per-client Places budget. |
| `PLACES_GLOBAL_PER_MIN` | 4 | **Site-wide.** Sized under the Google 5/min quota. |
| `PLACES_GLOBAL_PER_DAY` | 18 | **Site-wide.** Sized under the Google 20/day legacy Places quota. |
| `PLACES_GEOCODE_TIMEOUT_MS` | 6000 | Geocoding upstream timeout. |
| `PLACES_SEARCH_TIMEOUT_MS` | 6000 | Places upstream timeout. |
| `LUCY_CLIENT_PER_MIN` / `_PER_HOUR` / `_PER_DAY` | 8 / 60 / 200 | Per-client Lucy budget. |
| `LUCY_GLOBAL_PER_MIN` / `_PER_DAY` | 120 / 5000 | Site-wide Lucy budget. |
| `PET_TOOLS_CLIENT_PER_MIN` / `_PER_HOUR` / `_PER_DAY` | 6 / 40 / 120 | Per-client Paw Tools budget. |
| `PET_TOOLS_GLOBAL_PER_MIN` / `_PER_DAY` | 90 / 4000 | Site-wide Paw Tools budget. |
| `INDEXNOW_PER_MIN` / `INDEXNOW_PER_DAY` | 5 / 50 | Relay budget. |
| `INDEXNOW_HOST` | `petsinmycity.com` | Host declared to IndexNow. |
| `LUCY_MODEL` / `PET_TOOLS_MODEL` | `claude-sonnet-4-5` | Model override. |
| `RATE_LIMIT_BACKEND` | (unset) | Set to `memory` **only** for local development or tests. In production leave unset so Netlify Blobs is used. |

Netlify injects `CONTEXT`, `URL`, `DEPLOY_PRIME_URL` and `DEPLOY_URL` itself —
do not set them by hand. They are read only to allow preview origins, and only
when `CONTEXT !== 'production'`.

---

## 2. Manual Netlify configuration steps

1. **Set the two new variables** — `INDEXNOW_KEY` and `INDEXNOW_RELAY_SECRET` —
   plus `RATE_LIMIT_HMAC_SECRET`. Scope them to the functions runtime (all
   contexts, or production + deploy previews as you prefer).
   Until `INDEXNOW_KEY` and `INDEXNOW_RELAY_SECRET` are set, `indexnow-relay`
   returns `503` and submits nothing — that is the intended fail-closed state,
   not an outage of anything visitor-facing.
2. **Enable Netlify Blobs** for the site if it is not already on. The durable
   rate-limit counters live in a blob store named `pimc-rate-limits`. No manual
   store creation is needed; it is created on first write. If Blobs is
   unavailable at runtime the limiter logs `blobs_unavailable` once and falls
   back to a per-instance counter — the site keeps working, but the limits stop
   being global. Check the function logs for that line after the first deploy.
3. **Confirm the Node runtime is 20.** `netlify.toml` sets
   `[build.environment] NODE_VERSION = "20"` and `.nvmrc` matches. Nothing to
   click, but verify the deploy log's Node version.
4. **Update whatever calls the IndexNow relay** (deploy hook, CI step, manual
   curl) to send `x-indexnow-token: <INDEXNOW_RELAY_SECRET>`. Any existing
   browser-side caller will now be rejected — that is intentional.
5. **Watch the CSP report-only violations** in the browser console on a preview
   deploy before considering enforcement. See §5.
6. **Do not change** the Google Cloud quotas, the API key restrictions, GA4,
   Search Console or Bing settings. Nothing in this change requires it.

---

## 3. What each public endpoint now enforces

All three paid endpoints (`lucy-chat`, `pet-tools`, `places-search`) share:

- **Methods** — `POST` and `OPTIONS` only; anything else is `405 method_not_allowed`.
- **Body size** — checked against both the declared `Content-Length` and the
  actual byte length **before** `JSON.parse`. `413 payload_too_large`.
  Limits: Lucy 16 KB, Paw Tools 8 KB, Places 2 KB, IndexNow 64 KB.
- **CORS** — `https://petsinmycity.com` plus `ALLOWED_ORIGINS` plus
  Netlify-injected preview URLs in non-production contexts. `Access-Control-Allow-Origin: *`
  is never emitted. A request with no `Origin` header (same-origin, or
  server-to-server) is allowed but receives no ACAO header. `403 origin_not_allowed`.
- **Rate limiting** — durable, fixed-window, keyed by `<endpoint>:<scope>:<id>`.
  Two scopes: a per-client bucket keyed by a truncated HMAC of the connecting IP
  (the raw IP is never stored, logged or returned), and a site-wide bucket.
  `429 rate_limited` with a `Retry-After` header and `retry_after_seconds`.
- **Timeouts** — every paid upstream call is abortable. `504 upstream_timeout`.
- **Error hygiene** — the browser only ever sees a code from the fixed list in
  `netlify/lib/errors.js`. Provider messages, stack traces, credentials,
  configuration values and runtime internals are never returned. Server logs are
  built from an allow-listed field set and scrub query strings.

`indexnow-relay` additionally requires the `x-indexnow-token` secret and emits
no CORS headers at all.

### Public error codes

`method_not_allowed`, `origin_not_allowed`, `payload_too_large`, `invalid_json`,
`invalid_request`, `unauthorized`, `rate_limited`, `service_unavailable`,
`upstream_unavailable`, `upstream_timeout`, `quota_exhausted`, `internal_error`.

---

## 4. Places caching decision

**We cache nothing from Google Places.** Every request is pass-through.

Google's Places terms permit caching `place_id` for an extended period but
restrict how long other Places content (names, addresses, ratings, opening
hours) may be retained. Rather than track a different retention rule per field —
and risk drifting out of compliance as those terms change — the endpoint stores
no provider content at all, in memory or otherwise.

If caching is introduced later to relieve the 20/day quota, cache **`place_id`
only**, re-fetch the rest on demand, and record the decision and its terms
citation here before shipping it.

The only thing persisted by these functions is the rate-limit counter: a
`{start, count}` pair keyed by a truncated one-way hash. No request content, no
IP address, no personal data.

---

## 5. Security headers

`netlify.toml` keeps the existing HSTS, `X-Frame-Options`,
`X-Content-Type-Options` and `Referrer-Policy` headers unchanged, and adds:

- **`Permissions-Policy`** — denies every feature the site does not use
  (geolocation, camera, microphone, payment, USB, sensors, topics/FLoC).
  Verified: no page in this repository calls `navigator.geolocation` or any
  other denied API.
- **`Content-Security-Policy-Report-Only`** — **not enforced.** It deliberately
  omits `'unsafe-inline'` from `script-src` so that the browser console reports
  every remaining inline `<script>` block and inline event-handler attribute.
  That report is the work list for a follow-up change. Do **not** promote this
  to an enforcing `Content-Security-Policy` until that list is empty or covered
  by nonces — doing so today would break production.

There is no report collector configured, so violations appear in the browser
console only. Adding a collector endpoint is deferred work.

### Third-party inventory behind the policy

| Purpose | Domains |
| --- | --- |
| GA4 | `www.googletagmanager.com`, `www.google-analytics.com`, `analytics.google.com`, `region1.google-analytics.com`, `stats.g.doubleclick.net` |
| Google Ads / AdSense | `pagead2.googlesyndication.com`, `googleads.g.doubleclick.net`, `tpc.googlesyndication.com`, `td.doubleclick.net` |
| HubSpot forms | `js-na2.hsforms.net`, `api.hsforms.com`, `forms.hsforms.com` |
| Google Fonts | `fonts.googleapis.com` (CSS), `fonts.gstatic.com` (files) |
| Imagery | `images.unsplash.com`, `media1.tenor.com`, `cdn.petsinmycity.com`, `dbw3zep4prcju.cloudfront.net` |
| Google Places result imagery | `maps.googleapis.com`, `maps.gstatic.com`, `www.google.com` |
| Anthropic-backed functions | same-origin `/.netlify/functions/*` — the browser never talks to `api.anthropic.com` directly |

---

## 6. Build and test

```bash
npm ci                    # reproducible install from the committed root lockfile
npm run check:syntax      # parses every .js file AND every inline <script> in the HTML
npm test                  # security + function tests (test/*.test.js)
npm run test:knowledge    # existing knowledge-service suite
npm run test:all          # both suites
npm run build:production  # clean install + syntax check + both suites
```

`npm run build` (syntax check + the root suite) is what `netlify.toml` runs as
the build command.

Supported Node runtime: **20.x**, pinned in three places that must stay in sync —
`netlify.toml` (`NODE_VERSION`), `.nvmrc`, and `engines.node` in `package.json`
and `netlify/functions/package.json`.

---

## 7. Related review documents

- [`VETERINARY_SAFETY_REVIEW.md`](./VETERINARY_SAFETY_REVIEW.md) — clinical sign-off checklist.
- [`LEAD_FORM_REVIEW.md`](./LEAD_FORM_REVIEW.md) — consent wording and lead fulfilment, pending owner confirmation.
