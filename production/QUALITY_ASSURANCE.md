# CPS Quality Assurance

> Defines the per-city **Quality Score** and the dimension checks behind it. Extends the Publish Gate (`../docs/editorial/PUBLISH_GATE.md`) and the Local Authenticity Test (`../docs/editorial/LOCAL_JOURNALISM.md`). QA measures *how good* a city's knowledge is; the Publish Gate decides *whether it may ship*. They are complementary.

## 1. The ten quality dimensions

Each dimension is scored 0–100. The city Quality Score is a weighted average. A city may not pass the Publish Gate on any *safety-relevant* surface while the Safety dimension is below its floor, regardless of the overall average.

| # | Dimension | What it measures | Weight | Hard floor |
|---|---|---|---|---|
| 1 | Research Quality | Depth + breadth vs the domain checklist | 0.12 | — |
| 2 | Source Quality | Share of claims backed by Tier-1/primary sources | 0.14 | — |
| 3 | Verification Quality | Share of admitted claims independently verified | 0.14 | 90 |
| 4 | Editorial Quality | Editor Checklist + voice + accuracy pass rate | 0.10 | — |
| 5 | Knowledge Quality | Graph integrity: ids, edges, entity/claim separation | 0.10 | — |
| 6 | Freshness | Share of objects within their review cadence | 0.10 | — |
| 7 | Completeness | Coverage of required domains vs known gaps | 0.08 | — |
| 8 | Safety | Safety-floor claims verified via required standard + human-approved | 0.12 | 100 |
| 9 | Community Coverage | Breadth of locally-relevant places/orgs represented | 0.05 | — |
| 10 | Local Authenticity | Passes the Local Authenticity Test (not generic) | 0.05 | — |

Weights sum to 1.00.

## 2. Scoring formulas (per dimension)

- **Source Quality** = 100 × (Tier-1 claims / total admitted claims).
- **Verification Quality** = 100 × (independently-verified claims / admitted claims). *Independent* means verifier ≠ extractor.
- **Freshness** = 100 × (objects within cadence / total objects).
- **Safety** = 100 only if *every* safety-floor claim is (a) verified on the provider's/authority's own source and (b) carries a human approver id; otherwise 0 (it is a floor, not a gradient).
- **Completeness** = 100 × (required-domain items resolved-or-accepted-empty / required-domain items). Accepted-empty gaps count as resolved *for completeness* but are visible in Missing-Information.
- Remaining dimensions use documented rubric checklists (0–100).

## 3. Grade bands

| Quality Score | Grade | Meaning |
|---|---|---|
| 90–100 | A | Reference quality (Austin-pilot bar) |
| 80–89 | B | Publishable; minor gaps tracked |
| 70–79 | C | Publishable on non-safety surfaces; needs reporting |
| < 70 | D | Not publishable; return to research |
| Any grade with Safety < 100 | — | Safety surfaces blocked regardless of grade |

## 4. How QA interacts with the gate

1. QA is computed continuously and shown on the City Dashboard (`DASHBOARDS.md`).
2. The Publish Gate reads QA but is not overridden by it: a high average never ships a failing safety dimension.
3. A dropped QA score (e.g. Freshness decay) can *pull* objects back into Maintenance automatically (`MAINTENANCE_SYSTEM.md`).

## 5. Calibration

The Austin pilot is the calibration anchor for an A-grade city. New cities are spot-audited against Austin's dimension rubrics to prevent scoring drift as volume grows. Rubric changes require an ADR.
