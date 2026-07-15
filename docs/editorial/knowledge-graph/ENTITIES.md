# Entity Catalog

Every node in the PetsInMyCity graph is one of the entity types below. Each entity
carries the full envelope from [`SCHEMA_CONVENTIONS.md`](SCHEMA_CONVENTIONS.md)
(`id`, `confidence`, `verification`, `owner`, `last_reviewed`, `review_cadence`,
`sources`, …). This file lists **type-specific** attributes only.

Entities are grouped into five families:

1. **Place** — the geographic containment spine.
2. **Facility** — physical pet-relevant destinations.
3. **Organization** — businesses and institutions that provide pet services.
4. **CareConcept** — knowledge that isn't a place: breeds, hazards, climate, law.
5. **Signal** — human/experiential layer: recommendations, reviews, insights, events.

Legend: 🔒 = safety-critical field (Tier 1–2 sources required, safety floor applies).

---

## 1. Place family

The containment spine. `parent` links form the primary tree
Country → State → Metro → County → City → Neighborhood → ZIP.

### Place.Country / Place.State / Place.Metro / Place.County
Common attrs: `fips`, `population`, `area_sq_mi`, `official_site`,
`pet_population_estimate`, `climate_zone` (→ CareConcept.Climate),
`governing_laws` (→ CareConcept.Law).

### Place.City / Place.Town
Adds: `incorporation_status`, `county` (id), `leash_ordinance` 🔒 (→ Law),
`animal_services_provider` (→ Org.Shelter), `walkability_notes`,
`cost_of_pet_ownership` (→ Signal.Cost), `local_character` (prose seed, verified).

### Place.Neighborhood
Adds: `city` (id), `boundaries` (geojson ref), `density`, `dog_friendliness_notes`,
`typical_housing` (feeds "renting with pets"), `nearest_green_space` (→ Facility.Park).

### Place.ZIP
Adds: `zcta`, `overlaps` (neighborhood ids). ZIP is a **join key, not a content
surface** — it exists to attach Census/data attributes, not to generate pages.

---

## 2. Facility family

Physical destinations. All carry `hours`, `seasonality`, `leash_rules` 🔒,
`water_access`, `shade` 🔒 (heat), `parking`, `accessibility`, `fees`.

| Type | Key attributes |
|------|----------------|
| Facility.Park | `off_leash_areas`, `dog_amenities`, `surface`, `hazards` 🔒 (→ Hazard) |
| Facility.DogPark | `fenced`, `separated_small_dog_area`, `surface`, `water_stations`, `vaccination_required` 🔒 |
| Facility.Trail | `length_mi`, `difficulty`, `surface`, `shade_pct` 🔒, `water_on_route` 🔒, `elevation`, `hazards` 🔒 |
| Facility.Beach | `dog_policy` 🔒, `seasonal_dog_hours` 🔒, `tide_notes`, `rip_current_risk` 🔒, `bacteria_advisories` 🔒 |
| Facility.Lake | `swim_allowed` 🔒, `blue_green_algae_risk` 🔒, `boat_ramp`, `shore_access` |
| Facility.Campground | `pet_policy` 🔒, `max_pets`, `leash_rule` 🔒, `wildlife_notes` 🔒 (→ Wildlife), `vet_distance` 🔒 |
| Facility.DogFriendlyRestaurant | `patio_policy`, `indoor_allowed`, `water_provided`, `dog_menu`, `verified_with_operator` |
| Facility.Apartment / HOA | `pet_policy` 🔒, `breed_restrictions` 🔒, `weight_limit`, `pet_rent`, `pet_deposit` (→ Signal.Cost) |

> HOA/Apartment policies change often and are legally sensitive; `review_cadence`
> defaults to `quarterly` and they must cite the operator or a dated document.

---

## 3. Organization family

Businesses/institutions. All carry `address`, `phone`, `website`, `hours` 🔒,
`services`, `operator_confirmed`, `places_id` (live source link).

| Type | Key attributes |
|------|----------------|
| Org.Veterinarian | `species_treated`, `specialties`, `accepts_new_patients`, `payment_options` |
| Org.EmergencyVet | `24_7` 🔒, `after_hours_only` 🔒, `walk_in` 🔒, `er_capabilities` 🔒, `avg_wait_notes` |
| Org.Shelter | `intake_policy`, `municipal`, `lost_found_process` 🔒, `hold_period` 🔒, `adoption_process` |
| Org.Rescue | `focus_breed_species`, `foster_based`, `application_process`, `adoption_fee`, `coverage_area` |
| Org.Groomer / Boarding / Daycare / Trainer | `services`, `certifications`, `vaccination_required` 🔒, `capacity` |

