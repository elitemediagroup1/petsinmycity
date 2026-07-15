# Architecture Decision Records (Knowledge Graph)

> **Layer:** Schema (knowledge-graph). Lightweight ADRs recording *why* the graph
> is shaped the way it is. Each record is immutable once **Accepted**; a later
> decision supersedes rather than edits it.
> **Scope:** Sprint 4 decisions that extend the Sprint 3 Knowledge OS.

Format: Context -> Decision -> Consequences -> Status. Kept short on purpose.

---

## ADR-0001 — Model the lifecycle as one status axis plus two orthogonal axes

**Context.** The Sprint 4 brief asked for ~14 verification states (Unknown,
Researching, Needs Verification, Verified, Multi-source Verified, Officially
Confirmed, Observed Pattern, Community Pattern, Deprecated, Archived, Outdated,
Needs Review, Rejected). The Sprint 3 seed schema encoded only 5 (`unverified`,
`researching`, `verified`, `disputed`, `stale`). Left unreconciled, data authors
would not know which vocabulary is authoritative.

**Decision.** Treat trust as three orthogonal dimensions, not one list:
1. **Lifecycle status** (`verification`) — a small set of *mutually-exclusive*
   states (11; see `LIFECYCLE.md`).
2. **Confidence** (`confidence` 0-100) — strength of current evidence.
3. **Nature of the claim** (entity/edge `type`) — authoritative fact vs.
   `Signal.ObservedPattern` vs. `Signal.CommunityInsight`.

The brief's 14 labels map onto these three axes: e.g. "Multi-source Verified" =
`verified` + `confidence >= 90`; "Officially Confirmed" = `verified` + Tier-1
source + `confidence >= 95`; "Observed/Community Pattern" are claim *types*, not
lifecycle steps.

**Consequences.** The state machine stays provably unambiguous (no two states
describe the same condition), while every distinction the brief wanted is
preserved and queryable. `MACHINE_SCHEMA.yaml` `verification` enum is expanded
from 5 to 11 values to match. Nothing from Sprint 3 is removed.

**Status:** Accepted (Sprint 4).

---

## ADR-0002 — Rename `stale` to `needs_review`

**Context.** The seed used `stale` for "past its review date." The brief uses
"Needs Review." `stale` also implies the fact is *wrong*, when it usually only
means *unconfirmed-lately*.

**Decision.** Rename the state `stale` -> `needs_review`. Keep a documented
redirect note so any already-written data using `stale` resolves to
`needs_review`. Introduce a separate `outdated` state for facts that are *known
wrong/expired* (the meaning `stale` was overloaded to carry).

**Consequences.** Clearer semantics: `needs_review` = re-check due; `outdated` =
confirmed no-longer-true. This is the only rename in Sprint 4, and it is explained
before being applied, per the brief's instruction.

**Status:** Accepted (Sprint 4).

---

## ADR-0003 — Concepts are national; per-place value lives on the edge

**Context.** Naively, each city page would re-describe breeds, hazards, and laws,
producing near-duplicate "doorway" content across 10,000 cities.

**Decision.** Define each breed/hazard/law-topic/climate pattern **once** as a
`concept/*` entity, and attach place-specific facts to the **edge** joining the
concept to the place (a `Breed x Place` or `Hazard x Place` assertion).

**Consequences.** Uniqueness is structural: a `French Bulldog x Austin` join is
genuinely different from `French Bulldog x Denver` because the *edge facts* differ
(heat window, pavement risk, shaded trails). Scales to millions of distinct views
without duplicating the concept. Reinforces the anti-doorway stance already in the
Editorial OS.

**Status:** Accepted (extends Sprint 3 RELATIONSHIPS.md).

---

## ADR-0004 — Storage-agnostic model; defer the database choice

**Context.** It is tempting to pick a graph database now. Volume, query patterns,
and budget for a decade-scale system are not yet known.

**Decision.** Commit to the *model* (envelope + typed nodes/edges/assertions in
`MACHINE_SCHEMA.yaml`), not a vendor. The model maps cleanly onto a property graph,
a relational node/edge/assertion schema, or a document store with an edge collection.

**Consequences.** The knowledge asset is portable; the storage decision is later
and reversible. Avoids premature lock-in while still letting surfaces be built
against a stable logical schema.

**Status:** Accepted (Sprint 4).

---

## ADR-0005 — Austin ships as a complete *category skeleton*, not facts

**Context.** The brief says: build Austin's complete knowledge graph *structure*,
leave unknown fields empty, do not invent information. A separate 18-object seed
(`austin.entities.yaml`) already demonstrates the shape with a few real, honestly
`unverified` objects.

**Decision.** Add `austin.skeleton.yaml`: an exhaustive *category map* of every
class of object Austin will eventually contain, with empty value fields and
`verification: unverified`. Keep it separate from the seed so "what exists" (seed)
and "what the full shape will be" (skeleton) do not get confused.

**Consequences.** No fabricated facts enter the repo. The skeleton is a research
backlog and a completeness checklist; the seed is the honest current state. Both
reference `MACHINE_SCHEMA.yaml`.

**Status:** Accepted (Sprint 4).

---

## ADR-0006 — Keep the graph inside `docs/editorial/knowledge-graph/`, not a new top-level tree

**Context.** A tempting move was a brand-new top-level `knowledge/` tree. Sprint 3
already placed the schema layer under `docs/editorial/knowledge-graph/` and the
policy under `docs/editorial/KNOWLEDGE_OS.md`, cross-linked from `INDEX.md`.

**Decision.** Extend the existing location. Add lifecycle/architecture/decisions
beside the current schema files; add the Austin skeleton beside the existing seed
in `research/austin/graph/`.

**Consequences.** Avoids documentation sprawl and a second competing home for the
same system. One index, one map, one set of cross-references.

**Status:** Accepted (Sprint 4).
