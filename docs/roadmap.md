# PetsInMyCity — Product Roadmap (Internal)

> **Internal document. Do not publish.** This is the master, long-term blueprint for PetsInMyCity. It is **not a backlog and not a task list** — it is a living product strategy document that defines *what* we build and *when*, and *why* each step reinforces our mission.
>
> Source-of-truth companions: [`docs/brand-bible.md`](./brand-bible.md) governs brand, voice, editorial, SEO/AEO, E-E-A-T, and trust; [`docs/lucy-brain.md`](./lucy-brain.md) governs how Lucy thinks, speaks, and behaves. This roadmap defers to both. Where the roadmap proposes something, it must still pass the Brand Bible and Lucy Brain standards before it ships.
>
> Contains **no secrets, API keys, credentials, internal URLs, environment variables, or private implementation details** — strategy and direction only.

---

## Section 1 — Vision

PetsInMyCity exists to become **the most trusted AI-powered platform for pet owners** — the first place someone turns when they have a question about caring for the animal they love, and the place they return to because the answer was honest, useful, and safe.

Trust is the product. Everything else — Lucy, the tools, local discovery, content, affiliate relationships — is in service of one outcome: a pet owner makes a calmer, smarter, safer decision than they would have made alone. We measure success by whether people come back and whether they'd recommend us to a friend with a new puppy.

Over the next three to five years, PetsInMyCity should grow from a trusted resource into a trusted *companion* across the entire arc of pet ownership — adoption, daily care, emergencies, aging, and everything between — while never trading that trust for a faster dollar. As the Brand Bible states, we put pets first and earn trust every day. This roadmap is how we keep that promise at scale.

---

## Section 2 — Guiding Principles

These principles decide ties. When two paths compete, choose the one that best honors this list, in roughly this order:

- **Trust before monetization.** We never sell out the reader. Revenue follows trust; it never precedes it.
- **Education before products.** We explain first. A product is only ever mentioned when it genuinely helps.
- **AI should assist, not replace professionals.** Lucy informs and guides; she never substitutes for a veterinarian or emergency care.
- **Local-first experiences.** Pet ownership is local. Resources, services, and help should feel rooted in the user's actual city.
- **Accessibility for everyone.** WCAG-aligned, keyboard-friendly, screen-reader-friendly, by default — not as an afterthought.
- **Transparency always.** Affiliate relationships, AI involvement, and editorial choices are disclosed plainly.
- **Fast performance.** Speed is a trust and accessibility feature. Lean pages, minimal JavaScript, fast loads.
- **Continuous improvement.** We ship, learn, and refine. The platform compounds in quality over time.

---

## Section 3 — Current Status (Completed)

The foundation is in place. Already shipped and live:

- ✅ **Lucy AI** — educational pet assistant with safety-first behavior (see `lucy-brain.md`)
- ✅ **Google Places integration** — powering real local results
- ✅ **Local search** — find nearby pet services
- ✅ **Pet Emergency Planner** — preparedness tool
- ✅ **Food Checker** — is-this-safe lookups for pets
- ✅ **Calorie Calculator** — feeding guidance tool
- ✅ **Chewy integration** — trusted product sourcing
- ✅ **Amazon integration strategy** — defined affiliate approach
- ✅ **Analytics framework** — GA4 measurement in place
- ✅ **About page** — premium trust page (E-E-A-T anchor)
- ✅ **Brand Bible** — permanent brand manual (`brand-bible.md`)
- ✅ **Lucy Brain** — permanent AI operating manual (`lucy-brain.md`)
- ✅ **Navigation improvements** — restructured global nav, About promoted to a core page
- ✅ **SEO foundations** — titles, meta, canonical, Open Graph, schema graph (WebSite, Organization, AboutPage, BreadcrumbList, FAQPage)
- ✅ **AEO foundations** — FAQ schema, clear entity definitions, answer-friendly structure

---

## Section 4 — Current Priorities (Next 30 Days)

Realistic, near-term work that strengthens what already exists rather than chasing new surface area:

