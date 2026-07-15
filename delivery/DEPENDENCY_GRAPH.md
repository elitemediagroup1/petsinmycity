# Dependency Graph

> Tracks who-depends-on-what so a single change regenerates exactly the right deliveries — no more, no less. Maps to a directed index (adjacency lists / a graph store) maintained alongside the knowledge graph. Drives the Event System fan-out and the Freshness Engine invalidation.

## 1. What every object must know

For each knowledge object, the dependency index records:

- **Depends-on** — the objects this one references (parent place, managing authority, sources, related hazards).
- **Depended-on-by** — objects that reference this one (reverse edges).
- **Consumed-by** — the delivery contracts/surfaces that read this object (article section, map card, Lucy index, My Pets rule, API endpoint).
- **Derives** — rule outputs / recommendations computed from this object.
- **Cache keys** — the cached deliveries whose validity depends on this object.

## 2. Edge model (implementation)

```
NODE  = knowledge object id  |  delivery contract id  |  rule id  |  cache key
EDGE  = { from, to, kind }
  kind ∈ { references, managed_by, sourced_from,
           consumed_by, derived_by, cached_as }
```
Reverse edges are maintained on every write so “what depends on X” is an O(1) lookup, not a graph scan.

## 3. Change impact resolution

When `knowledge.changed{X}` arrives, the Dependency Graph computes the **impact closure**:

```
impacted(X) = {X}
            ∪ depended_on_by*(X)      // transitive reverse references
            ∪ derived_by(X)           // rule outputs / recommendations
            ∪ consumed_by(all above)  // delivery contracts / surfaces
            ∪ cached_as(all above)    // cache keys to invalidate
```
Traversal is bounded and de-duplicated. The result is handed to Freshness (invalidate `cached_as`), consumers (`consumed_by` refresh), and Notifications (if user-facing).

## 4. What changes / what goes stale / what regenerates

| Question | Answered by |
|---|---|
| Who depends on it? | `depended_on_by*` |
| Who consumes it? | `consumed_by` |
| What changes if it changes? | the impact closure |
| What becomes stale? | `cached_as` over the closure |
| What must be regenerated? | derived outputs + affected delivery formats |

## 5. Example closure (Austin leash rule)

```
leash_rule@austin (changed)
  depended_on_by: austin_city_page.leash_section, texas_page.tx_rollup
  derived_by:     rec.walking_rules, mypets.rule.offleash_warning
  consumed_by:    search_doc.austin_leash, map_card.auditorium_shores,
                  lucy_index.austin_rules, api.v1.places.austin.rules
  cached_as:      [… delivery cache keys …]
→ invalidate those caches, refresh those consumers, regenerate those derivations
```

## 6. Integrity rules

1. **No dangling consumers.** If a consumer reads an object, a `consumed_by` edge must exist; the Delivery Engine registers it at cache-write time (stage 9).
2. **No orphan derivations.** Every rule output records its input objects as `derived_by` edges so it is invalidated when inputs change.
3. **Reverse edges are authoritative for fan-out.** The Event System trusts `depended_on_by`/`consumed_by`; missing reverse edges = silent staleness, so writes are transactional with the graph write.
4. **Closures are bounded.** Cycles are broken by visited-set traversal; extremely high-fan-out objects (e.g. a state node) are flagged for batched propagation.

## 7. Relationship to the Knowledge Graph

The knowledge graph already models *semantic* relationships (a park is `managed_by` an agency). The dependency graph is the *operational* overlay derived from those relationships **plus** delivery/rule/cache edges that only exist at the KDP layer. It never changes the meaning of the knowledge graph; it indexes consumption of it.
