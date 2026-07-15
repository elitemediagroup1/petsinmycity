# Austin — Knowledge Graph Instance

This folder is the **first real instance** of the schema defined in
[`../../../docs/editorial/knowledge-graph/`](../../../docs/editorial/knowledge-graph/).
It turns the abstract model into concrete Austin knowledge objects.

> **Important:** This is the *data workspace*, not the public page. Per the Sprint 4
> brief and the Phase 4 constraints, **we are not writing or rewriting the public
> Austin article.** We are building Austin's knowledge graph. The article is
> assembled later, only after objects clear the publish gate.

## The idea, applied to Austin

```
place/tx/austin
  contains → Neighborhoods → Parks → Dog Parks
  contains → Veterinarians → Emergency Vets → Shelters → Rescues
  has_hazard → Heat / Flash-flood / Blue-green algae / Venomous snakes
  experiences → Central Texas summer / flash-flood season
  governed_by → Austin leash & licensing ordinances
  hosts_wildlife → Coral snake, copperhead, rattlesnake (active seasons)
  contains → Dog-friendly restaurants → Events → Trails → Lakes → Campgrounds
```

Each of those becomes its own research project — its own set of verified
assertions. Austin eventually becomes **2,000+ verified knowledge objects**, at
which point the city page is *assembled*, not written.

## Files

- [`austin.entities.yaml`](austin.entities.yaml) — seed entity set. Every object
  carries the full envelope. Most are seeded at `unverified`/`researching` on
  purpose — this file shows the *shape* and the honest starting state, not
  fabricated "verified" facts.
- [`austin.relationships.yaml`](austin.relationships.yaml) — the edges that wire
  those entities into Austin's graph (containment + care/hazard + service).
- [`POPULATION_PLAN.md`](POPULATION_PLAN.md) — how we get from this seed to
  2,000+ verified objects, in what order, with the safety floor first.

## How this connects to the rest of the Austin workspace

- [`../VERIFICATION_TRACKER.md`](../VERIFICATION_TRACKER.md) — the per-claim status
  ledger. Every assertion here should have a matching tracker row.
- [`../DOSSIER.md`](../DOSSIER.md) — narrative research intake.
- [`../MISSING_INFORMATION.md`](../MISSING_INFORMATION.md) — known gaps become
  `unverified` objects here.
- [`../EXPERT_SOURCES.md`](../EXPERT_SOURCES.md) — Tier 1–2 sources these objects
  must cite.

## Honesty rule for this instance

No object in this folder is marked `verified` unless a real Tier 1–2 source is
recorded for it. Because live reporting is a later sprint, most objects here are
intentionally `unverified` or `researching`. **We show the real state of our
knowledge, not a mock-up of a finished city.** That honesty is the product.
