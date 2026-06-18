# PetsInMyCity — Platform Architecture

> **Status:** Internal — Do not publish.
> **Type:** Permanent technical & product vision document.
> **Audience:** Product, Engineering, Design leadership.
> **Owner of record:** PetsInMyCity (Elite Media Group).

This document defines the long-term architecture for transforming PetsInMyCity from a content website into a **pet operating system** spanning web, Progressive Web App (PWA), and native iOS/Android.

It is written from three perspectives at once — **Chief Product Officer**, **Chief Technology Officer**, and **Chief Design Officer** — and is intended to remain the master architectural reference as every future feature is built into it.

### Companion documents
- [Brand Bible](./brand-bible.md) — voice, tone, visual identity, trust principles.
- [Lucy Brain](./lucy-brain.md) — Lucy's AI behavior, boundaries, and reasoning.
- [Knowledge Graph](./knowledge-graph.md) — the conceptual map of everything the platform knows.
- [Roadmap](./roadmap.md) — what gets built and when.
- [My Pets MVP Plan](./my-pets-mvp-plan.md) — the first product step toward the operating system.

> **Guardrails carried from all companion docs:** Trust before monetization. Education before products. Lucy assists, never replaces professionals. Emergency resources are never paywalled. No medical claims, no diagnosis. No secrets, API keys, credentials, internal URLs, or environment variables appear in this document.

---

## Section 1 — Platform Vision

**PetsInMyCity is the operating system for pet ownership.**

It is not a website. It is not an AI chatbot. It is not an affiliate site. Those are surfaces and features that live *inside* the platform — they are not the platform itself.

The right mental model is a system that sits at the center of a person's life with their pet and quietly handles everything that matters:

- **Apple Health for pets** — a trusted, private home for a pet's health, preparedness, and care history.
- **Duolingo engagement** — gentle daily habits, streaks, progress, and encouragement that make caring for a pet feel rewarding instead of overwhelming.
- **Chewy trust** — warmth, reliability, and a relationship the owner feels good about.
- **Notion flexibility** — a structure that bends to any pet, any species, any household.
- **Airbnb simplicity** — premium, calm, and effortless from the very first screen.

The platform should feel **premium from day one**, even while the underlying implementation is still simple and static. Premium is a design and trust posture, not a budget. Every decision in this document optimizes for a product a pet owner returns to *daily for the entire life of their pet* — and ideally across multiple pets and a lifetime of pets.

**What the platform owns conceptually:** the relationship between an owner, their pet(s), and Lucy. Everything else — content, tools, local discovery, commerce — exists to strengthen that relationship.

**What it explicitly is not:**
- Not a destination people visit once for an answer and leave.
- Not a chatbot wrapper.
- Not a thin affiliate funnel.
- Not a medical or diagnostic product.

---

## Section 2 — Core Products (Permanent Product Pillars)

These are the durable pillars the platform is organized around. Each is described by **Purpose**, **Primary users**, **Future roadmap**, and **Dependencies**. Not all exist today; this is the destination, and the [Roadmap](./roadmap.md) governs sequencing.

### 2.1 My Pets
- **Purpose:** The home of the owner-pet relationship — pet profiles, the Lucy Care Score™, missions, badges, and care history. The anchor product everything else attaches to.
- **Primary users:** Every owner, from day one.
- **Future roadmap:** Multi-pet households → cloud sync → family sharing → richer timelines and history.
- **Dependencies:** Local storage today; future auth, database, and storage layers. See [My Pets MVP Plan](./my-pets-mvp-plan.md).

### 2.2 Lucy AI
- **Purpose:** The warm, trustworthy guide that meets the pet, answers questions, and routes owners to the right tool, article, or local resource — never diagnosing, always within the boundaries in [Lucy Brain](./lucy-brain.md).
- **Primary users:** Everyone; the connective tissue across all products.
- **Future roadmap:** Pet-aware memory → photo understanding → voice → proactive care planning.
- **Dependencies:** Knowledge Graph, My Pets data (future, with consent), AI memory layer.

### 2.3 Health Center
- **Purpose:** A private, organized view of preventive care readiness — vaccinations, weight trend, medication routine, grooming, nutrition. Preparedness and organization, **never** diagnosis.
- **Primary users:** Engaged owners managing ongoing care.
- **Future roadmap:** Reminders → vaccination/medication tracking → vet-visit prep summaries.
- **Dependencies:** My Pets, Reminders, Journal, Knowledge Graph.

