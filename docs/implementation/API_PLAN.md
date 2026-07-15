# PetsInMyCity — API Implementation Plan (Phase II)

> Implementation priority for internal APIs. Every endpoint sits in front of the Delivery Service (KDP). No endpoint reads storage directly. Implemented as Netlify Functions to match current deployment.

## MVP endpoints (build in this order)

1. **`GET /api/knowledge`** — fetch a delivery envelope by `subject` + `predicate` (and optional context). Returns value, confidence, freshness, and source citations. This is the smallest vertical slice through Graph → KDP → consumer and unblocks everything else. **First.**
2. **`POST /api/lucy`** — refactor of `lucy-chat.js`: retrieves verified knowledge via the delivery layer, assembles context, then generates. Consumed by the Lucy UI. **Second.**
3. **`GET /api/austin` (page data)** — assembled knowledge for the Austin city page. Consumed by `cities/austin`. **Third.**
4. **`GET /api/recommendations`** — explainable recommendations with reasons tracing to claims.
5. **`GET /api/search`** — verified search results with citations.
6. **`GET /api/maps`** — map data assembled from verified place entities; reuses `places-search.js` plumbing where live lookups are needed.
7. **`GET /api/notifications` / My Pets alert feed** — event-driven alerts for a user's pets/location.

## Consumers per endpoint

- `/api/knowledge` → every surface (base contract).
- `/api/lucy` → Lucy UI.
- `/api/austin` → Austin city page.
- `/api/recommendations` → Austin page + Lucy.
- `/api/search` → search UI.
- `/api/maps` → Austin page map + tools.
- `/api/notifications` → My Pets.

## What can wait (post-MVP)

- External/developer APIs, API keys for third parties, public versioning contracts.
- Rate limiting beyond basic protection, advanced caching tiers.
- Mobile-specific and other-EMG-property endpoints. These attach to the same delivery envelopes later without changing the core (per `delivery/API_ARCHITECTURE.md`).

## What constitutes API MVP

`/api/knowledge` + `/api/lucy` + `/api/austin`, all returning KDP delivery envelopes, all sourced from verified Austin knowledge, none bypassing the KDP. Everything else is additive.
