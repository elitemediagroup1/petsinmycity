# CPS Role Definitions

> Extends `../docs/editorial/AI_EDITOR_GUIDELINES.md` and the Editorial OS review roles. Authority and approval rights here are binding across the CPS.

Every role is defined by: **Responsibilities, Inputs, Outputs, Authority, Approval rights, Escalation path, Quality standard.** Roles are grouped as Human, AI, and Product/Governance. Human and AI counterparts share a workflow but never share safety-approval authority (see `AUTOMATION_GUIDELINES.md`).

## Authority model (summary)

| Decision | Who may approve |
|---|---|
| Admit a routine claim to `verified` | AI Fact Checker OR Human Fact Checker |
| Admit a **safety-floor** claim | Veterinary Advisor / Legal Review (human) only |
| Pass a city through the **Publish Gate** | Senior Editor (human), with Knowledge Engineer sign-off |
| Approve a **schema/ADR** change | Chief Knowledge Officer (human) |
| Approve emergency-vet operating status | Veterinary Advisor (human) only |
| Legal interpretation of ordinances | Legal Review (human) only |

---

## Human roles

### Human Researcher
- **Responsibilities:** Discover and inspect primary/official sources; extract structured claims; draft entities/edges; log gaps to the Missing-Information queue.
- **Inputs:** Research questions, domain checklist, city workspace.
- **Outputs:** Source Registry entries, draft claims (status `needs_verification`), draft graph objects.
- **Authority:** May open sources and propose claims. May not self-verify their own safety-floor claims.
- **Approval rights:** None (proposes only).
- **Escalation:** → Senior Researcher for ambiguous/stale sources or scope questions.
- **Quality standard:** Every claim traces to an inspected source; no training-memory facts; no community anecdotes as facts.

### Senior Researcher
- **Responsibilities:** Own a city's research plan; resolve source ambiguity; decide localization scope (city vs county vs state); manage the Expert Consultation queue.
- **Inputs:** Researcher output, blocked/expert queues.
- **Outputs:** Verified sourcing decisions, localization rulings, expert requests.
- **Authority:** Approve source tier assignments; reprioritize research questions.
- **Approval rights:** Approve routine (non-safety) claim verification.
- **Escalation:** → Editor-in-Chief (editorial) / CKO (schema).
- **Quality standard:** No over-localization of statewide info; documented sourcing decisions.

### Fact Checker
- **Responsibilities:** Independently verify claims against the source of record; assign confidence; flag disputes.
- **Inputs:** Claims in the Verification queue.
- **Outputs:** `verified`/`disputed`/`needs_review` states + confidence scores.
- **Authority:** Move routine claims to `verified`.
- **Approval rights:** Routine claims only. Safety-floor claims routed to Vet/Legal.
- **Escalation:** → Veterinary Advisor / Legal Review for safety/legal; → Senior Researcher for source conflicts.
- **Quality standard:** Verification independent of the person who extracted the claim.

### Editor / Senior Editor
- **Responsibilities:** Apply the Editor Checklist + Local Authenticity Test; ensure voice, accuracy, and that public output derives only from verified objects. Senior Editor owns the Publish Gate decision.
- **Inputs:** Gate-ready objects, generated content drafts.
- **Outputs:** Editorial approvals, corrections, publish-gate classifications.
- **Authority (Editor):** Request changes; approve editorial quality.
- **Approval rights (Senior Editor):** Pass/hold a city at the Publish Gate (with Knowledge Engineer sign-off).
- **Escalation:** → Editor-in-Chief.
- **Quality standard:** Nothing public ships that fails the gate; corrections logged.

### Editor-in-Chief
- **Responsibilities:** Final editorial authority; owns the Editorial OS; arbitrates cross-city consistency.
- **Authority:** Override editorial decisions; commission ADRs affecting editorial policy.
- **Escalation:** Peer to CKO; jointly escalate to Product/EMG leadership.

