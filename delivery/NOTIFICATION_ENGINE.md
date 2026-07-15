# Notification Engine

> An event-driven KDP consumer that turns knowledge changes into user-facing alerts. Subscribes to the Event System; generates notifications only from verified, gated knowledge and in-window events. Aligns with existing `../assets/notifications.js` / `notification-preferences.js` behavior.

## 1. Principle: notifications are events, not authored messages

A notification is generated when a subscribed knowledge change matches a user's context + preferences. The content is derived from the verified object that changed; nothing is hand-written per user and nothing is sent that isn't backed by a delivered, gated fact.

## 2. Notification families

| Family | Trigger event | Safety class |
|---|---|---|
| Weather alert | `event.opened` (heat/storm) | high |
| Emergency alert | `event.opened` (disaster) | critical |
| Law/rule change | `knowledge.changed` (ordinance/leash) | high |
| Vaccination reminder | schedule (My Pets) | normal |
| Seasonal reminder | season signal | normal |
| Trail/park closure | `event.opened` (closure) | high |
| Business change | `knowledge.changed` (shelter/vet status) | high |
| Community event | `event.opened` (event) | normal |

## 3. Generation pipeline

```
Event System → Notification Engine
  match event.scope against subscribed users (location, pet, prefs)
  → KDP delivery for the affected object (ensures gated + fresh + provenance)
  → apply user preferences (channels, quiet hours, opt-ins)
  → dedupe + rate-limit (per family, per user)
  → compose from verified fact (templated, with as_of + source)
  → dispatch (push / in-app / email per preference)
```

## 4. Targeting model

Users subscribe implicitly (location + My Pets profile) and explicitly (preferences). An event targets the intersection of `event.scope` (place/domain) and subscriber context. Safety-critical families (emergency, disaster) have a wider, less opt-out-able reach than convenience families — configurable but with a safety floor that cannot be fully disabled for imminent-danger alerts.

## 5. Safety, consent & fatigue

1. **Verified-only.** No alert is sent from unverified/expired knowledge.
2. **Consent + preferences respected** for non-critical families; critical safety alerts honor a minimum floor.
3. **Rate-limiting + dedup** prevent notification fatigue (one heat alert per event window, not per reading).
4. **All-clear.** `event.closed` can emit a resolving notification (e.g. “flood watch lifted”) so users aren’t left with stale fear.
5. **No marketing dressed as safety.** Safety channels carry only safety knowledge.

## 6. Notification object (implementation)

```json
{
  "notif_id": "<uuid>",
  "family": "weather_alert",
  "user_id": "<id>",
  "object_id": "event:flood_watch@austin",
  "as_of": "<iso8601>", "expires_at": "<iso8601>",
  "channels": ["push","in_app"],
  "body_ref": "template:flood_watch",
  "provenance": { "source_tier": "T1", "origin": "nws" }
}
```

## 7. Example (event-driven cascade)

```
NWS issues flood watch → Freshness ingests → event.opened{flood_watch@austin}
  → Notification Engine matches Austin subscribers with dogs
  → KDP delivery confirms verified event + affected trails
  → send high-priority alert w/ as_of + official source + affected areas
  → on event.closed → send all-clear
```

## 8. Why centralize notifications

One engine subscribed to one event bus means every alert — whatever the product — is verified, gated, deduped, and preference-aware. Adding a channel or family doesn’t risk sending unverified content, because the only content source is the KDP.
