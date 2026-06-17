# PetsInMyCity — Brand Bible (Permanent Manual)

> The permanent brand manual and source of truth for PetsInMyCity. It governs how the brand is written, designed, built, and grown. Every page, tool, and future contribution — human or AI — should align with this document.
>
> Companion document: [`docs/lucy-brain.md`](./lucy-brain.md) is Lucy's operating manual. The Brand Bible defines the brand; Lucy Brain defines how Lucy applies it. Keep the two consistent.

---

## Mission

To help pet owners make smarter, calmer, better-informed decisions for the pets they love — by bringing trusted guidance, local resources, helpful tools, and honest recommendations into one dependable place.

## Vision

A future where caring for a pet never means searching ten websites for one honest answer. PetsInMyCity aims to be the trusted, pet-owner-first home for pet care across every city we serve, helping millions of owners feel confident and supported.

## Core Values

Trust, Transparency, Pet Safety, Compassion, Innovation, Local Communities, Education, and Responsibility. These are not slogans; they are the tie-breakers we use when decisions are hard.

## Brand Personality

Warm, knowledgeable, dependable, and human. We are the calm friend who knows pets — approachable and kind, but credible and careful. We are confident without being arrogant, and helpful without being pushy.

## Tone of Voice

Professional, warm, helpful, and trustworthy. Never overly corporate, never sales-heavy, never exaggerated. We write in plain language, in short readable sentences, addressing the reader as "you." We favor clarity over cleverness and honesty over hype. We avoid fear-based or pressure language. Confident, declarative statements are welcome when they're true; empty superlatives are not.

## Editorial Standards

- Accuracy first: content is reviewed and kept current as best practices change.
- Created for pet owners first — not for advertisers or rankings.
- Medical emergencies always require a licensed veterinarian; we say so clearly.
- AI assists; humans provide oversight, especially on health and safety.
- We never reproduce copyrighted text; we paraphrase briefly and link to sources.
- Every claim should be defensible; when uncertain, we soften or cite.

## SEO Philosophy

Earn rankings by being genuinely the best, clearest answer for pet owners. Write benefit-led titles and descriptions, use semantic headings, keep content original and helpful, maintain clean canonical/OG/Twitter metadata, and support discovery with breadcrumbs and sitemaps. Never keyword-stuff, cloak, or publish thin content. Good SEO is a by-product of being useful.

## AEO Philosophy

Answer Engine Optimization means being easy for AI and answer engines to understand and cite. Write self-contained, declarative sentences; lead answers with the key point; maintain a clean structured-data graph; provide FAQ content with direct questions and concise answers; and keep entity relationships explicit (PetsInMyCity → Elite Media Group; pages → site → organization). The goal is to be the trustworthy, quotable source.

## Google E-E-A-T Principles

- **Experience:** show real, practical familiarity with pet ownership and local care.
- **Expertise:** explain the "why," review content, and involve human judgment.
- **Authoritativeness:** clearly identify the operating entity (Elite Media Group) and model it in schema; build a consistent, credible presence.
- **Trustworthiness:** transparent affiliate disclosure, safety-first framing, accurate information, and a visible commitment to putting pet owners first. Trust is the most important factor and is reinforced on every page.

## Affiliate Philosophy

Affiliate relationships keep PetsInMyCity free for pet owners. They never decide what we recommend. We recommend based on usefulness and fit — the highest-paying option is never automatically the chosen one. We are transparent that we may earn referral fees through some links, that owners never pay more because of it, and that recommendations are usefulness-first. (Lucy applies these rules in [`docs/lucy-brain.md`](./lucy-brain.md) §"Affiliate Philosophy".)

## AI Philosophy

AI exists here to help people, not to persuade or pressure them. Lucy and our tools educate first, respect the user, and stay transparent about what they are. Human oversight guides design, sources, and limits — especially around health and safety. AI must never fabricate, never replace a veterinarian, and never become a covert sales channel. Any future memory or personalization must be opt-in, transparent, privacy-respecting, and free of sensitive data. (See [`docs/lucy-brain.md`](./lucy-brain.md).)

## Accessibility Standards

Meet WCAG best practices. Use semantic HTML and a correct single-H1 heading hierarchy, descriptive link text, `alt` text on meaningful images, `aria-*` only where it adds clarity (e.g., `aria-current`, `aria-expanded`, `aria-label`, `aria-hidden` on decorative icons), sufficient color contrast, visible focus, and full keyboard operability. Accessibility is a baseline requirement, not an add-on.

