# PetsInMyCity — Knowledge Graph (Internal)

> **Internal document. Do not publish.** This is the master knowledge architecture for the entire PetsInMyCity platform. It is **not code, not a database, and not a sitemap.** It is the conceptual blueprint that defines every knowledge domain PetsInMyCity owns today and every domain it will own in the future.
>
> This document is intended to eventually power: Lucy AI, future RAG systems, vector databases, AI memory, semantic search, internal linking, SEO topic clusters, AEO entity relationships, and content planning. It is the source of truth for *what PetsInMyCity knows*.
>
> Source-of-truth companions: [`docs/brand-bible.md`](./brand-bible.md) governs brand, voice, editorial, SEO/AEO, E-E-A-T, and trust; [`docs/lucy-brain.md`](./lucy-brain.md) governs how Lucy thinks, speaks, and behaves; [`docs/roadmap.md`](./roadmap.md) defines what gets built and when. This Knowledge Graph describes what we *know*; those three describe how we *behave* and what we *build*. Keep all four consistent.
>
> Contains **no secrets, API keys, credentials, internal URLs, environment variables, or implementation details** — knowledge architecture only.

---

## Section 1 — Purpose

This document exists so that everyone and everything building PetsInMyCity — humans and AI agents alike — shares one map of what the platform knows. Pages, tools, and products come and go; knowledge endures. By describing the platform as a graph of knowledge rather than a list of pages, we make Lucy smarter, search more relevant, internal linking more intentional, and future systems (RAG, vector search, memory) straightforward to build on top.

These terms are distinct and must not be conflated:

- **Knowledge** — the durable, structured understanding of a topic (e.g., *"large-breed dogs are prone to joint issues"*). It is independent of any single page and is what powers reasoning.
- **Content** — the human-readable expression of knowledge (an article, guide, or FAQ). Many pieces of content can express the same knowledge.
- **Tools** — interactive utilities that apply knowledge to a user's situation (e.g., the Calorie Calculator). Tools consume knowledge and produce tailored output.
- **Products** — physical goods we may recommend (food, supplements, kits). Products are *supporting* knowledge, never the starting point.
- **Local resources** — real-world places and services (vets, shelters, parks) discovered for a user's actual city.
- **Entities** — the named "things" knowledge is about (a breed, a condition, a nutrient, a city, a business type) and the relationships between them.

> **Principle:** Lucy should think in terms of *knowledge*, not pages. A page is one way to surface knowledge; the knowledge itself is the asset.

---

## Section 2 — Knowledge Domains

The highest-level taxonomy. Every piece of knowledge on the platform belongs to one or more of these domains:

- Dogs
- Cats
- Small Pets
- Birds
- Fish
- Reptiles
- Pet Health
- Nutrition
- Behavior
- Training
- Grooming
- Travel
- Emergency
- Senior Pets
- Puppies
- Kittens
- Pet Adoption
- Pet Safety
- Local Services
- Products
- Technology
- Community

Domains overlap by design (e.g., *Puppies* draws on *Nutrition*, *Behavior*, and *Pet Health*). Those overlaps are captured as entity relationships in Section 7.

---

## Section 3 — Subdomains

Every domain expands into subdomains. Examples below show the pattern; the same expansion applies to every domain.

### Dogs
- Nutrition
- Health
  - Vaccinations
  - Parasite prevention
  - Dental care
- Exercise
- Mental stimulation
- Behavior
- Training
- Puppies
- Senior dogs
- Food
- Treats
- Supplements
- Toys
- Grooming

### Cats
- Nutrition
- Health (vaccinations, dental, parasite prevention)
- Indoor enrichment
- Behavior (litter, scratching, anxiety)
- Kittens
- Senior cats
- Food, treats, supplements
- Litter and supplies

### Pet Health
- Preventive care
- Common conditions
- Symptoms and when to see a vet
- Emergencies (cross-links to the Emergency domain)
- Medications and reminders

### Nutrition
- Feeding guidelines and portioning
- Life-stage diets (puppy/kitten, adult, senior)
- Ingredient literacy
- Treats and supplements
- Toxic foods (cross-links to Food Checker and Pet Safety)

