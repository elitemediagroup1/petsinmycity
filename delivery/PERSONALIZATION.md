# Personalization

> Shapes and ranks verified knowledge for the user/persona/context. Runs at Delivery Engine stage 7. **Personalization changes emphasis and order, never truth.** Two users may see different arrangements of the same verified facts; neither ever sees a fabricated or safety-suppressed fact.

## 1. What personalization may and may not do

| May | May not |
|---|---|
| Reorder results by relevance to context | Hide a safety-critical fact |
| Choose which verified facts to emphasize | Invent a fact not in the graph |
| Adjust tone, units, format | Change a fact's value or confidence |
| Prefer nearer/saved locations | Suppress an emergency/hazard applicable to the user |
| Filter out irrelevant domains | Bypass the Publish Gate |

Safety facts are **non-suppressible**: if a hazard applies to the user's context, it is always surfaced regardless of preferences.

## 2. Persona model

Personas are context bundles, not identities. Examples (framework, not hardcoded): dog owner, cat owner, senior-pet owner, puppy owner, multi-pet household, apartment dweller, house-with-yard, traveler, local resident, visitor, veterinarian, shelter volunteer. A persona is derived from the DeliveryContext (My Pets profile + situation) and maps to a *relevance profile*, not to a different knowledge set.

## 3. Relevance profile (implementation)

```json
{
  "persona": "senior_dog_owner_apartment",
  "boosts":  [ "low_impact_walks", "heat_sensitivity", "nearby_parks", "joint_health_concepts" ],
  "demotes": [ "high_intensity_activities" ],
  "format": { "tone": "reassuring", "units": "imperial", "reading_level": "plain" },
  "non_suppressible": [ "safety", "emergency", "applicable_hazards" ]
}
```
Boosts/demotes adjust ranking weights; `non_suppressible` categories always pass through.

## 4. Ranking model

```
score(item) = base_relevance(item, context)
            + persona_boost(item)
            − persona_demote(item)
            + proximity(item, location)
            + freshness_bonus(item)
subject to: non_suppressible items pinned above the fold
```
Ranking is deterministic and explainable; the response envelope's `explain.ranking_reason` states why the top items ranked where they did. No ML black box is required for v1; weights are transparent and tunable.

## 5. Personalization inputs & consent

All personalization inputs come from consented profile data assembled by the Context Engine. With no profile, delivery falls back to context-only relevance (location/environment). Personal data is never written to the knowledge graph and never leaves the assembly/ranking step.

## 6. Examples of same-fact, different-delivery

- A verified “off-leash hours at Park X” fact ranks high for a local dog owner, lower for a cat owner, and is accompanied by a heat-risk note for a senior brachycephalic dog in summer — the *fact* is identical; emphasis differs.
- An emergency-vet fact is demoted in normal browsing but pinned when `situation.emergency = true` — and never suppressed for anyone it could help.

## 7. Why centralized personalization

Centralizing ranking in the KDP guarantees the non-suppressible safety rule holds for every consumer. A consumer cannot accidentally personalize a hazard away, because suppression of safety categories is impossible at the platform layer.
