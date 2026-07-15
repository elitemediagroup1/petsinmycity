# Schema Conventions — The Knowledge Envelope

Every entity and every individual fact ("assertion") in the PetsInMyCity graph
carries the same **envelope** of metadata. The envelope is what makes the graph
trustworthy, auditable, and safe to assemble pages from. The rules referenced
here (confidence bands, verification states, ownership) are defined in
[`../KNOWLEDGE_OS.md`](../KNOWLEDGE_OS.md); this file defines their concrete shape.

## 1. Two levels: entities and assertions

- **Entity** — a node (e.g. a specific park, a city, a veterinarian). Has stable
  identity and a set of attributes.
- **Assertion** — a single verifiable fact, attached either to an entity
  attribute or to a relationship (e.g. "Zilker Park allows off-leash dogs in the
  designated area"). Assertions carry their own confidence and verification.

An entity's overall confidence is never higher than the lowest-confidence
assertion a surface depends on. Confidence is not averaged; the weakest load-
bearing fact governs.

## 2. Identity fields (every entity)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Stable slug-based id, e.g. `place/tx/austin/zilker-park`. Never reused. |
| `type` | enum | One of the entity types in [`ENTITIES.md`](ENTITIES.md). |
| `name` | string | Canonical display name. |
| `aliases` | string[] | Other names locals use (feeds search + Lucy). |
| `parent` | id | Primary containment parent (e.g. a park's city). |
| `geo` | object | `{lat, lng, precision}` where precision ∈ centroid/rooftop/approx. |
| `status` | enum | `active` / `seasonal` / `closed` / `unverified-existence`. |

## 3. The envelope (every entity AND every assertion)

| Field | Type | Purpose |
|-------|------|---------|
| `confidence` | int 0–100 | Score per [`KNOWLEDGE_OS.md` §6](../KNOWLEDGE_OS.md). |
| `verification` | enum | `unverified` / `researching` / `verified` / `disputed` / `stale`. |
| `safety_critical` | bool | If true, the safety floor applies (Tier 1–2 sources only). |
| `owner` | string | Accountable editor/role. Never blank for published objects. |
| `last_reviewed` | date | ISO 8601. When a human last confirmed this was still true. |
| `review_cadence` | enum | `realtime` / `weekly` / `monthly` / `quarterly` / `annual` / `event`. |
| `next_review` | date | Derived from `last_reviewed` + `review_cadence`. |
| `sources` | source[] | Source history — see §4. Never empty for `verified`. |
| `derived_from` | id[] | If assembled/computed, the assertions it depends on. |

## 4. Source history (`sources`)

Each source entry is append-only. We never overwrite a source; a correction adds
a new entry and flips `verification`.

| Field | Type | Notes |
|-------|------|-------|
| `tier` | 1–4 | Source reliability tier per the Source Reliability Framework. |
| `kind` | enum | `gov` / `agency` / `publication` / `primary-doc` / `operator` / `community-lead`. |
| `url` | string | Or citation for offline/primary sources. |
| `accessed` | date | When we pulled it. |
| `quote` | string | Short supporting excerpt (respect copyright; keep minimal). |
| `captured_by` | string | Who recorded it. |

**Tier 4 (community) sources may appear in `sources` only as `community-lead` and
can NEVER raise an assertion to `verified`.** They exist to point reporters at
something to confirm elsewhere.

## 5. Verification state machine

```
unverified → researching → verified
                 │            │
                 │            ├─ (contradiction found) → disputed → researching
                 │            └─ (next_review passed)   → stale    → researching
                 └─ (cannot confirm) → unverified (logged in MISSING_INFORMATION)
```

- `verified` requires: confidence ≥ band threshold, ≥1 Tier 1–2 source for
  `safety_critical`, an `owner`, and a future `next_review`.
- `disputed` blocks a fact from all surfaces until resolved.
- `stale` still displays on non-safety surfaces but is flagged for re-review;
  safety-critical stale facts are withheld.

## 6. Confidence bands (summary)

| Band | Meaning | Publish behavior |
|------|---------|------------------|
| 90–100 | Multiple authoritative sources agree | Usable everywhere, incl. auto-assembly |
| 75–89 | One authoritative source, uncontradicted | Usable; editor sign-off for safety |
| 50–74 | Suggestive but thin | Internal only; drives research, not pages |
| < 50 | Rumor / single Tier-4 lead | Lead only; never surfaced |

## 7. Naming & ids

- Ids are lowercase, slash-scoped, and mirror containment:
  `place/<state>/<city>/<slug>`, `org/vet/<state>/<city>/<slug>`,
  `concept/hazard/<slug>`.
- Ids are permanent. Renames change `name`, never `id`. Merges leave a
  `redirect` stub so old references resolve.

## 8. Why this shape

This envelope is what lets a city page be **assembled, not written**: a surface
queries for objects at a place, filters by `verification == verified` and
`confidence ≥ threshold`, honors `safety_critical`, and renders. See
[`SURFACES.md`](SURFACES.md). The machine-readable form is in
[`MACHINE_SCHEMA.yaml`](MACHINE_SCHEMA.yaml).