> Every domain follows this parent → child pattern. Subdomains are added through the process in Section 13.

---

## Section 4 — Local Knowledge Graph

Local knowledge is organized by category. Each category is an entity type that maps to real-world results (sourced live, e.g., via Google Places) and relates to domains, tools, and content.

Current categories:

- Veterinarian
- Emergency Vet
- Pet Hospital
- Animal Shelter
- Rescue
- Dog Park
- Pet Store
- Boarding
- Daycare
- Groomer
- Trainer
- Pet-Friendly Hotel
- Dog Beach
- Walking Trail
- Emergency Services
- Lost Pet Resources
- Animal Control

Future categories: pet-friendly restaurants, pet-friendly workplaces, mobile vets, pet sitters, pet photographers, pet-friendly apartments.

**Relationships (examples):**

- `Emergency Vet` → relates to → `Emergency` domain, `Pet Emergency Planner` tool, and "when to call a vet" content.
- `Dog Park` → relates to → `Dogs`, `Exercise`, `Behavior`, and `Travel` (visiting dogs).
- `Animal Shelter` and `Rescue` → relate to → `Pet Adoption` domain and adoption content.
- `Groomer` → relates to → `Grooming` domain and grooming guides.

### Veterinary Care entities (Veterinary Care Engine)

Veterinary care is modeled as a set of **care paths**, not as a single "vet" node. The Veterinary Care Engine (`assets/vet-care-engine.js`) is the source of truth for these entities; Lucy routes to a care path before recommending any provider.

Care path entities:

- `Emergency Veterinary Care` → relates to → `Emergency` domain, `Emergency Vet` local category, and the `Emergency Finder` tool. Highest urgency.
- `Poison Control` → relates to → `Emergency` domain and toxin/ingestion content. Highest urgency.
- `Local Primary Veterinarian` → relates to → `Veterinarian` local category and the `Find a Vet` page. For anything needing a hands-on exam.
- `Veterinary Specialist` → relates to → `Veterinarian` (referral) and condition-specific `Pet Health` content.
- `Online Veterinary Care` → relates to → the `Online Vet Hub` (`/online-vet/`) and is the only care path that may surface a provider entity.
- `Behavioral Support` → relates to → `Training` and `Behavior` domains.

Provider entities (children of `Online Veterinary Care`):

- `Online Vet Provider` is an entity TYPE. Individual providers are instances of it, registered in the provider config. They are children of `Online Veterinary Care` → never the primary veterinary-care entity, and never a substitute for emergency or in-person care.
- `Dutch` → is an instance of → `Online Vet Provider` (one provider among several possible). It relates to → `Online Veterinary Care` only. It is an affiliate entity (see Section 10) and therefore sits at the bottom of the Recommendation Graph: it never determines a care path and is never surfaced in an emergency. Future providers (Vetster, AirVet, BetterVet, Pawp, etc.) are added as sibling instances of `Online Vet Provider`.

Hard relationship rules:

- `Emergency Veterinary Care` and `Poison Control` → NEVER relate to → any `Online Vet Provider`.
- `Online Vet Provider` → relates to → `Online Veterinary Care` ONLY (never to `Local Primary Veterinarian`, `Specialist`, or `Emergency`).

---

## Section 5 — Tool Graph

Every current and future tool, with what it knows and what it connects to.

### Lucy (AI Pet Assistant)
- **Purpose:** Educate first, guide to the right resource, never replace a veterinarian.
- **Knowledge used:** All domains; retrieval follows the priority order in Section 8.
- **Related domains:** All.
- **Related articles:** All educational content.
- **Related local resources:** All local categories.

### Pet Emergency Planner
- **Purpose:** Help owners prepare a plan before an emergency happens.
- **Knowledge used:** Emergency, Pet Safety, Pet Health.
- **Related domains:** Emergency, Senior Pets, Travel.
- **Related articles:** Emergency preparedness, seasonal safety.
- **Related local resources:** Emergency Vet, Pet Hospital, Animal Control.

