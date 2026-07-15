# Knowledge Delivery Platform (KDP)

> **Status:** Sprint 7 architecture. The intelligence layer between verified knowledge and every product that consumes it.
> **Read first:** `../docs/editorial/knowledge-graph/` (graph + schema + lifecycle), `../production/CITY_PRODUCTION_SYSTEM.md` (how knowledge is manufactured).
> **Optimized for implementation.** Every section maps to a concrete service, event topic, data model, or API surface so engineers can build directly from it.

---

## 0. The one-sentence purpose

The KDP is the **single mediating layer** through which all products read verified knowledge. **No consumer reads raw knowledge objects directly.** Products request *delivery contexts*; the KDP filters, ranks, personalizes, applies safety + freshness + permissions, resolves dependencies, formats, caches, versions, and returns a rendered, traceable payload — then keeps it up to date via events.

```
  Knowledge Graph  ──►  KNOWLEDGE DELIVERY PLATFORM  ──►  Consumers
  (verified objects)      (filter / rank / personalize        (Lucy, Articles, Search,
                           / safety / freshness / perms         Maps, Recs, My Pets,
                           / localize / cache / version         Notifications, APIs,
                           / events / dependencies / context)   Mobile, EMG products)
```

## 1. Why this layer must exist (the core problem)

When **one verified fact changes** (e.g. Austin Parks changes a leash rule), the change must propagate automatically to Lucy, the Austin page, the Texas page, Search, Maps, Recommendations, My Pets, and future apps/APIs — without any consumer re-reading the whole graph and without any consumer inventing or caching stale facts. Point-to-point integration between the graph and N consumers is O(N) coupling that breaks at scale. The KDP replaces it with a single hub: the graph emits one change event; the KDP resolves every dependent and refreshes every affected delivery.

## 2. Design tenets (binding)

1. **Graph is the source of truth; KDP is the only reader-of-record.** Consumers never bypass the KDP to touch objects. (ADR-0020.)
2. **Nothing is delivered that hasn't cleared the Publish Gate** for that surface. Safety-floor objects require the human approvals defined by the CPS. The KDP enforces this at delivery time, not just at authoring time.
3. **Every payload is traceable.** Each delivered fact carries its knowledge-object id, confidence, verification state, source tier, and `as_of`/`expires_at`. A consumer can always answer “where did this come from and is it current?”
4. **Dynamic ≠ evergreen at delivery, too.** Live events (weather, closures) are delivered with explicit validity windows and never cached as timeless.
5. **Read-only to the graph.** The KDP transforms and assembles; it never writes facts. Feedback becomes *signals* routed to the CPS maintenance queues, not direct edits.
6. **Additive & versioned.** Delivery contracts are versioned so consumers (including future ones) never break when the platform evolves.

## 3. The KDP component map

| Component | Doc | Service analogue | Responsibility |
|---|---|---|---|
| Delivery Engine | `DELIVERY_ENGINE.md` | request/response service | The 10-stage pipeline every request runs through |
| Event System | `EVENT_SYSTEM.md` | event bus / stream | Propagates knowledge changes to dependents |
| Dependency Graph | `DEPENDENCY_GRAPH.md` | graph index | Tracks who-consumes-what; drives regeneration |
| Freshness Engine | `FRESHNESS_ENGINE.md` | scheduler + version store | Expiry, refresh, version history, rollback |
| Rule Engine | `RULE_ENGINE.md` | rules service | Transforms knowledge + context into guidance |
| Context Engine | `CONTEXT_ENGINE.md` | context assembler | Builds the per-request context object |
| Personalization | `PERSONALIZATION.md` | profile service | Shapes delivery to the user/persona |
| Lucy Integration | `LUCY_INTEGRATION.md` | consumer contract | How Lucy requests + cites knowledge |
| Recommendation Engine | `RECOMMENDATION_ENGINE.md` | consumer service | Explainable, traceable recommendations |
| Notification Engine | `NOTIFICATION_ENGINE.md` | consumer service | Event-driven alerts |
| API Architecture | `API_ARCHITECTURE.md` | API gateway | Internal/external APIs, versioning, auth, limits |
| Decisions | `DECISIONS.md` | — | ADRs 0019+ |

## 4. Canonical request flow (happy path)

`Consumer request + context` → Delivery Engine validates → Context Engine assembles → Dependency resolution → Rule + Personalization + Safety + Freshness filters → Format for consumer → cache with validity window → return payload with provenance. Detailed in `DELIVERY_ENGINE.md`.

## 5. Canonical change flow (event path)

`Graph object changes` → Event System publishes `knowledge.changed` → Dependency Graph resolves affected deliveries + consumers → Freshness Engine invalidates caches + versions the change → affected consumers refreshed (push or next-read) → Notification Engine may emit user-facing alerts. Detailed in `EVENT_SYSTEM.md`.

## 6. How the KDP extends prior sprints (no duplication)

| Prior system | KDP extension |
|---|---|
| Knowledge Graph + Schema | KDP is the mediated read layer over it; adds no new fact types |
| `SURFACES.md` (conceptual surface mapping) | KDP is the *engineered* realization of it: concrete pipeline, events, contracts |
| Publish Gate (CPS) | Enforced again at **delivery time** per surface |
| Maintenance System (CPS) | Freshness Engine + feedback signals feed the CPS maintenance queues |
| Lucy / My Pets docs | Not redesigned; given a formal consumer contract to the KDP |
| ADR log (0001–0018) | Continued at 0019+ in `DECISIONS.md` |

## 7. Scale targets

Designed for 10,000 cities, 100,000+ locations, millions of entities/users/pets, real-time updates, and future mobile/API/partner consumers. The hub-and-spoke event model keeps propagation cost proportional to *affected dependents*, not to total consumers or total graph size.
