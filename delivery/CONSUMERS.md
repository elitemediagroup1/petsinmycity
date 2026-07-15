# Product Consumers

> Delivery contracts for each product that reads the KDP. Lucy, Recommendations, and Notifications have their own detailed docs; this file covers the remaining consumers (Articles, Search, Maps, My Pets) plus the shared consumer rules. Consolidated here to avoid documentation sprawl.

## 0. Shared consumer rules (all consumers)

1. Read only through the Delivery Engine; never touch the graph directly.
2. Render only gate-eligible, fresh, provenance-tagged objects from the envelope.
3. Display or preserve currency (`as_of`/`expires_at`) appropriately.
4. Never invent, never suppress applicable safety facts, never rank providers competitively.
5. Declare push vs pull refresh mode and the context dimensions needed (least-context).

## 1. Articles (city / neighborhood / park pages)

- **Requests:** delivery for a place + domain set; pull mode (build/regenerate on change).
- **Consumes:** verified claims composed into page sections; each fact carries provenance for inline attribution.
- **Refresh:** `knowledge.changed` in the page's dependency closure regenerates the affected section only (not the whole page).
- **Constraint:** article generation is downstream of the CPS Publish Gate; no public copy changes until gated + approved. Dynamic facts render with currency; evergreen facts render plainly.

## 2. Search

- **Requests:** indexing feed (`knowledge.created`/`changed`/`deprecated`) + query-time delivery.
- **Consumes:** verified objects as indexable documents; provenance + freshness stored in the index.
- **Refresh:** event-driven incremental indexing; deprecated objects removed on `knowledge.deprecated`.
- **Constraint:** search never surfaces ungated or expired objects; safety results respect the same gating as every surface.

## 3. Maps

- **Requests:** delivery for places/hazards within a viewport (location context); mixed push (dynamic events) + pull.
- **Consumes:** place entities (coordinates, managing authority), rule claims (off-leash status), and in-window hazard/closure events as map cards/overlays.
- **Refresh:** `event.opened`/`closed` toggles closure/hazard overlays in real time; `knowledge.changed` updates card facts.
- **Constraint:** a closed trail's overlay reflects the closure the moment the event fires; map cards carry provenance + currency.

## 4. My Pets

- **Requests:** delivery with consented pet profile (species/breed/age/medical) + location; push for alerts.
- **Consumes:** rule outputs personalized to the pet (e.g. heat-risk warnings), relevant local knowledge, reminders.
- **Refresh:** subscribes to events in the pet's location scope; `event.opened` (heat, flood) can raise a My Pets warning via rule signals.
- **Constraint:** medical context used only with consent; guidance limited to vet-approved rule outputs; no diagnosis. Personal data never written to the graph.

## 5. Future consumers (mobile apps, partner APIs, EMG properties)

All attach through the external API (`API_ARCHITECTURE.md`) using the same `DeliveryContext` in and envelope out. Adding one requires a formatter + contract + scopes — never core changes. This is what makes “one platform, many products” hold as the company scales.

## 6. Consumer matrix

| Consumer | Context needed | Refresh | Special constraint |
|---|---|---|---|
| Lucy | topic, location, pet | push | never invents; cites confidence |
| Articles | place, domains | pull | behind Publish Gate |
| Search | (index) | event | no ungated/expired in index |
| Maps | viewport/location | push+pull | real-time closure overlays |
| Recommendations | context + family | pull | explainable + traceable |
| My Pets | pet profile + location | push | consent; vet-approved guidance only |
| Notifications | subscription + prefs | event | verified-only; fatigue controls |
| External/EMG | scoped | per contract | permissioned subset |
