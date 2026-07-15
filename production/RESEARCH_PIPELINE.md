# CPS Research Pipeline

> Operational companion to `WORKFLOW.md`. Describes how *work items* (cities, sources, claims, objects) physically move between operational queues. Queue formal specs live in `QUEUE_SPECIFICATION.md`.

## 1. Work-item types

| Item | Created in | Terminal state |
|---|---|---|
| City | Intake (A) | `verified` city (maintained) |
| Research question | B1 | answered / gap-logged |
| Source | B2 | registered / rejected |
| Claim | B4 | `verified` / `rejected` / `deprecated` |
| Entity | B5 | active / `merged` / `archived` |
| Edge | B6 | active / removed |
| Maintenance ticket | F1 | closed (re-verified) |

## 2. Queues and how work flows between them

```
                 ┌─ Research Intake Queue
                 │     (cities admitted by Priority Engine)
                 ▼
        Research Assignment Queue  ──→  Source Registry
                 │                          │
                 ▼                          ▼
          Claim Registry  ────────→  Verification Queue
                                            │
                 ┌───────────────────────┼────────────┐
                 ▼                        ▼                ▼
        Knowledge Review Queue    Editorial Review Queue   Expert/Vet/Legal Queue
                 │                        │                (safety-floor)
                 └─────────────┬───────────┘
                              ▼
                        Publish Gate
                              │
          ┌────────────────────┼──────────────┐
          ▼                            ▼                ▼
     Activation (surfaces)      Missing-Information Q   Blocked-Claim Q
          │
          ▼
    Maintenance Queue  ◄── (cadence + triggers) ── Annual/Emergency Review Q
```

## 3. Queue-to-queue transitions

| From | To | Trigger |
|---|---|---|
| Research Intake | Research Assignment | City scored + capacity available |
| Research Assignment | Source Registry | Researcher registers an inspected source |
| Source Registry | Claim Registry | Claim extracted from a registered source |
| Claim Registry | Verification | Claim reaches `needs_verification` |
| Verification | Expert/Vet/Legal | `safety_floor` flag set |
| Verification | Knowledge + Editorial Review | Claim `verified` (routine) |
| Knowledge/Editorial Review | Publish Gate | Both sign-offs present |
| Publish Gate | Missing-Information | Classification = needs-further-reporting |
| Publish Gate | Blocked-Claim | Classification = blocked-by-safety / rejected |
| Publish Gate | Activation | Classification = eligible |
| Activation | Maintenance | Object published + cadence assigned |
| Maintenance | Verification | Cadence due OR trigger fired (re-enters Phase C) |

## 4. Flow guarantees

1. **No dead ends.** Every queue has a defined exit for every possible outcome (including rejection and gaps). Gaps go to Missing-Information; they are not discarded.
2. **No silent stalls.** Every item carries an owner and an SLA (`QUEUE_SPECIFICATION.md`). Items past SLA appear on the relevant dashboard as aging.
3. **Safety cannot skip.** A `safety_floor` claim physically cannot reach the Publish Gate without passing through the Expert/Vet/Legal queue with a human approver id.
4. **Re-entry is normal.** Maintenance returns items to Verification; this loop is the steady state once a city is live.

## 5. Intake to first publish (happy path, one city)

1. Priority Engine proposes city → Research Intake.
2. PM admits it (capacity) → Research Assignment; workspace + graph skeleton scaffolded.
3. AI/Human Researchers register sources → Source Registry; extract claims → Claim Registry.
4. Verification: routine claims auto/human-verified; safety-floor claims routed to Vet/Legal.
5. Knowledge Review + Editorial Review in parallel; Schema Validation gates malformed objects out.
6. Publish Gate classifies each object; eligible objects activate surfaces.
7. Objects enter Maintenance with cadence; gaps/blocked items remain tracked in their queues.