### 2.4 Emergency Center
- **Purpose:** Instant access to the Emergency Planner, nearby emergency vets, and critical preparedness. **Always free, never paywalled.**
- **Primary users:** Any owner in a stressful moment.
- **Future roadmap:** One-tap emergency mode → offline access → location-aware emergency vet routing.
- **Dependencies:** Local discovery, Emergency Planner, offline cache.

### 2.5 Discover Local
- **Purpose:** Find trustworthy nearby vets, emergency vets, groomers, parks, shelters, and pet-friendly places.
- **Primary users:** New owners, movers, travelers.
- **Future roadmap:** Saved places → reviews context → directions and hours surfaced inline.
- **Dependencies:** Local data provider, Knowledge Graph local categories.

### 2.6 Learning Center
- **Purpose:** Trusted education organized by the Knowledge Graph topic clusters — the "education before products" backbone.
- **Primary users:** Everyone, especially new and curious owners.
- **Future roadmap:** Personalized learning paths by species/life stage → Lucy-guided lessons.
- **Dependencies:** Knowledge Graph, content pipeline, Lucy.

### 2.7 Marketplace
- **Purpose:** Trustworthy, editorially honest product guidance (Chewy/Amazon and future partners) presented only *after* education and tools. Never the starting point.
- **Primary users:** Owners ready to buy with confidence.
- **Future roadmap:** Curated bundles → reorder reminders → partner integrations.
- **Dependencies:** Affiliate framework, Knowledge Graph, trust guardrails.

### 2.8 Settings
- **Purpose:** Control over data, privacy, notifications, units, and account.
- **Primary users:** All users.
- **Future roadmap:** Granular privacy controls → data export/delete → notification preferences.
- **Dependencies:** Auth, storage, notification system.

### 2.9 Notifications
- **Purpose:** Gentle, valuable nudges — reminders, birthdays, tips, weather/safety alerts.
- **Primary users:** Daily-active and returning users.
- **Future roadmap:** Push (web/native) → smart timing → digestible daily summary.
- **Dependencies:** Notification infrastructure, Reminders, retention engine.

### 2.10 Account
- **Purpose:** Identity and continuity across devices; the bridge from anonymous local use to synced multi-device use.
- **Primary users:** Returning and multi-device users.
- **Future roadmap:** Passwordless/SSO sign-in → family accounts → billing.
- **Dependencies:** Auth provider, database, billing.

### 2.11 Future Integrations
- **Purpose:** Connect outward — telehealth, insurance, wearables, smart devices, calendars.
- **Primary users:** Power users and Pro subscribers.
- **Future roadmap:** Partner API layer → device sync → calendar/reminder export.
- **Dependencies:** Public API layer, auth, partner agreements.

---

## Section 3 — Information Architecture

The application is organized around the pet, not around pages. Lucy and My Pets are always within reach.

### 3.1 Top-level structure
```
Home (Today)
├─ My Pets
│   ├─ Pet profile
│   ├─ Lucy Care Score™
│   ├─ Missions & badges
│   └─ Journal
├─ Lucy
├─ Health
│   ├─ Reminders
│   ├─ Vaccinations
│   ├─ Weight & nutrition
│   └─ Records
├─ Emergency
│   ├─ Emergency Planner
│   └─ Nearby emergency vets
├─ Discover (Local)
├─ Learn
├─ Shop (Marketplace)
└─ Profile
    ├─ Settings
    ├─ Notifications
    └─ Account
```

### 3.2 How navigation should evolve
- **Today (static web):** A simple header + footer, with My Pets and the existing tools reachable. Minimal, calm, premium.
- **PWA phase:** Introduce a persistent shell with a **Home/Today** hub and bottom navigation on mobile viewports.
- **Native phase:** The same IA expressed as native tab bars and stacks, sharing the PWA's mental model so the experience feels identical across surfaces.

### 3.3 Mobile bottom navigation (5 anchors, thumb-first)
1. **Home (Today)** — the daily hub.
2. **My Pets** — the relationship anchor.
3. **Lucy** — center position; the assistant is always one tap away.
4. **Discover** — local resources.
5. **Profile** — settings, account, notifications.

Emergency is intentionally **not** buried in a tab — it is surfaced as a persistent, always-visible affordance (e.g., a calm but unmistakable "Emergency" entry point) so it is reachable in one action from anywhere.

