# Relationship Catalog (Edges)

Entities become a **graph** through typed edges. Each edge has a direction, a
cardinality, and — critically — may itself be an **assertion** carrying the full
envelope from [`SCHEMA_CONVENTIONS.md`](SCHEMA_CONVENTIONS.md). A relationship like
"this trail `is_dangerous_during` flash-flood season" is a *fact* that must be
sourced and verified, not just a link.

## Edge notation

`(Subject) —EDGE→ (Object)  [cardinality] [fact? Y/N] [safety?]`

- **fact? Y** means the edge carries confidence/verification/sources and can gate
  a surface. **fact? N** means it's pure structure (navigation/containment).
- **safety?** means the edge is safety-critical (Tier 1–2 sources, safety floor).

---

## 1. Structural edges (the spine) — fact? N

| Edge | Cardinality | Notes |
|------|-------------|-------|
| `contains` / `within` | 1‑to‑many | The containment tree. Country→State→…→ZIP; City→Neighborhood; Place→Facility. Inverse pair. |
| `part_of_metro` | many‑to‑1 | Cities/counties → Metro. A city may map to one primary metro. |
| `located_in` | many‑to‑1 | Facility/Org → its City (and, when known, Neighborhood). |
| `overlaps` | many‑to‑many | ZIP ↔ Neighborhood (non-clean boundaries). Weighted. |
| `administers` | 1‑to‑many | City → its animal-services Org.Shelter. |

Structural edges are cheap and always present. They never gate safety; they power
navigation, breadcrumbs, and "nearby" queries.

---

## 2. Care & hazard edges — fact? Y, mostly safety 🔒

| Edge | S → O | Card. | Safety | Meaning |
|------|-------|-------|--------|---------|
| `has_climate` | Place → CareConcept.Climate | many‑to‑1 | 🔒 | Attaches NOAA-backed climate facts to a place. |
| `experiences` | Place → CareConcept.WeatherPattern/Season | m‑to‑m | 🔒 | e.g. Austin `experiences` flash-flood season. |
| `has_hazard` | Place/Facility → CareConcept.Hazard | m‑to‑m | 🔒 | The load-bearing safety edge. Requires severity+action. |
| `hosts_wildlife` | Place/Facility → CareConcept.Wildlife | m‑to‑m | 🔒 | Venomous/active-season facts; links to first_response. |
| `dangerous_during` | Facility → CareConcept.Season/WeatherPattern | m‑to‑m | 🔒 | e.g. a low-water trail unsafe in flash-flood months. |
| `governed_by` | Place → CareConcept.Law/Regulation | m‑to‑m | 🔒 | Leash/breed/licensing law with citation. |
| `restricts_breed` | Place/Facility/Org → CareConcept.Breed | m‑to‑m | 🔒 | BSL, HOA/apartment restrictions. Legally sensitive. |
| `recommended_response` | CareConcept.Hazard/Wildlife → Org.EmergencyVet | m‑to‑m | 🔒 | Connects a danger to where to go. |

> These edges are the reason the graph exists. A page's **safety floor** is
> satisfied by resolving these edges to `verified` Tier 1–2 assertions before any
> heat/flood/venom/toxicity content renders.

---

## 3. Suitability & service edges — fact? Y

| Edge | S → O | Card. | Meaning |
|------|-------|-------|---------|
| `suitable_for` | Facility/Activity → CareConcept.Breed/Species | m‑to‑m | Size/energy/climate fit. |
| `allows` / `prohibits` | Facility/Org → Activity (off-leash, swimming…) | m‑to‑m | Policy facts; operator- or ordinance-sourced. |
| `provides_service` | Org → Activity/service | m‑to‑m | Vet specialties, grooming, boarding. |
| `treats` | Org.Veterinarian → CareConcept.Species | m‑to‑m | Species/exotics coverage. |
| `refers_emergency_to` | Org.Veterinarian → Org.EmergencyVet | m‑to‑1 | Day-vet → after-hours pathway. |
| `adopts_out` | Org.Shelter/Rescue → CareConcept.Species/Breed | m‑to‑m | Adoption focus. |

---

## 4. Signal edges — fact? Y, strict provenance

| Edge | S → O | Rule |
|------|-------|------|
| `recommends` | Signal.Recommendation → any entity | Only `derived_from` verified assertions; carries `for_profile`. |
| `references_review` | Signal.Review → Org/Facility | Aggregate only; never a fact source; never reproduced verbatim. |
| `insight_about` | Signal.CommunityInsight → any entity | **Lead only.** Cannot gate a surface; must be re-verified as a real assertion elsewhere before display. |
| `costs_at` | Signal.Cost → Place/Org/Facility | Dated amount ranges; method disclosed. |
| `event_at` | Signal.Event → Facility/Place | Expiring; `event` cadence. |

---

## 5. Cross-place edges — fact? Y

| Edge | Meaning |
|------|---------|
| `nearest` | Facility → Facility of a type (e.g. neighborhood → nearest EmergencyVet). Computed, but the underlying distances are facts. |
| `serves_area` | Org.Rescue/EmergencyVet → Place(s) | Coverage/catchment. |
| `comparable_to` | Place → Place | For "similar cities" recommendations; derived, non-safety. |

---

## Edge integrity rules

1. **No orphan facts.** Every fact-bearing edge must resolve to two existing
   entities; dangling edges are invalid.
2. **Safety edges publish last.** A place is not "publish-ready" until its
   `has_hazard`, `hosts_wildlife`, `experiences`, and `governed_by` edges are
   `verified` or explicitly marked "no known hazard, verified".
3. **Community edges never gate.** `insight_about` can *suggest* an edge to
   investigate, but the investigated edge is what publishes.
4. **Inverse consistency.** `contains`/`within` and `allows`/`prohibits` must not
   both assert contradictory states without a `disputed` flag.
5. **Provenance travels.** When an edge is `derived_from` other assertions, its
   confidence is capped by the weakest input (see envelope §1).

The machine-readable edge list lives in
[`MACHINE_SCHEMA.yaml`](MACHINE_SCHEMA.yaml); rendering rules are in
[`SURFACES.md`](SURFACES.md).
