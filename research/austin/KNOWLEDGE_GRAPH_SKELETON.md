# Austin — Knowledge Graph Skeleton

> Companion to `DOSSIER.md`. Structures the Austin entities & relationships per `../../docs/editorial/KNOWLEDGE_OS.md`. **Skeleton only** — attributes (source, status, confidence, verified_on, owner) are filled ONLY as facts clear `VERIFICATION_TRACKER.md`. Nothing here is a verified fact yet.

---

## Place entities (to verify & populate)

```
Place: Texas (State)
 └─ Place: Austin metro (Austin-Round Rock-Georgetown MSA)
     └─ Place: Travis County  (also Williamson County, Hays County)
         └─ Place: Austin (City)
             ├─ Neighborhood: Downtown / South Congress / East Austin / Mueller /
             │                Hyde Park / Zilker / Barton Hills / Travis Heights / North Loop / Domain
             ├─ Nearby cities (proximity edges): Round Rock, Cedar Park, Georgetown,
             │                Pflugerville, Lakeway, Bee Cave, Kyle, Buda, San Antonio
             ├─ Park / DogPark: (to identify & verify — official names, rules)
             ├─ Trail: (to identify & verify — greenbelt/creek trails, dog rules)
             └─ Beach: N/A (inland) — waterfront/lake access to assess instead
```

## CareConcept entities (to verify & associate)
- Hazard: heat (paw-burn, heat illness) — associate with Season: summer
- Hazard: flash flooding (creek/greenbelt) — associate with Season: (verify)
- Hazard: venomous snakes — associate with Season: (verify via TX Parks & Wildlife)
- Hazard: ticks / fleas / heartworm prevalence — (verify prevalence)
- LifeStage / Breed intersections: high-value `Breed × Austin` pages (e.g., heat-sensitive breeds) — see `../../docs/editorial/dossiers/TEMPLATE_BREED_LOCATION.md`

## Business entities (live via Places; verify emergency/24-hr status)
- Veterinarian / Emergency Vet / Animal Hospital (identify 24-hr coverage & gaps)
- Shelter: Austin Animal Center (municipal — verify jurisdiction, lost-pet process)
- Rescue: (breed/species-specific — verify legitimacy)
- Groomer / Boarding / Daycare / Trainer / Pet Store (live category layer)

## Experience entities (conversion edges from Austin pages)
- Tool: Dog Park Finder, Emergency Finder, Calorie/Grooming calculators
- LucyJourney: heat/weekend planner, emergency-now, move-to-Austin planner

## Relationship notes
- Every Austin leaf page: containment edges up (city→county/metro→state), proximity edges sideways (nearest cities/parks/trails), care-association edges (hazard×season×Austin), and conversion edges inward (Lucy, My Pets).
- `Breed × Austin` care-associations are the doorway-proof content core.

## Population status
- [ ] Place tree verified (names, hierarchy, coordinates)
- [ ] Hazard×season associations verified (Tier 1-2)
- [ ] Emergency-vet coverage verified
- [ ] Shelter lost-pet process verified
- [ ] Park/trail dog rules officially confirmed
