# Editorial & Knowledge Foundation â Index

> **Start here.** This is the map of PetsInMyCity's Editorial Operating System and Knowledge Operating System, and how they connect to the existing product documentation. For the audit and rationale behind these files, see `IMPLEMENTATION_MAP.md`.

---

## Read in this order

1. **`IMPLEMENTATION_MAP.md`** â repository audit, what already existed, consolidation decisions, and how the editorial system integrates.
2. **`EDITORIAL_OS.md`** â the master newsroom manual (philosophy, standards, review, competitive moat, manifesto).
3. **`LOCAL_JOURNALISM.md`** â how we report a place to newsroom depth; the Local Authenticity Test.
4. **`RESEARCH_WORKFLOW.md`** â the investigative workflow and the source-reliability tiers (1-4).
5. **`PUBLISH_GATE.md`** â claim verification statuses, the publish gate, and content maintenance/refresh.
6. **`KNOWLEDGE_OS.md`** â the Knowledge Operating System: entity model, relationships, lifecycle, provenance, ownership.
7. **`dossiers/README.md`** â the research dossier system, plus 10 production templates.
8. **`AI_EDITOR_GUIDELINES.md`** â how AI (Lucy + future) operates under the manual.
9. **`EDITOR_CHECKLIST.md`** â the reviewable checklist that enforces the publish gate.

## Document map

```
docs/editorial/
  INDEX.md                 â you are here
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

- `../platform-architecture.md` â product/IA vision. The editorial system produces the *content and knowledge* that fill its Discover/Learn/Emergency pillars.
- `../roadmap.md` â the SEO/Content/Local roadmaps; this foundation operationalizes their "programmatic city pages, done well" intent.
- `../knowledge-graph.md` â the conceptual entity map. **Extended (not replaced)** by `KNOWLEDGE_OS.md`.
- `../lucy-brain.md` â Lucy's guardrails. **Inherited** by `AI_EDITOR_GUIDELINES.md`.
- `../brand-bible.md` â voice/trust. The Editorial OS is consistent with it.
- Public `/editorial-standards/` â its private engine is this `docs/editorial/` set.

## The one-line summary

Report before we write; verify before we publish; store knowledge in the graph so it is reused everywhere and corrected everywhere; and never publish anything that fails the name-swap test or the publish gate. Trust is the objective; rankings are a byproduct.


## Knowledge Graph â schema layer (Sprint 4)

The data model that the Knowledge OS describes is now specified in
[`knowledge-graph/`](knowledge-graph/). Start with its
[`README`](knowledge-graph/README.md), then:

- [`knowledge-graph/SCHEMA_CONVENTIONS.md`](knowledge-graph/SCHEMA_CONVENTIONS.md) â the universal knowledge envelope.
- [`knowledge-graph/ENTITIES.md`](knowledge-graph/ENTITIES.md) â every entity type and its fields.
- [`knowledge-graph/RELATIONSHIPS.md`](knowledge-graph/RELATIONSHIPS.md) â the edge catalog.
- [`knowledge-graph/MACHINE_SCHEMA.yaml`](knowledge-graph/MACHINE_SCHEMA.yaml) â machine-readable source of truth.
- [`knowledge-graph/SURFACES.md`](knowledge-graph/SURFACES.md) â how the graph powers articles, Lucy, My Pets, search, recommendations, maps, and APIs.
- [`knowledge-graph/LIFECYCLE.md`](knowledge-graph/LIFECYCLE.md) â the verification state machine (11 states) and confidence decay.
- [`knowledge-graph/ARCHITECTURE.md`](knowledge-graph/ARCHITECTURE.md) â the system map, request-to-render data flow, decade-scale model, and integration seams.
- [`knowledge-graph/DECISIONS.md`](knowledge-graph/DECISIONS.md) â Architecture Decision Records (ADRs).

The first populated instance lives in
[`../../research/austin/graph/`](../../research/austin/graph/): the honest,
mostly-unverified `austin.entities.yaml` seed, the exhaustive `austin.skeleton.yaml`
category map (structure only, no invented facts), and a population plan to 2,000+ objects.
This layer **extends** the Knowledge OS; it does not replace it.
# Editorial & Knowledge Foundation â Index

> **Start here.** This is the map of PetsInMyCity's Editorial Operating System and Knowledge Operating System, and how they connect to the existing product documentation. For the audit and rationale behind these files, see `IMPLEMENTATION_MAP.md`.

---

## Read in this order

1. **`IMPLEMENTATION_MAP.md`** â repository audit, what already existed, consolidation decisions, and how the editorial system integrates.
2. **`EDITORIAL_OS.md`** â the master newsroom manual (philosophy, standards, review, competitive moat, manifesto).
3. **`LOCAL_JOURNALISM.md`** â how we report a place to newsroom depth; the Local Authenticity Test.
4. **`RESEARCH_WORKFLOW.md`** â the investigative workflow and the source-reliability tiers (1-4).
5. **`PUBLISH_GATE.md`** â claim verification statuses, the publish gate, and content maintenance/refresh.
6. **`KNOWLEDGE_OS.md`** â the Knowledge Operating System: entity model, relationships, lifecycle, provenance, ownership.
7. **`dossiers/README.md`** â the research dossier system, plus 10 production templates.
8. **`AI_EDITOR_GUIDELINES.md`** â how AI (Lucy + future) operates under the manual.
9. **`EDITOR_CHECKLIST.md`** â the reviewable checklist that enforces the publish gate.

## Document map

```
docs/editorial/
  INDEX.md                 â you are here
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

