# City Production System (CPS)

> **Status:** Sprint 6 architecture. Operational backbone for scaling verified local knowledge to 10,000+ cities.
> **Scope:** This document is the entry point ("constitution") for the CPS. It does **not** replace the Editorial OS or Knowledge OS — it operationalizes them.
> **Do not** treat this as public-facing content, website code, or a rewrite of any prior system.

---

## 0. What the CPS is (and is not)

PetsInMyCity is no longer building content. It is building a **knowledge manufacturing platform**. Knowledge is researched, verified, stored, connected, and reused. Articles, Lucy, Search, Maps, Recommendations, and My Pets are all *downstream renderings* of the same verified graph.

The CPS is the **repeatable operating system** that lets the company run the exact Austin-pilot lifecycle for any city, at any volume, without lowering the standards proven in Sprints 3–5.

| The CPS **is** | The CPS **is not** |
|---|---|
| A production workflow from city selection to continuous maintenance | A new editorial or knowledge philosophy (those exist) |
| A role, queue, dashboard, and metric specification | Production application code |
| A scaling contract that preserves quality | A website redesign or SEO plan |
| An extension of the Editorial OS + Knowledge OS | A replacement for either |

## 1. How the CPS extends prior systems (no duplication)

The CPS sits **on top of** existing architecture. Every prior document remains authoritative in its domain; the CPS references rather than restates it.

| Prior system | Where it lives | What the CPS adds |
|---|---|---|
| Editorial Operating System | `docs/editorial/EDITORIAL_OS.md` (+ RESEARCH_WORKFLOW, LOCAL_JOURNALISM, EDITOR_CHECKLIST, AI_EDITOR_GUIDELINES) | Turns editorial standards into staffed, queued, measurable production stages |
| Publish Gate | `docs/editorial/PUBLISH_GATE.md` | Wires the gate into the workflow as a hard stage with named approvers |
| Knowledge Operating System | `docs/editorial/KNOWLEDGE_OS.md` | Defines who creates/verifies knowledge objects and how work flows between queues |
| Knowledge Graph + Machine Schema | `docs/editorial/knowledge-graph/` | Adds graph-health metrics, schema-validation gate, and a maintenance/expiry engine |
| Verification Lifecycle (11-state machine) | `docs/editorial/knowledge-graph/LIFECYCLE.md` | Maps every lifecycle state to a queue, an owner, and a dashboard signal |
| Austin Pilot (proof) | `research/austin/` + `research/austin/pilot/` | Generalizes the pilot into a repeatable city template and prioritization engine |
| ADRs 0001–0012 | KG `DECISIONS.md` + pilot `SCHEMA_FINDINGS_AND_ADRS.md` | Continues the ADR log at 0013+ in `production/DECISIONS.md` |

## 2. The CPS document set

| Document | Purpose |
|---|---|
| `CITY_PRODUCTION_SYSTEM.md` (this file) | Backbone, philosophy, index, guarantees |
| `WORKFLOW.md` | The end-to-end production pipeline (challenged & refined) |
| `ROLE_DEFINITIONS.md` | Every human + AI role: responsibilities, inputs, outputs, authority, approval rights, escalation |
| `RESEARCH_PIPELINE.md` | How work physically flows between operational queues |
| `QUEUE_SPECIFICATION.md` | Formal spec for every queue (entry/exit rules, SLAs, owners) |
| `CITY_PRIORITY_ENGINE.md` | Scoring model for selecting and sequencing cities |
| `QUALITY_ASSURANCE.md` | Per-city quality scoring across ten dimensions |
| `DASHBOARDS.md` | Specifications for City / National / Research / Editorial / Knowledge dashboards |
| `MAINTENANCE_SYSTEM.md` | Review cadences and automatic re-entry into the maintenance queue |
| `AUTOMATION_GUIDELINES.md` | What AI should automate, what it must never automate, and why |
| `REPORTING_METRICS.md` | KPI definitions, formulas, and success thresholds |
| `DECISIONS.md` | Sprint 6 ADRs (0013+) |

## 3. The production lifecycle (one line)

`Idea → Research → Verification → Knowledge → Editorial Review → Publication → Maintenance → Continuous Improvement`

Each arrow is a **stage** with a queue, an owner, entry/exit criteria, and a dashboard signal. No city is ever "lost": every city and every claim always has an explicit status drawn from the 11-state lifecycle. See `WORKFLOW.md`.

## 4. Non-negotiable guarantees (the scaling contract)

These invariants must hold whether the platform runs 1 city or 10,000:

1. **Provenance or nothing.** No claim enters the graph without a source, tier, verification date, confidence, owner, and next-review date. Empty is acceptable; fabricated certainty is not.
2. **The Publish Gate is a hard gate.** Nothing public is generated from knowledge that has not cleared `PUBLISH_GATE.md`. Speed never lowers the bar.
3. **Safety-floor claims require human approval.** Emergency vet status, hazard safety floors, and legal interpretations are never auto-approved. (See `AUTOMATION_GUIDELINES.md`.)
4. **Dynamic ≠ evergreen.** Live conditions (weather, closures, alerts) are stored as time-bound events with expiry, never as timeless facts. (ADR-0009.)
5. **Every object is reviewable and reusable.** Each object carries a review cadence and is addressable by all surfaces via stable identifiers.
6. **Schema changes need an ADR.** Material architecture changes require a decision record (problem, alternatives, decision, consequences, migration).

## 5. Reading order

1. This file → 2. `WORKFLOW.md` → 3. `ROLE_DEFINITIONS.md` → 4. `RESEARCH_PIPELINE.md` + `QUEUE_SPECIFICATION.md` → 5. `CITY_PRIORITY_ENGINE.md` → 6. `QUALITY_ASSURANCE.md` → 7. `DASHBOARDS.md` + `REPORTING_METRICS.md` → 8. `MAINTENANCE_SYSTEM.md` → 9. `AUTOMATION_GUIDELINES.md` → 10. `DECISIONS.md`.
