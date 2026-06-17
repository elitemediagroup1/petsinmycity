# My Pets + Lucy Care Score™ — MVP Plan (Internal)

> **Internal document. Do not publish.** This is the product spec and MVP implementation plan for **My Pets** and the **Lucy Care Score™** — the first product step toward PetsInMyCity becoming the operating system for pet ownership. It is a plan only: no production code, no page, no navigation, analytics, sitemap, Lucy, or affiliate changes are described as "done."
>
> Source-of-truth companions: [`docs/brand-bible.md`](./brand-bible.md) (brand, voice, trust, SEO/AEO, E-E-A-T), [`docs/lucy-brain.md`](./lucy-brain.md) (how Lucy thinks, speaks, and behaves — especially safety/medical boundaries), [`docs/roadmap.md`](./roadmap.md) (what we build and when), [`docs/knowledge-graph.md`](./knowledge-graph.md) (what we know, future memory schema). This plan also builds on the prior **My Pet Dashboard + Lucy Score architecture audit**.
>
> Contains **no secrets, API keys, credentials, internal URLs, environment variables, or implementation details** — product specification only.

---

## 1. Core Direction & Naming

This is **not** a dashboard. It is the **first relationship** between a pet owner, their pet, and Lucy. The defining feeling we are designing for is:

> *"Lucy is meeting my pet."* — never *"I am filling out a database form."*

Fixed naming (use exactly these, nothing else):

- Product name: **My Pets** (never "Dashboard," "Pet Dashboard," or "Pet Profile")
- Score name: **Lucy Care Score™** (never "Lucy Score")

Tone: premium, warm, simple, emotional, trustworthy. Never corporate, gimmicky, medical, or salesy. The voice is Lucy's, governed by `lucy-brain.md`.

---

## 2. Recommended MVP Scope & Route

**Route:** `/my-pets/` — a single, standalone, private utility page. It reads as a personal, ownable space, and the plural scales naturally to multi-pet and future sub-views (e.g. `/my-pets/[id]`) without a rename.

**Storage:** `localStorage` only. **No** login, accounts, database, backend, or Supabase in v1. Architected hybrid-ready so opt-in cloud sync can be added later without reshaping data or UI.

**Foundation reused:** This mirrors the proven on-site pattern already used by the Pet Emergency Planner — a self-contained static page that includes the shared `/assets/script.js`, carries its own GA4 tag, and persists user input via `localStorage.setItem(KEY, JSON.stringify(data))` under a namespaced key. We are not introducing a new architectural risk; we are repeating an established one.

---

## 3. Primary Concept & Conversational Onboarding

The visitor should never feel they are completing a form. Onboarding is a gentle, one-question-at-a-time conversation in Lucy's voice. Ask little at a time; let momentum build.

Example flow (illustrative copy, not final):

```
Lucy: Hi, I'm Lucy. I'd love to meet your pet. What's their name?
  → [Bella]
Lucy: Lovely to meet Bella! Is Bella a dog, cat, rabbit, bird, fish, reptile, or other?
  → [Dog]
Lucy: What breed is Bella? (You can skip if you're not sure.)
Lucy: How old is Bella — or do you know the birthday?
Lucy: About how much does Bella weigh?
Lucy: What's Bella's favorite food?
Lucy: Who's Bella's veterinarian? (Optional)
Lucy: Is there an emergency contact you'd want on hand? (Optional)
Lucy: Want to add a photo of Bella, or skip for now?
```

Principles: one question per step; every sensitive/optional field can be skipped; the pet's name is echoed back to keep it personal; nothing blocks the user from reaching their My Pets home.

---

## 4. Page Structure & MVP Experience

After onboarding, `/my-pets/` renders the **My Pets home** (one page, two states: onboarding vs. populated):

- **Pet summary card** — photo (uploaded local-only) or avatar placeholder; name, species, breed, age (or derived from birthday), weight, favorite food, veterinarian, emergency contact.
- **Lucy Care Score™** — the score, an encouraging one-liner, and per-category breakdown.
- **Preparedness checklist** — the items that drive the score.
- **Recommended next steps** — scored "missions" that show exactly how to improve (see §6).
- **Shortcuts** — Emergency Planner, Find nearby vet, Find nearby emergency vet (all link to existing destinations; no new behavior).
- **Notes section** — free-text, local only.
- **Edit profile** and **Clear data** buttons.
- **Plain-language privacy note** (see §9).

Returning visitors skip onboarding and land directly on a populated home. Editing reopens the relevant conversational step pre-filled.

---

## 5. Data Model & localStorage Schema