- `../platform-architecture.md` â product/IA vision. The editorial system produces the *content and knowledge* that fill its Discover/Learn/Emergency pillars.
- `../roadmap.md` â the SEO/Content/Local roadmaps; this foundation operationalizes their "programmatic city pages, done well" intent.
- `../knowledge-graph.md` â the conceptual entity map. **Extended (not replaced)** by `KNOWLEDGE_OS.md`.
- `../lucy-brain.md` â Lucy's guardrails. **Inherited** by `AI_EDITOR_GUIDELINES.md`.
- `../brand-bible.md` â voice/trust. The Editorial OS is consistent with it.
- Public `/editorial-standards/` â its private engine is this `docs/editorial/` set.

## The one-line summary

Report before we write; verify before we publish; store knowledge in the graph so it is reused everywhere and corrected everywhere; and never publish anything that fails the name-swap test or the publish gate. Trust is the objective; rankings are a byproduct.

---

## Production layer — City Production System (Sprint 6)

The Editorial OS and Knowledge OS above define **what good is**. The `production/` directory (added in Sprint 6) defines **how PetsInMyCity manufactures that quality repeatedly for 10,000+ cities**. It extends — and never redesigns — the systems in this index.

Start at `../../production/CITY_PRODUCTION_SYSTEM.md`, then:

```
production/
  CITY_PRODUCTION_SYSTEM.md   backbone, philosophy, index, scaling guarantees
  WORKFLOW.md                 24-stage / 6-phase production pipeline (challenged & refined)
  ROLE_DEFINITIONS.md         human + AI roles, authority, approval rights, escalation
  RESEARCH_PIPELINE.md        how work flows between operational queues
  QUEUE_SPECIFICATION.md      every queue: entry/exit, owner, SLA, state mapping
  CITY_PRIORITY_ENGINE.md     scoring model for selecting/sequencing cities
  QUALITY_ASSURANCE.md        per-city 10-dimension quality score
  DASHBOARDS.md               City/National/Research/Editorial/Knowledge specs
  MAINTENANCE_SYSTEM.md       cadences, triggers, auto re-enqueue, de-publishing
  AUTOMATION_GUIDELINES.md    what AI should / must never automate, and why
  REPORTING_METRICS.md        KPIs, guardrails, anti-gaming definitions
  DECISIONS.md                Sprint 6 ADRs (0013–0018)
```

How the production layer maps back to this foundation:

- **Editorial OS** → becomes staffed, queued, measurable stages (Phases B–D of `WORKFLOW.md`).
- **Publish Gate** → a hard workflow stage with named approvers (`ROLE_DEFINITIONS.md`).
- **Knowledge OS + Machine Schema** → graph-health + schema-validation gates and a maintenance/expiry engine.
- **Verification Lifecycle (11 states)** → every state mapped to a queue, owner, and dashboard signal (`QUEUE_SPECIFICATION.md`).
- **Austin Pilot** → generalized into a repeatable city template, the calibration anchor for quality scoring, and the source of ADRs 0007–0012 that the CPS builds on.

The ADR log is continuous: KG `knowledge-graph/DECISIONS.md` (0001–0006) → Austin pilot `SCHEMA_FINDINGS_AND_ADRS.md` (0007–0012) → `production/DECISIONS.md` (0013–0018).