### 3.4 Desktop navigation
- Persistent **left sidebar** with the full product list (Home, My Pets, Lucy, Health, Emergency, Discover, Learn, Shop, Profile/Settings).
- **Top bar** for global search (Lucy), notifications, and active-pet switcher.
- Multi-pet households get a pet switcher that is always visible, since desktop has the room.

---

## Section 4 — Technical Architecture

The guiding principle: **build the simplest thing today that the future can grow into without a rewrite.** Each layer below is designed so the static-web version is a true subset of the PWA and native versions.

### 4.1 Evolution path
1. **Static web today** — HTML/CSS/JS, design tokens in a shared stylesheet, localStorage for personal data. Zero backend. Fast, private, cheap.
2. **PWA next** — add a manifest and service worker for installability, offline caching of emergency/static content, and a Today hub. Still client-first; sync optional.
3. **Native apps later** — iOS/Android wrapping the same product model and IA, talking to the same API layer, sharing the design system.

### 4.2 Layers
- **Client/UI layer:** A single design system (tokens, components) shared across web, PWA, and native so the brand feels identical everywhere.
- **API layer:** A clean, versioned API that the client talks to. Introduced at the PWA/sync stage. Native apps and partners consume the same API. Stable contracts, additive changes only.
- **Authentication:** Anonymous-first today (no login). Future: **passwordless / SSO** sign-in only. Users always create their own accounts and enter their own credentials — the platform never creates accounts or stores passwords on a user's behalf.
- **Database:** None today (localStorage). Future: a managed cloud database holding the same versioned, multi-pet schema already used locally (`pimc-my-pets-v1` shape), enabling sync without a data-model rewrite.
- **Storage:** Photos/avatars stored locally today (or skipped). Future: managed object storage with private, owner-scoped access.
- **Notifications:** None today. Future: web push (PWA) and native push, driven by the Reminders + retention engine.
- **Billing:** None today. Future: a subscription billing provider for Plus/Pro, integrated through the API layer. The platform never enters a user's payment or banking details on their behalf.
- **Analytics:** GA4 today (event-level, **no PII**). Future: privacy-preserving product analytics for DAU/WAU/retention — still strictly no pet names, health details, or contact info in event parameters.
- **Security:** Owner-scoped data, least-privilege access, encryption in transit and at rest (future cloud), no secrets in the client, no PII in analytics, and respect for all bot/abuse protections.
- **Future AI memory:** A consent-gated memory store (pet profile facts, preferences, conversation context) that Lucy can draw on — opt-in, deletable, and never used to make medical claims. See [Lucy Brain](./lucy-brain.md).
- **Future integrations:** Exposed only through the versioned API with explicit user consent (telehealth, insurance, wearables, calendars).

### 4.2.1 Lucy Decision Engine (parent orchestration layer)

As of Phase 2.3, Lucy is coordinated by a **Lucy Decision Engine** (`assets/lucy-decision-engine.js`, exposed as `window.PIMCLucy`). It is the parent orchestration layer that makes Lucy feel like a companion rather than a router: she understands the concern, determines urgency, asks only the minimum clarifying questions, selects the right care pathway, explains why, recommends the appropriate next step, and ends with a helpful follow-up.

The engine is **provider-agnostic**. The existing Veterinary Care Engine (`assets/vet-care-engine.js`, `window.PIMCVetCare`) is **not replaced** — it becomes one module within the Decision Engine. Dutch remains a provider inside that module; Dutch is never the engine.

**Modules (registry).** Capabilities are registered in a provider-agnostic module registry so new ones can be added without redesigning Lucy or the platform:

- **Veterinary Decision Engine** — wraps `PIMCVetCare` for non-emergency care pathways.
- **Emergency Decision Engine** — also delegates to `PIMCVetCare` so emergency/poison detection stays a single source of truth and is never weakened.
- **Local Discovery Engine** — local vet/groomer/boarding discovery.
- **Learning Engine** — educational content and explanations.
- **Product Recommendation Engine** — reserved for future product guidance.
- **Affiliate Recommendation Engine** — surfaces trusted partners with disclosure, never as the focus.
- **My Pets Engine** — pet profile context.
- **Lucy Care Journey Engine** — longer-term care guidance.
- **Notification Engine** — reserved for future reminders/notifications.

