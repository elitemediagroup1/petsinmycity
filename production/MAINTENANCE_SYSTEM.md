# CPS Maintenance System

> Defines how verified knowledge stays trustworthy over time. Extends `../docs/editorial/PUBLISH_GATE.md` §4–5 (staleness + immediate-review triggers) and the review cadences assigned during the Austin pilot. Every published object has a cadence and can be pulled back by a trigger.

## 1. Why maintenance is a first-class system

Knowledge is not shipped once. The Austin pilot proved that some facts are durable (a park's managing authority) while others decay fast (emergency-vet hours, weather, closures). Maintenance is the engine that keeps the graph honest at scale.

## 2. Scheduled review cadences

| Cadence | Applies to (examples) | Default window |
|---|---|---|
| Annual | Geography, jurisdiction, park identity, durable climate patterns | 12 months |
| Quarterly | Shelter/rescue contact + operating status, park rules | 3 months |
| Safety (short-window) | Emergency-vet status/hours, hazard safety floors | 30–90 days |
| Dynamic (event) | Weather alerts, closures, flood watches | Explicit expiry timestamp |

Dynamic events are never "reviewed" — they **expire**. On expiry they are archived, not silently kept (ADR-0009 / ADR-0010).

## 3. Trigger-based review (overrides the calendar)

Certain real-world signals force an object back into review immediately, ahead of its cadence:

| Trigger | Enters queue | Priority |
|---|---|---|
| Annual review | Annual Review | normal |
| Quarterly review | Maintenance | normal |
| Safety review due | Emergency Review | high |
| Business closure signal (vet/shelter) | Emergency Review | high |
| Law/ordinance change | Maintenance + Legal Review | high |
| Weather alert issued/lifted | Dynamic expiry handler | automated |
| Disaster declaration | Emergency Review | critical (48h SLA) |
| Scientific/veterinary guidance update | Maintenance + Vet Advisor | normal |
| Community feedback (correction report) | Maintenance triage | normal |

## 4. How work automatically enters the maintenance queue

1. **Cadence timer.** On admission, each object gets `next_review`. A scheduled job moves objects whose `next_review ≤ today` into the Maintenance queue (or Annual/Emergency per type).
2. **Expiry sweep.** Dynamic events with `expires_at ≤ now` are archived automatically; any surface reading them is refreshed.
3. **External-signal listeners.** Feeds (NWS alerts, closure notices, ordinance updates) map to the trigger table and enqueue the affected objects. Signals are *leads*; they open a review, they do not auto-edit facts.
4. **QA decay.** If a city's Freshness dimension (`QUALITY_ASSURANCE.md`) drops below threshold, its overdue objects are bulk-enqueued.
5. **Community feedback.** A user correction opens a Maintenance-triage ticket; it is a lead, verified before any change (never auto-applied).

## 5. Review outcome → lifecycle transition

| Outcome | Transition |
|---|---|
| Still accurate | `verified` (new `next_review` set) |
| Changed | back to Verification → re-gate |
| No longer true | `outdated` → `deprecated`; surfaces stop reading it |
| Source gone | `needs_review`; gap logged to Missing-Information |
| Safety no longer supported | de-publish via Emergency Review immediately |

## 6. De-publishing (the one fast path)

Emergency Review may remove an object from public surfaces within 48h **only** in the safety-reducing-risk direction (e.g. an emergency vet that closed). Re-publishing always requires the full gate again. This asymmetry is deliberate: it is always safe to withdraw a stale safety claim quickly, never safe to add one quickly.

## 7. Scale note

At 10,000 cities and millions of objects, maintenance volume dwarfs initial research. Cadence assignment and expiry are automated; human effort concentrates on triggered and safety reviews. See `AUTOMATION_GUIDELINES.md` for the automate/never-automate split.
