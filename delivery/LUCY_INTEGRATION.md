# Lucy Integration

> How Lucy consumes the KDP. **Lucy is not redesigned here** (see `../docs/lucy-brain.md`). This is the contract between Lucy and the delivery platform, aligned with Lucy's existing Safety Rules, Medical Boundaries, and Hallucination-Prevention sections.

## 1. Lucy's relationship to the KDP

Lucy reasons; the KDP supplies verified knowledge. Lucy never reads the graph directly and never treats its own trained parameters as a source of local facts. For any factual local claim, Lucy requests a delivery context from the KDP and answers **only** from what the KDP returns.

## 2. What Lucy should request

| Lucy need | KDP request |
|---|---|
| Answer a local question | delivery for (topic, location, pet context) |
| Emergency help | delivery with `situation.emergency=true` (pins emergency-care facts) |
| Personalized guidance | delivery with consented My Pets context |
| “Is this current?” | reads `currency` + `as_of` from the envelope |
| Cite a source | reads `provenance.source_tier` + object id |

Lucy sends a `DeliveryContext`; the KDP returns the standard envelope (facts + provenance + currency + explain).

## 3. What Lucy must never do

1. **Never invent local facts.** If `items` is empty or `explain.no_verified_knowledge=true`, Lucy says it doesn't have verified information and offers to help another way — it does not guess. (Matches Lucy Hallucination-Prevention.)
2. **Never state a safety/medical fact the KDP didn't deliver as verified + approved.** Medical/emergency claims must come from safety-floor-approved objects. (Matches Lucy Medical Boundaries + Emergency Escalation.)
3. **Never present stale as current.** If `currency.fresh=false`, Lucy discloses the information may be out of date and, for safety topics, defers to the official source.
4. **Never rank/endorse one provider over another** (matches CPS + Lucy Google-Places behavior) — it presents verified options neutrally.
5. **Never bypass consent** — uses pet/user context only when the envelope indicates it was consent-assembled.

## 4. How Lucy explains uncertainty

- **No knowledge:** “I don’t have verified information on that for [place] yet.”
- **Low confidence:** surfaces the fact with an explicit hedge tied to `provenance.confidence`.
- **Stale:** “This was verified on [as_of]; it may have changed — here’s the official source.”
- **Conflicting:** presents the verified position and notes a dispute exists (`disputed` state), never resolves it by guessing.

## 5. How Lucy cites confidence & provenance

Lucy maps `provenance` to user-friendly citation: source tier → plain phrasing (“according to the City of Austin’s official ordinance…”), confidence → hedging strength, `as_of` → recency phrasing. Every factual sentence in a Lucy answer is backed by at least one delivered object id (internally auditable).

## 6. How Lucy combines knowledge with reasoning

Lucy may **reason over** verified facts (compare, summarize, sequence steps, apply a delivered rule output) but may not **add** facts. Reasoning that produces guidance (“it’s hot and your dog is brachycephalic, so…”) must be grounded in delivered rule signals (`heat_risk`) that themselves trace to verified veterinary/climate claims. If the grounding is missing, Lucy asks a clarifying question or defers.

## 7. Request/response sketch

```
Lucy → KDP: DeliveryContext{ consumer:lucy, topic:"off-leash rules", location:austin, pet:{...} }
KDP → Lucy: envelope{ items:[leash_rule@austin v12 + provenance], currency:fresh, explain:{rules_fired:[]} }
Lucy composes answer strictly from items; cites City of Austin; notes as_of; offers official link.
```

## 8. Why route Lucy through the KDP

It makes Lucy's safety and anti-hallucination rules *structurally enforced*: Lucy literally has no other source of local facts, so “don’t invent” becomes “can’t invent.” Knowledge improvements propagate to Lucy instantly via events, with no retraining.