**Conversation memory (in-session only).** The engine keeps a lightweight memory of what the owner has already shared this session — preferred name, pet name, species, approximate age, symptoms, city, and ZIP — so Lucy doesn't ask twice and can speak to the pet by name. Nothing is persisted: there is no account, no cookie, and no storage. Memory lives in a closure for the page session and is cleared by `reset()`, which Lucy calls when the chat is closed. This is distinct from the consent-gated, opt-in **Future AI memory** described above, which is a separate, persistent, deletable store.

**Decision philosophy.** Every health conversation follows the same sequence: understand the concern → determine urgency → ask the minimum clarifying questions → select the correct care pathway → explain why → recommend the appropriate resource → end with another helpful question. Emergencies short-circuit the sequence and escalate immediately, never naming a provider. Affiliate disclosures and the existing analytics events are preserved unchanged.

### 4.3 Data portability principle
The localStorage schema designed for My Pets is intentionally **cloud-shaped**: versioned and multi-pet-ready. When sync arrives, the migration is "upload the same object," not "redesign the model." This is the single most important technical decision for long-term scalability.

---

## Section 5 — User Journey

The ideal experience is a gentle, compounding relationship — not a funnel.

```
Visitor
  ↓   arrives via search, content, or a tool
Meet Lucy
  ↓   conversational, warm — "I'd love to meet your pet"
Create first pet
  ↓   feels like an introduction, not a form
Lucy Care Score™
  ↓   "Great start — let's get Bella to 100"
Emergency Planner
  ↓   immediate, free, builds trust fast
Journal
  ↓   small moments worth saving
Reminders
  ↓   the platform starts giving back daily
Daily use
  ↓   Today hub, tips, streaks, birthdays
Subscription
  ↓   Plus/Pro for those who want more — never for emergencies
Family
  ↓   shared pets across a household
Lifetime customer
```

Each step should deliver value *before* asking for anything. The Care Score and Emergency Planner intentionally come early because they build trust and demonstrate usefulness before any account or subscription is ever mentioned.

---

## Section 6 — Subscription Strategy

Three tiers. Every tier delivers genuine value. **Emergency resources are never paywalled, ever.**

### Free — "Everything a pet needs to be cared for"
- My Pets (multiple pets), Lucy Care Score™, missions and badges.
- Full Emergency Center and Emergency Planner.
- Local discovery, Learning Center, core Lucy conversations.
- Basic reminders and journal.
- **Principle:** Free must feel generous, not crippled. Trust is built here.

### Plus — "Stay on top of everything"
- Advanced reminders (recurring, smart timing), richer journal and timeline/history.
- Multi-pet quality-of-life features, weight/nutrition trends.
- Expanded Lucy capabilities (more context, care planning).
- Family sharing within a household.

### Pro — "Your pet's full operating system"
- Everything in Plus.
- Deepest Lucy memory and proactive care planning.
- Integrations (telehealth/insurance/wearables) where available.
- Priority support and the most advanced insights.

**Guardrails (from [Brand Bible](./brand-bible.md) and [Roadmap](./roadmap.md)):** Never paywall emergency or safety resources. Never compromise trust for conversion. Never make medical claims a paid feature. Pricing should feel fair for a product used daily for a pet's lifetime.

---

## Section 7 — Retention Strategy

The platform earns a daily open by being genuinely useful and warm — Duolingo-style habit, Apple-Health-style trust.

- **Morning greeting** from Lucy on the Today hub ("Good morning — here's Bella's day").
- **Today's care tip** tailored to species/life stage.
- **Reminders** that complete real tasks (meds, grooming, vet visits).
- **Weather & safety alerts** (heat, cold, seasonal hazards) for the pet's location.
- **Pet birthdays** and gotcha-day moments.
- **Achievements** — badges and Care Score milestones.
- **Timeline / Journal** that becomes a treasured history over the years.
- **Streaks** for healthy care habits (gentle, never guilt-driven).
- **Lucy conversations** that feel personal and pick up where they left off.
- **Personal insights** — "Bella's weight has been steady for 3 months."

Retention is built on warmth and usefulness, never on dark patterns, manufactured anxiety, or guilt.

---

## Section 8 — Monetization Strategy

Revenue follows trust. The order of priority is fixed: **be trusted, be useful, then monetize.**

