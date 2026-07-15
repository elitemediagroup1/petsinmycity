# Editorial & Knowledge Foundation — Index

> **Start here.** This is the map of PetsInMyCity's Editorial Operating System and Knowledge Operating System, and how they connect to the existing product documentation. For the audit and rationale behind these files, see `IMPLEMENTATION_MAP.md`.

---

## Read in this order

1. **`IMPLEMENTATION_MAP.md`** — repository audit, what already existed, consolidation decisions, and how the editorial system integrates.
2. **`EDITORIAL_OS.md`** — the master newsroom manual (philosophy, standards, review, competitive moat, manifesto).
3. **`LOCAL_JOURNALISM.md`** — how we report a place to newsroom depth; the Local Authenticity Test.
4. **`RESEARCH_WORKFLOW.md`** — the investigative workflow and the source-reliability tiers (1-4).
5. **`PUBLISH_GATE.md`** — claim verification statuses, the publish gate, and content maintenance/refresh.
6. **`KNOWLEDGE_OS.md`** — the Knowledge Operating System: entity model, relationships, lifecycle, provenance, ownership.
7. **`dossiers/README.md`** — the research dossier system, plus 10 production templates.
8. **`AI_EDITOR_GUIDELINES.md`** — how AI (Lucy + future) operates under the manual.
9. **`EDITOR_CHECKLIST.md`** — the reviewable checklist that enforces the publish gate.

## Document map

```
docs/editorial/
  INDEX.md                 ← you are here
  IMPLEMENTATION_MAP.md    audit + integration
  EDITORIAL_OS.md          master manual
  LOCAL_JOURNALISM.md      local reporting + authenticity test
  RESEARCH_WORKFLOW.md     workflow + source tiers
  PUBLISH_GATE.md          verification statuses + gate + refresh
  KNOWLEDGE_OS.md          knowledge operating system
  AI_EDITOR_GUIDELINES.md  AI operation rules
  EDITOR_CHECKLIST.md      review & approval
  dossiers/
    README.md              dossier system spec
    TEMPLATE_STATE.md  TEMPLATE_CITY.md  TEMPLATE_NEIGHBORHOOD.md
    TEMPLATE_PARK.md  TEMPLATE_TRAIL.md  TEMPLATE_BEACH.md
    TEMPLATE_VETERINARIAN.md  TEMPLATE_SHELTER.md  TEMPLATE_RESCUE.md
    TEMPLATE_BREED_LOCATION.md

research/
  austin/                  gold-standard research workspace (NOT for publication)
    README.md  DOSSIER.md  KNOWLEDGE_GRAPH_SKELETON.md
    RESEARCH_CHECKLIST.md  VERIFICATION_TRACKER.md
    MISSING_INFORMATION.md  EXPERT_SOURCES.md
```

## How it connects to existing docs (preserved, not modified)

- `../platform-architecture.md` — product/IA vision. The editorial system produces the *content and knowledge* that fill its Discover/Learn/Emergency pillars.
- `../roadmap.md` — the SEO/Content/Local roadmaps; this foundation operationalizes their "programmatic city pages, done well" intent.
- `../knowledge-graph.md` — the conceptual entity map. **Extended (not replaced)** by `KNOWLEDGE_OS.md`.
- `../lucy-brain.md` — Lucy's guardrails. **Inherited** by `AI_EDITOR_GUIDELINES.md`.
- `../brand-bible.md` — voice/trust. The Editorial OS is consistent with it.
- Public `/editorial-standards/` — its private engine is this `docs/editorial/` set.

## The one-line summary

Report before we write; verify before we publish; store knowledge in the graph so it is reused everywhere and corrected everywhere; and never publish anything that fails the name-swap test or the publish gate. Trust is the objective; rankings are a byproduct.


## Knowledge Graph — schema layer (Sprint 4)

The data model that the Knowledge OS describes is now specified in
[`knowledge-graph/`](knowledge-graph/). Start with its
[`README`](knowledge-graph/README.md), then:

