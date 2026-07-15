# Event System

> The propagation backbone of the KDP. When knowledge changes, one event fans out to every dependent. Maps to an event bus / stream (e.g. topic-per-domain on a durable log). Read `DELIVERY_ENGINE.md` and `DEPENDENCY_GRAPH.md` alongside this.

## 1. Why event-driven

The core requirement: one verified fact changes → everything downstream updates automatically. Polling the graph from N consumers does not scale and serves stale data between polls. Instead the graph (via the CPS) emits a single change event; the KDP resolves dependents and refreshes exactly what is affected. Propagation cost ∝ affected dependents, not total consumers.

## 2. Event taxonomy

| Event | Emitted when | Primary handlers |
|---|---|---|
| `knowledge.created` | New verified object admitted | Dependency indexer, Search indexer |
| `knowledge.changed` | Fact/claim value or state changes | Freshness (invalidate), all dependents |
| `knowledge.deprecated` | Object outdated/deprecated | Cache purge, consumers drop it |
| `event.opened` | Dynamic event begins (flood watch, closure) | Notification, Rules, affected surfaces |
| `event.closed` | Dynamic event ends/expires | Cache purge, Notification (all-clear) |
| `source.changed` | Monitored source updated (Freshness) | Opens CPS review; may emit `knowledge.changed` |
| `gate.reclassified` | Publish-gate class changes | Delivery re-eval (may add/remove from a surface) |
| `feedback.received` | Consumer/user signal | Routed to CPS maintenance queue (never auto-edit) |

## 3. Event envelope (implementation contract)

```json
{
  "event_id": "<uuid>",
  "type": "knowledge.changed",
  "occurred_at": "<iso8601>",
  "object_id": "<stable id>",
  "change": { "field": "leash_rule", "from_version": 11, "to_version": 12 },
  "scope": { "place": "place/us/tx/austin/...", "domain": "leash-rules" },
  "validity": { "as_of": "<iso8601>", "expires_at": "<iso8601|null>" },
  "safety_floor": false,
  "origin": "cps.publish-gate"
}
```

## 4. Worked example: Austin leash rule changes

```
Austin Parks updates leash ordinance
  → CPS re-verifies + re-gates the claim (human-approved if safety-floor)
  → graph writes claim v12; emits knowledge.changed{object=leash_rule@austin}
  → Event System publishes to the bus
  → Dependency Graph resolves dependents:
        Austin city page section, Texas page rollup, Search doc,
        Map card(s) for affected parks, Recommendation inputs,
        My Pets rule-based warnings, Lucy retrieval index
  → Freshness Engine invalidates caches for those delivery keys + stores v12 (v11 retained for history)
  → Consumers refresh (push for subscribed, next-read for pull)
  → Notification Engine evaluates: material rule change → emit alerts to relevant users
```
No consumer re-read the whole graph; each got exactly the one changed fact and anything derived from it.

## 5. Delivery semantics

- **Durable + ordered per object.** Events for a single object are ordered by version so consumers never apply an older change after a newer one.
- **At-least-once delivery + idempotent handlers.** Handlers key on `(object_id, to_version)` so replays are safe.
- **Push vs pull.** Latency-sensitive/subscribed consumers (Lucy sessions, Notifications, mobile) get push; page/article caches refresh on next read via cache invalidation. Consumers declare their mode in their contract.
- **Safety fast-path.** `safety_floor` and disaster events bypass normal batching for immediate propagation (aligns with CPS asymmetric de-publish: fast to withdraw risk).

## 6. Backpressure & scale

At 10,000 cities a burst (e.g. a regional heat event) can touch many objects at once. The bus partitions by `scope.place`/region so hot regions don't block others; handlers scale horizontally; fan-out is bounded by the Dependency Graph closure, not by global consumer count.

## 7. What events never do

Events carry *change notifications*, not authority. An event never causes a fact to be created or auto-edited; only the CPS (with its gates and human approvals) writes to the graph. `feedback.received` and `source.changed` open reviews — they do not mutate knowledge.
