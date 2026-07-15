# CPS Automation Guidelines

> Defines what AI should automate, what AI must never automate, and why. This is a safety-and-quality boundary, not a cost decision. It operationalizes the AI role limits in `ROLE_DEFINITIONS.md` and the safety guarantees in `CITY_PRODUCTION_SYSTEM.md`.

## 1. Governing principle

Automate **generation, retrieval, and structuring**; reserve **judgment, safety, and final authority** for humans. AI proposes and accelerates; humans decide anything where a wrong answer can hurt a pet, a person, or the platform's credibility.

## 2. What AI SHOULD automate

| Task | Why it's safe to automate | Human backstop |
|---|---|---|
| Source discovery | Finding candidate sources is retrieval, not judgment | Human confirms tier + authority |
| Document inspection / extraction | Parsing text/tables/PDFs scales linearly | Fact Checker verifies against source |
| Claim extraction (draft) | Structuring facts is mechanical | Never auto-`verified` for safety-floor |
| Entity matching / de-duplication | Pattern matching at scale | KE reviews merges |
| Relationship generation (draft) | Graph edges follow rules | KE validates |
| Schema validation | Deterministic conformance check | Blocks bad objects automatically |
| Internal linking | Reuse of existing ids | — |
| Knowledge reuse across surfaces | Reads only gated objects | Gate already passed |
| Research summaries | Synthesis of captured sources | Editor reviews before use |
| Quality scoring | Formula-driven (`QUALITY_ASSURANCE.md`) | Humans read, don't rubber-stamp |
| Maintenance reminders / cadence timers | Scheduling is deterministic | — |
| Dynamic-event expiry | Timestamp comparison | — |
| Contradiction detection | Flags conflicts for humans | Human resolves |

## 3. What AI must NEVER automate

| Task | Why a human must own it |
|---|---|
| **Safety approval** | A wrong safety call can lead someone to a closed emergency vet or into a hazard. Irreversible real-world harm; requires accountable human judgment. |
| **Legal interpretation** | Ordinance meaning, liability wording, and enforcement-vs-law distinctions require licensed judgment; errors carry legal exposure. |
| **Final editorial approval** | Local authenticity and trust are editorial judgments; the Publish Gate must have an accountable human. |
| **Medical claims** | Veterinary/medical guidance affects animal health; must be approved by a Veterinary Advisor, never generated as fact by AI. |
| **Community reputation** | Ranking/endorsing shelters, rescues, or vets is a reputational judgment with fairness implications; out of scope for automation (and for this era of the platform). |
| **Emergency-vet operating status** | Must be verified on the provider's own official source and human-approved; listings/aggregators are not proof. |
| **Schema/ADR approval** | Architecture changes ripple across millions of objects; the CKO must own them. |
| **De-publishing that adds risk** | Withdrawing a stale safety claim is fast+automatable; anything that could *increase* risk needs a human. |

## 4. The AI→human handoff contract

1. **Provenance-complete or it doesn't move.** AI output without full provenance cannot advance.
2. **AI never sets `verified` on a safety-floor claim.** The `safety_floor` flag hard-routes to a human queue.
3. **AI declines rather than guesses.** When evidence is missing/stale, AI marks `needs_review` or logs a gap — it never fabricates certainty (this is the core Austin-pilot rule).
4. **Every automated action is attributable.** Automated steps record the AI role + model context so decisions are auditable.

## 5. Why this split scales

At 10,000 cities, ~90% of *volume* (discovery, extraction, structuring, scheduling) is automatable, letting a comparatively small human team concentrate on the ~10% that is judgment and safety. Quality is preserved because the automatable 90% is exactly the part where correctness is checkable against sources, and the reserved 10% is exactly the part where it is not.
