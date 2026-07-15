# Austin Verified Knowledge Pilot — structured data

Real, live-sourced knowledge objects for the Sprint 5 Austin pilot. Every admitted fact is
backed by a Tier-1 source recorded in `../SOURCE_REGISTRY.md`, and carries verification status,
confidence, owner, and review/expiration per the machine schema
(`docs/editorial/knowledge-graph/MACHINE_SCHEMA.yaml`).

## Files

| File | Contents |
|------|----------|
| `entities.places.yaml` | Place & Facility entities (state, county, city, 3 named parks) |
| `entities.orgs.yaml` | Org & agency entities (PARD, WPD, NWS EWX, TPWD, AAS, 3 emergency vets) |
| `concepts.hazards.yaml` | CareConcept entities: leash law, heat, flooding, venomous snakes |
| `claims.yaml` | Sourced assertions + time-bound DYNAMIC events (kept separate from entities) |
| `edges.yaml` | Relationship edges wiring the graph together |

## Design rules honored

- **Entities vs claims vs events are separate.** A park is an entity; its managing authority is an
  edge; its off-leash designation is a sourced claim; a Flood Watch is a time-bound event.
- **Evergreen vs dynamic.** Durable climate/hazard patterns are `CareConcept` entities; live NWS
  alerts are `dynamic_event` claims with `valid_from`/`valid_until`/`expires: true` and must never
  be rendered as timeless knowledge.
- **No over-localization.** Venomous-snake knowledge is scoped to Texas; Austin-park localization
  is `needs_verification`, not asserted.
- **Safety-critical honesty.** Emergency-vet availability is verified on each providers OWN site,
  carries a 30-day review window, and AVES address confidence is reduced due to a recent relocation.
- **Empty/unknown is acceptable.** Fields we could not verify from a primary source are omitted or
  marked `needs_verification` rather than filled from memory.

## Stable identifiers

Path-style IDs (`place/tx/austin/red-bud-isle`, `org/emergency-vet/tx/austin/veg-south-lamar`)
survive wording changes and match the Sprint 4 seed conventions in `../graph/`.
