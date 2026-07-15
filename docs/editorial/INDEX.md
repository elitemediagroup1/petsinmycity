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
- [`knowledge-graph/LIFECYCLE.md`](knowledge-graph/LIFECYCLE.md) — the verification state machine (11 states) and confidence decay.
- [`knowledge-graph/ARCHITECTURE.md`](knowledge-graph/ARCHITECTURE.md) — the system map, request-to-render data flow, decade-scale model, and integration seams.
- [`knowledge-graph/DECISIONS.md`](knowledge-graph/DECISIONS.md) — Architecture Decision Records (ADRs).

The first populated instance lives in
[`../../research/austin/graph/`](../../research/austin/graph/): the honest,
mostly-unverified `austin.entities.yaml` seed, the exhaustive `austin.skeleton.yaml`
category map (structure only, no invented facts), and a population plan to 2,000+ objects.
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

---

## Delivery layer — Knowledge Delivery Platform (Sprint 7)

The Editorial OS + Knowledge OS define *what good is*; the CPS (`production/`) defines *how it’s manufactured*; the **KDP (`delivery/`, Sprint 7)** defines *how verified knowledge reaches every product*. It is the single mediating layer — no consumer reads raw knowledge objects directly. It extends, and never redesigns, the systems above.

Start at `../../delivery/KNOWLEDGE_DELIVERY_PLATFORM.md`, then:

```
delivery/
  KNOWLEDGE_DELIVERY_PLATFORM.md  backbone, tenets, component map, request/change flows
  DELIVERY_ENGINE.md              10-stage request pipeline + response envelope
  EVENT_SYSTEM.md                 event bus: taxonomy, envelope, propagation
  DEPENDENCY_GRAPH.md             who-consumes-what; impact closure; regeneration
  FRESHNESS_ENGINE.md             expiry, refresh, versioning, rollback, comparison
  RULE_ENGINE.md                  rules-as-data framework (not hardcoded)
  CONTEXT_ENGINE.md               DeliveryContext assembly + consent + degradation
  PERSONALIZATION.md              persona/relevance ranking; non-suppressible safety
  LUCY_INTEGRATION.md             Lucy’s consumer contract (never-invent, cite, uncertainty)
  RECOMMENDATION_ENGINE.md        explainable, traceable recommendations
  NOTIFICATION_ENGINE.md          event-driven, verified-only alerts
  API_ARCHITECTURE.md             internal/external APIs, versioning, auth, EMG integration
  CONSUMERS.md                    Articles/Search/Maps/My Pets contracts + matrix
  DECISIONS.md                    Sprint 7 ADRs (0019–0025)
```

How the delivery layer maps back to the foundation:

- **Knowledge Graph + Schema** → the KDP is its only reader-of-record; adds delivery/rule/cache overlays, not new fact types.
- **`SURFACES.md`** (conceptual surface mapping) → the KDP is its *engineered* realization: concrete pipeline, events, and per-consumer contracts.
- **Publish Gate (CPS)** → re-enforced at *delivery time* per surface (defense-in-depth).
- **Maintenance System (CPS)** → Freshness Engine + feedback/source signals feed the CPS maintenance queues.
- **Lucy / My Pets** → not redesigned; given formal consumer contracts.

The ADR log continues: … `production/DECISIONS.md` (0013–0018) → `delivery/DECISIONS.md` (0019–0025).
