# PetsInMyCity — UI Implementation Plan (Phase II)

> Goal: avoid unnecessary UI work. Reuse existing pages; change only what must become graph-driven for the Austin MVP.

## What already exists

- Static HTML pages for every route (city pages, service pages, tools), plus Lucy and My Pets UIs and their client JS in `assets/`.
- The Austin page (`cities/austin/index.html`, 33 KB) is the richest and is the MVP target.

## What must change (MVP)

1. **Austin city page** — convert from hand-authored facts to a template hydrated from `/api/austin` (KDP envelopes). Replace embedded facts section by section; keep layout/markup.
2. **Lucy UI** — render confidence and source citations; state uncertainty plainly when the graph has no verified answer. Minimal additions to existing `lucy*.js`.
3. **My Pets** — consume the event-driven alert feed for Austin; render one alert path end-to-end.
4. **Search / recommendations / map** on the Austin page — pull from KDP endpoints instead of static content.

## What can be deferred

- Redesigns of any kind (explicitly out of scope).
- Other city pages (untouched until Epic 8).
- Tools, service pages, marketing pages.
- Any new visual components not required to display verified knowledge + confidence.

## UI MVP definition

The Austin page, Lucy, and one My Pets alert path all render from the KDP, showing verified values with confidence and citations, and updating when a claim changes — with no layout redesign.
