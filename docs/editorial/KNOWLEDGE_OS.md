# The PetsInMyCity Knowledge Operating System

> **Status:** Authoritative operating specification for how knowledge is modeled, verified, stored, and reused across the platform.
> **Extends (does not replace):** `../knowledge-graph.md` — the conceptual entity map. This document operationalizes it by adding lifecycle, confidence, provenance, ownership, and cadence.
> **Part of:** The Editorial Operating System (`EDITORIAL_OS.md`, Section 8).
> **Principle:** Articles are outputs. **Knowledge is the asset.** Every surface is a view onto one graph.

---

## 1. Why a Knowledge OS

PetsInMyCity is a knowledge company, not a publisher of pages. If knowledge lives inside articles, it dies when the article goes stale and must be re-researched for every new surface. If knowledge lives in a **graph** — with provenance, verification, and ownership — it is verified once and reused everywhere, corrected once and fixed everywhere. This document defines that graph as an operating system.

The existing `knowledge-graph.md` already maps the *concepts* (domains, ~17 local categories, tool graph, relationships). The Knowledge OS adds the *operational layer* that makes those concepts a durable, auditable asset.

---

## 2. Entity model

Five entity families. Each instance is a node with attributes (Section 4).

1. **Place** — the geographic containment tree:
   `Country → State → Region → County → Metro → City → Town → Neighborhood → ZIP`, plus named natural places: `Park`, `Beach`, `Trail`, `DogPark`, `Campground`.
2. **CareConcept** — `Species`, `Breed`, `LifeStage`, `Condition`, `Behavior`, `Hazard`, `Season`.
3. **Business** — the live local categories (Veterinarian, Emergency Vet, Pet Hospital, Shelter, Rescue, Dog Park operator, Pet Store, Boarding, Daycare, Groomer, Trainer, Pet-Friendly Hotel, Mobile Vet, Sitter, Photographer, etc.), sourced live (e.g., Google Places).
4. **Experience** — `Tool` and `LucyJourney` (planners, finders, checklists).
5. **OwnerPet** — the private My Pets layer (owner + pet + history). Private; never exposed as public knowledge.

---

## 3. Relationships

Edges are typed and directional. Core edge types:
- **containment** (Place → Place): state contains metro contains city contains neighborhood.
- **proximity** (Place ↔ Place): computed from coordinates (nearest cities, parks, beaches, trails).
- **care-association** (CareConcept ↔ CareConcept ↔ Place): e.g., `Hazard:rattlesnake × Season:spring × Place:Phoenix`; `Breed:Great Dane × Place:Austin`.
- **serves** (Business → Place, Business → Category).
- **relates-to** (Experience ↔ CareConcept / Place): a heat planner relates to `Hazard:heat` and hot-climate places.
- **conversion** (any public page → `LucyJourney`, any public page → My Pets): the two edges every public page must express.

Intersection edges (care-association) are the source of non-duplicative uniqueness: a `Breed × Place` join is genuinely different per place, which is what defeats doorway-content patterns.

---

## 4. Attributes on every fact

No fact enters the graph without provenance. Each fact node/edge carries:

| Attribute | Meaning |
|---|---|
| `value` | the fact itself |
| `source` | reference to the source (tier + citation), per `RESEARCH_WORKFLOW.md` |
| `verification_status` | one of the statuses in `PUBLISH_GATE.md` |
| `confidence` | High / Medium / Low |
| `verified_on` | date last verified |
| `review_by` | next-review date (drives staleness) |
| `update_frequency` | expected volatility (static / seasonal / live) |
| `owner` | the person or role accountable for this fact |
| `provenance_note` | how it was established; conflicts noted |

A fact without `source` and `verification_status` is **not admitted** to the graph.

---

## 5. Verification lifecycle

```
Discovered (from research)
   → Needs further reporting
      → Verified / Multi-source verified / Officially confirmed / Observed pattern
         → Published (served to surfaces)
            → review_by reached → Outdated → re-report → back to Verified
      → Rejected (recorded, not re-litigated)
   → Community pattern (Tier 4 lead) → held; never served as fact until verified
```

Only facts at **Verified / Multi-source verified / Officially confirmed / Observed pattern** (or clearly-labeled **Expert opinion**) are served to any public surface. **Community pattern** facts are stored but flagged and never served as fact.

---

## 6. Confidence scoring

- **High:** Tier 1–2, current, corroborated.
- **Medium:** Tier 3 corroborated, or Tier 1–2 slightly dated.
- **Low:** single Tier 3 or thin observed pattern.

Confidence is independent of status (a *Verified* fact can be *Medium* if its only authoritative source is aging). Surfaces may use confidence to decide how prominently to present a fact and whether Lucy hedges.

---

## 7. Ownership

Every fact, entity, and page has a named **owner** (person or role) accountable for its accuracy and its review. Ownership is what makes maintenance real rather than aspirational: staleness reports are routed to owners, and corrections are their responsibility. Unowned facts are not published.

---

## 8. Update lifecycle & propagation

Facts carry `review_by` and `update_frequency`. The system surfaces facts approaching or past review. When a fact changes:
1. It is corrected **once** in the graph.
2. The change **propagates automatically** to every surface rendering it — articles, Lucy, search, recommendations, maps, tools.
3. If it becomes **Outdated** and cannot be re-verified, the flag propagates too, so no surface silently serves a stale fact.

Immediate-review triggers (closures, law changes, disasters, recalls, new veterinary guidance) override the calendar — see `PUBLISH_GATE.md`.

---

## 9. How knowledge flows into each surface

- **Articles / location pages:** rendered as views over the graph; a section renders only if its facts clear the publish gate (uniqueness/quality threshold). Prevents doorway pages by construction.
- **Lucy:** reads verified facts scoped to the user's pet + place; never serves Community-pattern facts as truth; operates under `AI_EDITOR_GUIDELINES.md`.
- **Search:** surfaces only facts/entities at or above required verification status.
- **Recommendations:** rank using confidence and relationships, with commercial firewall (`EDITORIAL_OS.md`, Section 17) — payment never reorders editorial recommendations.
- **Maps:** render Place and Business entities with their coordinates and verified attributes.
- **My Pets:** the private layer; public pages link inward via conversion edges. My Pets data never flows outward into public knowledge.
- **Tools:** consume relevant CareConcept and Place facts (e.g., heat thresholds by climate).
- **Future APIs / mobile / EMG platforms:** consume the same graph. The Knowledge OS is deliberately **surface-agnostic** so new products inherit verified knowledge without re-research.

---

## 10. Relationship to the dossier

The **research dossier** (`dossiers/README.md`) is where facts are born and verified; the **Knowledge OS** is where verified facts live and are reused. Dossier → (verification) → graph → (rendering) → surfaces. The dossier is the private workshop; the graph is the durable asset; the article is the most public view.

---

## 11. Governance

- No fact is admitted without source + verification status.
- No fact is served publicly below the required status.
- Every fact has an owner and a review date.
- Corrections propagate everywhere; nothing is fixed in one place only.
- The entity model extends `../knowledge-graph.md`; changes to the model are versioned decisions by editorial + product leadership.
