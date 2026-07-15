# Delivery Engine

> The request/response core of the KDP. Every consumer read runs through this 10-stage pipeline. Maps to a stateless request service in front of the graph, with the Event/Freshness/Dependency subsystems attached. Read `KNOWLEDGE_DELIVERY_PLATFORM.md` first.

## 1. The pipeline

```
 Consumer request (+ DeliveryContext)
   │
   ▼
 1 Validation          – authn/z, contract version, context schema
 2 Rule Evaluation     – apply RULE_ENGINE rules to context
 3 Dependency Resolution – gather all objects the answer depends on
 4 Context Assembly     – build the working set (facts + events + profile)
 5 Safety + Publish Gate – drop/redact anything not gate-eligible for this surface
 6 Freshness Check      – verify as_of/expires_at; refresh or mark stale
 7 Personalization + Ranking – shape + order for the user/persona
 8 Delivery Formatting  – render into the consumer's response contract
 9 Cache Write          – store with validity window + dependency keys
10 Monitoring + Feedback – emit metrics + route feedback signals to CPS
   │
   ▼
 Consumer payload (facts + provenance + validity)
```

## 2. Stage detail

**1. Validation.** Authenticate the consumer, authorize the requested scope, pin the contract version, and validate the incoming `DeliveryContext` against its schema. Reject early; never partially serve an invalid request.

**2. Rule Evaluation.** Run the `RULE_ENGINE` against the context to derive *derived signals* (e.g. “heat-risk = high”). Rules read knowledge + context; they never fabricate facts, only interpret verified ones into guidance flags.

**3. Dependency Resolution.** Ask the `DEPENDENCY_GRAPH` for the closure of objects this response needs (the requested objects plus everything they reference — managing authority, parent place, related hazards, sources). This defines the working set and the cache key.

**4. Context Assembly.** The `CONTEXT_ENGINE` composes the working set: verified facts + any in-window dynamic events + the personalization profile. Output is an immutable *assembled context* passed down the pipeline.

**5. Safety + Publish Gate.** Re-enforce the CPS Publish Gate **at delivery time** for the requesting surface. Objects not eligible for that surface are dropped or redacted; safety-floor objects lacking human approval are never delivered. This is defense-in-depth: authoring-time gating can drift, delivery-time gating cannot be bypassed.

**6. Freshness Check.** The `FRESHNESS_ENGINE` verifies each object's `as_of`/`expires_at`. Expired dynamic events are removed; near-expiry evergreen objects are flagged for refresh but still served with a currency indicator. Nothing stale is served silently.

**7. Personalization + Ranking.** `PERSONALIZATION` shapes and orders results to the user/persona/context (species, location, etc.). Ranking is deterministic and explainable; it reorders verified facts, never invents or hides safety-critical ones.

**8. Delivery Formatting.** Render the assembled, gated, ranked set into the consumer's response contract (e.g. Lucy context block, article section model, map card, API JSON). Each formatter is a pure function of assembled context → contract.

**9. Cache Write.** Persist the payload keyed by (contract version + object ids + context signature) with a validity window = min(object expiries). Cache entries register their dependency keys so events can invalidate precisely.

**10. Monitoring + Feedback.** Emit delivery metrics (latency, cache hit, staleness served=0 target) and route any consumer/user feedback as *signals* into the CPS maintenance queues — never as direct graph edits.

## 3. Response envelope (implementation contract)

Every payload, regardless of consumer, is wrapped in a common envelope so provenance and currency travel with the data:

```json
{
  "contract_version": "kdp.v1",
  "assembled_at": "<iso8601>",
  "context_signature": "<hash>",
  "items": [
    {
      "payload": { /* consumer-specific formatted content */ },
      "provenance": {
        "object_id": "<stable id>",
        "verification_state": "verified",
        "confidence": 0.0,
        "source_tier": "T1",
        "as_of": "<iso8601>",
        "expires_at": "<iso8601|null>",
        "safety_floor": false,
        "approved_by": "<role|null>"
      }
    }
  ],
  "currency": { "fresh": true, "stale_items": [] },
  "explain": { "rules_fired": [], "ranking_reason": "" }
}
```

## 4. Failure modes (explicit)

| Failure | Behavior |
|---|---|
| Object not gate-eligible | Omit; log; never substitute a guess |
| Object expired | Omit dynamic; flag evergreen as stale in `currency` |
| Missing dependency | Serve partial with `explain` noting the gap; enqueue Missing-Information signal |
| No verified answer exists | Return empty `items` + `explain.no_verified_knowledge=true` (consumers must handle honestly; Lucy declines) |
| Rule references missing fact | Rule yields `unknown`, never a default value |

## 5. Why a pipeline (not per-consumer code)

Centralizing filter/gate/freshness/format in one ordered pipeline guarantees that **every** consumer gets the same safety and provenance behavior. Adding a consumer means adding a formatter (stage 8) and a contract — not re-implementing gating. This is what makes the platform safe to scale to unknown future consumers.
