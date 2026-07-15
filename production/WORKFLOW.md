# CPS Production Workflow

> Extends `../docs/editorial/RESEARCH_WORKFLOW.md`, `PUBLISH_GATE.md`, and the Knowledge Graph `LIFECYCLE.md`. Read `CITY_PRODUCTION_SYSTEM.md` first.

This document defines the end-to-end pipeline that moves a city from an idea to continuously-maintained verified knowledge. The example pipeline in the Sprint 6 brief was used as a starting point and then **challenged**: steps were merged, reordered, and added where the Austin pilot exposed gaps.

## 1. The pipeline at a glance

The workflow is organized into **six phases** and **24 stages**. Every stage has: an owner role, an input, an output, an entry gate, an exit gate, a queue (see `QUEUE_SPECIFICATION.md`), and a dashboard signal.

```
PHASE A — INTAKE & PLANNING
  A1 City Selection            (Priority Engine proposes)
  A2 Priority Scoring          (score → rank → sequence)
  A3 Research Initialization   (create city workspace from template)
  A4 Knowledge Graph Init      (instantiate city node + skeleton)

PHASE B — RESEARCH & CAPTURE
  B1 Research Question Gen     (from domain checklist)
  B2 Source Discovery          (primary/official first)
  B3 Source Classification     (tier + scope + cadence)
  B4 Claim Extraction          (facts, not prose)
  B5 Knowledge Object Creation (entities)
  B6 Relationship Creation     (edges)

PHASE C — VERIFICATION & CONFIDENCE
  C1 Verification             (against source of record)
  C2 Confidence Assignment    (band + score)
  C3 Safety-Floor Check       (NEW — routes safety claims to human)

PHASE D — REVIEW & GATE
  D1 Knowledge Review         (graph integrity)
  D2 Schema Validation        (machine schema conformance)
  D3 Editorial Review         (voice, local authenticity, accuracy)
  D4 Publish Gate             (hard gate; named approvers)

PHASE E — ACTIVATION (surfaces)
  E1 Content Generation       (articles from knowledge)
  E2 Lucy Integration         (reasoning over graph)
  E3 Search Integration       (index verified objects)
  E4 Maps Integration         (place + hazard geodata)
  E5 Recommendation Engine    (personalize verified objects)

PHASE F — MAINTENANCE & IMPROVEMENT
  F1 Maintenance Queue        (cadence + trigger driven)
  F2 Review Cycle             (re-verify → re-gate)
  F3 Continuous Improvement   (feedback → schema/process ADRs)
```

## 2. How this challenges the brief's example pipeline

The brief listed a 24-step linear chain. Changes made, with rationale:

| Change | Rationale (pilot evidence) |
|---|---|
| **Added `C3 Safety-Floor Check`** as an explicit stage | Austin emergency-vet + hazard work showed safety claims must branch to human approval *before* the general publish gate, not inside it. Prevents safety claims from being batch-approved. |
| **Merged** `Editorial Review` + `Knowledge Review` into one *phase* (D) but kept them as **distinct stages** | They have different owners (Editor vs Knowledge Engineer) and different exit gates; they run in parallel, not sequence. |
| **Moved `Schema Validation` before `Editorial Review`** | A malformed object should never reach an editor. Validation is cheap and automatable; editorial time is scarce. |
| **Made Activation (E) a fan-out, not a chain** | Content, Lucy, Search, Maps, Recommendations all read the *same* gated objects independently. Ordering them sequentially created a false dependency. |
| **Added `F3 Continuous Improvement`** feeding back to ADRs | The pilot produced ADR-0007..0012 from real research. That feedback loop must be a permanent stage, not a one-off. |
| **Removed** an implied separate "Idea" step | "Idea" is not a work stage; it is an input to A1. Kept out of the queue to avoid a status with no owner. |

## 3. Phase detail

### Phase A — Intake & Planning
A city may only enter production through the Priority Engine (`CITY_PRIORITY_ENGINE.md`); ad-hoc starts are prohibited so nothing is untracked. A3/A4 clone the Austin workspace + graph-skeleton conventions (`research/austin/` structure) so every city starts identically.

**Exit gate:** city node exists with status `researching`; workspace files scaffolded; domain checklist attached.

### Phase B — Research & Capture
Follows the Editorial OS research workflow without exception. Sources must be primary/official where they exist; community discussions are leads only. Claims are extracted as structured facts (not prose) and attached to entities and edges using stable path-style identifiers. Entities are separated from claims (ADR-0008).

**Exit gate:** every captured claim has a source in the Source Registry, a tier, and status `needs_verification`.

### Phase C — Verification & Confidence
Each claim is verified against its source of record and assigned a confidence band. `C3 Safety-Floor Check` inspects the claim's `safety_floor` flag: if set (emergency care, hazard floor, legal restraint), the claim is routed to the **Expert/Legal/Vet queue** and cannot advance on AI verification alone.

**Exit gate:** claim is `verified` or `disputed`/`needs_review`; safety-floor claims carry a human approver id.

### Phase D — Review & Gate
Knowledge Review checks graph integrity (no orphan edges, stable ids, dynamic-vs-evergreen correctly modeled). Schema Validation enforces `MACHINE_SCHEMA.yaml`. Editorial Review applies the Editor Checklist + Local Authenticity Test. The Publish Gate (`PUBLISH_GATE.md`) is the single hard gate; it classifies every object as *eligible / internal-only / needs-further-reporting / outdated / rejected / blocked-by-safety*.

**Exit gate:** object bears an explicit publish-gate classification and, if eligible, a named approver.

### Phase E — Activation
Only gate-eligible objects are readable by surfaces. Each surface renders from the graph; none may introduce new facts. This preserves the guarantee that all public output traces to verified knowledge.

### Phase F — Maintenance & Improvement
Objects automatically re-enter the maintenance queue by cadence or trigger (`MAINTENANCE_SYSTEM.md`). Re-verification returns an object to Phase C at the appropriate state. Process/schema gaps discovered here become ADRs in `DECISIONS.md`.

## 4. State mapping

Every stage maps to a lifecycle state from `LIFECYCLE.md` (11-state machine). No new states are introduced by the CPS; the workflow is a *traversal* of the existing state machine, annotated with owners and queues.

| Phase | Typical lifecycle states |
|---|---|
| B | `researching` → `needs_verification` |
| C | `needs_verification` → `verified` / `disputed` / `needs_review` |
| D | `verified` → (`verified` eligible) / `rejected` / `needs_review` |
| E | `verified` (published surfaces read-only) |
| F | `needs_review` → `verified` / `outdated` → `deprecated` / `archived` |
