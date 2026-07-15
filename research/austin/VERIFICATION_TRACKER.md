# Austin â Verification Tracker

> **The source of truth for Austin.** A claim may only appear on the public page after its row here reaches a publishable status (per `../../docs/editorial/PUBLISH_GATE.md`). Every row starts as **Needs further reporting**. **No claim below is verified yet.**

Status legend: Verified | Multi-source verified | Officially confirmed | Observed pattern | Community pattern (never published as fact) | Expert opinion | Needs further reporting | Rejected | Unknown | Outdated.

Confidence: High | Medium | Low. Safety-floor rows require Verified/Officially confirmed at Tier 1-2.

---

| # | Claim to verify | Status | Source (tier) | Confidence | Verified on | Owner | Safety floor? | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | Leash ordinance requirements in Austin | Needs further reporting | (City of Austin Code) | â | â | (assign) | No | Note any district variations |
| 2 | Pet licensing requirement & process | Needs further reporting | (Austin Animal Center) | â | â | (assign) | No |  |
| 3 | Breed-specific regulations / restrictions | Needs further reporting | (City/State) | â | â | (assign) | No |  |
| 4 | Off-leash areas & rules (greenbelt/top parks) | Needs further reporting | (Austin Parks & Rec) | â | â | (assign) | No | Confirm hours/seasons per site |
| 5 | Summer heat profile & safe-walking windows | Needs further reporting | (NOAA/NWS) | â | â | (assign) | YES | Paw-burn/heat-illness guidance |
| 6 | Flash-flood risk & season (creek/greenbelt trails) | Needs further reporting | (NWS/watershed authority) | â | â | (assign) | YES | Which trails affected |
| 7 | Venomous snake species, range & season | Needs further reporting | (TX Parks & Wildlife) | â | â | (assign) | YES |  |
| 8 | Tick/flea/heartworm prevalence | Needs further reporting | (CDC/university/state) | â | â | (assign) | Partial |  |
| 9 | Emergency / 24-hr vet coverage & gaps (metro) | Needs further reporting | (practices / TX vet board) | â | â | (assign) | YES | Confirm currency â closures critical |
| 10 | Austin Animal Center lost-pet reclaim process & stray-hold | Needs further reporting | (Austin Animal Center) | â | â | (assign) | No | Reunion-critical accuracy |
| 11 | Typical vet visit cost range (Austin) | Needs further reporting | (multiple local) | â | â | (assign) | No |  |
| 12 | Typical grooming cost range | Needs further reporting | (multiple local) | â | â | (assign) | No |  |
| 13 | Typical boarding/daycare cost range | Needs further reporting | (multiple local) | â | â | (assign) | No |  |
| 14 | Named top dog parks & their real conditions | Needs further reporting | (Parks & Rec + convergence) | â | â | (assign) | No | Shade/mud/crowding as Observed pattern only |
| 15 | Neighborhood differences for pet owners | Needs further reporting | (planning/HOA/local news) | â | â | (assign) | No | Keep only city-distinct facts |
| 16 | Recurring pet-friendly events locals attend | Needs further reporting | (official event calendars) | â | â | (assign) | No |  |
| 17 | Air-quality patterns affecting walking | Needs further reporting | (EPA/state) | â | â | (assign) | Partial |  |

> Add rows as reporting surfaces new meaningful claims. Move a row to a publishable status ONLY with a logged source and verification date. Safety-floor rows (5,6,7,9) block publication until Verified/Officially confirmed at Tier 1-2.


---

## Sprint 5 — Pilot Results (2026-07-15)

The Austin Verified Knowledge Pilot moved specific claims through the full lifecycle. Structured,
sourced objects live in `pilot/data/`; full provenance in `pilot/SOURCE_REGISTRY.md`. Summary:

| Claim / object | Status | Source (tier) |
|----------------|--------|----------------|
| Austin is in Travis County, Texas | Verified | City of Austin GIS (T1) |
| Austin leash / running-at-large rule (City Code Title 3 §3-2-1, §3-1-1(16)) | Verified | Municode ordinance (T1) |
| Off-leash allowed only in PARD-designated areas | Verified (rule) | PARD (T1) |
| Per-park off-leash designation (Red Bud Isle, Auditorium Shores, Barton Creek) | Needs further reporting | official PDF/GIS not yet inspected |
| Red Bud Isle / Auditorium Shores / Barton Creek identity+address+manager+status | Verified | City of Austin GIS (T1) |
| Austin Animal Services jurisdiction/phone/address/hours | Verified | austintexas.gov (T1) |
| VEG South Lamar 24/7 ER (phone/address) | Verified (30-day review) | provider-official (T1) |
| MedVet Austin 24/7 ER (phone/address) | Verified (30-day review) | provider-official (T1) |
| AVES 24/7 ER (phone) | Verified; address needs re-check | provider-official (T1); recent relocation |
| Texas venomous snakes (15 species, 4 groups) | Verified (Texas scope) | TPWD (T1) |
| Austin-localized snake risk | Needs further reporting | over-localization avoided |
| Central Texas heat pattern | Needs further reporting | no verbatim NOAA normals yet |
| Austin flooding hazard / "Flash Flood Alley" label | Needs further reporting | WPD verified; label unconfirmed |
| NWS Flood Watch 2026-07-14->16 | Verified (time-bound; expires) | api.weather.gov (T1) |

See `pilot/PILOT_FINDINGS.md` for the publish-gate classification of each object.
