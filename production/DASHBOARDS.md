# CPS Dashboards

> Specifications (not implementations) for the operational dashboards that make the CPS observable. Metrics referenced here are defined in `REPORTING_METRICS.md`; statuses come from `LIFECYCLE.md`; queues from `QUEUE_SPECIFICATION.md`.

Each dashboard spec lists: purpose, primary audience, widgets, and the drill-down path. Dashboards are read models over the graph + queues; they never mutate knowledge.

## 1. City Dashboard
**Audience:** Senior Researcher, Editor, PM (per city).
**Purpose:** Single pane for one city's production health.

| Widget | Shows |
|---|---|
| Research progress | % domain checklist complete |
| Knowledge objects | entities / claims / edges counts |
| Verified claims | count + % of admitted |
| Blocked claims | count + reasons |
| Confidence | distribution across bands |
| Editorial status | in-review / approved / changes-requested |
| Publish status | gate classification breakdown |
| Review dates | upcoming + overdue reviews |
| Research hours | logged effort |
| Safety issues | open safety-floor items |
| Outstanding questions | open research questions + gaps |
| Quality Score | 10-dimension grade (`QUALITY_ASSURANCE.md`) |

**Drill-down:** widget → queue → individual object with provenance.

## 2. National Dashboard
**Audience:** COO, CPO, Editor-in-Chief, CKO.
**Purpose:** Portfolio view across all cities/states.

| Widget | Shows |
|---|---|
| Cities complete | count + trend |
| Cities researching | count by phase |
| States complete | count |
| Knowledge objects | total + growth rate |
| Verification rate | platform-wide |
| Average confidence | platform-wide |
| Research backlog | Intake + Assignment depth |
| Editorial backlog | Editorial + Gate depth |
| Maintenance backlog | overdue reviews |
| Emergency reviews | open + SLA status |
| Upcoming expirations | objects due in 30/60/90d |

**Drill-down:** national → state → City Dashboard.

## 3. Research Dashboard
**Audience:** Researchers, Senior Researchers.

| Widget | Shows |
|---|---|
| Research assignments | per researcher |
| Priority cities | top of Intake queue |
| Open questions | unanswered research questions |
| Source quality | tier mix per city |
| Missing documentation | Missing-Information queue |
| Blocked research | blocked items + reasons |
| Expert requests | Expert/Vet/Legal queue depth |
| Verification requests | Verification queue depth |

## 4. Editorial Dashboard
**Audience:** Editors, Senior Editors, Editor-in-Chief.

| Widget | Shows |
|---|---|
| Pages awaiting review | Editorial Review queue |
| Knowledge awaiting review | Knowledge Review queue |
| Rejected claims | with reasons |
| Outstanding corrections | open corrections |
| Publish readiness | gate-ready count |
| Quality metrics | editorial pass rates |

## 5. Knowledge Dashboard
**Audience:** Knowledge Engineers, CKO.

| Widget | Shows |
|---|---|
| Entities | count by type |
| Relationships | count by type |
| Claims | count by status |
| Confidence distribution | histogram |
| Verification distribution | across 11 states |
| Source distribution | by tier |
| Knowledge growth | objects added over time |
| Graph health | orphan edges, id collisions, dynamic-as-evergreen violations |
| Schema health | validation pass rate, open schema findings |

## 6. Cross-cutting requirements

1. **No city is invisible.** Every city appears on the National Dashboard with an explicit status; a city with zero activity still shows (Intake/deferred).
2. **Aging is always visible.** Any item past its queue SLA is flagged.
3. **Safety is always surfaced.** Open safety-floor items appear on City, National, and Editorial dashboards simultaneously.
4. **Read-only.** Dashboards render from verified graph + queue state; edits happen in the workflow, not the dashboard.