A single namespaced, **versioned, multi-pet-ready** object from day one — even though v1 UI may focus on one pet.

- **Key:** `pimc-my-pets-v1`
- **Shape (conceptual):**

```
{
  "schemaVersion": 1,
  "pets": [
    {
      "id": "<local-generated-id>",
      "name": "",
      "species": "",        // dog | cat | rabbit | bird | fish | reptile | other
      "breed": "",
      "birthday": "",        // optional; age derived when present
      "ageText": "",         // fallback if no birthday
      "weight": "",
      "favoriteFood": "",
      "veterinarian": "",
      "emergencyContact": "",
      "medications": "",     // free-text reminders only — NEVER dosing advice
      "allergies": "",       // free-text note only
      "photoLocal": null,    // optional, local-only (see §9); else null
      "notes": "",
      "createdAt": "",
      "updatedAt": ""
    }
  ],
  "score": {
    "<petId>": {
      "total": 0,
      "categories": { /* per-category subscores */ },
      "badges": [],
      "computedAt": ""
    }
  }
}
```

Two decisions make the cloud future cheap: `schemaVersion` (clean migrations) and `pets` as an **array** (multi-pet without reshape). All data is on-device; nothing is transmitted.

---

## 6. Lucy Care Score™ Formula

**Framing (must appear on the page, verbatim intent):** *"Lucy Care Score™ is a lifestyle, preparedness, and organization snapshot. It is not a medical evaluation. It does not diagnose. It does not measure how healthy your pet is — it measures how prepared and organized you are."* This is non-negotiable and consistent with `lucy-brain.md` boundaries: no medical claims, no diagnosis.

**Seven categories, each explainable and roughly equally weighted (~14–15 points each, total 100):**

1. **Profile completeness** — core fields filled (name, species, breed, age/birthday, weight, food).
2. **Emergency preparedness** — emergency contact added; Emergency Planner completed.
3. **Preventive care readiness** — veterinarian on file; preventive items acknowledged.
4. **Nutrition routine** — favorite/current food recorded; feeding routine noted.
5. **Exercise and enrichment** — activity/enrichment routine noted.
6. **Grooming routine** — grooming cadence noted.
7. **Local care setup** — a local vet/emergency vet identified via the shortcuts.

**The score rewards progress, never punishes.** It opens with encouragement, e.g.:

```
58 — Great start. Let's get Bella to 100.
```

**Next-step "missions" (example point values):**

```
+5  Add emergency contacts
+8  Add veterinarian
+6  Complete the Emergency Planner
+4  Add medications (reminders only)
+7  Add birthday
```

Each category exposes a short "why this matters" explanation so the score is transparent and Lucy can describe how to raise it.

---

## 7. Badge System

Simple, encouraging (never childish), earned by completing the work behind a category or milestone:

- **Prepared Parent** — high overall completeness across categories.
- **Emergency Ready** — emergency contact + Emergency Planner complete.
- **Preventive Care** — veterinarian on file + preventive items acknowledged.
- **Birthday Ready** — birthday added.
- **Exercise Champion** — exercise/enrichment routine recorded.
- **Travel Ready** — travel-prep items noted.
- **Nutrition Planner** — nutrition routine recorded.
- **Local Care Ready** — local vet/emergency vet set up.

**Rules:** badges are derived from the same data that drives the score (no separate state to corrupt), awarded the moment criteria are met, and stored in the local `score.<petId>.badges` array. **Design for shareable moments later** (each badge has a title + caption + visual concept) but **do not build social sharing in v1.**

---

## 8. User Flow Summary

First visit → conversational onboarding (one question per step, skippable) → save to `pimc-my-pets-v1` → My Pets home renders with summary card, Lucy Care Score™, checklist, missions, shortcuts, notes. Returning visit → straight to populated home. Edit → reopen pre-filled step. Clear data → confirm → wipe the key. No step ever forces a login or sends data off-device.

---

## 9. Privacy Approach (Critical)

- **All data stays in browser `localStorage` for MVP.** No accounts, no uploads, no server, no backend.
- **Never send to GA4:** pet names, allergies, medications, veterinarian names, location, emergency-contact details, notes — or any PII whatsoever.
- **Plain-language privacy note on the page:** state clearly that everything is stored only in this browser, never uploaded, and can be deleted anytime.
- **Clear/delete control** is prominent and one-click (with confirm).
- **Photo upload:** optional, **local-only**, clearly explained. If local photo storage proves too heavy or risky for MVP (size limits, accidental persistence), **default to a pet avatar placeholder** and defer real uploads. Avatar-first is the safe baseline.
- Aligns with the Knowledge Graph's Future AI Memory section: any future cloud sync must be **explicit opt-in** with consent.

