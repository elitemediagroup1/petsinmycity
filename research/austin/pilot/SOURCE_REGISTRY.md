# Austin Verified Knowledge Pilot — Source Registry

Sprint 5 (Austin Verified Knowledge Pilot). This registry records every source consulted
during live reporting, with tier, scope, access date, supported claims, limitations, and
review cadence. Sources here back the claims in `research/austin/pilot/data/`.

Tiers (per Editorial OS): **T1** primary/official (government, managing authority, provider-official);
**T2** credible institutional (universities, recognized vet/health orgs, established news of record);
**T3** reputable secondary; **T4** community/leads-only (never admitted as fact).

Reporting window: 2026-07-15. All access dates 2026-07-15 unless noted.

## Government & geographic

- **S-AAS-MAIN** — Austin Animal Services (City of Austin). T1 gov. https://www.austintexas.gov/animal-services
  - Supports: AAS is the municipal shelter for the City of Austin AND unincorporated Travis County;
    accepts stray/owned animals regardless of species/breed; walk-in adoption/reclaim daily 11:00–19:00
    (adoption lines close 18:00); Pet Resource Center Mon–Fri 11:00–16:00.
  - Limitations: hours/closures are time-bound; no phone/address on this page. Review: quarterly.
- **S-AAS-CONTACT** — Contact | Austin Animal Services. T1 gov. https://www.austintexas.gov/animal-services/contact
  - Supports: phone 512-974-2000; address 7201 Levander Loop, Bldg. A, Austin, TX. Review: quarterly.
- **S-COA-GIS-PARKS** — City of Austin GIS, BOUNDARIES_city_of_austin_parks (ArcGIS org 0L95CJ0VTaxqcmED). T1 gov.
  - https://services.arcgis.com/0L95CJ0VTaxqcmED/arcgis/rest/services/BOUNDARIES_city_of_austin_parks/FeatureServer/0
  - Supports: authoritative park name, address, county (Travis), ZIP, park type, owner/managing
    authority (City of Austin Parks and Recreation, Municipal), council district, asset status (Open)
    for Red Bud Isle, Auditorium Shores, Barton Creek Greenbelt. Review: annual.
- **S-MUNICODE-T3** — Austin City Code, Title 3 Animal Regulation (Municode). T1 gov (official codified ordinance).
  - https://library.municode.com/tx/austin/codes/code_of_ordinances?nodeId=TIT3ANRE
  - Supports: §3-2-1 Running at Large Prohibited; §3-1-1(16) RESTRAINT definition; §3-1-1(18) RUNNING AT
    LARGE definition. Codified through Ord. No. 20260226-050, eff. 2026-03-09 (Supp. 173, version APR 23 2026).
  - Limitations: off-leash exceptions are administered separately by PARD (see S-PARD-DOG). Review: annual.
- **S-PARD-DOG** — Austin Parks and Recreation, Dog Parks / off-leash. T1 gov.
  - https://www.austintexas.gov/parks (Dog Parks section) + Dog Off-Leash Area Map (PDF):
    https://austin.widen.net/s/ffqbhzsgwf/dog_off_leash_area_map_v5 ; interactive: 
    https://experience.arcgis.com/experience/6cf5048c0d4d46198f1b75ac0bbadc65/
  - Supports: "The leash ordinance requires dogs to be on a leash unless you are in one of Austin's
    designated off leash areas." Off-leash areas enumerated on the official PDF/map (binary; per-park
    off-leash status marked needs_verification pending PDF inspection). Review: annual.

## Hazards

- **S-NWS-EWX** — NOAA/National Weather Service, Austin/San Antonio (EWX). T1 gov.
  - https://www.weather.gov/ewx/ and API https://api.weather.gov/alerts/active?area=TX
  - Supports: NWS EWX is the responsible forecast/alert authority for the Austin area; live watches/
    warnings (e.g., Flood Watch observed 2026-07-14→2026-07-16) are DYNAMIC, time-bound events, not
    evergreen. Review: dynamic feed (not stored as evergreen).
- **S-COA-WPD** — Austin Watershed Protection (City of Austin). T1 gov.
  - https://www.austintexas.gov/ (Austin Watershed Protection) 
  - Supports: WPD manages the City's creeks, drainage systems and water-quality programs and reduces
    the impact of flooding/erosion/pollution; official flood-safety message "Turn Around — Don't Drown®".
  - Limitations: "Flash Flood Alley" characterization not captured verbatim here → needs_verification. Review: annual.
- **S-TPWD-SNAKES** — Texas Parks & Wildlife Dept., Venomous Texas Snakes. T1 gov (statewide scope).
  - https://tpwd.texas.gov/education/resources/texas-junior-naturalists/snakes-alive/venomous-texas-snakes
  - Supports: Texas has 15 potentially dangerous venomous snake species/subspecies in four groups
    (copperheads, cottonmouths, rattlesnakes, coral snakes); statewide safety guidance; more TX deaths
    from lightning than snakebite annually. SCOPE = Texas; Austin localization marked needs_verification.
  - Limitations: statewide page; do not over-localize to specific Austin parks. Review: annual.

## Emergency veterinary (safety-critical; provider-official verification required)

- **S-VEG-SLAMAR** — Veterinary Emergency Group (VEG), South Lamar Austin. T1 provider-official.
  - https://www.veg.com/locations/texas/south-lamar-austin
  - Supports: 24/7 emergency, walk-in/no-appointment; phone (737) 243-9408; address 4211 South Lamar
    Boulevard, Austin, TX 78704; species dogs/cats/birds/rabbits/reptiles/rodents/exotics. Review: 30 days.
- **S-MEDVET-ATX** — MedVet Austin. T1 provider-official. https://www.medvet.com/location/austin/
  - Supports: ER open 24/7, no appointment for emergencies; phone 737.931.0345; address 12400 North
    Interstate 35, Building B, Austin, TX 78753; email info.austin@medvet.com. Species dogs/cats. Review: 30 days.
- **S-AVES-ATX** — Austin Veterinary Emergency & Specialty Center (AVES). T1 provider-official. https://www.austinvets.com/
  - Supports: open 24/7/365 for emergencies (specialty by appt); phone (512) 343-2837; new address
    7501 North Capital of Texas Highway, Building A, Austin, TX 78731 (site shows recent "We've Moved").
  - Limitations: recent relocation → address confidence reduced; short review window. Review: 30 days.

## Community / leads-only (NOT admitted as fact)

- Google Search result lists (udm=14) used ONLY to discover candidate emergency-vet providers and
  official-site URLs. No Google/Yelp/directory listing was used as evidence for hours, status, or phone;
  every emergency claim was re-verified on the provider's own official website.

_Privacy note: no cookie/consent banners were accepted during reporting (privacy-preserving default)._
