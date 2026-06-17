# PetsInMyCity — Lucy Video Automation Architecture

> **Status:** Internal — Do not publish.
> **Type:** Technical architecture & product plan (design only — nothing is built here).
> **Audience:** Product, Engineering, Design, and Content leadership.
> **Owner of record:** PetsInMyCity (Elite Media Group).

This document designs a safe, scalable workflow for generating **branded Lucy videos** — talking-avatar clips of Lucy — for social media, website onboarding, education, and future personalized pet experiences. It combines **ElevenLabs** (voice) and **HeyGen** (talking avatar video) behind a backend, with a **manual-review-first** posture.

**This is a plan. No videos are generated, no APIs are called, no secrets are stored, and the production site is not modified.**

### Companion documents
- [Brand Bible](./brand-bible.md) — Lucy's voice, tone, visual identity, trust principles.
- [Lucy Brain](./lucy-brain.md) — Lucy's AI behavior, boundaries, and reasoning.
- [Platform Architecture](./platform-architecture.md) — the pet operating system this fits inside.
- [Knowledge Graph](./knowledge-graph.md) — the topics and entities video content draws from.
- [Roadmap](./roadmap.md) — what gets built and when.

> **Guardrails carried from all companion docs:** Trust before monetization. Education before products. Lucy assists, never replaces professionals. No medical diagnosis or claims. No fearmongering. No aggressive affiliate language. Warm, premium, and trustworthy from the first frame. **API keys never appear in the frontend or in source control; backend/serverless only.**

---

## 1. Recommended Architecture

### 1.1 Shape of the system
A **backend-orchestrated, queue-style pipeline** with a human approval gate. Nothing about video generation ever touches the browser except (a) an internal admin UI that triggers and reviews jobs and (b) the public site that plays already-approved, already-hosted video files.

```
[Internal Admin UI]  ── trigger / review / approve ──┐
        │                                            │
        ▼                                            ▼
[Backend / Netlify Functions]  ◄── status polling / webhooks ──►  [Job Store]
        │                                            
        ├─► ElevenLabs API  (script → Lucy voice audio)
        ├─► HeyGen API      (Lucy avatar + audio → talking video)
        └─► Media Storage   (final MP4 + thumbnail)
                                │
                                ▼
                 [Approved assets] ─► Social / Website / Email / App
```

### 1.2 Core principles
- **Secrets stay server-side.** Only backend functions hold ElevenLabs/HeyGen keys, via environment variables — never in client code, never in the repo.
- **Asynchronous by nature.** Voice synthesis and especially avatar video rendering are slow (seconds to minutes). The pipeline is job-based: create → process → poll/webhook → ready-for-review → approved → published.
- **Manual review is mandatory in v1.** No video is ever auto-published. A human approves every asset before it can go anywhere public.
- **Idempotent, logged steps.** Each job records every stage so a failure can be retried without duplicating spend or producing orphan assets.
- **Provider-agnostic seams.** ElevenLabs and HeyGen sit behind thin internal interfaces so a provider can be swapped without rewriting the pipeline.
- **Cost-aware.** Both APIs are metered; the design favors caching reusable audio, previewing scripts before synthesis, and avoiding accidental re-renders.

---

## 2. API Workflow (End-to-End)

The pipeline, step by step. Each numbered stage maps to a job status (see Section 4).