- [`knowledge-graph/SCHEMA_CONVENTIONS.md`](knowledge-graph/SCHEMA_CONVENTIONS.md) — the universal knowledge envelope.
- [`knowledge-graph/ENTITIES.md`](knowledge-graph/ENTITIES.md) — every entity type and its fields.
- [`knowledge-graph/RELATIONSHIPS.md`](knowledge-graph/RELATIONSHIPS.md) — the edge catalog.
- [`knowledge-graph/MACHINE_SCHEMA.yaml`](knowledge-graph/MACHINE_SCHEMA.yaml) — machine-readable source of truth.
- [`knowledge-graph/SURFACES.md`](knowledge-graph/SURFACES.md) — how the graph powers articles, Lucy, My Pets, search, recommendations, maps, and APIs.

The first populated instance lives in
[`../../research/austin/graph/`](../../research/austin/graph/): honest,
mostly-unverified Austin knowledge objects plus a population plan to 2,000+ objects.
This layer **extends** the Knowledge OS; it does not replace it.
# Editorial & Knowledge Foundation — Index

> **Start here.** This is the map of PetsInMyCity's Editorial Operating System and Knowledge Operating System, and how they connect to the existing product documentation. For the audit and rationale behind these files, see `IMPLEMENTATION_MAP.md`.

---

## Read in this order

1. **`IMPLEMENTATION_MAP.md`** — repository audit, what already existed, consolidation decisions, and how the editorial system integrates.
2. **`EDITORIAL_OS.md`** — the master newsroom manual (philosophy, standards, review, competitive moat, manifesto).
3. **`LOCAL_JOURNALISM.md`** — how we report a place to newsroom depth; the Local Authenticity Test.
4. **`RESEARCH_WORKFLOW.md`** — the investigative workflow and the source-reliability tiers (1-4).
5. **`PUBLISH_GATE.md`** — claim verification statuses, the publish gate, and content maintenance/refresh.
6. **`KNOWLEDGE_OS.md`** — the Knowledge Operating System: entity model, relationships, lifecycle, provenance, ownership.
7. **`dossiers/README.md`** — the research dossier system, plus 10 production templates.
8. **`AI_EDITOR_GUIDELINES.md`** — how AI (Lucy + future) operates under the manual.
9. **`EDITOR_CHECKLIST.md`** — the reviewable checklist that enforces the publish gate.

## Document map

```
docs/editorial/
  INDEX.md                 ← you are here
  IMPLEMENTATION_MAP.md    audit + integration
  EDITORIAL_OS.md          master manual
  LOCAL_JOURNALISM.md      local reporting + authenticity test
  RESEARCH_WORKFLOW.md     workflow + source tiers
  PUBLISH_GATE.md          verification statuses + gate + refresh
  KNOWLEDGE_OS.md          knowledge operating system
  AI_EDITOR_GUIDELINES.md  AI operation rules
  EDITOR_CHECKLIST.md      review & approval
  dossiers/
    README.md              dossier system spec
    TEMPLATE_STATE.md  TEMPLATE_CITY.md  TEMPLATE_NEIGHBORHOOD.md
    TEMPLATE_PARK.md  TEMPLATE_TRAIL.md  TEMPLATE_BEACH.md
    TEMPLATE_VETERINARIAN.md  TEMPLATE_SHELTER.md  TEMPLATE_RESCUE.md
    TEMPLATE_BREED_LOCATION.md

research/
  austin/                  gold-standard research workspace (NOT for publication)
    README.md  DOSSIER.md  KNOWLEDGE_GRAPH_SKELETON.md
    RESEARCH_CHECKLIST.md  VERIFICATION_TRACKER.md
    MISSING_INFORMATION.md  EXPERT_SOURCES.md
```

## How it connects to existing docs (preserved, not modified)

- `../platform-architecture.md` — product/IA vision. The editorial system produces the *content and knowledge* that fill its Discover/Learn/Emergency pillars.
- `../roadmap.md` — the SEO/Content/Local roadmaps; this foundation operationalizes their "programmatic city pages, done well" intent.
- `../knowledge-graph.md` — the conceptual entity map. **Extended (not replaced)** by `KNOWLEDGE_OS.md`.
- `../lucy-brain.md` — Lucy's guardrails. **Inherited** by `AI_EDITOR_GUIDELINES.md`.
- `../brand-bible.md` — voice/trust. The Editorial OS is consistent with it.
- Public `/editorial-standards/` — its private engine is this `docs/editorial/` set.

## The one-line summary

Report before we write; verify before we publish; store knowledge in the graph so it is reused everywhere and corrected everywhere; and never publish anything that fails the name-swap test or the publish gate. Trust is the objective; rankings are a byproduct.