- **Affiliate (Marketplace):** Honest product guidance after education and tools. Editorial integrity is never compromised. (Chewy, Amazon, future partners.)
- **Subscriptions:** Plus and Pro — the core durable revenue, tied to ongoing value.
- **Marketplace:** Curated, trustworthy commerce surfaces.
- **Partner integrations:** Revenue-share with vetted partners exposed via the API layer.
- **Telehealth:** Connect owners to licensed professionals — Lucy never replaces them.
- **Insurance:** Transparent, optional, clearly disclosed referrals.
- **Services:** Local services (boarding, grooming, training) where genuinely helpful.

**Absolute rule:** Never prioritize revenue over trust. Never paywall emergencies. Never let monetization distort Lucy's recommendations — education and tools always come before products, per the [Knowledge Graph](./knowledge-graph.md) recommendation order.

---

## Section 9 — Mobile Strategy

Mobile is where pet care actually happens — at the vet, on a walk, in an emergency. The platform is mobile-first by default.

- **Responsive web:** The baseline today. Mobile-first layouts, large touch targets, thumb-friendly.
- **PWA:** Installable to the home screen, offline access to emergency and saved content, fast cold starts, an app-like shell with bottom navigation.
- **iPhone (iOS):** Native app sharing the IA and design system; native tab bar; deep integration where it adds value.
- **Android:** Native parity with iOS.
- **Tablet:** Two-pane layouts (list + detail) that take advantage of the larger canvas.
- **Watch integration:** Glanceable reminders, "log a walk," birthday nudges, emergency shortcut.
- **Widgets:** Home-screen widgets for the Today tip, next reminder, and Care Score.
- **Push notifications:** Reminders, birthdays, weather/safety alerts, gentle re-engagement — valuable, never spammy.
- **Offline mode:** Emergency information, the active pet's profile, and saved local resources remain available without a connection.

Offline-first for emergencies is a trust feature, not a nice-to-have: a panicking owner with poor signal must still reach their emergency plan and nearest emergency vet.

---

## Section 10 — Future AI (How Lucy Evolves)

Lucy's evolution stays inside the boundaries of [Lucy Brain](./lucy-brain.md): assist, never diagnose; acknowledge uncertainty; route to professionals.

- **Conversation memory** — continuity across sessions (opt-in, deletable).
- **Pet memory** — Lucy knows the pet's name, species, breed, age, and routine, with consent.
- **Photo understanding** — recognize a pet in a photo, help organize the journal; never a diagnostic tool.
- **Voice** — hands-free Lucy for walks and busy moments.
- **Behavior coaching** — gentle, education-backed guidance for training and enrichment.
- **Care planning** — proactive, personalized preparedness plans (not medical plans).
- **Smart reminders** — Lucy proposes the right reminders at the right time.
- **Natural conversations** — warm, human, and genuinely helpful.

Every AI capability is consent-gated, privacy-preserving, and explicitly bounded away from medical diagnosis.

---

## Section 11 — Growth Strategy

Growth should come from delight and genuine usefulness, not extraction.

- **Sharing** — shareable Care Score milestones and achievement moments (architected for later; not built in v1).
- **Invitations** — invite family members to a shared pet/household.
- **Pet birthdays** — naturally shareable, joyful moments.
- **Achievements** — badges worth showing off.
- **Care Score™** — a friendly, comparable signal of preparedness ("My pup hit 100").
- **Community** — owners helping owners, moderated and trustworthy (future).
- **Referrals** — reward existing users for bringing friends, fairly.

Virality is a byproduct of love for one's pet — design for the moments owners *want* to share.

---

## Section 12 — Success Metrics

The north-star is a product people use *for the life of their pet*. Key measures:

- **Daily Active Users (DAU)**
- **Weekly Active Users (WAU)**
- **Retention** (D1 / D7 / D30 / long-term cohort curves)
- **Subscriber growth** (Free → Plus → Pro conversion and churn)
- **Lucy engagement** (conversations per active user, helpful-resolution rate)
- **Care Score completion** (share of pets reaching higher Care Score tiers)
- **Reminder completion** (reminders acted on vs. created)
- **Journal usage** (entries per active pet over time)
- **Referral rate** (invites sent and accepted)
- **Lifetime value (LTV)** balanced against trust — never optimized at trust's expense.

All measurement remains PII-free in analytics, consistent with the My Pets analytics rules.

---

## Section 13 — Five-Year Vision

### At 100,000 users
- The PWA is the primary experience; native apps are launched or in late beta.
- A real API + cloud database power optional sync; My Pets data migrates cleanly from the local schema.
- Plus is live and converting; reminders, journal, and the Today hub drive daily habit.
- **What stays the same:** trust-first posture, free emergency resources, Lucy's boundaries, warm premium feel.

