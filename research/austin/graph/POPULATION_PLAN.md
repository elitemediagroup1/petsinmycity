# Austin — Knowledge Graph Population Plan

How Austin grows from the ~18 seed objects in
[`austin.entities.yaml`](austin.entities.yaml) to **2,000+ verified knowledge
objects**, at which point the city page is *assembled*, not written.

The rule that makes this scale is the one from the editorial correction: **we do
not mass-produce articles; we run a repeatable research system.** Every object is
a small, ownable research task with a verification state and a source.

## Sequencing principle: safety floor first

We populate in the order that protects pets, not the order that fills a page
fastest. A half-populated Austin that has *verified* heat, flood, venom, algae,
and emergency-vet facts is more valuable — and safer — than a "complete-looking"
Austin whose safety facts are guesses.

## Waves

### Wave 0 — Seed (done)
The current files: place spine, a few representative facilities/orgs, and the
five safety CareConcepts, all with honest `unverified`/`researching` states.

### Wave 1 — Safety floor (highest priority)  → ~40 verified objects
Resolve the seeded safety edges to `verified` Tier 1–2 assertions:

| Object / edge | Source to verify against | Cadence |
|---------------|--------------------------|---------|
| `concept/climate/central-texas` (summer highs, pavement window) | NOAA / NWS Austin-San Antonio normals | annual |
| `concept/hazard/heat-austin` (onset, symptoms, action) | Vet-authoritative + NWS heat guidance | quarterly |
| `concept/hazard/flash-flood-austin` (season) | NWS "Flash Flood Alley" | quarterly |
| Lady Bird Lake **blue-green algae** hazard (new object) | City of Austin Watershed Protection advisories | event/weekly in season |
| `concept/wildlife/venomous-snakes-austin` (species, season, first response) | Texas Parks & Wildlife | quarterly |
| `concept/law/austin-leash` (exact citation) | Austin City Code | annual |
| ≥3 `Org.EmergencyVet` with confirmed 24/7 + ER capability | TX Board of Vet Medical Examiners + operator/webpage | monthly |

Wave 1 is the **publish gate for any Austin safety content**. Nothing about heat,
flood, algae, snakes, or emergencies renders until these are `verified`.

### Wave 2 — Core destinations  → ~300 objects
Parks, dog parks, trails, lakes, and their pet-relevant attributes (leash/off-
leash zones, shade, water, fees). Source: Austin PARD + operator confirmation.
Each facility's safety fields (shade, water, hazards) still obey the floor.

### Wave 3 — Services  → ~600 objects
Veterinarians, shelters, rescues, groomers, boarding, daycare, trainers. Live
Places data seeds existence; `verified` requires operator/authoritative
confirmation of the load-bearing attributes (species treated, emergency referral,
adoption/hold processes).

### Wave 4 — Neighborhood texture  → ~500 objects
Neighborhood characteristics, typical housing / renting-with-pets, nearest green
space, dog-friendliness. This is where local authenticity lives; every claim is a
sourced assertion, and `Signal.CommunityInsight` is used **as leads only**.

### Wave 5 — Experience & cost layer  → ~500 objects
Dog-friendly restaurants (operator-confirmed patio/indoor policy), events
(expiring), costs (dated vet visit / pet rent / licensing ranges), activities.

### Wave 6 — Recommendations & cross-links  → derived
`Signal.Recommendation` and `comparable_to` computed only from `verified` inputs.
No new primary facts — pure assembly.

## Definition of "publish-ready Austin"

Austin's public page may be assembled when:

1. **Wave 1 is 100% verified** (safety floor closed).
2. ≥ 90% of load-bearing facts across Waves 2–3 are `verified` at confidence ≥ 90.
3. Every rendered section resolves to real objects (no filler paragraphs).
4. The page passes the **Local Authenticity Test** and **Publish Gate** in
   `docs/editorial/`.
5. `next_review` dates are set on all safety-critical objects.

## Tracking

- Each object → a row in [`../VERIFICATION_TRACKER.md`](../VERIFICATION_TRACKER.md).
- Gaps → [`../MISSING_INFORMATION.md`](../MISSING_INFORMATION.md).
- Sources → [`../EXPERT_SOURCES.md`](../EXPERT_SOURCES.md).

## Scale note (how this generalizes)

The waves above are city-agnostic. Swap Austin's sources for another city's
equivalents (its parks dept, its NWS office, its state wildlife agency, its
municipal code) and the same system populates any city. **The process scales —
not the shortcuts.** That is how PetsInMyCity reaches national coverage without
becoming a doorway-page directory.
