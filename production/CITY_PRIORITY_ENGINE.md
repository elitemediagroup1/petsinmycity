# CPS City Priority Engine

> Defines how new cities are selected and sequenced into the Research Intake queue (`QUEUE_SPECIFICATION.md`, queue 1). Produces a single **Priority Score** per city so the queue is ordered, transparent, and auditable.

## 1. Principles

1. **No ad-hoc starts.** A city enters production only via this engine.
2. **Transparent + reproducible.** The score is a weighted sum of documented factors; inputs and weights are versioned.
3. **Safety and demand outrank vanity metrics.** Emergency need and real user demand are weighted above raw traffic potential.
4. **Quality is never a scoring factor.** Priority decides *order*, never *standard*. Every city gets identical verification standards.

## 2. Scoring factors

Each factor is scored 0–10, multiplied by its weight, and summed to a 0–100 Priority Score.

| Factor | Weight | 0 | 10 | Data source |
|---|---|---|---|---|
| Existing users / My Pets density | 0.18 | none | large active base | Platform analytics |
| Demonstrated demand (searches, waitlist) | 0.16 | none | high unmet demand | Search logs, signups |
| Population / metro size | 0.12 | small town | major metro | Census |
| Emergency need (vet deserts, hazards) | 0.12 | well-served | underserved / high-hazard | Vet coverage + hazard scan |
| Traffic opportunity | 0.10 | saturated | high, winnable | Keyword/demand model |
| Geographic coverage gap | 0.08 | dense coverage | fills a regional hole | Coverage map |
| Seasonality timing | 0.07 | off-peak | entering peak season | Seasonal calendar |
| Business ecosystem (shelters, vets, parks) | 0.07 | sparse | rich, verifiable | Entity pre-scan |
| Strategic importance (EMG priorities) | 0.06 | none | flagship | Leadership input |
| Competition (inverse) | 0.04 | dominated | open field | Market scan |

Weights sum to 1.00. **Score = Σ(factor_0to10 × weight) × 10** → 0–100.

## 3. Modifiers (applied after base score)

| Modifier | Effect | Reason |
|---|---|---|
| Safety emergency (active disaster, vet-desert alert) | +15 (capped at 100) | Users need verified local safety info fast |
| Data availability = poor (few primary sources) | −10 | Low verifiability slows the pipeline; sequence realistically |
| Legal complexity (unclear ordinance regime) | −5 | Requires more Legal Review capacity |
| Adjacent city already verified | +5 | Reuse of county/state knowledge lowers marginal cost |

## 4. Worked example (illustrative, not a commitment)

Austin (already piloted) is the calibration reference. A hypothetical scoring of three candidate cities shows the *shape* of the model — actual inputs come from live data at scoring time:

| City | Base score | Modifiers | Priority | Suggested status |
|---|---|---|---|---|
| (High-demand metro) | 82 | +5 adjacent | 87 | Intake now |
| (Mid metro, disaster season) | 61 | +15 safety | 76 | Intake now |
| (Small metro, sparse sources) | 44 | −10 data | 34 | Defer / partial |

## 5. Sequencing rules

1. Cities enter Intake in descending Priority Score.
2. **Capacity-gated:** the PM only admits as many cities as the pipeline can staff without breaching queue SLAs.
3. **Batch by region** when scores are close, to reuse county/state knowledge (lower marginal research cost).
4. **Safety modifier jumps the line** but does *not* bypass any gate — it only reorders intake.
5. Scores are recomputed on a schedule; a deferred city is never forgotten — it stays in Intake with its current score.

## 6. Governance

Weights and factors are versioned. Any change to weights/factors is an ADR (`DECISIONS.md`) because it materially affects national coverage strategy. The Product Manager owns the engine; the COO approves weight changes.
