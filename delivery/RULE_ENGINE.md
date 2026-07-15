# Rule Engine

> A framework that transforms verified knowledge + context into guidance signals and recommendations. **This document defines the framework, not a fixed rule set** — concrete rules are data, authored/reviewed via the CPS, versioned, and never hardcoded. Runs at Delivery Engine stage 2.

## 1. Purpose and boundary

Rules **interpret** verified facts into actionable signals (e.g. combine a temperature reading + a breed profile into a heat-risk level). Rules never create facts and never override safety facts; a rule output is always traceable to the verified inputs that produced it. A rule that lacks a required verified input yields `unknown`, not a default.

## 2. Rule as data (schema)

```json
{
  "rule_id": "heat-risk.v3",
  "version": 3,
  "inputs": [
    { "key": "temp_f",   "from": "signal:weather.temp",  "required": true },
    { "key": "humidity", "from": "signal:weather.humidity", "required": false },
    { "key": "breed_group", "from": "context:pet.breed_group", "required": false }
  ],
  "when": "temp_f >= threshold(breed_group)",
  "emit": { "signal": "heat_risk", "levels": ["low","elevated","high","severe"] },
  "safety_floor": true,
  "evidence": ["claim:vet_guidance.heat", "claim:climate.austin_summer"],
  "owner": "veterinary_advisor",
  "review": "safety-window"
}
```
Rules are stored, versioned, and reviewed like knowledge. Safety-floor rules require Veterinary Advisor / Legal ownership per the CPS.

## 3. Rule categories (framework dimensions, illustrative)

The engine accepts rules keyed on any context/knowledge dimension. Examples of dimensions (not an exhaustive or hardcoded list): temperature, humidity, air quality, breed, age, medical conditions, flood risk, wildlife activity, season, time of day, travel status, emergency state. New dimensions are added as new context signals — no engine change required.

## 4. Evaluation model

```
assembled context + verified signals
  → select applicable rules (by input availability + scope)
  → evaluate deterministically (pure function; no side effects)
  → emit derived signals with evidence links + confidence (≤ min(input confidences))
  → record derived_by edges (Dependency Graph) so outputs invalidate when inputs change
```
Determinism means the same inputs always yield the same output — essential for explainability, testing, and caching.

## 5. Confidence & safety propagation

- A derived signal's confidence never exceeds the lowest-confidence input.
- A `safety_floor` rule's output is itself safety-gated: it may inform guidance but any user-facing safety instruction still routes through the CPS-approved safety claims (rules don't invent safety thresholds; they reference verified veterinary/authority claims as `evidence`).
- If any required input is missing/expired, output = `unknown`; consumers must handle `unknown` honestly (Lucy discloses uncertainty; recommendations omit).

## 6. Authoring, testing, governance

1. Rules are authored as data and go through the CPS review/gate like knowledge.
2. Each rule ships with test vectors (input → expected output) run in CI before activation.
3. Rule changes are versioned; a change emits `knowledge.changed` for the rule so dependent derivations regenerate.
4. Safety-floor rules require human (Vet/Legal) approval and short review windows.

## 7. Why framework-not-hardcoded matters at scale

Ten thousand cities have different thresholds (a “hot day” differs by climate). Encoding thresholds as rule *data* referencing local verified climate claims lets the same engine serve every city correctly, and lets veterinary guidance updates propagate as data changes rather than code deploys.
