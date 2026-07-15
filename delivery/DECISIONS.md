# KDP Architecture Decisions (Sprint 7)

> Continues the ADR log: KG `knowledge-graph/DECISIONS.md` (0001–0006) → Austin pilot (0007–0012) → `production/DECISIONS.md` (0013–0018) → here (0019+). Each ADR: problem, alternatives, decision, trade-offs, future implications.

---

## ADR-0019 — Base the Sprint 7 branch on `feature/city-production-system`, not `main`
**Problem:** The brief says branch from latest `main`, but PR #6 (CPS) is an open draft not yet merged, so `main` lacks the `production/` layer the KDP must cross-reference.
**Alternatives:** (a) branch off `main` — KDP can't reference `production/*` and the tree lacks CPS; (b) branch off `feature/city-production-system` — KDP sees full stack, clean KDP-only diff; (c) wait for the user to merge PR #6 first.
**Decision:** Base Sprint 7 on `feature/city-production-system` (PR #7 targets it as base). Mirrors the Sprint 5 precedent of building on not-yet-merged foundation.
**Trade-offs:** PR #7 is stacked; it should merge after PR #6. Clean, reviewable KDP-only diff is worth the stacking.
**Future implications:** When PR #6 merges to main, PR #7 can be retargeted to main (its own commits remain the KDP delta). Flagged to the user in the completion report.

## ADR-0020 — The KDP is the sole reader-of-record; no consumer reads the graph directly
**Problem:** N consumers reading raw objects = O(N) coupling, divergent safety/freshness handling, and stale caches.
**Alternatives:** (a) shared client library each consumer embeds; (b) direct graph reads with conventions; (c) a single mediating delivery platform.
**Decision:** All reads go through the KDP Delivery Engine. Consumers get envelopes, never raw objects.
**Trade-offs:** One more hop + a platform to operate; gains uniform gating, provenance, freshness, and single-point evolvability.
**Future implications:** New consumers (mobile, partners, EMG) attach without re-implementing safety; the graph can evolve behind a stable contract.

## ADR-0021 — Enforce the Publish Gate again at delivery time (defense-in-depth)
**Problem:** Authoring-time gating can drift (a gate class changes after an object was cached/served).
**Alternatives:** (a) trust authoring-time gating only; (b) re-check at delivery.
**Decision:** Delivery Engine stage 5 re-enforces per-surface gate eligibility and safety-floor approval on every request.
**Trade-offs:** Slight per-request cost; guarantees no ungated/unapproved fact is ever served even if upstream state changed.
**Future implications:** `gate.reclassified` events can safely add/remove objects from surfaces at runtime.

## ADR-0022 — Rules and thresholds are data, not code
**Problem:** 10,000 cities have different thresholds; hardcoding them means code deploys for every guidance change and blocks per-city correctness.
**Alternatives:** (a) hardcoded rules; (b) rules-as-data authored/gated like knowledge.
**Decision:** The Rule Engine executes versioned rule *data* that references verified local claims as evidence; safety rules are Vet/Legal-owned.
**Trade-offs:** Need a rule authoring/testing/gating path; gains per-city correctness and no-deploy guidance updates.
**Future implications:** Veterinary guidance updates propagate as data + events; new hazard dimensions need no engine change.

## ADR-0023 — Personalization may reorder but never suppress applicable safety facts
**Problem:** Personalization could accidentally hide a hazard a user needs.
**Alternatives:** (a) full personalization freedom; (b) safety categories non-suppressible at the platform layer.
**Decision:** Safety/emergency/applicable-hazard categories are pinned and non-suppressible in ranking; personalization affects only emphasis/order/format.
**Trade-offs:** Less ranking freedom; guarantees no consumer can personalize a hazard away.
**Future implications:** Safe to let products define relevance profiles without safety risk.

## ADR-0024 — Feedback and source changes open reviews; they never edit knowledge
**Problem:** Auto-applying user feedback or detected source changes could inject unverified facts.
**Alternatives:** (a) auto-edit on trusted signals; (b) treat all such signals as leads into the CPS.
**Decision:** `feedback.received` and `source.changed` route to CPS maintenance queues; only the CPS (gates + human approval) writes facts.
**Trade-offs:** Changes take a review cycle; preserves the “no fabricated certainty” guarantee end-to-end.
**Future implications:** The delivery layer can safely ingest real-world signals at scale without weakening verification.

## ADR-0025 — Content-neutral core so the platform can serve other EMG properties
**Problem:** Rebuilding gating/freshness/provenance/events for each future EMG property would be wasteful and unsafe.
**Alternatives:** (a) pet-specific platform, rebuilt per property; (b) content-neutral core + per-property data & formatters.
**Decision:** The Delivery/Event/Dependency/Freshness/Rule/Context engines are domain-agnostic; a property supplies its own schema-conformant graph, rule data, and formatters.
**Trade-offs:** Slightly more abstraction now; enables reuse across CareInMyCity, ServicesInMyCity, and future EMG products without core changes.
**Future implications:** One safety-critical platform, many properties — the decade-scale target.

---

## Not changed this sprint
- **No machine-schema change.** The KDP reads the existing graph; it adds delivery/rule/cache overlays, not new fact types.
- **Lucy, My Pets, website not redesigned.** They receive contracts to the KDP; their existing specs stand.
