# PetsInMyCity — Master Project Checklist

> **Single source of truth for execution.** This is the one place to look to answer "what is done, what is being worked on right now, and what comes next." It is the working companion to the strategy in [\`docs/roadmap.md\`](./roadmap.md), and it always defers to [\`docs/brand-bible.md\`](./brand-bible.md) (brand, voice, editorial, SEO/AEO, E-E-A-T, trust) and [\`docs/lucy-brain.md\`](./lucy-brain.md) (how Lucy thinks and behaves).
>
> Internal document. Do not publish. Contains no secrets, keys, credentials, or private implementation details — status and direction only.

---

## How to use this checklist

- **One source of truth.** If work is happening and it is not reflected here, update this file first.
- **Status, not strategy.** The roadmap explains *why* and *when*; this file tracks *where things actually are*.
- **Each phase has the same shape:** Completed · In Progress · Next · Backlog · Notes.
- **Keep it honest.** Only mark something "Completed" when it is live and meets Brand Bible standards.

## The 3–5 rule (focus rule)

> **No more than 3–5 active development priorities at any one time.**

Anything beyond the active set lives in **Next** or **Backlog** — not "In Progress." This is the single most important rule for keeping PetsInMyCity from feeling scattered. Before pulling a new item into "In Progress," something must ship or move back out. When in doubt, do fewer things well.

### Current active priorities (max 3–5)

1. **Phase 1 — Foundation Cleanup & Trust Completion** — shipped (Trust Center, Editorial Standards, this checklist live). Kept here only while the "last reviewed" pattern and the nav-placement decision wrap up.
2. **Phase 2 — Lucy: Premium Welcome + Chat Polish** — shipped (Lucy 2.0 first-visit welcome, suggestion cards, premium chat UI).
3. **Phase 2 — Lucy Care Companion™ Notification Engine** — in progress (provider-agnostic communication foundation + Notification Preferences page).
4. **Phase 2 / Phase 8 — PetsInMyCity Platform Shell v1** — in progress (shared application shell + permanent platform navigation: Home/Today, Lucy, My Pets, Discover, Me; Emergency always reachable; shared design system; Today dashboard). Foundation for the future Website/PWA/iOS/Android surfaces.

  Foundation (Phase 1) has shipped, so Phase 2 product work is now active. Still respecting the 3–5 rule: nothing new enters "In Progress" until one of the above moves out.

---

## Phase 1 — Foundation

The trust, project-management, and credibility groundwork that makes everything else easier to build and easier to rank.

- **Completed**
  - Brand Bible established as permanent brand manual.
  - Lucy Brain established as permanent AI operating manual.
  - Product roadmap documented.
  - Premium About page live (primary E-E-A-T anchor).
  - Global navigation restructured; About promoted to a core page.
  - SEO foundations: titles, meta, canonical, Open Graph, connected JSON-LD \`@graph\` (WebSite, Organization, AboutPage, BreadcrumbList, FAQPage).
  - AEO foundations: FAQ schema, clear entity definitions, answer-friendly structure.
  - Analytics framework (GA4) in place.
- **In Progress**
  - Master Project Checklist (this file) — establishing single source of truth for execution.
  - Trust Center page (\`/trust/\`).
  - Editorial Standards page (\`/editorial-standards/\`).
  - Footer updated with Trust Center + Editorial Standards links.
  - About page linked to Trust Center + Editorial Standards (where natural).
- **Next**
  - Add a lightweight "last reviewed / last updated" pattern to high-trust pages.
  - Confirm sitemap.xml includes the new trust pages.
  - Decide whether Trust Center / Editorial Standards belong in main nav (currently footer-only).
- **Backlog**
  - Author bylines / contributor model for content pages.
  - Visible "reviewed by" treatment for health-adjacent content.
  - Centralized disclosure component reused across affiliate pages.
- **Notes**
  - Keep these pages warm and plain-language, not legalistic.
  - Trust is reinforced on every page, not just the trust pages (per Brand Bible).

## Phase 2 — Lucy

Lucy is the AI pet assistant and the heart of the platform. Behavior is governed by \`lucy-brain.md\`.

- **Completed**
  - Lucy live as an educational, safety-first assistant.
  - Google Places integration powering real local results.
  - Chewy product sourcing integrated.
  - Amazon affiliate approach defined.
  - Lucy 2.0 premium first-visit welcome experience (welcome modal, primary actions, future-ready media container).
  - Lucy chat polish: suggestion cards, timestamps, premium UI, empty state.
Lucy Care Journey™ shipped — premium, encouraging progress experience (Journey Progress bar + percentage, milestone language, supportive Lucy copy) replacing the user-facing Care Score, with calculation logic, storage schema, and analytics events unchanged.
- **In Progress**
  - Lucy Care Companion™ Notification Engine — unified, provider-agnostic communication foundation (Email, SMS, Browser, future Push) + Notification Preferences page (\`/notifications/\`).
- **Next**
  - Sharpen clarifying questions and reduce conversational friction.
  - Tighten safety/emergency phrasing and “call a vet now” escalation.
  - Improve relevance and explanation quality of recommendations.
  - Wire a real email provider (e.g. Resend/SendGrid) behind the engine when a transport layer exists.
- **Backlog**
  - Lightweight memory / personalization (future).
  - Additional integrations beyond Chewy/Amazon.
  - Region-aware emergency vet awareness inside Lucy.
  - SMS + mobile push delivery once accounts/transport land (architecture already in place).
  - Connect notification preferences to My Pets profiles and per-pet reminders.
- **Notes**
  - Lucy is never a salesperson, diagnostician, or vet replacement.
  - Recommendations are usefulness-first; commission never decides.
  - Notifications must always sound like Lucy: warm, encouraging, helpful — never spammy, fear-based, or pushy. Providers stay swappable; none are hardcoded.

## Phase 3 — My Pets

Owner pet profiles and personalized context. See \`docs/my-pets-mvp-plan.md\`.

- **Completed**
  - My Pets entry point exists on the site.
Lucy Care Journey™ experience live on the My Pets page (rebrand + progress UX over the existing, unchanged score calculation).
- **In Progress**
  - _None active. Do not start new My Pets features during Phase 1._
- **Next**
  - Revisit MVP scope after foundation work ships.
- **Backlog**
  - Pet profile basics (per MVP plan).
  - Personalized tool/content suggestions based on profile.
  - Reminders and records (future).
- **Notes**
  - Explicitly out of scope right now per current execution focus.

## Phase 4 — Emergency Center

Emergency preparedness and "what do I do right now" guidance.

- **Completed**
  - Pet Emergency Planner tool live.
  - Emergency finder tool live.
  - Lost pet tool live.
  - Symptom checker tool live.
- **In Progress**
  - _None active._
- **Next**
  - Region-aware emergency / emergency-vet information.
  - Clearer escalation paths and "when to call a vet now" guidance across the site and Lucy.
- **Backlog**
  - Verified emergency resource directory by city.
  - Printable / offline emergency plan output improvements.
- **Notes**
  - Always route true emergencies to a licensed veterinarian.

## Phase 5 — Local Discovery

Helping owners find trusted local pet services.

- **Completed**
  - Local search via Google Places.
  - City pages live: Austin, Chicago, Denver, Houston, Phoenix, Seattle.
  - Find a Vet, grooming, boarding, training, adoption category pages.
- **In Progress**
  - _None active._
- **Next**
  - Improve local result relevance and completeness for covered cities.
  - Add high-value business categories.
- **Backlog**
  - Expand city coverage.
  - Richer local pages (hours, specialties, owner-useful detail).
- **Notes**
  - Accuracy of local info is a trust commitment; stale data erodes trust.

## Phase 6 — Affiliate Ecosystem

Affiliate relationships keep the platform free without deciding recommendations.

- **Completed**
  - Chewy integration.
  - Amazon affiliate strategy defined.
  - Affiliate category pages (insurance, supplies, DNA testing, pet boxes, etc.).
- **In Progress**
  - _None active. Do not add new affiliate placements during Phase 1._
- **Next**
  - Improve placement quality and disclosure clarity without compromising editorial integrity.
- **Backlog**
  - Centralized, reusable disclosure component.
  - Structured product evaluations feeding both content and Lucy.
- **Notes**
  - Highest-paying option is never automatically the chosen one.
  - Owners never pay more because of affiliate links; this must always be disclosed.

## Phase 7 — Content

Educational, owner-first content along the roadmap topic clusters.

- **Completed**
  - Core care category hubs (dog care, training, grooming, etc.).
  - Tool-supporting content (food checker, calorie calculator, etc.).
- **In Progress**
  - _None active._
- **Next**
  - Expand highest-intent, highest-trust topic clusters.
  - Begin structured, editorially honest product evaluations.
- **Backlog**
  - Deeper breed, nutrition, and behavior libraries.
  - Refresh/review cadence for existing content.
- **Notes**
  - Editorial Standards page now documents how content is researched, reviewed, and corrected.

## Phase 8 — Platform / PWA

The technical platform, performance, and architecture. See \`docs/platform-architecture.md\`.

- **Completed**
  - Static, fast site on Netlify with serverless functions (Lucy chat, places search, pet tools, IndexNow relay).
  - Clean URL structure and sitemap/robots.
  - Shared header/footer injected site-wide for consistency.
Platform Shell v1 — shared application shell, permanent platform navigation, and shared design system that future PWA/native surfaces will reuse (incremental, opt-in adoption; marketing pages unchanged).
- **In Progress**
  - _None active._
- **Next**
  - Validate analytics events end-to-end.
  - Routine performance and Core Web Vitals checks.
- **Backlog**
  - PWA / installability and offline support.
  - Component reuse to reduce duplication across pages.
- **Notes**
  - Keep JavaScript minimal; prefer static, accessible HTML.

## Phase 9 — Lucy Studio

Future content/video automation surface. See \`docs/lucy-studio-spec.md\` and \`docs/lucy-video-automation.md\`.

- **Completed**
  - Specification documented.
- **In Progress**
  - _None active. Do not build Lucy Studio yet._
- **Next**
  - Hold until foundation and core product phases mature.
- **Backlog**
  - All Lucy Studio build work (per spec).
- **Notes**
  - Explicitly out of scope right now.

## Phase 10 — Growth

Distribution, SEO/AEO compounding, newsletter, and audience.

- **Completed**
  - SEO/AEO foundations and schema graph.
  - IndexNow relay for fast indexing.
- **In Progress**
  - _None active._
- **Next**
  - Improve newsletter signup clarity and subscriber value.
  - Strengthen internal linking and topical authority.
- **Backlog**
  - Community contribution features.
  - Broader channel/distribution experiments.
- **Notes**
  - Growth follows trust and usefulness — never the other way around.

---

_Last updated as part of Phase 1 — Foundation Cleanup & Trust Completion._
