# CPS Queue Specification

> Formal spec for every operational queue referenced in `RESEARCH_PIPELINE.md`. Each queue has: purpose, entry rule, exit rule, owner, SLA, dashboard signal, and the escalation path when SLA is breached.

SLAs are default targets for planning; they scale with staffing, not by relaxing quality. A breached SLA never authorizes skipping a gate.

## Queue register

| # | Queue | Owner | Entry rule | Exit rule | SLA (default) | Aging signal |
|---|---|---|---|---|---|---|
| 1 | Research Intake | Product Manager | City scored by Priority Engine | Admitted to Assignment or deferred with reason | 14d to triage | City stuck > 30d |
| 2 | Research Assignment | Senior Researcher | City admitted + capacity | Workspace scaffolded, questions assigned | 3d | Unassigned > 7d |
| 3 | Source Registry | Researcher | Source inspected (not just found) | Source recorded with tier/scope/cadence | Continuous | Source unclassified > 3d |
| 4 | Claim Registry | Researcher | Claim extracted from registered source | Claim reaches `needs_verification` | Continuous | Claim without source (0 tolerance) |
| 5 | Verification | Fact Checker | Claim `needs_verification` | `verified`/`disputed`/`needs_review` | 5d routine | Claim aging > 14d |
| 6 | Expert/Vet/Legal | Vet Advisor / Legal | `safety_floor` flag set | Human approval or rejection recorded | 7d | Safety claim aging > 10d |
| 7 | Knowledge Review | Knowledge Engineer | Claim `verified` | Graph-integrity sign-off | 3d | Object aging > 7d |
| 8 | Editorial Review | Editor / Senior Editor | Object schema-valid + knowledge-signed | Editorial approval or change request | 5d | Object aging > 10d |
| 9 | Publish Gate | Senior Editor (+KE sign-off) | Both reviews complete | Classification assigned | 3d | Gate-ready aging > 7d |
| 10 | Missing-Information | Senior Researcher | Gate = needs-further-reporting | Gap resolved or accepted-as-empty | Reviewed monthly | Open > 90d |
| 11 | Blocked-Claim | Senior Editor | Gate = blocked-by-safety / rejected | Unblocked or archived with reason | Reviewed monthly | Blocked > 60d |
| 12 | Maintenance | PM + Knowledge Engineer | Object published + cadence assigned | Re-verified within cadence | Per cadence | Overdue review |
| 13 | Annual Review | Senior Researcher | Cadence = annual due | Re-verification complete | Cadence window | Overdue > 30d |
| 14 | Emergency Review | Senior Editor + Vet/Legal | Trigger fired (see MAINTENANCE_SYSTEM) | Re-verified or de-published | 48h | Any open > 72h |

## State-to-queue mapping

| Lifecycle state (`LIFECYCLE.md`) | Resident queue |
|---|---|
| `unverified` / `researching` | Research Assignment / Source / Claim Registry |
| `needs_verification` | Verification (or Expert/Vet/Legal if safety-floor) |
| `verified` (pre-gate) | Knowledge + Editorial Review |
| `verified` (post-gate, eligible) | Maintenance |
| `disputed` / `needs_review` | Verification or Emergency Review |
| `outdated` | Maintenance → Annual/Emergency Review |
| `rejected` | Blocked-Claim (archived with reason) |
| `deprecated` / `archived` / `merged` | Closed (retained for provenance) |

## Invariants

1. Every work item is in **exactly one** primary queue at a time (safety-floor items may appear on a dashboard in two views but have one owning queue).
2. Every queue has a **named owning role**; no queue is owned by "the system."
3. **Emergency Review** has the tightest SLA (48h) and can trigger de-publishing without waiting for the normal gate cycle — the only path that may remove public output rapidly, and only in the safety-reducing direction.
4. SLA breaches escalate one level up the ladder in `ROLE_DEFINITIONS.md`.
