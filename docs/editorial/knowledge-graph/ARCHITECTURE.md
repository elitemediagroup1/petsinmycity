# Knowledge Graph Architecture

> **Layer:** Schema (knowledge-graph) — the map that ties the four layers together.
> **Reads with:** policy in [`../KNOWLEDGE_OS.md`](../KNOWLEDGE_OS.md), envelope in
> [`SCHEMA_CONVENTIONS.md`](SCHEMA_CONVENTIONS.md), types in [`ENTITIES.md`](ENTITIES.md),
> edges in [`RELATIONSHIPS.md`](RELATIONSHIPS.md), lifecycle in [`LIFECYCLE.md`](LIFECYCLE.md),
> consumers in [`SURFACES.md`](SURFACES.md), machine truth in [`MACHINE_SCHEMA.yaml`](MACHINE_SCHEMA.yaml).
> **Purpose:** the one place a new engineer, editor, or AI reads to understand *how the
> whole thing fits and scales for a decade* — without re-reading six files.

This document does not redefine entities, edges, or policy. It is the **system
architecture**: the layers, the data flow into each surface, the scaling model, and the
integration seams with the Editorial OS and the existing product.

---

## 1. The one idea

> **Knowledge is the product. Every user-facing thing is a view over the graph.**

Today PetsInMyCity ships *articles*. Tomorrow it ships *knowledge*, and an article is just
one rendering of it. Lucy, Search, Recommendations, Maps, My Pets, the future API, future
mobile apps, and future EMG (Elite Media Group) properties all read the **same verified
objects**. Verify a fact once → every surface improves. Correct it once → every surface is
fixed. Retire it once → no surface serves it.

This is the moat: not "pages about cities," but a **verified, provenance-carrying graph of
local pet intelligence** that is expensive to copy and cheap to reuse.

---

## 2. The four layers

```
  POLICY    KNOWLEDGE_OS.md          WHY the graph exists + governance
               |                     (confidence, verification, ownership, propagation)
               v
  SCHEMA    knowledge-graph/         WHAT the graph is
            - SCHEMA_CONVENTIONS.md  the envelope every object/fact carries
            - ENTITIES.md            the 5 entity families + fields
            - RELATIONSHIPS.md       the typed edge catalog
            - LIFECYCLE.md           the verification state machine
            - ARCHITECTURE.md        (this file) how it all fits + scales
            - SURFACES.md            how each surface queries the graph
            - MACHINE_SCHEMA.yaml    machine source of truth
               |
               v
  INTAKE    dossiers/                HOW facts are researched before entry
               |                     (templates -> sourced, tiered assertions)
               v
  DATA      research/<city>/graph/   POPULATED instances of the schema
               |                     (e.g. austin.entities.yaml + austin.skeleton.yaml)
               v
  SURFACES  articles . Lucy . My Pets . search . recommendations . maps . APIs . EMG
```