### Food Checker
- **Purpose:** Quick "is this safe for my pet?" lookups.
- **Knowledge used:** Nutrition, Pet Safety, Pet Health.
- **Related domains:** Dogs, Cats, Nutrition.
- **Related articles:** Toxic foods, safe treats.
- **Related local resources:** Emergency Vet (if ingested).

### Calorie Calculator
- **Purpose:** Feeding-amount guidance based on a pet's profile.
- **Knowledge used:** Nutrition, life-stage diets.
- **Related domains:** Dogs, Cats, Senior Pets, Puppies, Kittens.
- **Related articles:** Feeding guidelines, weight management.
- **Related local resources:** Veterinarian (for tailored advice).

### Future tools
- **Emergency Finder** — locate nearest emergency care fast. Knowledge: Emergency, Local. 
- **Breed Finder** — match lifestyle to breed. Knowledge: Dogs, Cats, Behavior, Adoption.
- **Lost Pet Helper** — step-by-step lost-pet response. Knowledge: Emergency, Local, Pet Safety.
- **Medication Reminder** — adherence support (never dosing advice). Knowledge: Pet Health.
- **Vaccination Tracker** — schedule-aware prompts. Knowledge: Pet Health, Puppies, Kittens.

> Each new tool must declare these five facets — Purpose, Knowledge used, Related domains, Related articles, Related local resources — before it ships (see Section 13).

---

## Section 6 — Content Graph

Educational content is organized as a hierarchy. Knowledge flows parent → child, which doubles as the internal-linking and SEO topic-cluster structure.

```
Dog Health
  └─ Vaccinations
       └─ Puppy Vaccinations
            ├─ Rabies
            ├─ Distemper
            └─ Boosters
```

```
Nutrition
  └─ Toxic Foods
       ├─ Chocolate
       ├─ Grapes & Raisins
       └─ Xylitol
  └─ Life-Stage Diets
       ├─ Puppy / Kitten
       ├─ Adult
       └─ Senior
```

Parent pages are topic hubs; children are spokes. Hubs link down to spokes and spokes link up to hubs, which is exactly the internal-linking model described in the Brand Bible and Roadmap.

---

## Section 7 — Entity Relationships

Knowledge is most powerful as a web of related entities. Lucy should understand these connections, not just isolated facts.

```
Golden Retriever
  └─ is a → Large Breed
       └─ prone to → Joint Health concerns
            ├─ supported by → Glucosamine (supplement)
            ├─ supported by → appropriate Exercise
            └─ relates to → Senior Care
                 └─ includes → Hip Dysplasia (condition)
```

Other example chains:

- `Kitten` → needs → `Vaccinations` → includes → `FVRCP`, `Rabies` → tracked by → `Vaccination Tracker`.
- `Senior Cat` → prone to → `Kidney issues` → relates to → `Nutrition` (renal diets) → discuss with → `Veterinarian`.
- `Summer` → relates to → `Seasonal Safety` → includes → `Heatstroke` → escalates to → `Emergency Vet`.

> Lucy should traverse these relationships to give context-rich, safe guidance — and always defer to a veterinarian for medical decisions.

---

## Section 8 — Lucy Knowledge Sources

When Lucy answers, she should retrieve information in this strict priority order. **Never reverse this order.**

1. **Emergency protocols** — safety always comes first.
2. **PetsInMyCity tools** — Planner, Food Checker, Calculators, etc.
3. **Internal articles** — our own educational content.
4. **Local Google Places results** — real, current local resources.
5. **Educational resources** — trusted external knowledge where appropriate.
6. **Trusted product recommendations** — only after the above, and only when genuinely useful.

This mirrors the behavior defined in `lucy-brain.md`; the two must stay aligned.

---

## Section 9 — Recommendation Graph

Recommendations follow a fixed flow. **Never start with products.**

```
Education
   ↓
Tools
   ↓
Local resources
   ↓
Products
```

A user is first informed, then offered a tool to apply that information, then pointed to local help if relevant, and only then — if it genuinely serves them — shown a product. This is the practical expression of "education before products" from the Brand Bible.

---