> **Emergency and 24-hour status is the single highest-stakes fact in the graph.**
> `24_7` and `er_capabilities` are safety-critical, `review_cadence: monthly`, and
> must be operator- or webpage-confirmed with a dated source. Never inferred.

---

## 4. CareConcept family

Knowledge that isn't a place. These attach to places via relationships (e.g. a
Hazard `occurs_in` a City) rather than being contained by them.

| Type | Key attributes |
|------|----------------|
| CareConcept.Species | `common_name`, `care_baseline`, `legal_status_varies` |
| CareConcept.Breed | `species`, `size`, `coat`, `climate_tolerance` 🔒, `activity_needs`, `common_health_notes` 🔒, `local_restrictions` 🔒 (→ Law) |
| CareConcept.Climate | `koppen_zone`, `summer_high_range` 🔒, `winter_low_range` 🔒, `humidity`, `pavement_risk_window` 🔒, `sources` (NOAA) |
| CareConcept.Season | `months`, `heat_risk` 🔒, `cold_risk` 🔒, `allergen_load`, `pest_activity` 🔒 |
| CareConcept.WeatherPattern | `type` (flash-flood, heat-dome, ice…), `season`, `pet_impact` 🔒, `affected_facilities` (→ Facility) |
| CareConcept.Wildlife | `species`, `venomous` 🔒, `active_season` 🔒, `encounter_context` 🔒, `pet_risk` 🔒, `first_response` 🔒 (→ EmergencyVet) |
| CareConcept.Hazard | `kind` (toxic plant, algae, heat, traffic, foxtail…), `severity` 🔒, `onset` 🔒, `symptoms` 🔒, `action` 🔒 |
| CareConcept.Law / Regulation | `jurisdiction` (→ Place), `topic` (leash, breed, licensing, vaccination), `citation` 🔒, `effective_date`, `penalty`, `source_url` 🔒 |
| CareConcept.Activity | `type` (hiking, swimming, patio dining…), `suitable_for` (breed/size), `season`, `prerequisites` 🔒 |

> **Safety floor:** every 🔒 field in this family requires a Tier 1–2 source and
> cannot be published from community leads. Toxicity, venom, dosing, emergency
> response, heat/cold, and flood facts are the platform's non-negotiable core.

---

## 5. Signal family

The human/experiential layer. These give the site local texture — but their trust
rules are the strictest about **provenance vs. fact**.

| Type | Key attributes | Trust rule |
|------|----------------|-----------|
| Signal.CommunityInsight | `claim`, `context`, `raised_by` (Tier 4 ref), `status` | **Lead only.** Cannot appear on a page until re-verified as an assertion on another entity. |
| Signal.Recommendation | `subject` (id), `rationale`, `for_profile` (breed/size/need), `derived_from` (verified assertions) | Only from `verified` inputs; never editorializes beyond evidence. |
| Signal.Review | `subject` (id), `source` (platform), `rating`, `sample_note` | Aggregate/reference only; never reproduced verbatim; not a fact source. |
| Signal.Cost | `category` (vet visit, pet rent, licensing…), `amount_range`, `as_of`, `method` | Dated; `review_cadence: annual`; method disclosed. |
| Signal.Event | `date` 🔒, `recurring`, `venue` (→ Facility/Place), `pet_policy` 🔒, `organizer`, `source` | Expires; `review_cadence: event`; unverified past events are archived, not shown. |

---

## Entity lifecycle summary

1. An entity is **created** (often as `unverified-existence`) from a dossier or a
   live source (Places).
2. Reporters add **assertions**, each with sources, moving fields
   `unverified → researching → verified`.
3. When enough load-bearing assertions are `verified` and confidence clears the
   band, the entity becomes eligible for its surfaces.
4. `review_cadence` drives `next_review`; passing it flips fields to `stale`.

See [`RELATIONSHIPS.md`](RELATIONSHIPS.md) for how these entities connect and
[`SURFACES.md`](SURFACES.md) for how they render.
