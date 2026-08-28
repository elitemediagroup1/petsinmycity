# Veterinary safety review — sign-off checklist

**Status: NOT YET REVIEWED. Every clinical entry in the safety layer is marked
`pending_vet_review`.**

Nothing in this repository has been reviewed by a licensed veterinarian. The
deterministic safety layer was drafted by engineering from the audit brief. It
is a real improvement over relying on an AI prompt — it cannot be talked out of
an emergency classification — but its clinical content still needs professional
sign-off before the site can claim any clinical accuracy.

---

## What the safety layer does

`netlify/lib/safety/vet-safety-config.js` is the single reviewable file. It is
data only: no request handling, no model calls, no formatting. A veterinarian
should be able to read that one file end to end and sign off without reading any
other file.

`netlify/lib/safety/vet-safety.js` applies it:

1. On every request to `lucy-chat` and `pet-tools`, the **owner's own words** are
   matched against the red-flag patterns **before any model call**.
2. On a match, the endpoint returns the deterministic emergency answer
   immediately and **never calls the model**. Emergency advice is therefore
   never delayed by, and never contradicted by, an AI response.
3. `classification`, `disclaimer` and the emergency-search link are attached
   server-side. A prompt-injected reply cannot strip them.
4. Medication-dosing requests are refused deterministically, also without a model
   call.

Prompt injection is structurally ineffective here: the classifier reads the text
as data and never as instruction, and for a red flag there is no model turn for
an injection to influence.

---

## Design decisions a reviewer should confirm or reject

1. **Recall over precision.** Patterns are deliberately over-inclusive. A false
   positive costs a wasted vet call; a false negative can cost a life.
   Consequence: *"my dog had a seizure last year, is that relevant?"* is
   classified as an emergency. There is a regression test asserting this
   behaviour — if a reviewer wants it changed, change the test too.
2. **Negation is narrow.** Only an unambiguous negation immediately preceding the
   matched phrase suppresses a flag (`no bloat`, `not seizing`). Past tense,
   hedging and hypotheticals do **not** suppress.
3. **No dosing, ever.** No dose appears anywhere in the config, and the refusal
   copy itself contains none. Enforced by test.
4. **No diagnosis.** Copy says signs "can mean" an emergency, never "your pet
   has X". Enforced by test.
5. **No invented clinical thresholds.** The only numbers in the config are
   `INPUT_BOUNDS`, which exist to stop a form submitting a 900 lb cat. They are
   explicitly labelled *"Input plausibility bounds for form validation only. NOT
   clinical thresholds."* and a test asserts that label is present.
6. **Poison-control fees are disclosed but not quoted.** We name the ASPCA
   Animal Poison Control Center and the Pet Poison Helpline, state that a
   consultation fee applies and is payable by the caller, and deliberately do
   **not** quote a dollar amount — a stale published figure in our copy would be
   a misrepresentation.
7. **The food checker distinguishes hypothetical from reported.** *"Is chocolate
   safe?"* is an ordinary lookup. *"My dog ate chocolate"* (the **My pet has
   already eaten this** checkbox) is an emergency. Confirm this is the right
   split.

---

## Sign-off checklist

For each item, review, then set `review: 'vet_approved'` and fill in
`reviewed_by` with the reviewer's name, licence jurisdiction and date **in the
config file itself**. The test suite asserts that any `vet_approved` entry
records a reviewer.

- [ ] `DISCLAIMER.text` — wording (also needs legal/marketing review)
- [ ] `POISON_CONTROL` — services, numbers, availability, fee disclosure wording
- [ ] `EMERGENCY_SEARCH` — that a Google Maps "emergency vet near <ZIP>" search
      is an appropriate emergency pathway, and that pointing at
      `/tools/emergency-finder/` is appropriate
- [ ] `RED_FLAGS[difficulty_breathing]` — patterns **and** guidance steps
- [ ] `RED_FLAGS[collapse_or_unconscious]`
- [ ] `RED_FLAGS[seizure]`
- [ ] `RED_FLAGS[uncontrolled_bleeding]`
- [ ] `RED_FLAGS[suspected_poisoning]` — especially the toxin list and the
      "do not induce vomiting unless told to" instruction
- [ ] `RED_FLAGS[urinary_obstruction]` — especially the male-cat urgency claim
- [ ] `RED_FLAGS[severe_trauma]` — especially "seems fine afterwards" and the
      transport instruction
- [ ] `RED_FLAGS[heatstroke]` — especially the cooling instruction (cool not
      ice-cold water; no wet-towel wrapping)
- [ ] `RED_FLAGS[severe_allergic_reaction]` — especially refusing to suggest any
      antihistamine
- [ ] `RED_FLAGS[bloat_or_unproductive_retching]` — especially the deep-chested
      dog / GDV framing
- [ ] `NEGATION_PREFIXES` — that narrow negation handling is acceptable
- [ ] `INPUT_BOUNDS` — that the plausibility ranges are sane and that labelling
      them non-clinical is sufficient
- [ ] `REFUSED_TOPICS[medication_dosing]` — the drug list and the refusal copy

### Also needs review, outside the config file

- [ ] The `SAFETY FLOOR` block appended to the Lucy system prompt
      (`netlify/lib/lucy-system-prompt.js`) and to every Paw Tools prompt
      (`netlify/lib/pet-tools-schema.js`). This is defence in depth only — the
      deterministic layer is authoritative — but the wording is still shown to a
      model that talks to owners.
- [ ] The **existing** tool prompts, which are unchanged from before this work
      and were never vet-reviewed either (symptom checker, calorie calculator,
      emergency finder, food checker, vet cost estimator).
- [ ] The calorie calculator still asks the **model** to compute calories,
      assuming 350 cal/cup. No deterministic calorie formula was introduced,
      because that would mean inventing clinical constants. If a reviewer wants
      a deterministic calculation (e.g. a published RER/MER formula), they must
      supply the formula and its citation, and it should be added to the config
      file with a `vet_approved` marker.

---

## Tests

`test/vet-safety.test.js` covers, for every red-flag class, a set of realistic
owner phrasings; the absence of doses and diagnoses; the disclaimer and search
pathway; poison-control gating; dosing refusal; field validation; and that every
clinical entry carries a review marker.

`test/pet-tools.test.js` and `test/lucy-chat.test.js` prove the same behaviour
end to end through the HTTP handlers, including that a red flag never reaches
the model and that prompt-injection attempts do not change the outcome.

Adding a phrasing to the test file is the right way to report a missed case.