## Section 10 — Affiliate Knowledge

Affiliate categories are **supporting knowledge only.** They exist to help fund free access, never to steer guidance. We recommend on usefulness first; commission never decides (see Brand Bible and Roadmap).

- Chewy
- Amazon
- Insurance
- DNA Tests
- Emergency Kits
- Travel
- Subscriptions

> Affiliate entities sit at the *bottom* of the Recommendation Graph (Section 9). They are never a knowledge source for medical, safety, or local truth.

---

## Section 11 — Future AI Memory

*Future functionality.* With explicit user consent and privacy by design, Lucy may one day remember details that make guidance more relevant. None of this is implemented today; it is documented here so the knowledge model is ready for it.

Potential remembered facts:

- Pet names
- Species
- Breed
- Age
- Weight
- Medical history (handled with extra care; never used to diagnose)
- Favorite products
- Favorite veterinarian
- Location
- Conversation history
- Reminder preferences

> This is **future** functionality. Any memory feature must pass the governance test in Section 15 and the privacy and safety standards in the Brand Bible and Lucy Brain before it is built.

---

## Section 12 — Knowledge Boundaries

What Lucy must **never** do, regardless of how the knowledge graph grows:

- **Never diagnose.** Lucy educates and guides; diagnosis belongs to a veterinarian.
- **Never invent businesses.** Local results come from real sources, never fabricated.
- **Never invent product information.** No made-up specs, prices, or claims.
- **Never invent citations.** No fabricated sources or studies.
- **Never fabricate medical advice.** When unsure, say so and point to a vet.
- **Always acknowledge uncertainty.** Honesty over false confidence, every time.

These boundaries are absolute and override any future capability.

---

## Section 13 — Knowledge Expansion Strategy

The knowledge graph is the gate, not an afterthought. Before it ships:

- **Every new article** must be placed in the Content Graph (Section 6) under the correct parent.
- **Every new tool** must declare its five facets in the Tool Graph (Section 5).
- **Every new city** must map its local categories into the Local Knowledge Graph (Section 4).
- **Every new partner** must be classified as supporting affiliate knowledge (Section 10).
- **Every new product category** must be slotted into the Recommendation Graph (Section 9).

> If it isn't in the Knowledge Graph, it isn't ready to build. Adding to the graph first keeps Lucy, search, and linking coherent as the platform grows.

---

## Section 14 — Future Architecture

This document is designed to evolve into real systems **without changing today's implementation.** It is a conceptual layer that future infrastructure can be built against:

- **Semantic search** — domains, subdomains, and entities become the vocabulary for meaning-based search.
- **Knowledge Graph database** — the entities and relationships in Sections 4, 6, and 7 map directly to nodes and edges.
- **Vector database** — content and knowledge chunks can be embedded and indexed against these domains.
- **RAG (retrieval-augmented generation)** — Section 8's source priority defines retrieval order; the graph defines what is retrievable.
- **Memory** — Section 11 defines the personalization schema in advance.
- **Personalization** — entity relationships let Lucy tailor guidance to a specific pet's profile.
- **Multi-agent AI** — specialized agents (emergency, local, nutrition) can each own a slice of the graph.

Today's static site keeps working unchanged; this document simply makes the future buildable.

---

## Section 15 — Knowledge Governance

Every future feature, article, tool, or domain must answer **yes** to these before it is built:

1. Does it expand an existing knowledge domain (or sensibly create a new one)?
2. Does it improve Lucy?
3. Does it improve search?
4. Does it improve trust?
5. Does it improve local usefulness?
6. Does it improve the user experience?

> If the answer is "no," reconsider building it. This complements the Roadmap's Decision Framework — that one asks whether to build; this one asks whether it fits what we *know*.

---

## How to Use This Document

Consult this map **before** creating new content, tools, features, or knowledge domains. Add to the graph first, then build. Keep it aligned with the Brand Bible (how we behave), Lucy Brain (how Lucy behaves), and the Roadmap (what we build and when). Maintained well, this should remain the master map of everything PetsInMyCity knows — and will ever know — for the next 5–10 years.
