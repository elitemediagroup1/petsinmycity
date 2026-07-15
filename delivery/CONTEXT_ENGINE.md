# Context Engine

> Assembles the per-request `DeliveryContext` so knowledge is never delivered blindly. Runs at Delivery Engine stage 4. Every response is built from context; the same object can be delivered differently depending on who/where/when is asking.

## 1. The DeliveryContext object (implementation contract)

```json
{
  "request_id": "<uuid>",
  "consumer": { "id": "lucy|articles|search|maps|recs|mypets|notifications|api", "contract": "kdp.v1" },
  "location": { "place_id": "place/us/tx/austin", "lat": null, "lng": null, "precision": "city" },
  "pet": { "species": null, "breed_group": null, "age_band": null, "medical_flags": [] },
  "environment": { "weather": null, "air_quality": null, "season": null, "local_time": null },
  "situation": { "traveling": false, "emergency": false, "behavior_topic": null },
  "user": { "persona": null, "preferences": {}, "consent": {} },
  "events": { "active": [] },
  "as_of": "<iso8601>"
}
```
Fields are optional; the engine degrades gracefully. Missing context widens scope (e.g. no pet → general guidance), it never invents specifics.

## 2. Context dimensions

| Dimension | Source | Effect on delivery |
|---|---|---|
| Location | request / place resolution | scopes to city/county/state knowledge |
| Species / Breed / Age | My Pets profile / request | selects applicable rules + guidance |
| Medical conditions | My Pets (consented) | raises caution; may gate certain guidance to vet-approved only |
| Weather / Season / Time | environment signals (dynamic) | activates hazard rules; time-bounded |
| Travel | situation | prefers visitor-relevant + destination knowledge |
| Emergency | situation | prioritizes safety + emergency-care surfaces |
| Behavior topic | request | narrows to relevant concept subgraph |
| User preferences | user profile (consented) | tone, units, saved locations |
| Community / Current events | active events | injects in-window dynamic knowledge |

## 3. Assembly algorithm

```
resolve location → place subgraph
attach pet + user profile (consent-checked)
attach environment + active events (in-window only)
select knowledge scope = intersection(place, topic, applicable domains)
hand scope to Dependency Graph for closure
produce immutable AssembledContext (facts + events + profile + derived signals)
```
The AssembledContext is immutable and hashed (`context_signature`) so identical contexts hit cache and outputs are reproducible.

## 4. Privacy & consent

1. Pet medical data and user preferences are used **only** with stored consent; absent consent, the engine falls back to general context.
2. Personal context is used for *assembly and ranking*, never written into the knowledge graph.
3. Context signatures hash sensitive fields so cache keys don't leak personal data.
4. The engine follows least-context: it requests only the dimensions a given consumer contract needs.

## 5. Location resolution

Location resolves to a stable `place_id` in the knowledge graph (city → county → state chain). Coordinates, when provided, map to the nearest managed place(s) for map/relevance use. Resolution reuses the graph's place hierarchy; it does not create new places.

## 6. Graceful degradation ladder

`full context` → `location + species` → `location only` → `region only` → `national general`. At each step the engine serves the most specific *verified* knowledge available and labels the scope, rather than fabricating specificity it doesn't have.

## 7. Why context assembly is centralized

If each consumer assembled its own context, safety/consent handling would diverge. Centralizing it means every surface — Lucy, a map card, an API call — gets identical, consent-safe, reproducible context, and new context dimensions become available to all consumers at once.