### Knowledge Engineer
- **Responsibilities:** Maintain graph integrity; create/validate entities, edges, and stable ids; run schema validation; keep dynamic-vs-evergreen modeling correct.
- **Inputs:** Draft graph objects, schema-validation failures.
- **Outputs:** Clean graph objects, schema-conformance reports, proposed ADRs.
- **Authority:** Reject malformed objects; require re-modeling.
- **Approval rights:** Knowledge Review sign-off (required companion to the Publish Gate).
- **Escalation:** → Chief Knowledge Officer.
- **Quality standard:** No orphan edges; ids survive wording changes; events modeled with expiry.

### Chief Knowledge Officer (CKO)
- **Responsibilities:** Owns the Knowledge OS, Machine Schema, and ADR log; approves material architecture changes.
- **Authority:** Sole approver of schema/ADR changes; graph-health accountability.
- **Escalation:** Peer to Editor-in-Chief.

### Veterinary Advisor
- **Responsibilities:** Approve medical/safety claims and emergency-vet operating status; provide veterinary sourcing standards for hazard guidance.
- **Authority:** Sole approver of safety-floor medical claims and emergency-care availability.
- **Approval rights:** Emergency-vet status, paw/heat safety guidance, medical claim admission.
- **Escalation:** → Editor-in-Chief + CKO jointly for policy conflicts.
- **Quality standard:** Emergency status verified on the provider's own official source; short review window.

### Legal Review
- **Responsibilities:** Interpret ordinances, leash/restraint law, and liability-sensitive wording; distinguish written law from reported enforcement.
- **Authority:** Sole approver of legal interpretations and safety-floor legal claims.
- **Escalation:** → EMG legal leadership.

### Product Manager
- **Responsibilities:** Own the city queue and priority scoring; balance research/editorial/maintenance backlogs; own KPIs and dashboards.
- **Authority:** Sequence cities; allocate capacity.
- **Approval rights:** None over quality gates (cannot override editorial/knowledge/safety).
- **Escalation:** → COO / EMG leadership.

---

## AI roles

Each AI role mirrors a human role's *workflow* but has strictly bounded authority. AI never holds final safety, legal, medical, or publish authority.

### AI Researcher
- **Responsibilities:** Automate source discovery, document inspection, claim extraction, and draft entity/edge creation at scale.
- **Outputs:** Draft sources + claims (status `needs_verification`), never `verified`.
- **Authority:** Propose only. Must record provenance for every claim.
- **Escalation:** Flags ambiguous/stale sources to Senior Researcher (human).

### AI Editor
- **Responsibilities:** Draft content from verified objects; run first-pass editorial checks; enforce voice mechanically.
- **Authority:** Draft + flag. May not pass the Publish Gate.
- **Escalation:** → Human Editor for judgment calls and local authenticity.

### AI Fact Checker
- **Responsibilities:** Cross-check claims against captured sources; compute preliminary confidence; detect contradictions.
- **Authority:** May advance *routine* claims to `verified` when a Tier-1 source is machine-confirmable; **may never** verify safety-floor claims.
- **Escalation:** Safety-floor → Veterinary Advisor / Legal Review.

### AI Knowledge Engineer
- **Responsibilities:** Automate schema validation, entity matching/de-duplication, relationship generation, and graph-health checks.
- **Authority:** Reject malformed objects; propose (not approve) schema changes.
- **Escalation:** → Knowledge Engineer (human) then CKO for schema/ADR.

### Lucy (AI assistant / reasoning surface)
- **Responsibilities:** Reason over the *verified* graph to answer user questions; cite knowledge objects; surface review dates.
- **Authority:** Read-only over gate-eligible objects. May not introduce facts, make diagnoses, or recommend one provider over another.
- **Escalation:** Uncertain/expired knowledge → declines or defers rather than inventing; flags to Maintenance queue.
- **Quality standard:** Every Lucy factual answer maps to a verified object id.

---

## Escalation ladder (summary)

```
Researcher → Senior Researcher → Editor-in-Chief / CKO → COO/EMG
Fact Checker → Vet Advisor / Legal Review (safety/legal, terminal for those domains)
Knowledge Engineer → CKO (schema/ADR, terminal)
Editor → Senior Editor → Editor-in-Chief (editorial, terminal)
AI role → its human counterpart (always) for any non-routine judgment
```
