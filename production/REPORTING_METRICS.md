# CPS Reporting & Metrics

> Defines the KPIs that measure CPS success, their formulas, and target thresholds. Metrics are surfaced by `DASHBOARDS.md`. A metric only counts objects that carry full provenance — unverified drafts never inflate a KPI.

## 1. KPI catalog

| KPI | Definition / formula | Target | Dashboard |
|---|---|---|---|
| Research velocity | Verified claims admitted per researcher-week | Trend up | Research/National |
| Verification rate | verified claims / admitted claims | ≥ 0.95 | National/Knowledge |
| Knowledge growth | Net new objects (entities+claims+edges) / period | Trend up | Knowledge |
| Claim accuracy | 1 − (corrections / published claims) | ≥ 0.98 | Editorial/National |
| Average confidence | mean confidence of verified claims | ≥ 0.80 | National/Knowledge |
| Research backlog | Intake + Assignment queue depth | Within capacity | Research/National |
| Editorial backlog | Editorial + Gate queue depth | Within SLA | Editorial/National |
| Maintenance backlog | overdue reviews count | → 0 | National |
| Safety review completion | closed safety reviews / due safety reviews | 1.00 | National/Editorial |
| Average review age | mean age of objects past next_review | < cadence | Knowledge |
| Expired claims | dynamic events past expiry not yet archived | 0 | Knowledge |
| Cities completed | cities at grade ≥ B, gate-passed | Trend up | National |
| States completed | states with all target cities complete | Trend up | National |
| Knowledge reuse | avg surfaces per verified object (>1 = reused) | > 2.0 | Knowledge |
| Lucy knowledge coverage | user questions answerable from verified graph | Trend up | National |
| Knowledge freshness | objects within cadence / total | ≥ 0.90 | National/Knowledge |

## 2. How success is measured (not volume)

The primary success statement, inherited from the Austin pilot: **every admitted fact is current, traceable, reviewable, and reusable.** Volume KPIs (knowledge growth, cities completed) are secondary to integrity KPIs (verification rate, claim accuracy, safety review completion, freshness). A dashboard where volume rises while integrity falls is a **failing** state and triggers a review.

## 3. Guardrail metrics (must not regress)

| Guardrail | Floor | If breached |
|---|---|---|
| Verification rate | 0.95 | Halt intake; drain Verification queue |
| Safety review completion | 1.00 | Freeze safety-surface publishing |
| Claim accuracy | 0.98 | Root-cause + ADR if systemic |
| Expired claims | 0 | Auto-archive sweep + investigate listener |

## 4. Reporting cadence

| Report | Frequency | Audience |
|---|---|---|
| National health snapshot | Weekly | COO/CPO/EiC/CKO |
| Per-city QA report | On gate + monthly | Senior Researcher/Editor |
| Safety review log | Continuous + weekly summary | Vet Advisor/Legal/EiC |
| Schema/graph health | Monthly | CKO |
| KPI trend review | Quarterly | Leadership |

## 5. Definitions that prevent gaming

1. **Admitted** = passed verification with provenance; drafts don't count.
2. **Published** = gate-eligible AND read by ≥ 1 surface.
3. **Verified independently** = verifier ≠ extractor (prevents self-verification inflating rates).
4. **Reuse** counts distinct surfaces, not repeated reads, so a widely-read single-surface fact isn't miscounted as reused.