Each arrow is one-directional trust: policy constrains schema, schema shapes intake, intake
produces data, data is queried by surfaces. Nothing downstream can weaken an upstream rule
(a surface cannot lower the safety floor; data cannot invent a state the schema doesn't define).

---

## 3. Data flow — request to render

A surface never "reads an article." It **assembles a view**:

```
User asks: "Is Zilker Park good for my Frenchie in July?"
   |
   v
1. RESOLVE   place = place/tx/austin ; facility = .../zilker-park ; breed = concept/breed/french-bulldog
   |
   v
2. QUERY     objects + edges at/near those ids: facility attrs, has_hazard->heat,
             experiences->flash-flood-season, governed_by->leash law, suitable_for(breed),
             nearest->emergency-vet
   |
   v
3. GATE      keep fact IF verification == verified
                        AND confidence >= surface.threshold
                        AND (not safety_critical OR max_source_tier <= 2)
   |
   v
4. RENDER    surface-specific shape:
             article -> prose section ; Lucy -> caveated answer + "I don't know" for gaps ;
             map -> labeled pin ; API -> object + envelope (confidence/verification/sources)
   |
   v
5. RECORD    unknowns become research tasks; stale facts flagged for re-review
```

Step 5 is what makes the system *compounding*: every query that hits a gap generates a
prioritized research task, so usage drives the graph toward completeness.

---

## 4. How each surface consumes the graph

Thresholds live in `MACHINE_SCHEMA.yaml` `surfaces:`; the safety floor (Tier 1-2 sources for
any `safety_critical` fact) applies to **every** surface.

| Surface | Reads | Threshold | Special rule |
|---|---|---|---|
| **Articles** | all objects at a place; a section renders only if its facts clear the gate | 90 | Assembled, not written -> structurally cannot become a doorway page |
| **Lucy** | verified facts scoped to pet + place | 90 | Says "I don't know" on gaps; never serves community leads as truth |
| **My Pets** | facts filtered to the pet's breed/lifestage/place | 85 | Private + caveated, so slightly lower bar; safety floor still full |
| **Search** | entities incl. lower-confidence (findability) | 75 | Displayed facts still respect render thresholds + show verification state |
| **Recommendations** | only Signal.Recommendation whose derived_from are all verified | 90 | Never recommends beyond the evidence |
| **Maps** | geo + located_in + nearest | 80 | Emergency-vet 24/7 only labeled if verified + monthly-reviewed |
| **APIs** (future) | objects **with envelope** (confidence/verification/sources) | 90 | Turns the graph into licensable infrastructure |
| **EMG platforms** (future) | scoped slices of the graph per property/vertical | inherits | Same objects, different front-ends; see section 6 |

The unifying invariant: **no surface invents facts.** Improve the graph once and every
surface improves at once.

---

## 5. Scaling model — built for a decade

Targets: **10,000 cities . 100,000 places . millions of verified objects . millions of
users/pets . future AI employees . future APIs/products.**

**Identity that scales.** Ids are containment-scoped slugs (`place/<state>/<city>/<slug>`,
`org/vet/<state>/<city>/<slug>`, `concept/hazard/<slug>`). They are permanent; renames change
`name` only; merges leave a redirect stub. This lets the graph shard by `place` prefix and
lets any object be addressed globally without a central sequence.

**Concepts are national; instances are local.** A breed, hazard, law-topic, or climate
pattern is defined **once** (`concept/*`) and *associated* to many places via edges. The
city-specific value lives on the **edge** (a Breed x Place join), not in duplicated prose.
This defeats programmatic-doorway patterns while still producing millions of genuinely
distinct city x topic views.

**Work is decomposed into ownable tasks.** Every object is a small research task with an
owner, a source, a verification state, and a review cadence (see `LIFECYCLE.md`). Ten
thousand cities is ten thousand parallelizable backlogs, not one monolith — and the safety
floor sequences the work (heat/flood/venom/vet first) so a half-built city is still safe.

**Freshness scales by cadence, not by re-writing.** Static facts rarely re-review; volatile
facts (hours, 24/7 status, events, prices) carry short cadences and decay first. The system
pushes due objects to `needs_review` automatically — the graph maintains itself instead of
rotting inside articles.

**Storage-agnostic on purpose.** The schema is an envelope + typed nodes/edges
(`MACHINE_SCHEMA.yaml`). It maps cleanly onto a property graph (Neo4j-style), a relational
store with a node/edge/assertion schema, or a document store with an edge collection. We
commit to the *model*, not a vendor, so the decade-scale storage decision can be made against
real volume later without reworking the knowledge itself.

---

## 6. Integration seams

**With the Editorial Operating System.** The Knowledge OS is the *data* half of the same
system whose *process* half is the Editorial OS. The seam is exact:

- `RESEARCH_WORKFLOW.md` source tiers (1-4) -> `sources[].tier` on every assertion.
- `PUBLISH_GATE.md` verification statuses + triggers -> `LIFECYCLE.md` states + triggers.
- `EDITOR_CHECKLIST.md` -> the human enforcement of the render gate.
- `AI_EDITOR_GUIDELINES.md` + `../lucy-brain.md` -> Lucy's read rules in section 4.
- `dossiers/` templates -> the intake that produces schema-shaped objects.

Editorial defines *how a fact earns its state*; the graph *stores the fact with that state*;
surfaces *render only what the state permits*. One pipeline.

**With the existing product architecture.** `../../platform-architecture.md` and
`../../roadmap.md` describe the site, Lucy, My Pets, and the programmatic-city-page strategy.
This graph is the **backend of record** those features read from: the "programmatic city
pages, done well" intent in the roadmap is realized as graph-assembled articles (section 4),
and `../../my-pets-mvp-plan.md`'s per-pet guidance is a graph query filtered by the pet's profile.

**With future AI employees.** Because every fact carries provenance and a state, an AI worker
can be scoped to *safe operations*: propose objects in `researching`, attach candidate
sources, flag `disputed`/`needs_review` — but never move a safety-critical fact to `verified`
without the Tier 1-2 floor and a human owner. The envelope is the guardrail.

---

## 7. What this is not

- Not a CMS. Articles are outputs; the graph is the record.
- Not an SEO scheme. Rankings are a byproduct of being the most trusted source.
- Not vendor lock-in. The model is portable; storage is a later, reversible choice.
- Not a rewrite of Sprint 3. It is the connective tissue plus the two pieces the seed left
  open: a full lifecycle and a complete Austin category skeleton.
