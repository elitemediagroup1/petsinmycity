# Verification Lifecycle & State Machine

> **Layer:** Schema (knowledge-graph). Operationalizes the policy in
> [\`../KNOWLEDGE_OS.md\`](../KNOWLEDGE_OS.md) and the envelope in
> [\`SCHEMA_CONVENTIONS.md\`](SCHEMA_CONVENTIONS.md).
> **Machine source of truth:** [\`MACHINE_SCHEMA.yaml\`](MACHINE_SCHEMA.yaml) \`verification:\`.
> **Status:** normative for the schema layer as of \`schema_version 0.2.0\`.

This file is the single canonical definition of how a knowledge object moves from
"we don't know" to "verified and serving pages" — and back out again to
"outdated" or "archived." It exists because the Sprint 4 brief specified a richer
lifecycle than the seed schema encoded, and those two descriptions needed to be
reconciled deliberately rather than left to drift. See
[\`DECISIONS.md\`](DECISIONS.md) ADR-0001 for the reasoning.

---

## 1. The problem this solves

The brief listed ~14 desired states (Unknown, Researching, Needs Verification,
Verified, Multi-source Verified, Officially Confirmed, Observed Pattern,
Community Pattern, Deprecated, Archived, Outdated, Needs Review, Rejected). The
seed \`MACHINE_SCHEMA.yaml\` encoded only 5 (\`unverified\`, \`researching\`,
\`verified\`, \`disputed\`, \`stale\`).

Both are describing the same reality at different resolutions. Collapsing them
loses safety-relevant nuance (a government record is not the same trust as a
single blog). Encoding all 14 as free-standing states makes the state machine
ambiguous — "Multi-source Verified" and "Officially Confirmed" are really
*confidence levels* of the same state (\`verified\`), and "Community Pattern" /
"Observed Pattern" are *kinds of assertion*, not lifecycle steps.

**Resolution:** model the lifecycle as **one dimension of a small set of
mutually-exclusive \`status\` states**, and push the other distinctions onto two
orthogonal dimensions the envelope already has — \`confidence\` (a number) and the
Signal *entity type* (Observed vs. Community). This keeps the state machine
provably unambiguous while preserving every distinction the brief asked for.

---

## 2. The three orthogonal dimensions

A knowledge object's trust is never one value. It is three:

| Dimension | Field | Answers |
|---|---|---|
| **Lifecycle status** | \`verification\` | *Where in the pipeline is this?* (mutually exclusive) |
| **Confidence** | \`confidence\` (0–100) | *How strong is the evidence right now?* |
| **Nature of the claim** | entity/edge \`type\` | *Is this an authoritative fact, an observed pattern, or a community lead?* |

The brief's 14 labels map cleanly onto these three axes:

| Brief label | Modeled as |
|---|---|
| Unknown | \`verification: unverified\` + \`confidence: 0\` |
| Researching | \`verification: researching\` |
| Needs Verification | \`verification: needs_verification\` |
| Verified | \`verification: verified\` |
| Multi-source Verified | \`verification: verified\` + \`confidence ≥ 90\` |
| Officially Confirmed | \`verification: verified\` + \`confidence ≥ 95\` (Tier-1 gov/operator source) |
| Observed Pattern | \`type: Signal.ObservedPattern\` (may be \`verified\` at pattern-confidence) |
| Community Pattern | \`type: Signal.CommunityInsight\` (lead-only; capped confidence) |
| Deprecated | \`verification: deprecated\` |
| Archived | \`verification: archived\` |
| Outdated | \`verification: outdated\` |
| Needs Review | \`verification: needs_review\` (was \`stale\`; renamed — see ADR-0002) |
| Rejected | \`verification: rejected\` |
| (Disputed) | \`verification: disputed\` — retained from seed; a contradiction was found |

Nothing from the seed is deleted; \`stale\` is renamed to \`needs_review\` (clearer,
and matches the brief) with a redirect note so old data resolves.

---

## 3. Canonical status set (11 states)

\`\`\`
unverified          object exists; no verification attempted yet (Unknown)
researching         actively being sourced by an owner
needs_verification  has a candidate source, awaiting a second/authoritative check
verified            cleared the publish gate; may render (subject to confidence + safety floor)
disputed            a credible contradiction exists; blocked from all surfaces
needs_review        next_review passed OR a trigger fired; re-check required
outdated            was verified, now known-wrong/expired, not yet re-verified
deprecated          superseded by a better object; kept for provenance, not served
archived            intentionally retired (place closed, law repealed); read-only history
rejected            evaluated and found false/unsafe; never serve; retained as a "do-not-repeat"
merged              duplicate folded into a canonical id; leaves a redirect stub
\`\`\`

\`verified\` is the only state that can render on a public surface. Everything else
is internal, a lead, or withheld.

---

## 4. The state machine

\`\`\`
                         +----------------------------+
                         v                            |
  unverified --> researching --> needs_verification --+--> verified
      |               |                 |                     |
      |               |                 +--> rejected          |
      |               +--> rejected                            |
      |                                                        |
      +--> merged (duplicate found at intake)                  |
                                                               |
   verified --(contradiction found)--------> disputed ---------+ (back to researching)
   verified --(next_review passed / trigger)--> needs_review --+ (back to researching)
   verified --(known wrong, not yet re-done)--> outdated ------+ (back to researching)
   verified --(superseded by better object)--> deprecated
   verified --(place closed / law repealed)--> archived
   disputed --(contradiction resolved false)--> rejected
   any state --(confirmed duplicate)----------> merged
\`\`\`

**Rules that make it safe:**

- A safety-critical object (\`safety_critical: true\`) that enters \`needs_review\`,
  \`disputed\`, or \`outdated\` is **withheld immediately** from safety surfaces —
  it does not keep serving while re-verification happens.
- \`disputed\` blocks *all* surfaces until resolved.
- Only \`researching\` → \`verified\` can create a servable fact, and only through
  the publish gate (confidence + source tier + safety floor).
- \`rejected\` and \`archived\` are terminal for serving but never deleted —
  provenance and "do-not-repeat" memory are permanent assets.

---

## 5. Confidence over time (why status alone is not enough)

Confidence is **time-decaying** for volatile facts. Each object carries an
\`update_frequency\` (static / seasonal / live) and a \`review_cadence\`. The system
does not silently trust an old \`verified\`:

- When \`next_review\` passes, the object is moved to \`needs_review\` and its
  effective confidence for rendering is discounted until re-verified.
- Live/volatile facts (emergency-vet 24/7 status, event dates, hours, prices)
  decay fastest; static facts (a breed's coat type) effectively never decay.
- Re-verification against a fresh source resets \`last_reviewed\`, recomputes
  \`next_review\`, and restores full confidence — appending, never overwriting,
  the source history so the change is auditable.

Confidence bands (see \`SCHEMA_CONVENTIONS.md\` §6) gate *where* a \`verified\` fact
may appear; the lifecycle gates *whether* it may appear at all. Both must pass.

---

## 6. Transition ownership & triggers

- Every transition has an **actor** (\`owner\` role or an automated job) recorded
  in the object's history — no anonymous state changes.
- **Calendar triggers:** \`next_review\` passing → \`needs_review\`.
- **Event triggers** (override the calendar → immediate \`needs_review\` or
  \`disputed\`): place closure, law change, disaster/flood, product recall, new
  veterinary guidance. These mirror the immediate-review triggers in
  \`../PUBLISH_GATE.md\`.
- **Contradiction:** any new source that conflicts with a \`verified\` assertion
  forces \`disputed\` and notifies the owner.

---

## 7. Where this is enforced

The states, transitions, and per-surface render gate live in machine-readable
form in [\`MACHINE_SCHEMA.yaml\`](MACHINE_SCHEMA.yaml) (\`verification:\`,
\`gates:\`, \`surfaces:\`). Any surface (article, Lucy, My Pets, search,
recommendations, maps, API) applies the same rule before rendering a fact:

\`\`\`
render(fact) IF fact.verification == verified
             AND fact.confidence >= surface.threshold
             AND (NOT fact.safety_critical OR fact.max_source_tier <= 2)
\`\`\`

Improve an object once and every surface improves at once. That is the entire
point of modeling knowledge as a graph rather than as prose inside articles.