## Performance Standards

Stay fast and lightweight. Prefer static HTML and reuse shared styles/components (`/assets/style.css`, `/assets/script.js`). Avoid unnecessary JavaScript and heavy dependencies. Lazy-load below-the-fold imagery, keep third-party scripts minimal, and don't ship code that doesn't earn its weight.

## UX Philosophy

Calm, clear, and confidence-building. Reduce stress, never add to it. Every page should help a worried owner find the next step quickly. Use generous spacing, readable typography, alternating sections for rhythm, cards for scannability, and strong but honest calls to action. Design serves comprehension first.

## Navigation Philosophy

Navigation should be predictable and pet-owner-centric. The primary nav is: **Home, About, Find Local, Paw Tools, Resources, Lucy AI, Contact** (About sits immediately after Home as a core trust page). Keep the header design consistent, expose active state with `aria-current`, and ensure desktop and mobile menus stay in sync via the shared component in `/assets/script.js`.

## Internal Linking Philosophy

Link naturally and helpfully. Connect related resources (Lucy, Paw Tools, Pet Emergency Planner, dog/cat/adoption resources, local search, blog/resources, contact, privacy) using descriptive anchor text. Internal links should guide the owner to the logical next step and reinforce topical relationships for both users and search engines — never stuffed, always purposeful.

## Schema Philosophy

Maintain a clean, connected JSON-LD `@graph` with cross-referenced `@id`s: WebSite, Organization, and page-level types (AboutPage, etc.), plus BreadcrumbList and FAQPage where appropriate. Schema must accurately reflect on-page content (no markup for content that isn't visible). One coherent entity model beats scattered, duplicative blocks.

## Trust Principles

Trust comes before monetization; education comes before sales. We are transparent about how we work and how we earn. We protect user privacy and never request or store sensitive financial or identity data. We follow a safety-first philosophy and escalate emergencies to professionals. We build for pet owners, not advertisers — and we earn trust every single day.

## Content Quality Standards

Every piece should be accurate, original, genuinely useful, and created for pet owners. No thin or filler content, no copied text, no manipulative patterns. Prefer depth and clarity over volume. Update content as information changes, and always make the safe, responsible recommendation clear.

## Development Standards

- Reuse existing styles/components before adding new ones.
- Keep changes surgical, readable, and consistent with the established design system and CSS variables.
- Preserve accessibility, performance, and schema integrity with every change.
- Validate structured data and HTML before committing.
- Never commit secrets, API keys, environment variables, or credentials.
- Commit with clear, descriptive messages.

## Rules for Future Claude Work

1. Read this Brand Bible and [`docs/lucy-brain.md`](./lucy-brain.md) before making changes.
2. Reuse the existing design system; don't redesign without reason.
3. Preserve trust, SEO, AEO, E-E-A-T, accessibility, and performance in every change.
4. Keep desktop and mobile navigation in sync; maintain active state and ARIA.
5. Validate JSON-LD and HTML before committing; verify the diff.
6. Never expose secrets or private implementation details.
7. Prefer honest, pet-owner-first copy; avoid sales-heavy or exaggerated language.
8. Commit directly only when explicitly asked; otherwise follow the requested workflow.

## Rules for Future AI Agents

Operate as a pet-owner-first, safety-first system. Educate before recommending. Be transparent about affiliate relationships. Never fabricate facts, clinics, prices, or medical certainty. Never replace a veterinarian. Respect privacy; never collect or store sensitive personal/financial data. Keep human oversight in the loop for health and safety. Align all behavior with this Brand Bible and Lucy Brain, and escalate genuine emergencies to professionals immediately.

## Long-Term Vision

PetsInMyCity grows by deepening local coverage, improving Lucy, expanding useful tools, and publishing more reviewed educational content — always in service of one audience: pet owners and their pets. As a platform built by Elite Media Group around the idea of helping people make smarter everyday decisions, PetsInMyCity's north star never changes: less confusion, more clarity, and a calmer experience for everyone who shares their life with a pet.

---

### Source of truth

This document is the permanent brand manual for PetsInMyCity and works together with [`docs/lucy-brain.md`](./lucy-brain.md). When the brand evolves, update this file first, then align Lucy Brain.
