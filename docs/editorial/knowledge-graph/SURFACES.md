# Surfaces — How the Graph Powers Everything

The graph is the product. Every user-facing feature is a **query over verified
knowledge objects**, not hand-authored content. This is what makes PetsInMyCity a
knowledge company whose articles are one output — not a content company.

```
                       Knowledge Graph (verified objects + edges)
                                     │
   ┌──────────┬──────────┬──────────┼──────────┬──────────┬──────────┐
Articles     Lucy     My Pets     Search   Recommend.   Maps       APIs
```

Every surface enforces two things before rendering a fact: a **confidence
threshold** and, when the fact is safety-critical, the **safety floor** (Tier 1–2
sources). Thresholds are defined in
[`MACHINE_SCHEMA.yaml`](MACHINE_SCHEMA.yaml) under `surfaces:`.

---

## 1. Articles (city/neighborhood/park/etc. pages)

**Old model:** "Write a city page." A human researches and writes prose.
**New model:** "Assemble the Austin page from all objects at `place/tx/austin`
whose `verification == verified` and `confidence >= 90`, honoring the safety floor."

The page becomes a **rendering of the graph**:

- Intro/character prose is itself a `verified` assertion on the Place, not free text.
- Each section (parks, vets, hazards, laws, costs) resolves specific edges.
- A section with no qualifying objects **does not render a vague filler paragraph** —
  it either shows nothing or a sourced "we don't yet have verified X for this area".
- The name-swap test is structural: because every claim is a place-scoped object,
  a page literally cannot contain another city's facts.

This is the payoff the sprint brief describes: *the article isn't researched, it's
assembled from verified knowledge.*

---

## 2. Lucy (AI assistant)

Lucy answers from the graph, not from open-ended generation.

- Retrieval is filtered to `verified`, `confidence >= 90`, safety floor on.
- For safety questions (toxicity, venom, heat, emergencies) Lucy may ONLY use
  Tier 1–2 assertions and always surfaces the source and `last_reviewed` date.
- When no qualifying object exists, Lucy says **"I don't have a verified answer for
  that"** and offers the nearest verified fact — never guesses. (Per KNOWLEDGE_OS:
  "we don't know" beats a confident wrong answer, especially on safety.)

---

## 3. My Pets

Personalizes the graph to a specific animal (species/breed/age/needs).

- Uses `suitable_for`, `restricts_breed`, `has_hazard`, `experiences` edges to
  tailor guidance ("for a flat-faced breed in Austin summers, note the pavement
  window and these shaded trails").
- Threshold 85 (slightly lower than articles) because output is caveated and
  private, but the safety floor still applies fully.

---

## 4. Search

- Threshold 75: search may surface `researching`/lower-confidence entities so users
  can find a place, but any **displayed fact** on the result still respects the
  higher render thresholds and shows verification state.
- `aliases` power recall; `located_in`/`nearest` power "near me".
- Safety-critical fields never appear in a snippet unless they clear the floor.

---

## 5. Recommendations

- Only from `Signal.Recommendation` nodes whose `derived_from` are all `verified`.
- Never recommends beyond the evidence (no "best vet" without a defensible basis).
- `comparable_to` powers "cities like yours"; `for_profile` tailors to the pet.

---

## 6. Maps

- Renders `geo` + `located_in` + `nearest`.
- Pins for Org.EmergencyVet are treated as safety-critical: only `verified`,
  monthly-reviewed 24/7 status is labeled as such; unverified status is shown
  neutrally, never as "open now / 24-7".

---

## 7. APIs (future)

- Exposes objects **with their envelope**: consumers always receive `confidence`,
  `verification`, `last_reviewed`, and `sources` alongside each fact.
- Default filter `verified` + `confidence >= 90`; safety floor non-negotiable.
- This is how the graph becomes licensable infrastructure ("local pet intelligence")
  rather than scraped content — the moat described in the expansion strategy.

---

## The unifying rule

> No surface invents facts. Each surface is a **view** with a threshold. Improve the
> graph once, and every surface improves at once. That is why we build knowledge
> first and let articles, Lucy, search, maps, and APIs fall out of it.

See [`ENTITIES.md`](ENTITIES.md) and [`RELATIONSHIPS.md`](RELATIONSHIPS.md) for what
gets queried, and [`../KNOWLEDGE_OS.md`](../KNOWLEDGE_OS.md) for the governing policy.
