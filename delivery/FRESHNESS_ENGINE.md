# Freshness Engine

> Guarantees no consumer ever serves stale knowledge silently. Owns expiry, scheduled review, automatic refresh, source monitoring, version history, rollback, and historical comparison. Maps to a scheduler + a versioned object store. Consumes CPS `MAINTENANCE_SYSTEM.md` cadences; feeds the Event System.

## 1. Currency model

Every deliverable object carries two timestamps and a class:

| Field | Meaning |
|---|---|
| `as_of` | When the fact was last verified true |
| `expires_at` | When it must not be served without recheck (`null` for durable evergreen with a review cadence instead) |
| `class` | `evergreen` (review cadence) or `dynamic` (hard expiry) |

Delivery Engine stage 6 reads these; consumers receive them in the response envelope so they can display currency honestly.

## 2. Expiration vs review (never conflated)

- **Dynamic** objects (weather, closures, alerts) **expire**. Past `expires_at` they are removed from delivery and the object is archived. They are never “refreshed in place” as if timeless (upholds ADR-0009).
- **Evergreen** objects (jurisdiction, park identity) don't expire; they carry a **review cadence** from the CPS. Past `next_review` they are still served but flagged `needs_review` and enqueued to CPS maintenance.

## 3. Automatic refresh loop

```
scheduler tick
  → find objects where expires_at ≤ now (dynamic) OR next_review ≤ today (evergreen)
  → dynamic: expire + emit event.closed / knowledge.deprecated
  → evergreen: open CPS review (does NOT auto-change the fact)
  → on re-verification by CPS: write new version, emit knowledge.changed
  → Dependency Graph + Event System refresh dependents
```
Refresh **opens work**; it never fabricates or auto-edits a fact. Only the CPS (with gates/human approval) changes values.

## 4. Source monitoring

Monitored sources (ordinance pages, provider sites, NWS feeds) are polled/subscribed. A detected change emits `source.changed`, which opens a CPS review for the claims that cite it. This is the bridge between the outside world and the maintenance queues — a *lead*, not a fact.

## 5. Version history, rollback, comparison

- **Versioning.** Every value change creates an immutable version `(object_id, version, value, as_of, approved_by, event_id)`. Deliveries pin the version they served.
- **Rollback.** If a bad change ships, roll forward to a corrected version referencing the prior good one (append-only; history is never deleted — preserves provenance).
- **Historical comparison.** Any two versions can be diffed (e.g. “leash rule v11 → v12”) to explain what changed and when — used by Notifications and by editorial corrections.

## 6. Freshness guarantees to consumers

| Guarantee | Mechanism |
|---|---|
| Never serve an expired dynamic fact | stage-6 drop + event-driven cache purge |
| Always disclose currency | `currency` block in the response envelope |
| Stale-but-evergreen is visible, not hidden | `needs_review` flag surfaced to consumer |
| Safety facts recheck fast | short CPS review windows honored by scheduler |
| Corrections propagate | rollback emits `knowledge.changed` → full fan-out |

## 7. Scale

At millions of objects, the scheduler indexes by `expires_at`/`next_review` so each tick touches only due items. Dynamic expiry is O(due), not O(total). Version history is append-only and partitioned by object for cheap reads of the current version.