1. **Script intake.** A Lucy script is created or received. Source can be a human writer, a template fill-in, or (future) a Lucy/LLM draft. The script is checked against brand and safety rules *before* any paid API call.
2. **Script validation & approval (gate #1).** A reviewer (or automated linter for obvious issues) confirms the script is on-brand, warm, non-medical, non-fearmongering, and non-salesy. Only approved scripts proceed. This protects spend and trust.
3. **Voice synthesis (ElevenLabs).** The backend sends the approved script + the existing Lucy voice ID to ElevenLabs and receives an audio file (e.g., MP3/WAV). Audio is stored and linked to the job. Reusable intros/outros may be cached.
4. **Audio review (optional gate).** For sensitive categories (e.g., Emergency Safety Minute), a reviewer may listen before video render to avoid wasting render cost.
5. **Avatar video generation (HeyGen).** The backend submits the Lucy avatar/template ID + the audio (or a HeyGen voice driven by the same script) to HeyGen, which renders a talking-Lucy video. Because rendering is asynchronous, the backend either polls HeyGen for status or receives a **webhook** when the render completes.
6. **Asset retrieval & storage.** On completion, the backend downloads the final video and a thumbnail/poster frame and stores them in media storage; the job record is updated with the asset URLs.
7. **Human review & approval (gate #2 — mandatory).** A reviewer watches the final video in the admin UI and approves or rejects. Rejections capture a reason and can re-enter at the appropriate stage (re-script, re-voice, or re-render).
8. **Publish / export.** Approved videos are exported or scheduled to the target platform(s): TikTok, Instagram Reels, YouTube Shorts, website embed, email, and (future) in-app. v1 publishing is **manual export/upload**; automated posting is a later phase.
9. **Logging & analytics.** Every job and outcome is logged internally (topic, script, voice ID, status, platform, asset URL, cost/usage metadata). No PII; aggregate performance can later inform content strategy.

### 2.1 Two valid voice paths
- **Path A (ElevenLabs → HeyGen audio-driven):** ElevenLabs produces the Lucy voice; HeyGen lip-syncs the avatar to that audio. Preferred — keeps Lucy's exact existing voice consistent everywhere.
- **Path B (HeyGen text-to-video):** HeyGen drives both voice and video. Simpler/cheaper but risks voice drift from the established Lucy voice. Reserved as a fallback; not the default.

### 2.2 Error handling
- Provider timeouts/failures mark the job `failed` with an error code and are retryable without re-charging completed stages.
- Rendering can take minutes; the system never blocks a request waiting — it returns a job id and resolves via polling/webhook.
- Spend guards: a per-day/per-job limit and a confirmation step before high-cost renders.

---

## 3. Required Netlify Functions / Backend Endpoints

All endpoints are **serverless backend functions** (e.g., Netlify Functions). They are the *only* place ElevenLaks/HeyGen keys exist (via environment variables). All admin endpoints require authentication and are never exposed to anonymous visitors.

| Endpoint | Method | Purpose |
|---|---|---|
| `/.netlify/functions/video-job-create` | POST | Create a job from a script + category + template; returns `jobId`. Status = `draft`/`script_pending_review`. |
| `/.netlify/functions/video-job-approve-script` | POST | Gate #1: mark a script approved so it may proceed to synthesis. |
| `/.netlify/functions/video-generate-voice` | POST | Call ElevenLabs with the approved script + Lucy voice ID; store audio; update job. |
| `/.netlify/functions/video-generate-avatar` | POST | Submit avatar/template + audio to HeyGen; store provider render id; set status `rendering`. |
| `/.netlify/functions/video-webhook-heygen` | POST | Receive HeyGen completion callback; download asset; set `ready_for_review`. (Verifies a shared signing secret.) |
| `/.netlify/functions/video-job-status` | GET | Poll a job's current status/asset URLs (admin only). |
| `/.netlify/functions/video-job-approve` | POST | Gate #2: human approval of the final video → `approved`. |
| `/.netlify/functions/video-job-reject` | POST | Reject with reason; route back to the correct re-entry stage. |
| `/.netlify/functions/video-job-list` | GET | List/filter jobs for the admin dashboard (by status, category, platform). |
| `/.netlify/functions/video-publish-mark` | POST | Record that an approved asset was published to a platform (manual in v1). |

**Notes**
- Long renders should use background/async function patterns or rely on the HeyGen webhook rather than a synchronous request that could time out.
- A scheduled function can later poll for stuck `rendering` jobs as a webhook fallback.
- Every function validates inputs, enforces auth, and never echoes secrets in responses or logs.

---

## 4. Data Model — Video Jobs

A single `video_job` record tracks a clip through its lifecycle. Versioned and storage-agnostic (starts as a JSON store / lightweight DB; cloud DB later per [Platform Architecture](./platform-architecture.md)). **No PII.**

```
video_job (schema_version: 1)
├─ id                 // internal job id
├─ created_at / updated_at
├─ created_by         // admin user id (internal)
├─ category           // enum: tip_of_day | ask_lucy | emergency_safety_minute |
│                     //       breed_spotlight | local_pet_care | my_pets_onboarding |
│                     //       care_score_explainer | product_education
├─ template_id        // which reusable template was used
├─ topic              // short topic label (e.g., "summer heat safety")
├─ script             // the text Lucy will say
├─ script_status      // draft | pending_review | approved | rejected
├─ voice
│   ├─ provider       // "elevenlabs"
│   ├─ voice_id       // existing Lucy voice id (reference, not a secret)
│   ├─ audio_url      // stored audio asset
│   └─ audio_status   // pending | ready | failed
├─ video
│   ├─ provider       // "heygen"
│   ├─ avatar_id      // Lucy avatar/template id (reference)
│   ├─ render_id      // provider-side render id
│   ├─ asset_url      // final MP4 URL (internal/storage)
│   ├─ thumbnail_url  // poster frame
│   └─ video_status   // pending | rendering | ready | failed
├─ status             // overall: draft | script_pending_review | script_approved |
│                     //          voicing | voiced | rendering | ready_for_review |
│                     //          approved | published | rejected | failed
├─ platforms          // array: [tiktok, instagram_reels, youtube_shorts, website, email, app]
├─ publish
│   ├─ published_at
│   ├─ published_targets   // where it actually went
│   └─ public_url          // hosted/CDN url used in embeds (if applicable)
├─ review
│   ├─ reviewer_id
│   ├─ decision           // approved | rejected
│   ├─ reason             // required on reject
│   └─ reviewed_at
├─ usage_meta            // non-secret provider usage/cost metadata for budgeting
└─ error                 // last error code/message if failed
```

**Tracked per the requirements:** topic, script, voice ID, status, platform, and final asset URL — all captured above, plus review trail and lifecycle timestamps.

---

## 5. Security & API Key Handling

- **Keys are server-side only.** ElevenLabs and HeyGen API keys live exclusively in backend environment variables (e.g., Netlify env vars). They are **never** in frontend code, never in the repo, never in client network responses, never logged.
- **No secrets in source control.** This document and all code reference keys only by name (e.g., `ELEVENLABS_API_KEY`), never by value.
- **Admin-only access.** All generation/approval endpoints require authenticated admin access (passwordless/SSO per [Platform Architecture](./platform-architecture.md)). Anonymous visitors can never trigger a paid API call.
- **Webhook verification.** The HeyGen webhook validates a signing secret/signature so only genuine provider callbacks are accepted.
- **Least privilege & rate limiting.** Functions accept only the minimum inputs, enforce per-user/per-day spend and rate limits, and reject malformed requests.
- **Asset access control.** Raw generated assets stay in internal storage until approved; public embeds use a separate, intentionally published CDN URL — drafts are never publicly guessable.
- **Auditability.** Every create/approve/reject/publish action is attributed to an admin user and timestamped.
- **PII discipline.** Job logs and any analytics contain no pet names, owner contact details, or health data. Future personalized videos (Section 10) get their own stricter consent + privacy handling.

---

## 6. Manual Review Workflow (Review-First)

Two mandatory gates with a clear re-entry path on rejection.

```
Script drafted
   │
   ▼
[Gate #1: Script review] ── reject ──► back to drafting (reason logged)
   │ approve
   ▼
ElevenLabs voice  ─► (optional audio listen-check)
   │
   ▼
HeyGen render
   │
   ▼
ready_for_review
   │
   ▼
[Gate #2: Final video review] ── reject ──► re-script / re-voice / re-render
   │ approve
   ▼
approved ─► manual publish/export
```

**Reviewer checklist (every video):**
- On-brand voice/tone and visuals (per [Brand Bible](./brand-bible.md)).
- Warm, helpful, trustworthy — Lucy assists, never replaces a professional.
- **No medical diagnosis or medical claims**; uncertainty acknowledged where relevant ([Lucy Brain](./lucy-brain.md)).
- **No fearmongering**; emergency content is calm and reassuring.
- **No aggressive affiliate language**; product education is genuinely educational and clearly secondary.
- Accurate captions/subtitles; correct disclaimers where needed.
- Correct category/template and target platform formatting.

No content reaches any public surface without an explicit approval recorded against a reviewer.

---

## 7. Content Templates

Reusable templates standardize structure, length, tone, and on-screen elements per category. Each template defines: target length, intro/outro, caption style, required disclaimer (if any), platform aspect ratios, and a script skeleton with guardrails baked in.

| Category | Purpose | Length | Tone & guardrails |
|---|---|---|---|
| **Pet Tip of the Day** | One quick, useful habit | 15–30s | Warm, upbeat, practical. No claims beyond general best practice. |
| **Ask Lucy** | Answer a common owner question | 30–60s | Helpful, conversational. "Check with your vet" where appropriate. |
| **Emergency Safety Minute** | Calm preparedness guidance | 45–60s | **Reassuring, never scary.** Always: "In an emergency, contact your vet or an emergency clinic." No diagnosis. |
| **Breed Spotlight** | Friendly breed overview | 30–60s | Celebratory, factual. Avoid stereotypes/overgeneralized health claims. |
| **Local Pet Care Tip** | Location-relevant guidance | 20–40s | Helpful, neutral; points to Discover Local resources. |
| **My Pets Onboarding** | Introduce My Pets + first pet | 30–45s | Warm welcome — Lucy "meets" the pet. Mirrors the [My Pets MVP](./my-pets-mvp-plan.md) tone. |
| **Lucy Care Score™ Explainer** | What the Care Score is | 30–45s | Encouraging. Explicitly: a preparedness/organization snapshot, **not** a medical evaluation. |
| **Product Education (non-salesy)** | How to think about a product type | 30–60s | Educational first; no hard sell, no pressure, clear/honest framing per affiliate guardrails. |

**Template object (concept):** `{ template_id, category, target_length, aspect_ratios, intro, outro, caption_style, required_disclaimer, script_skeleton, banned_phrases }`. `banned_phrases` encodes the no-diagnosis / no-fearmongering / no-aggressive-affiliate rules as an automated first-pass check before Gate #1.

---

## 8. Social Publishing Strategy

- **Formats:** Vertical 9:16 for TikTok, Instagram Reels, and YouTube Shorts; 16:9 or 1:1 variants for website/email where appropriate. Templates pre-bake the right aspect ratios and safe margins for captions.
- **v1 = manual publishing.** Approved videos are exported and uploaded/scheduled by a human (or via a scheduling tool). The system records where each asset was published (`published_targets`).
- **Captions & accessibility:** burned-in or platform captions on every video; concise on-brand copy; consistent hashtags per category.
- **Cadence:** start with a sustainable rhythm (e.g., a few Tips/Ask Lucy per week) before scaling; let performance data guide volume.
- **Cross-posting:** one approved master can spawn platform variants; each variant is still tracked as a publish target of the same job.
- **Later automation:** direct API posting/scheduling is a future phase, added only after manual review has proven reliable and on-brand.

---

## 9. Website Embedding Strategy

- **Decoupled from generation.** The public site only ever references **approved, hosted** assets via a stable public/CDN URL — it never calls ElevenLabs/HeyGen and never sees keys.
- **Self-hosted or platform-embedded:** approved MP4s served from media storage/CDN (with poster thumbnail and captions) or embedded from the chosen video host. Lazy-loaded for performance; no autoplay with sound.
- **Placement examples:** a Lucy welcome on My Pets onboarding, a Care Score explainer on the Care Score view, Emergency Safety Minutes in the Emergency Center, and Tip/Ask Lucy clips in the Learning Center.
- **Performance & SEO:** lightweight, lazy-loaded players; descriptive titles and transcripts for accessibility and discoverability; nothing that slows core pages.
- **Consistency:** the embed component is part of the shared design system so Lucy videos feel native to the platform on every surface.

---

## 10. Future Personalized Video Strategy

The long-term vision (per [Platform Architecture](./platform-architecture.md)) is Lucy speaking to *a specific pet* — e.g., "Happy birthday, Bella!" or a personalized Care Score recap.

- **Consent-gated and opt-in.** Personalized videos require explicit owner consent; pet data is used only with permission and is deletable.
- **Strict PII handling.** Personalized scripts may include a pet's name, but that data is never sent to analytics and never logged in plaintext beyond what's needed to render; assets are private to the owner unless they choose to share.
- **Templated personalization.** Reuse category templates with a small, safe set of merge fields (pet name, species, milestone) — never free-form sensitive data, never medical content.
- **On-demand, not bulk.** Generated when the owner triggers/qualifies (birthday, milestone), with the same review guardrails (automated checks; spot human review) and spend controls.
- **Sharing built for delight.** Shareable moments (birthdays, achievements) align with the growth strategy — designed so owners *want* to share, never pushed.
- **Cost & scale.** Per-user rendering is metered; cache reusable segments and gate behind clear value (likely a Plus/Pro perk) so economics stay sane.

---

## 11. Risks & Compliance Issues

- **Cost runaway.** Voice + render are metered and renders are expensive. *Mitigation:* script approval before synthesis, audio check before render, per-day/job spend caps, no auto-retries that re-charge completed stages.
- **Off-brand or unsafe output.** AI can drift off-tone or imply medical advice. *Mitigation:* template guardrails + `banned_phrases` linting + two mandatory human gates. Nothing auto-publishes.
- **Voice/likeness & provider terms.** Lucy's voice and avatar must be used in line with ElevenLabs/HeyGen terms and any underlying voice/likeness rights. *Mitigation:* confirm licensing for the Lucy voice and avatar; keep usage within provider TOS; document provenance.
- **Disclosure / synthetic media.** Some platforms require labeling AI-generated content. *Mitigation:* apply required AI-content disclosures per platform; keep Lucy clearly a brand character, not a real person.
- **Medical/legal claims.** *Mitigation:* hard no-diagnosis rule, "consult your vet" framing, reviewer checklist; emergency content stays calm and directional, never prescriptive.
- **Affiliate/advertising rules.** Product education must follow disclosure rules and avoid deceptive/aggressive language. *Mitigation:* non-salesy templates, clear disclosures, editorial-integrity guardrails.
- **Secret leakage.** *Mitigation:* server-only keys, no secrets in repo/logs/responses, webhook signature verification, admin-only endpoints.
- **PII exposure.** *Mitigation:* no PII in logs/analytics; personalized videos consent-gated and private by default.
- **Provider lock-in / outages.** *Mitigation:* provider-agnostic seams, fallback voice path, graceful job failure + retry.
- **Accessibility.** *Mitigation:* captions/transcripts on every video.

---

## 12. Recommended MVP

Start **manual-review-first**, smallest useful slice:

1. **Internal-only.** No public site changes. An authenticated admin tool (or even a controlled script run by a trusted operator) — not a public feature.
2. **One or two categories first:** *Pet Tip of the Day* and *Ask Lucy* — short, low-risk, high-volume.
3. **Path A voice:** ElevenLabs (existing Lucy voice) → HeyGen audio-driven render, so Lucy's voice stays consistent.
4. **Job store + lifecycle:** implement the `video_job` schema and the core endpoints (create, approve-script, generate-voice, generate-avatar, webhook, status, approve/reject, list).
5. **Two human gates** wired in from day one; **manual export** to platforms (no auto-posting yet).
6. **Spend caps + logging** from the first job.
7. **Defer:** Emergency Safety Minute (higher sensitivity), personalized videos, automated social posting, and any public-facing trigger until the manual pipeline is proven on-brand and on-budget.

This proves the full pipeline end-to-end with minimal spend and maximum safety, and every later capability (more categories, automation, personalization, in-app embeds) slots into the same job model and endpoints.

---

## 13. Final Recommendation

**Build it now as an internal admin tool — review-first — not as a public dashboard feature and not as an unattended script.**

- An **internal admin tool** gives authenticated operators a UI to draft scripts, trigger generation, watch results, and approve/reject — with the security, logging, and two-gate review the brand requires. This is the right starting point.
- A **pure script-based automation** is acceptable only as a thin first step *if* run by a trusted operator with the same spend caps and manual approval before anything is published; but it lacks the review UI and auditability, so it should graduate into the admin tool quickly.
- A **public dashboard feature** (and personalized in-app videos) is the *future* destination, unlocked only after the internal tool proves the pipeline is safe, on-brand, and cost-controlled — and after consent/privacy handling for personalization is in place.

Sequence: **internal admin tool (manual review) → selective automation of low-risk steps → personalized/in-app videos**, governed by the [Roadmap](./roadmap.md). Trust before scale, always.

---

*Internal document. Cross-references: [Brand Bible](./brand-bible.md) · [Lucy Brain](./lucy-brain.md) · [Platform Architecture](./platform-architecture.md) · [Knowledge Graph](./knowledge-graph.md) · [Roadmap](./roadmap.md) · [My Pets MVP Plan](./my-pets-mvp-plan.md). No videos generated, no APIs called, no secrets stored. Contains no secrets, API keys, credentials, internal URLs, or environment variables.*
