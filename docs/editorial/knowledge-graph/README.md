# Knowledge Graph — Schema Layer

This folder is the **data model** for PetsInMyCity. It is the concrete,
implementable specification that turns the policy in
[`../KNOWLEDGE_OS.md`](../KNOWLEDGE_OS.md) into schemas that machines and editors
can both use.

## How this fits the system

```
KNOWLEDGE_OS.md        → WHY the graph exists + governance (policy layer)
knowledge-graph/       → WHAT the graph is: entities, edges, fields (schema layer)
dossiers/              → HOW facts are researched before entry (intake layer)
research/<city>/graph/ → Populated instances of the schema (data layer)
```

Nothing here duplicates the Knowledge OS. The Knowledge OS defines the rules
(confidence bands, verification states, ownership, propagation). This layer
defines the **shapes** those rules apply to.

## Files

- [`SCHEMA_CONVENTIONS.md`](SCHEMA_CONVENTIONS.md) — the universal envelope every
  entity and every fact carries: identity, provenance, confidence, verification,
  owner, review cadence, and source history.
- [`ENTITIES.md`](ENTITIES.md) — every entity type, its purpose, its fields, and
  which fields are safety-critical.
- [`RELATIONSHIPS.md`](RELATIONSHIPS.md) — the edge catalog: how entities connect,
  direction, cardinality, and whether an edge itself carries verified facts.
- [`MACHINE_SCHEMA.yaml`](MACHINE_SCHEMA.yaml) — the machine-readable source of
  truth for entities, edges, and the envelope. Human docs above are generated
  from and must agree with this file.
- [`SURFACES.md`](SURFACES.md) — how the graph powers articles, Lucy, My Pets,
  search, recommendations, maps, and future APIs, and the confidence gate each
  surface enforces.

## Core idea

An article is not researched. It is **assembled from verified knowledge objects**.
Every fact on a page is a node or edge in this graph with a confidence score and a
verification state. Publishing a city page becomes a query:

> assemble the page from all objects for this place whose confidence ≥ threshold
> and whose verification state is `verified`, respecting the safety floor.

Articles are one output. The same graph feeds Lucy, search, recommendations, maps,
and APIs. See [`SURFACES.md`](SURFACES.md).
