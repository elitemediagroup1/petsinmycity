# Austin Pilot — Schema Validation Findings & ADRs

Real reporting exposed concrete gaps between the Sprint 4 machine schema
(`docs/editorial/knowledge-graph/MACHINE_SCHEMA.yaml`) / Editorial OS and the shape of live
Austin data. Per the sprint rules, gaps are recorded here with the **smallest durable fix**, and
material changes get an ADR (extends the Sprint 4 `DECISIONS.md`, ADR-0001..0006).

Schema changes are PROPOSED here (not yet applied to MACHINE_SCHEMA.yaml) so the pilot data and
the schema can be reconciled in one reviewed step. Nothing here weakens verification standards.

## Findings (evidence-driven)

| # | Finding | Evidence from pilot | Proposed smallest fix |
|---|---------|---------------------|-----------------------|
| F1 | No entity type for government agencies | PARD, Watershed Protection, NWS EWX, TPWD are all first-class actors but `Org.*` only lists care businesses | Add `Org.GovAgency` (ADR-0007) |
| F2 | Claims not separable from entities | A parks off-leash status is a *sourced claim* with its own lifecycle, distinct from the park entity | Introduce first-class `claim` object (ADR-0008) |
| F3 | No evergreen-vs-dynamic distinction | NWS Flood Watch (2026-07-14→16) must expire; a climate pattern must not | Add `kind: dynamic_event` + `valid_from/valid_until/expires` (ADR-0009) |
| F4 | `review_cadence` lacked short units | Emergency-vet hours need ~30-day review, not annual/quarterly | Allow duration form `30d` alongside enum (ADR-0010) |
| F5 | Envelope lacked a typed `attributes` map | Park address/zip/park_type, vet phone/hours need a home without polluting the envelope | Add optional `attributes` sub-map per entity (ADR-0011) |
| F6 | Off-leash designation not a schema field | PARD stores off-leash areas only in a binary PDF/GIS overlay; per-park status is a claim, not an entity attribute | Model as `off_leash_designation` claim (uses F2) |
| F7 | Safety-floor sourcing needs provider-official kind | Emergency status must come from provider site, not directory | Add source `kind: provider-official` as a recognized T1 kind (ADR-0012) |

## ADRs

### ADR-0007 — Add `Org.GovAgency` entity subtype
- **Problem:** Governing/managing authorities (PARD, WPD, NWS, TPWD, counties) are central to the
  pilot but have no home in the `organization` type list (which is care-business only).
- **Alternatives:** (a) shoehorn into `Org.Shelter`/misc — wrong semantics; (b) make them `place` —
  they are actors, not places; (c) new subtype.
- **Decision:** Add `Org.GovAgency`. Carries envelope + `role`, `url`, optional `jurisdiction`.
- **Consequences:** Enables `governs`/`manages`/`issues_alerts_for` edges to a typed node.
- **Migration:** Additive; no existing records change.

### ADR-0008 — First-class `claim` object (separate from entities & edges)
- **Problem:** A fact like "Red Bud Isle is off-leash" has its own source, confidence, and
  lifecycle independent of the park entity; burying it as an entity field loses provenance.
- **Decision:** Introduce `claim {id, subject, predicate, value, confidence, verification,
  safety_critical, sources, [valid_from/valid_until]}`. Entities hold identity; claims hold
  assertions; edges hold typed relationships.
- **Consequences:** Cleaner provenance, per-claim review, and safe partial-verification (an entity
  can be verified while one of its claims stays `needs_verification`).
- **Migration:** Additive new file/type; Sprint 4 seed entities remain valid.

### ADR-0009 — Model dynamic events distinctly from evergreen knowledge
- **Problem:** Live NWS watches/warnings are time-bound and must never render as timeless facts;
  the schema had no way to say "this expires."
- **Decision:** Add `kind: dynamic_event` plus `valid_from`, `valid_until`, `expires: true` to the
  claim shape. Surfaces MUST suppress expired dynamic events. Durable patterns stay `CareConcept`.
- **Consequences:** Weather/closures/outbreaks can be ingested from official feeds without
  corrupting evergreen knowledge; auto-expiry is a rendering contract.
- **Migration:** Additive.

### ADR-0010 — Short-window review cadences
- **Problem:** Safety-critical, fast-changing facts (ER hours) need review windows far shorter
  than annual/quarterly.
- **Decision:** Permit ISO-ish duration strings (`30d`, `7d`) for `review_cadence`/`next_review`
  alongside the existing enum.
- **Consequences:** Emergency-vet records carry `review_cadence: 30d`, `next_review: 2026-08-14`.
- **Migration:** Additive; enum values still valid.

### ADR-0011 — Optional typed `attributes` sub-map
- **Problem:** Type-specific fields (park address/zip; vet phone/hours/species) had no defined
  place in the envelope.
- **Decision:** Add optional `attributes:` map per entity for type-specific fields; envelope stays
  minimal and universal.
- **Migration:** Additive.

### ADR-0012 — Recognize `provider-official` as a Tier-1 source kind
- **Problem:** Safety-floor claims (ER availability) must be sourced from the providers OWN site,
  which is authoritative for its own hours/status but is not "gov."
- **Decision:** Add source `kind: provider-official` (Tier 1 **for first-party facts about that
  provider only** — hours, phone, status). Directories/aggregators remain leads-only.
- **Consequences:** VEG/MedVet/AVES emergency claims verify at T1 without misclassifying them as gov.
- **Migration:** Additive to the source `kind` vocabulary.
