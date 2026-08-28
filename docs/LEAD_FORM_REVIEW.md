# Vet lead form — consent wording and fulfilment

**Status: BLOCKED ON OWNER CONFIRMATION.** The wording below is a conservative
placeholder chosen so that nothing on the page can be false. It has not been
legally reviewed, and the real fulfilment process is not documented anywhere in
this repository.

---

## What was wrong

`window.submitVetForm` in `assets/script.js` used to:

- fire the HubSpot request and **never await it**;
- swallow every failure with an empty `.catch(function(){})`;
- replace the form with *"Got it! A local vet will be in touch shortly."*
  **immediately**, before the request resolved — so a visitor whose submission
  failed outright still saw a success message;
- promise that a veterinarian would make contact;
- collect a name, phone number, ZIP code and pet type with **no consent
  control** of any kind;
- run from an inline `onsubmit="return submitVetForm(event)"` attribute, with
  placeholder-only fields (no visible labels, no `autocomplete`, no validation
  messages, no loading state, no accessible announcements).

## What it does now

- Awaits the HubSpot response; success is shown **only** on a confirmed 2xx.
- On failure — HTTP error, network error, or timeout — shows a retryable error,
  keeps every answer, and re-enables the button.
- Blocks submission entirely until an **unchecked** consent box is ticked. No
  request is made without it.
- Visible `<label>` for every field, `autocomplete` attributes, per-field
  validation messages wired with `aria-describedby` and `aria-invalid`, a
  disabled/`aria-busy` submit button while in flight, and a live region that
  announces success politely and errors assertively.
- Links the privacy policy twice: inside the consent sentence and beside the
  submit button.
- Bound with `addEventListener`; the inline `onsubmit` attribute is gone.
- Emits `form_submission_success` and `form_submission_failure` with **no
  personal data** — only `form_name`, `form_location` (the page path) and, for
  failures, a coarse `failure_reason` (`validation` | `timeout` |
  `network_or_http`). Enforced by test.

---

## The wording currently shipped — please confirm or replace

### Consent checkbox (unchecked by default)

> I agree that Elite Media Group LLC may contact me by phone call or email about
> finding local veterinary care, and may share the details above with veterinary
> practices near my ZIP code. I can ask to be removed at any time by emailing
> help@elitemediagroup.io. See our **Privacy Policy**.

### Success message

> Thanks — we have your request. We share it with veterinary practices near ZIP
> *nnnnn*. We cannot guarantee that a practice will call, so if this is urgent
> please contact a vet directly.

### Choices made, and why

- **No SMS or autodialer language.** Nothing in this repository shows that SMS
  or automated dialling is used, so no consent to it is requested. Adding that
  language would create TCPA exposure for a channel that may not even exist.
  **If SMS is used, this wording is wrong and must be replaced with properly
  reviewed express-written-consent language before that channel is used.**
- **No promise of contact.** The current privacy policy says contact details are
  used *"solely to connect you with local veterinary services in your area"*.
  That describes an intention, not a guarantee, so the copy does not promise a
  call.
- **Sharing is disclosed.** The privacy policy says information is not sold and
  is not shared with advertisers, but connecting a visitor to a practice
  necessarily means passing details to that practice. The consent sentence says
  so explicitly.

---

## Questions the owner must answer

1. **What actually happens to a submitted lead?** Who receives it, through what
   system, and what do they do with it? The answer determines whether the
   success copy is accurate.
2. **Which contact methods are really used** — phone call, email, SMS, or a
   third party contacting on our behalf? The consent sentence must name exactly
   these and no others.
3. **Are the details shared with veterinary practices, sold to a lead buyer, or
   neither?** The privacy policy and the consent sentence must agree with each
   other and with reality.
4. **Has any consent wording been approved by counsel?** If so, replace the
   placeholder verbatim.
5. **Does the 90-day retention statement in the privacy policy still hold** now
   that HubSpot stores the submission?
6. **Is a state-specific disclosure needed** (e.g. CPRA/CCPA "Do Not Sell or
   Share")? Out of scope for this change.

Until (1) and (2) are answered, treat the shipped wording as provisional.

---

## Files

- `assets/script.js` — validation, consent gating, awaited submit, retryable
  error state, analytics
- `cities/chicago/index.html`, `cities/houston/index.html`,
  `cities/phoenix/index.html` — the form markup
- `test/vet-form.test.js` — proves a failed submission never shows success, that
  submission is blocked without consent, that consent is not pre-checked, that
  analytics carry no personal data, and that the shipped city pages have labels,
  autocomplete attributes, error regions, a live region and a privacy link