---

## 10. Analytics Approach

Non-identifying events only, in the existing `gtag('event', …)` convention. **No PII, no pet names, no health details, and treat breed as too-identifiable — do not send breed.**

```
my_pets_start
my_pets_profile_created
my_pets_view
my_pets_edit
lucy_care_score_view
lucy_care_score_improvement_click
my_pets_clear_data
emergency_planner_shortcut_click
local_vet_shortcut_click
local_emergency_vet_shortcut_click
```

Event parameters, if any, are limited to non-identifying counts/flags (e.g. score bucket as a coarse range, not exact PII). This measures demand and funnel completion without compromising privacy.

---

## 11. SEO / AEO Impact

`/my-pets/` is a **private utility**, not content. Plan: **noindex**, **excluded from the sitemap**, **no article schema**, **no FAQ schema**, no crawlable personal content. It must never compete with or dilute the trust pages and topic clusters. It supports **retention and brand value** (a Roadmap success metric), not direct search ranking. Existing pages, navigation, and schema remain untouched.

---

## 12. Accessibility Requirements

WCAG-aligned, per the Brand Bible: full keyboard operability through the conversational flow; visible focus states; proper labels/`aria` on every input and control; the score and missions conveyed in text, not color alone; badges have text equivalents; sufficient contrast using existing design tokens; respect reduced-motion preferences for any transitions; screen-reader-friendly announcement of step changes and score updates.

---

## 13. Performance Considerations

Reuse existing `style.css` tokens and card components; ship a small, dedicated script (e.g. `/assets/my-pets.js`) so the shared `script.js` stays lean (matching the Planner's self-contained approach). No frameworks, minimal JS, no blocking requests, lazy-handle any optional photo to avoid bloating localStorage. Keep within localStorage size limits; if photos are enabled, cap dimensions/size client-side.

---

## 14. Risk Assessment

- **Data loss** (user clears storage / different browser) → mitigate with clear "stored locally" messaging and a future optional export.
- **PII leakage into analytics** → mitigate with strict event-parameter discipline (no names, breed, or health data).
- **Photo storage bloat/risk** → mitigate by defaulting to avatar; enable uploads only if safely capped.
- **Scope creep toward accounts/DB** → hold the line on v1 localStorage-only.
- **SEO contamination** → mitigate with noindex + sitemap exclusion.
- **Medical-boundary drift** → score copy and Lucy framing must never imply health/diagnosis; enforce §6 framing.
All risks are low and well-understood given the Planner precedent.

---

## 15. Future Paths (designed-for, not built)

- **Supabase / cloud sync:** opt-in only, consent-gated; the versioned, array-shaped schema migrates cleanly. Adds cross-device continuity and saved history.
- **Lucy integration:** Lucy reads the local profile (with permission) to personalize guidance, following `lucy-brain.md` retrieval priority and boundaries; the Knowledge Graph's memory schema is the bridge.
- **Social sharing:** badge/score "shareable moments" — designed for now (title + caption + visual), implemented later.
- **Multi-pet UI:** the data model already supports it; surface a pet switcher when ready.

---

## 16. Exact Files Likely to Change (when built — not now)

- **New:** `/my-pets/index.html` (the page), `/assets/my-pets.js` (dedicated logic), optional scoped additions to `/assets/style.css` reusing existing tokens/classes.
- **One-line config:** robots/sitemap exclusion for `/my-pets/`.
- **Untouched in v1:** every existing page, the navigation, the shared `script.js` nav/header logic, Lucy, affiliate links, and GA4 configuration.

---

## 17. What NOT to Build in v1

No login, accounts, database, backend, or Supabase. No cloud sync. No social sharing. No Lucy behavior changes. No navigation changes. No analytics-code changes beyond the new page's own non-identifying events. No sitemap changes beyond exclusion. No affiliate changes. No medical features, claims, or diagnosis. No changes to existing pages.

---

## 18. Readiness Recommendation

This plan is **ready for implementation** as a localStorage-only, hybrid-ready MVP. It reuses a proven on-site pattern (Emergency Planner), carries the lowest privacy risk for sensitive data, ships without touching existing pages/nav/Lucy/analytics/affiliates, and preserves a clean path to cloud sync. Recommended first build: the `/my-pets/` page with conversational onboarding, the `pimc-my-pets-v1` schema, the Lucy Care Score™, missions, badges, shortcuts, the privacy note, and the clear-data control. Build `localStorage` first; revisit accounts/database only after demand is validated.
