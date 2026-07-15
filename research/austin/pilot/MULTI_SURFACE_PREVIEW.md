# Austin Pilot — Internal Multi-Surface Preview

**Internal only. Not public. Not connected to production.** Every line below is generated ONLY
from verified graph objects in `data/`. Each block names the knowledge objects that power it, to
prove reuse: the same verified facts feed articles, Lucy, search, maps, and My Pets.

Objects with `verification: needs_verification` are deliberately NOT surfaced as fact (they show
as "not yet confirmed"). Dynamic events are shown only within their `valid_until` window.

---

## 1. City-page section (Austin > Pet rules & safety)

> **Dogs in Austin: leash rules.** Austin requires dogs to be restrained (leash, cord, chain, or
> secure enclosure) and prohibits dogs running at large, except in Parks and Recreation
> designated off-leash areas.

_Powered by:_ `concept/law/austin-restraint` (verified, City Code Title 3 §3-2-1 / §3-1-1(16)),
edge `applies_to -> place/tx/austin`, `org/gov/tx/austin/pard`.
_Withheld:_ per-park off-leash status (claims `needs_verification`).

## 2. Lucy response (assistant)

> **User:** "Is there a 24-hour emergency vet in Austin?"
> **Lucy:** "Yes. Several Austin emergency hospitals are open 24/7, including Veterinary
> Emergency Group (South Lamar), MedVet Austin, and Austin Veterinary Emergency & Specialty
> (AVES). VEG South Lamar is a 24/7 walk-in ER at 4211 South Lamar Blvd; you can call (737)
> 243-9408. As always, call ahead if you can."

_Powered by:_ `org/emergency-vet/tx/austin/{veg-south-lamar, medvet-austin, aves}` (all verified,
provider-official) + claims `claim/*/24-7`. Safety-critical; 30-day review window.
_Note:_ Lucy does not rank providers and does not give medical advice (sprint constraint).

## 3. Search result

> **Austin Animal Services (Austin Animal Center)** — Municipal shelter
> 7201 Levander Loop, Bldg. A - (512) 974-2000
> Serves City of Austin + unincorporated Travis County - Adoption/reclaim daily 11am-7pm

_Powered by:_ `org/shelter/tx/austin/austin-animal-center` (verified, gov) + `claim/aas/jurisdiction`.

## 4. Map card

> **Red Bud Isle** - Park (City of Austin PARD)
> 3401 Redbud Trl., Austin, TX 78746 - ~17.5 acres - Status: Open
> Off-leash: not yet confirmed (pending official PARD map)

_Powered by:_ `place/tx/austin/red-bud-isle` (verified, COA GIS) + edge `managed_by -> pard`.
_Honest surface:_ off-leash line reflects `needs_verification`, not a guess.

## 5. My Pets seasonal warning

> **Heads up for Austin dog owners.** Central Texas summers get very hot - plan walks for cooler
> hours and bring water. If a heat or flood alert is active from the National Weather Service,
> check conditions before heading to creek-side trails like the Barton Creek Greenbelt.

_Powered by:_ `concept/climate/central-texas-heat` (needs_verification -> shown as general
seasonal guidance, NOT a specific temperature cutoff), `concept/hazard/austin-flooding`,
`org/gov/us/nws-ewx`, edge `hazard_at -> barton-creek-greenbelt`.
_Dynamic:_ if `event/2026-07-14/flood-watch` is within its window, My Pets may add: "A NWS Flood
Watch is currently in effect." It disappears automatically after `valid_until`.

---

## Reuse proof

A single verified object appears across multiple surfaces without re-reporting:

- `concept/law/austin-restraint` -> city page (#1) AND (potentially) Lucy leash answers.
- `org/emergency-vet/*` -> Lucy (#2), search, and a future map layer.
- `concept/hazard/austin-flooding` + `org/gov/us/nws-ewx` -> My Pets warning (#5) AND map card
  hazard badges for `barton-creek-greenbelt`.

This is the pilots core validation: **knowledge is the asset; each surface is just an interface.**