- **Improve Lucy conversations** — sharpen clarifying questions, tighten safety/emergency phrasing, reduce friction.
- **Expand local search** — broaden categories and improve result quality in covered areas.
- **Strengthen product recommendations** — make Lucy's and the site's recommendations more relevant and better explained.
- **Planner improvements** — refine the Emergency Planner flow and outputs.
- **Newsletter experience** — improve signup clarity and the value of what subscribers receive.
- **Emergency resources** — expand and verify emergency/vet information.
- **Affiliate optimization** — improve placement and disclosure quality without compromising editorial integrity.
- **Analytics validation** — confirm GA4 events fire correctly and dashboards are trustworthy.
- **Performance tuning** — trim payloads, defer non-critical JS, audit Core Web Vitals.
- **Accessibility review** — keyboard, contrast, ARIA, and screen-reader pass across key templates.

---

## Section 5 — Next 90 Days (By Initiative)

### Emergency & Safety
Deepen emergency content and tooling: clearer escalation paths, region-aware emergency vet info, and stronger "when to call a vet now" guidance throughout Lucy and the site.

### Local Discovery
Improve local result relevance, add high-value business categories, and make local pages more useful and complete for the cities we cover.

### AI Improvements
Make Lucy more helpful and consistent: better question-asking, better resource recommendations, and tighter alignment with `lucy-brain.md` safety and tone rules.

### Product Reviews
Begin structured, editorially honest product evaluations — usefulness first, never commission-driven — that feed both content and Lucy's recommendations.

### Educational Content
Expand the content library along the topic clusters in Section 6, prioritizing the highest-intent, highest-trust topics.

### Community Features
Explore lightweight ways for pet owners to contribute and benefit (e.g., questions, local tips) without introducing moderation or safety risk prematurely.

### Trust & Transparency
Make disclosures, editorial standards, and AI involvement even clearer and more visible across the experience.

---

## Section 6 — Content Roadmap (Topic Clusters)

Content is organized into durable clusters that build topical authority and feed AEO. Each cluster lists example future content directions:

- **Dogs** — breed care basics, common health questions, daily-care guides.
- **Cats** — indoor care, litter and behavior, feline-specific nutrition.
- **Puppies** — first 30 days, socialization, vaccination basics, training starts.
- **Kittens** — early care, litter training, kitten-proofing.
- **Senior Pets** — mobility, diet shifts, comfort and quality-of-life guidance.
- **Nutrition** — feeding guidelines, ingredient literacy, treats and portioning.
- **Health** — preventive care, common conditions, when to see a vet.
- **Behavior** — anxiety, problem behaviors, enrichment.
- **Training** — fundamentals, positive reinforcement, troubleshooting.
- **Travel** — car and air travel, pet-friendly logistics, safety.
- **Emergency Preparedness** — kits, plans, disaster readiness (ties to the Planner).
- **Seasonal Safety** — heat, cold, holidays, toxic seasonal hazards.
- **Adoption** — choosing, preparing, the first weeks home.
- **Supplies** — what's worth buying, how to choose, what to skip.

---

## Section 7 — Lucy Roadmap

Future capabilities, all gated by the safety and trust rules in `lucy-brain.md`:

- **Site-wide knowledge** — Lucy understands and can route to every tool and article.
- **Pet profiles** — optional saved details to personalize guidance.
- **Conversation memory** — continuity across sessions, with privacy by design.
- **Personalized recommendations** — relevance based on a pet's actual needs.
- **Appointment reminders** — gentle, useful nudges.
- **Vaccination reminders** — schedule-aware prompts (never medical instructions).
- **Medication reminders** — adherence support, never dosing advice.
- **Voice conversations** — hands-free help.
- **Image understanding** — interpret what a user shows Lucy.
- **Photo analysis** — supportive, never diagnostic; always defers to a vet for medical concerns.
- **Behavior coaching** — structured, educational guidance over time.

---

## Section 8 — Local Platform Roadmap

Future local capabilities that make PetsInMyCity feel genuinely rooted in each user's city:

- **More cities** — expand coverage methodically, quality before quantity.
- **More business categories** — vets, groomers, boarding, daycare, trainers, supply, and beyond.
- **Local events** — adoption events, clinics, meetups.
- **Shelters** — discoverable, accurate listings.
- **Rescues** — breed- and species-specific rescue discovery.
- **Dog-friendly parks** — vetted local green space.
- **Dog-friendly restaurants** — where pets are welcome.
- **Emergency resources** — nearest 24/7 and emergency vet info.
- **Lost pet resources** — what to do and where to turn locally.

---

## Section 9 — Affiliate Roadmap

Affiliate revenue keeps PetsInMyCity free. It must never bend editorial judgment. We recommend on usefulness first; commission never decides. Per the Brand Bible, we are built for pet owners, not advertisers:

- **Chewy** — core trusted product source.
- **Amazon** — breadth and convenience where it genuinely serves the reader.
- **Insurance** — only transparent, genuinely useful options.
- **DNA tests** — where they add real value.
- **Subscriptions** — recurring needs that make ownership easier.
- **Travel** — pet-friendly travel products and services.
- **Emergency kits** — preparedness products tied to safety content.

> **Hard rule:** Never compromise editorial integrity. If a recommendation wouldn't survive without the commission, it doesn't ship.

---

## Section 10 — SEO Roadmap

Long-term organic and AI-search authority, aligned with the SEO/AEO philosophy in the Brand Bible:

- **Topic clusters** — build authority around the Section 6 clusters.
- **Internal linking** — strong, intentional links between hubs and spokes.
- **Schema expansion** — extend structured data across tools and content types.
- **Programmatic city pages** — scalable, genuinely useful local pages.
- **Breed pages** — durable, high-intent reference content.
- **FAQ expansion** — grow answer-friendly FAQ coverage (feeds AEO).
- **AI-search optimization** — clear, citable, entity-rich answers for AI engines.
- **Entity building** — consistent definitions of who we are and what we cover.
- **Knowledge Graph** — earn and reinforce a clear entity footprint.

---

## Section 11 — Technical Roadmap

Keep the platform fast, accessible, reliable, and trustworthy:

- **Performance** — minimal JS, lean assets, strong Core Web Vitals.
- **Accessibility** — sustained WCAG alignment across every template.
- **Caching** — smart caching for speed and resilience.
- **Analytics** — trustworthy, validated measurement.
- **Testing** — guardrails so quality doesn't regress as we grow.
- **Monitoring** — uptime, errors, and regression alerts.
- **Search improvements** — faster, more relevant local and content search.
- **AI infrastructure** — scalable, safe foundations for Lucy's growth.

---

## Section 12 — Future Monetization

Only ethical opportunities that strengthen — never undermine — trust:

- **Affiliate** — the current, transparent foundation.
- **Sponsored educational content** — clearly labeled, genuinely useful, editorially independent.
- **Premium tools** — advanced features for power users, with free value preserved.
- **Pet profiles** — optional premium personalization.
- **Reminder services** — convenience features people would gladly pay for.
- **Marketplace** — vetted, trustworthy connections between owners and services.

> **Hard rule:** Never compromise trust. Any monetization that asks the reader to lose so we can win is off the table.

---

## Section 13 — Ideas Parking Lot

Unprioritized future ideas. Captured, not committed — revisit against the Decision Framework before any of these graduate to the roadmap:

- Wearables
- Pet cameras
- Smart feeders
- Vet telehealth
- Community forums
- Mobile app
- Apple Watch
- Android

---

## Section 14 — Success Metrics

We measure what reflects trust and genuine usefulness, not vanity:

- **Trust** — perceived trustworthiness and disclosure clarity.
- **Returning visitors** — do people come back?
- **Lucy usage** — adoption and depth of helpful conversations.
- **Tool usage** — Planner, Food Checker, Calorie Calculator, and beyond.
- **Newsletter growth** — quality subscribers, not just count.
- **Local search usage** — are local features genuinely used?
- **Affiliate conversion** — healthy, but never at the expense of trust.
- **Content quality** — accuracy, helpfulness, freshness.
- **Organic traffic** — durable, non-paid growth.
- **AI referrals** — visibility and citations in AI search.
- **User satisfaction** — would they recommend us to a fellow pet owner?

---

## Section 15 — Decision Framework

Before building anything, it must pass this test. Every future feature should answer **yes** to these:

1. Does this help pet owners?
2. Does this strengthen trust?
3. Does this align with the **Brand Bible** (`brand-bible.md`)?
4. Does this align with **Lucy Brain** (`lucy-brain.md`)?
5. Does it improve SEO?
6. Does it improve AEO?
7. Does it improve accessibility?
8. Does it improve long-term value?

> If the answer is "no," it should not be built. A clever feature that erodes trust is a net loss, no matter how it performs in the short term.

---

## How to Use This Roadmap

This is a living document. Revisit it regularly, update Section 3 as items ship, re-sequence priorities as we learn, and run every new idea through Section 15. The Brand Bible and Lucy Brain remain the source of truth for *how* we behave; this roadmap defines *what* we build and *when*. Kept current, it should guide the team for years.
