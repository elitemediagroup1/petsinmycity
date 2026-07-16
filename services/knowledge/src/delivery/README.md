# Knowledge Delivery Read Layer

The single supported read path between stored knowledge (PR #9 `KnowledgeStore`)
and every future consumer (Lucy, articles, search, maps, recommendations, My
Pets, future APIs). Consumers never read repositories or SQLite directly — they
ask the delivery service, which enforces trust, freshness, provenance, and
safety at delivery time and returns one standardized envelope.

Contracts implemented (frozen Architecture v1.0, not redesigned):
`delivery/KNOWLEDGE_DELIVERY_PLATFORM.md`, `delivery/DELIVERY_ENGINE.md`,
`delivery/FRESHNESS_ENGINE.md`, `docs/editorial/knowledge-graph/LIFECYCLE.md`,
`docs/editorial/knowledge-graph/MACHINE_SCHEMA.yaml`.

## Usage

```js
const { KnowledgeStore } = require('../KnowledgeStore');
const { KnowledgeDeliveryService } = require('./index');

const store = KnowledgeStore.open('knowledge.db');
const delivery = new KnowledgeDeliveryService(store);

const result = delivery.getKnowledge({
  subjectId: 'place/tx/austin',   // required
  predicate: 'located_in_county', // required
  asOf: '2025-06-01T00:00:00Z',   // optional ISO-8601; defaults to now
  consumer: 'lucy',               // optional; must be a known consumer
  context: { persona: 'new-owner' } // optional; recorded, never used to hide safety facts
});
```

## Result states

Branch on `result.state` (never parse message strings):

| State          | Meaning                                                        |
|----------------|----------------------------------------------------------------|
| `resolved`     | one admissible claim selected; `items[0]` holds the envelope   |
| `conflict`     | two credible claims tie on every precedence rule; see `conflicting` |
| `not_found`    | no stored claim matches subject + predicate                    |
| `inadmissible` | records exist but none clears the delivery gate; see `reasons`  |
| `expired`      | the best candidate is a dynamic fact past its `valid_until`     |

Thrown errors (bad input / backend): `InvalidRequestError`, `StorageFailureError`.

## Delivery gates (in order)

1. **Admission** — only `verification: verified` may be delivered as fact. All other
   lifecycle states (unverified, researching, needs_verification, disputed,
   needs_review, outdated, deprecated, archived, rejected, merged) are suppressed.
2. **Freshness** — dynamic facts past `valid_until` are dropped; future `valid_from`
   is not yet deliverable; evergreen past `next_review` is delivered but flagged
   `needs_review` (surfaced in `currency.stale_items`).
3. **Provenance** — a claim with no linked source fails the gate. Provenance is
   assembled from real `sources`, never fabricated.
4. **Safety floor** — `safety_critical` claims additionally require `verified` +
   confidence >= 90 + a Tier-1/Tier-2 source + current freshness. Consumer context
   can never suppress a safety fact that otherwise passes.
5. **Ranking** — deterministic: official confirmation > source tier > confidence >
   version > freshness > effective date > recency > stable id tie-break. A genuine
   tie yields a `conflict` result rather than an arbitrary winner.

## Envelope

Follows the canonical `kdp.v1` envelope (`contract_version`, `assembled_at`,
`items[].payload`, `items[].provenance`, `currency`, `explain`) and extends the
payload with `identity`, `value`, `trust`, `freshness` blocks plus a `delivery`
metadata block (`delivered_at`, `consumer`, `trace_id`, `warnings`).

## Tests

```
cd services/knowledge
npm install
npm test            # runs storage + delivery + Austin integration tests
```

Austin integration tests import the real verified dataset from
`research/austin/pilot/data/` and prove verified facts are delivered while the
real `needs_verification` fact (red-bud-isle off-leash) is suppressed. No research
fact is modified for testing.

## Next PR (recommended)

PR #11: a thin internal read API (`/api/knowledge`) over this service, then wire
Lucy retrieval so Lucy answers only from admitted envelopes. No consumer should
bypass this read path.
