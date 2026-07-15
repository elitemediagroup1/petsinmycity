# Research Dossier System

> **Part of:** The PetsInMyCity Editorial Operating System (`../EDITORIAL_OS.md`, Section 7).
> **Purpose:** Define the research dossier — the private source of truth that every page begins with, before a word is written.
> **Companions:** `../RESEARCH_WORKFLOW.md`, `../PUBLISH_GATE.md`, `../KNOWLEDGE_OS.md`, `../EDITOR_CHECKLIST.md`.

---

## 1. What a dossier is

A dossier is the investigative case file for one page. It is created **before writing begins**, maintained for the life of the page, and **never published**. It records what we know, how we know it, how confident we are, and what remains open. If an article is ever challenged, the dossier is our defense — and if the dossier can't defend the article, the article should not have shipped.

**The dossier is the asset. The article is its most public view.**

---

## 2. When a dossier is required

Every location and location-intersection page requires one: states, regions, counties, metros, cities, towns, neighborhoods, parks, beaches, trails, dog parks, campgrounds, and `Breed × Location` intersections; plus entity profiles for veterinarians, shelters, and rescues. Evergreen care articles use a lighter dossier focused on sources and verification.

---

## 3. Canonical dossier structure

Every template in this folder follows this structure. Sections may be expanded per location type, but none may be dropped.

1. **Header** — subject, location type, geographic parents, owner, status, created/updated dates, next-review date.
2. **Framing questions** — what a real pet owner here would actually ask.
3. **Sources consulted** — each with tier (1–4), URL/citation, date accessed. (See `../RESEARCH_WORKFLOW.md`.)
4. **Verification log** — the heart of the dossier: every meaningful claim with its status, source, confidence, and verification date. (Statuses per `../PUBLISH_GATE.md`.)
5. **Major findings** — verified facts and the central "what makes this place different."
6. **Local insights discovered** — specific, sourced details that pass the name-swap test.
7. **Rejected findings** — claims that failed verification, with the reason (so they are not re-litigated).
8. **Open questions / needs further reporting** — blocks publication until resolved.
9. **Confidence summary** — overall confidence and any low-confidence areas.
10. **Knowledge-graph entities & relationships** — entities created/touched and their edges (feeds `../KNOWLEDGE_OS.md`).
11. **Related pages** — for internal linking (upward/downward/sideways/contextual).
12. **Expert & interview opportunities** — named potential sources, on-the-record quotes obtained.
13. **Potential future updates** — known upcoming changes and volatility notes.
14. **Editorial notes** — anything a future editor or AI needs to know.

---

## 4. Verification log format

Record each meaningful claim as a row:

```
| Claim | Status | Source (tier) | Confidence | Verified on | Owner | Notes |
|-------|--------|---------------|------------|-------------|-------|-------|
| Example: Off-leash hours at Park X are 5-9am | Officially confirmed | City Parks Dept page (T1) | High | 2026-01-10 | (name) | Seasonal; re-check spring |
```

A page cannot pass the publish gate while any meaningful claim is **Needs further reporting**, or while a safety-floor claim is below **Verified/Officially confirmed** at **Tier 1–2**.

---

## 5. How a dossier becomes a page

```
Dossier (research + verification)
   → clears the publish gate (../PUBLISH_GATE.md)
      → facts enter the Knowledge OS (../KNOWLEDGE_OS.md)
         → writing begins (../EDITORIAL_OS.md, Section 9)
            → review chain (../EDITOR_CHECKLIST.md)
               → publish + set next-review date
```

---

## 6. Templates in this folder

Ten production-ready templates, one per subject type. Location types have genuinely different research needs, so a single template cannot serve a whole state and a single veterinarian well.

- `TEMPLATE_STATE.md`
- `TEMPLATE_CITY.md`
- `TEMPLATE_NEIGHBORHOOD.md`
- `TEMPLATE_PARK.md`
- `TEMPLATE_TRAIL.md`
- `TEMPLATE_BEACH.md`
- `TEMPLATE_VETERINARIAN.md`
- `TEMPLATE_SHELTER.md`
- `TEMPLATE_RESCUE.md`
- `TEMPLATE_BREED_LOCATION.md`

To start a page: copy the relevant template into the page's research workspace (e.g., `research/{location}/DOSSIER.md`), fill the header, and begin reporting at Section 2. Do not delete unused sections — mark them "N/A — reason" so reviewers can see the decision was deliberate.
