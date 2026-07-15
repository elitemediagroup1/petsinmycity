# Austin Verified Knowledge Pilot — Findings Report

Evidence from the pilot (not a strategy manual). Sprint 5.

## What was successfully modeled (verified, T1)

- **Geography/government:** Austin (city) -> Travis County -> Texas; managing authorities PARD and
  Watershed Protection; state authority TPWD; federal forecast/alert authority NWS EWX.
- **Leash rule:** Austin City Code Title 3 §3-2-1 (running at large prohibited) + §3-1-1(16)
  RESTRAINT definition, codified through Ord. 20260226-050 (eff. 2026-03-09); PARD confirms the
  leash-unless-designated-off-leash structure.
- **Three named parks:** Red Bud Isle, Auditorium Shores, Barton Creek Greenbelt with authoritative
  address, county, ZIP, park type, managing authority, council district, and open status (COA GIS).
- **Animal services:** Austin Animal Services / Center - jurisdiction, phone, address, hours, functions.
- **Wildlife:** Texas venomous-snake context (15 species; 4 groups) scoped to Texas.
- **Emergency vets:** 3 providers verified 24/7 on their OWN official sites (VEG South Lamar, MedVet
  Austin, AVES) with phone, address, species, and short review windows.
- **Dynamic vs evergreen:** a live NWS Flood Watch captured as a time-bound, self-expiring event.

## What remains unverified / needs further reporting

- Per-park **off-leash designation** (Red Bud Isle, Auditorium Shores, Barton Creek) - the official
  authority is a binary PDF/GIS overlay not yet inspected; kept `needs_verification`.
- **Austin-specific heat normals** (avg highs, heat-season months) - not yet captured verbatim from
  NOAA/NWS; only the general seasonal pattern is acknowledged.
- **"Flash Flood Alley"** label - regional flood risk is real but the exact authoritative wording
  was not captured; label kept `needs_verification`.
- **Austin localization of snake risk** - statewide fact verified; localizing specific groups to
  specific Austin parks needs local evidence.
- **AVES exact address** - provider recently relocated; confidence reduced, 30-day re-check.

## What failed the publish gate

- Any per-park off-leash "yes/no" (insufficient primary confirmation).
- Any universal temperature/pavement cutoff (no authoritative source; sprint forbids inventing).
- Any "this trail always floods" claim (wording unsupported).

## Schema assumptions that HELD

- Path-style stable IDs, the per-record provenance envelope, the 11-state verification enum, and the
  confidence bands all fit real data cleanly.
- Safety-critical defaulting (Org.EmergencyVet, CareConcept.Hazard/Wildlife) matched reality.

## Schema assumptions that FAILED (fixed via ADRs 0007-0012)

- No government-agency type (F1/ADR-0007).
- Claims not separable from entities (F2/ADR-0008).
- No evergreen-vs-dynamic modeling (F3/ADR-0009).
- No short review windows (F4/ADR-0010).
- No typed attributes map (F5/ADR-0011).
- No provider-official source kind (F7/ADR-0012).

## What changed because of real research

- The public austintexas.gov site was recently redesigned - many guessed URLs 404; the durable
  path was the **City GIS FeatureServer** and **Municode**, which should be the pipeline of record.
- Off-leash truth lives in a **non-textual** artifact (PDF/GIS), forcing an honest
  `needs_verification` rather than a memory-based answer.

## Safety blockers

- Emergency-vet data is admitted ONLY from provider-official sources and expires in 30 days; do not
  publish stale ER hours. AVES address must be re-verified post-relocation before any public use.

## Recommendation before the next city

1. Apply ADRs 0007-0012 to `MACHINE_SCHEMA.yaml` in a single reviewed change.
2. Build a small **PDF/GIS ingestion** step so off-leash + floodplain layers become admissible claims.
3. Add an **automated freshness/expiry job** that flips overdue safety claims to `needs_review` and
   drops expired dynamic events.
4. Only then scale to Wave 2 places / the next city.

---

## Publish-gate classification (per object)

| Object | Class |
|--------|-------|
| place/tx, place/tx/travis, place/tx/austin | eligible-for-future-publication |
| place/tx/austin/{red-bud-isle, auditorium-shores, barton-creek-greenbelt} (identity/address) | eligible-for-future-publication |
| off-leash designation (all 3 parks) | needs-further-reporting |
| concept/law/austin-restraint | eligible-for-future-publication |
| org/shelter/.../austin-animal-center | eligible-for-future-publication |
| org/emergency-vet/* (VEG, MedVet, AVES) | eligible-for-future-publication (safety review + 30d expiry) |
| org/emergency-vet/.../aves address | needs-further-reporting (recent relocation) |
| concept/wildlife/texas-venomous-snakes (Texas scope) | eligible-for-future-publication |
| Austin-localized snake risk | needs-further-reporting |
| concept/climate/central-texas-heat | needs-further-reporting (no verbatim normals) |
| concept/hazard/austin-flooding | internal-only (label needs_verification) |
| event/2026-07-14/flood-watch | internal-only / time-bound (expires 2026-07-16) |
| universal temperature cutoffs / "always floods" | rejected |

**No public Austin copy is changed by this sprint.** Publication awaits explicit approval in a
later sprint after the gate + safety review.