### At 500,000 users
- Native apps mature with push, widgets, and watch support.
- Family sharing and multi-pet households are common; Pro and partner integrations (telehealth/insurance) generate meaningful revenue.
- Lucy has consent-based memory and care planning.
- **What stays the same:** education before products, no medical claims, no paywalled emergencies, PII-free analytics.

### At 1,000,000 users
- PetsInMyCity is recognized as *the* operating system for pet ownership — the default place owners go.
- A robust platform: scalable infrastructure, partner ecosystem via the API layer, community, and a deep, trusted Lucy.
- Significant, durable subscription + marketplace revenue.
- **What changes:** scale, breadth of integrations, depth of AI, organizational maturity.
- **What never changes:** trust before monetization, Lucy assists rather than replaces professionals, emergencies are always free, owners own and control their data, and the product feels premium and warm from the very first screen.

---

## Final Synthesis — CPO / CTO / CDO View

**As CPO:** The product is the owner-pet-Lucy relationship. My Pets is the anchor; everything else (Health, Emergency, Discover, Learn, Shop) strengthens it. Sequence per the Roadmap; never sacrifice trust for a metric.

**As CTO:** Build the simplest thing today (static + localStorage) using a *cloud-shaped* schema so static → PWA → native → API → cloud is an evolution, not a rewrite. One design system, one IA, one data model across all surfaces. Auth is passwordless/SSO and user-driven; analytics stays PII-free; emergencies work offline.

**As CDO:** Premium, calm, warm, and emotional from day one. Lucy *meets* the pet; she never presents a form. The same brand and feel render identically on web, PWA, and native.

### Greatest technical risks
- **Data-model drift:** if the local schema and future cloud schema diverge, sync becomes a costly rewrite. *Mitigation:* versioned, multi-pet-ready schema today; additive migrations only.
- **Premature backend:** adding accounts/database too early adds cost, privacy risk, and complexity before value is proven. *Mitigation:* stay client-first until sync is genuinely demanded.
- **Privacy & PII leakage:** pet/owner data is sensitive; analytics or integrations could leak it. *Mitigation:* strict no-PII analytics, owner-scoped access, consent-gated AI memory.
- **Trust erosion via monetization:** over-eager paywalls or product pushes. *Mitigation:* fixed recommendation order, free emergencies, editorial integrity.
- **Cross-platform fragmentation:** web/PWA/native diverging. *Mitigation:* shared design system, IA, and API contracts.

### Greatest opportunities
- Becoming the **trusted daily home** for pet owners — a category few have earned.
- **Apple-Health-for-pets** positioning with a warm, Duolingo-style engagement loop.
- A **Lucy memory + care planning** layer that compounds value over a pet's lifetime.
- A **fair subscription + honest marketplace** model that monetizes without betraying trust.
- A **lifetime, multi-pet, family** relationship — extraordinary LTV when trust is preserved.

### Readiness recommendation
**Yes — the platform is ready to begin building the full SaaS experience, in the disciplined sequence below.** The foundations (brand, Lucy boundaries, knowledge graph, roadmap, and a live, cloud-shaped My Pets MVP) are in place. Recommended first moves, in order:

1. **Harden the data model** as the canonical schema (it already is cloud-shaped) and add export/delete.
2. **Ship the PWA shell** — manifest, service worker, Today hub, offline emergency access, mobile bottom nav. *No backend required.*
3. **Introduce optional accounts (passwordless/SSO) + cloud sync** behind a clear value proposition, migrating the existing schema as-is.
4. **Layer Plus** once daily-habit features (reminders, journal, Today) prove retention.
5. **Then** native apps, push/widgets/watch, deeper Lucy memory, and partner integrations.

Do **not** build accounts, databases, billing, or native apps before the PWA proves daily retention. Build the platform that every future feature fits into — then let the [Roadmap](./roadmap.md) govern the pace.

---

*Internal document. Cross-references: [Brand Bible](./brand-bible.md) · [Lucy Brain](./lucy-brain.md) · [Knowledge Graph](./knowledge-graph.md) · [Roadmap](./roadmap.md) · [My Pets MVP Plan](./my-pets-mvp-plan.md). Contains no secrets, API keys, credentials, internal URLs, or environment variables.*
