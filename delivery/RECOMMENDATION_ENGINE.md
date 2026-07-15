# Recommendation Engine

> A KDP consumer that produces **explainable, traceable** recommendations. Every recommendation is derived from verified knowledge + rules + context; every one can be traced back to the objects that justify it. It ranks and suggests; it never ranks providers competitively or invents options.

## 1. Principle: recommendations are derived, not authored

A recommendation = a verified object (or set) selected and ordered by rules + context, wrapped with a human-readable reason. It is a *view* over knowledge, not new content. If no verified knowledge supports a recommendation, none is made.

## 2. Recommendation object (implementation)

```json
{
  "rec_id": "<uuid>",
  "type": "nearby_parks|weekend_activity|emergency_care|walking|heat_safety|training|boarding|travel|events",
  "items": [
    { "object_id": "place/.../auditorium_shores",
      "reason": "Off-leash hours verified; within 2mi; low heat-risk this morning",
      "evidence": ["claim:offleash@auditorium_shores", "signal:proximity", "signal:heat_risk=low"] }
  ],
  "context_signature": "<hash>",
  "explain": "Ranked by proximity + verified off-leash status + current heat-risk",
  "generated_at": "<iso8601>"
}
```
Every item carries `evidence` linking to verified objects and derived signals — this is the traceability requirement.

## 3. Recommendation families (framework)

Nearby parks, weekend activities, emergency care, walking recommendations, heat safety, training, boarding, travel, events — each is a *query template* over the graph parameterized by context. New families are new templates; no engine change. **Safety-sensitive families** (emergency care, heat safety) only use safety-floor-approved objects and never rank providers competitively (CPS rule).

## 4. Generation pipeline

```
context → select family template
        → KDP delivery for candidate objects (already gated + fresh)
        → rule signals (heat_risk, flood_risk, wildlife, season…)
        → rank (proximity + relevance + freshness; safety pinned)
        → attach reason + evidence
        → return explainable recommendation
```
Because candidates come through the Delivery Engine, they are already publish-gated, fresh, and provenance-tagged.

## 5. Explainability contract

1. Every recommendation states **why** in plain language.
2. Every item lists the verified objects + signals that justify it (`evidence`).
3. Removing any evidence object (via an event) regenerates or withdraws the recommendation (Dependency Graph `derived_by`).
4. No “black-box” suggestions: if it can’t be explained from verified knowledge, it isn’t shown.

## 6. Prohibited behaviors (inherited from CPS + Lucy)

- No competitive ranking or endorsement of shelters, rescues, or vet providers.
- No medical/diagnostic recommendations; heat/hazard guidance only from vet-approved rule outputs.
- No recommending unverified or community-sourced places as facts.
- No suppression of an applicable safety recommendation for personalization reasons.

## 7. Freshness & events

Recommendations are cached with the same validity model as deliveries. A `knowledge.changed` or `event.opened` (e.g. trail closure) touching an evidence object invalidates and regenerates affected recommendations automatically — a closed trail stops being recommended the moment the closure event fires.

## 8. Why centralize recommendations here

Building recommendations as a KDP consumer (not inside each product) means every surface’s recommendations share the same gating, safety pinning, and explainability — and any product (My Pets, Lucy, a future app) can request the same traceable recommendations through one contract.
