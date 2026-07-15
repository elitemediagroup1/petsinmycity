# CPS Architecture Decisions (Sprint 6)

> Continues the ADR log from the Knowledge Graph `DECISIONS.md` (ADR-0001..0006) and the Austin pilot `SCHEMA_FINDINGS_AND_ADRS.md` (ADR-0007..0012). Sprint 6 ADRs start at **0013**. Each ADR records: context/problem, alternatives considered, decision, consequences, migration impact.

These are *operational/process* decisions. None change the machine schema; where a schema change would be needed, it is deferred to the CKO with a note (none required this sprint).

---

## ADR-0013 — Introduce a `production/` layer distinct from `docs/editorial/`
**Context:** Sprints 3–5 produced philosophy + architecture + a proof. There was no home for the *operational* system (workflow, roles, queues, dashboards).
**Alternatives:** (a) expand `docs/editorial/` with operational files; (b) put ops docs inside `research/`; (c) a new top-level `production/`.
**Decision:** Create top-level `production/`. Editorial/Knowledge docs describe *what good is*; production describes *how we manufacture it repeatedly*. Mixing them would blur the stable-standard vs evolving-process boundary.
**Consequences:** Clear separation; `docs/editorial/INDEX.md` gains a cross-reference. Standards remain the source of truth; production references them.
**Migration:** None. Additive only; no existing file moved or rewritten.

## ADR-0014 — Add an explicit Safety-Floor Check stage before the Publish Gate
**Context:** In the Austin pilot, safety-sensitive claims (emergency-vet status, hazard floors) were verified with extra rigor, but the workflow had no *structural* place guaranteeing they branch to a human before the general gate.
**Alternatives:** (a) handle safety inside the Publish Gate; (b) rely on reviewer discipline; (c) a dedicated pre-gate stage + queue.
**Decision:** Add stage `C3 Safety-Floor Check` (`WORKFLOW.md`) routing any `safety_floor` claim to the Expert/Vet/Legal queue; it cannot reach the gate without a human approver id.
**Consequences:** Safety claims cannot be batch-approved with routine ones. Slightly longer path for safety claims — accepted deliberately.
**Migration:** Uses the existing `safety_floor` flag; no schema change.

## ADR-0015 — Model Activation as a surface fan-out, not a sequential chain
**Context:** The brief's example listed Content → Lucy → Search → Maps → Recommendations sequentially, implying dependencies that don't exist.
**Alternatives:** (a) keep the sequence; (b) parallel fan-out from the gated graph.
**Decision:** All surfaces read the *same* gate-eligible objects independently (`WORKFLOW.md` Phase E). None may introduce facts.
**Consequences:** Removes false ordering dependencies; surfaces can be added/removed without reworking the pipeline. Reinforces “knowledge first, rendering second.”
**Migration:** None.

## ADR-0016 — City entry only via the Priority Engine (no ad-hoc starts)
**Context:** At scale, informal city starts create untracked work and “lost” cities.
**Alternatives:** (a) allow manual starts; (b) require Priority Engine intake for all.
**Decision:** All cities enter through `CITY_PRIORITY_ENGINE.md` → Research Intake. Every city always has a status.
**Consequences:** Transparent, auditable sequencing; the National Dashboard can guarantee no city is invisible.
**Migration:** None; Austin is retro-classified as the calibration reference.

## ADR-0017 — Asymmetric de-publishing (fast to withdraw, slow to (re)add)
**Context:** Stale safety info (e.g. a closed emergency vet) must be removable fast; but adding safety claims fast is dangerous.
**Alternatives:** (a) symmetric gate both directions; (b) asymmetric: fast withdraw, full-gate to (re)publish.
**Decision:** Emergency Review may de-publish within 48h in the risk-reducing direction only; publishing/re-publishing always requires the full gate (`MAINTENANCE_SYSTEM.md` §6).
**Consequences:** Minimizes user exposure to stale safety claims without creating a fast path to unverified safety claims.
**Migration:** None.

## ADR-0018 — Integrity KPIs outrank volume KPIs; guardrails can halt intake
**Context:** Scaling pressure could tempt volume-over-quality.
**Alternatives:** (a) treat all KPIs equally; (b) designate guardrail metrics that can halt production.
**Decision:** Verification rate, safety review completion, claim accuracy, and expired-claims are guardrails; breaching a floor halts intake or freezes safety publishing (`REPORTING_METRICS.md` §3).
**Consequences:** Quality structurally wins over speed. A rising-volume/falling-integrity dashboard is defined as a failing state.
**Migration:** None.

---

## Deferred / not-yet-needed

- **No machine-schema change** was required by Sprint 6; the operational layer sits on top of the existing schema (ADRs 0007–0012 already added the needed schema affordances). Any future schema change from CPS operation will be logged here and owned by the CKO.
