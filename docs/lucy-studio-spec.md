# Lucy Studio — Internal Admin Tool Specification

> **Status:** Internal — Do not publish.
> **Type:** Implementation-ready spec (design only — no production code is written here).
> **Audience:** Product, Engineering, Design, and Content leadership.
> **Owner of record:** PetsInMyCity (Elite Media Group).

**Lucy Studio** is the internal-only admin tool for safely creating, reviewing, approving, storing, and publishing branded **Lucy videos** using **ElevenLabs** (voice) and **HeyGen** (talking avatar). It implements the manual-review-first pipeline from [Lucy Video Automation](./lucy-video-automation.md).

**This is a specification. No code is built, no APIs are called, no secrets are stored, and the production site is not modified. Lucy Studio is never public-facing.**

### Companion documents
- [Lucy Video Automation](./lucy-video-automation.md) — the pipeline this tool operationalizes.
- [Brand Bible](./brand-bible.md) — Lucy's voice, tone, visual identity, trust principles.
- [Lucy Brain](./lucy-brain.md) — Lucy's AI behavior, boundaries, and reasoning.
- [Platform Architecture](./platform-architecture.md) — the pet operating system this fits inside.
- [Roadmap](./roadmap.md) — what gets built and when.

> **Guardrails:** Trust before monetization. Education before products. No medical diagnosis or claims. No fearmongering. No aggressive affiliate language. FTC disclosure when products are mentioned. Synthetic-media disclosure where required. Accessibility captions on every video. **API keys live only in backend environment variables — never in the frontend, never in source control. No PII in jobs, logs, or analytics.**

---

## 1. Admin UX Flow — Every Screen

Lucy Studio is a focused, authenticated single-purpose app behind admin login (passwordless/SSO per [Platform Architecture](./platform-architecture.md)). Nine screens.

### 1.1 Dashboard
The home screen and command center.
- **Header:** "Lucy Studio" + current admin user + a prominent **"New Video Job"** button.
- **Status overview cards:** counts by lifecycle bucket — *Needs script review*, *Needs final review*, *In progress* (voice/video generating), *Approved*, *Published*, *Rejected*, *Failed*.
- **Action queues:** two priority lists — **Awaiting your script review** and **Awaiting your final review** — each row showing title, category, age, and a "Review" action.
- **Today's usage strip:** jobs created today vs. daily cap, estimated spend today vs. budget, characters synthesized today.
- **Recent activity feed:** last N lifecycle events (created, approved, rejected, published) attributed to admins.

### 1.2 New Video Job
A guided form to create a `draft`.
- **Category picker** (eight categories) → loads the matching template (script skeleton, target length, aspect ratio, required disclaimer, banned-phrases check).
- **Fields:** title, topic, target platform(s), aspect ratio (defaulted by platform), voice (Lucy voice id, read-only default), avatar/template id (read-only default).
- **Script editor:** template-seeded, with live character count and **banned-phrases linter** flagging medical-claim / fear / aggressive-affiliate language inline.
- **Cost estimate panel:** live estimate (characters → voice cost; expected duration → render cost) shown **before** anything is generated.
- **Actions:** *Save draft* and *Submit for script review* (the latter sets `script_pending_review`). No generation happens on this screen.

### 1.3 Script Review
Gate #1.
- Side-by-side: the script + the script-approval checklist (Section 6).
- Inline linter results and required-disclaimer confirmation.
- Cost estimate restated.
- **Actions:** *Approve script* (→ `script_approved`) or *Reject* (reason required → `rejected`). Approving does **not** auto-generate; it enables the *Generate voice* action on Job Detail.

### 1.4 Audio Review
Optional gate, used for sensitive categories (e.g., Emergency Safety Minute) before paying to render.
- Audio player for the ElevenLabs output, the script alongside, audio-approval checklist.
- **Actions:** *Approve audio* (enables *Generate video*), *Regenerate voice* (re-synthesize), or *Reject* (reason → revision loop).

### 1.5 Video Review
Gate #2 — mandatory.
- Video player (final render) + thumbnail, transcript, captions preview, video-approval checklist.
- Brand/tone/safety confirmation; platform-format confirmation.
- **Actions:** *Approve* (→ `approved`) or *Reject* (reason → revision loop, re-entering at re-script / re-voice / re-render).

### 1.6 Approved Library
The catalog of `approved` and `published` assets.
- Filter/search by category, platform, date, status.
- Each card: thumbnail, title, category, status, asset URL (copy), captions/transcript links.
- **Actions per item:** *Mark published* (records platform + public URL), *Open Job Detail*, *Archive*.

### 1.7 Rejected Jobs
All `rejected` jobs with the rejection reason and stage.
- **Actions:** *Open Job Detail*, *Clone into new draft* (start a revision), *Archive*.

### 1.8 Job Detail
The full lifecycle view for a single `video_job`.
- Timeline of states with timestamps and the acting admin.
- All assets (audio, video, thumbnail, captions, transcript) with players/links.
- Full `approval_history`, cost estimate vs. actual usage metadata, platforms, published targets.
- **Stage-appropriate actions only:** Generate voice / Generate video / Approve / Reject / Mark published / Archive — each gated by the current `status`.

### 1.9 Settings
Admin configuration (no secret *values* ever shown — names/status only).
- Default Lucy voice id and avatar/template id (references, not secrets).
- Daily job cap, max duration, max characters, daily spend budget.
- Template management (edit skeletons, disclaimers, banned-phrases lists).
- Provider connection **status** (connected/not), surfaced from the backend — never the key itself.
- Admin user list / roles (view; user management handled by the platform auth provider).

---

## 2. Job Lifecycle

A `video_job` moves through an explicit state machine. Each transition is logged with actor + timestamp.

```
draft
  └─ submit ─────────────► script_pending_review
script_pending_review
  ├─ approve ────────────► script_approved
  └─ reject ─────────────► rejected
script_approved
  └─ generate voice ─────► voice_generating
voice_generating
  ├─ success ────────────► voice_ready
  └─ error ──────────────► failed
voice_ready
  ├─ generate video ─────► video_generating
  └─ reject (audio) ─────► rejected   (or back to script_approved on revision)
video_generating
  ├─ success ────────────► video_ready
  └─ error ──────────────► failed
video_ready
  └─ (auto) ─────────────► final_pending_review
final_pending_review
  ├─ approve ────────────► approved
  └─ reject ─────────────► rejected
approved
  └─ mark published ─────► published
published / approved / rejected
  └─ archive ────────────► archived
failed
  └─ retry ──────────────► (re-enters the failed stage; no double-charge for completed stages)
```

**State definitions**
- `draft` — being authored; no review submitted.
- `script_pending_review` — awaiting Gate #1.
- `script_approved` — script passed; voice generation allowed.
- `voice_generating` — ElevenLabs call in flight.
- `voice_ready` — audio stored; optional audio review available.
- `video_generating` — HeyGen render in flight.
- `video_ready` — render complete; assets stored.
- `final_pending_review` — awaiting Gate #2.
- `approved` — cleared for publishing.
- `published` — recorded as posted/embedded to one or more targets.
- `rejected` — declined at some stage; reason captured.
- `failed` — a provider/system error occurred; retryable.
- `archived` — retired from active views; retained for audit.

---

## 3. `video_job` JSON Schema

Versioned, storage-agnostic, **no API keys, no secrets, no PII**. `voice_id` and `avatar_id` are non-secret references.

```json
{
  "schema_version": 1,
  "id": "vj_01HZX...",
  "title": "Summer Heat Safety Tip",
  "category": "tip_of_day",
  "topic": "keeping dogs cool in summer",
  "script": "Hi, I'm Lucy. On hot days, your pup...",
  "platform": ["tiktok", "instagram_reels", "youtube_shorts"],
  "aspect_ratio": "9:16",
  "voice_provider": "elevenlabs",
  "voice_id": "lucy_voice_ref",
  "audio_url": "https://storage.internal/.../audio.mp3",
  "video_provider": "heygen",
  "avatar_id": "lucy_avatar_ref",
  "video_url": "https://storage.internal/.../video.mp4",
  "thumbnail_url": "https://storage.internal/.../poster.jpg",
  "transcript": "Hi, I'm Lucy. On hot days...",
  "captions_url": "https://storage.internal/.../captions.vtt",
  "status": "final_pending_review",
  "approval_history": [
    {
      "stage": "script",
      "decision": "approved",
      "reviewer_id": "admin_123",
      "reason": null,
      "at": "2025-01-15T14:02:00Z"
    }
  ],
  "cost_estimate": {
    "currency": "USD",
    "voice_chars": 480,
    "estimated_voice_cost": 0.12,
    "estimated_render_seconds": 28,
    "estimated_render_cost": 0.90,
    "estimated_total": 1.02
  },
  "usage_metadata": {
    "voice_chars_used": 0,
    "render_seconds_used": 0,
    "provider_request_ids": []
  },
  "published_targets": [
    { "platform": "tiktok", "public_url": null, "published_at": null }
  ],
  "created_by": "admin_123",
  "created_at": "2025-01-15T13:58:00Z",
  "updated_at": "2025-01-15T14:05:00Z"
}
```

**Enums** — `category`: `tip_of_day | ask_lucy | emergency_safety_minute | breed_spotlight | local_pet_care | my_pets_onboarding | care_score_explainer | product_education`. `platform` / `published_targets[].platform`: `tiktok | instagram_reels | facebook_reels | youtube_shorts | website | email | app`. `aspect_ratio`: `9:16 | 1:1 | 16:9`. `status`: the lifecycle states in Section 2.

---

## 4. API / Function Signatures

All are **serverless backend functions** (Netlify Functions). Keys exist only in backend env vars. Every endpoint requires authenticated admin access except the HeyGen webhook, which is authenticated by signature verification. No endpoint ever returns a secret.

### `video-job-create`
- **Method:** POST
- **Inputs:** `{ title, category, topic, script, platform[], aspect_ratio, voice_id?, avatar_id? }`
- **Output:** `{ jobId, status: "draft" | "script_pending_review" }`
- **Auth:** Admin (session/JWT).
- **Failures:** 401 unauthenticated; 400 invalid category/missing fields; 422 banned-phrase lint hard-fail; 429 over daily job cap.

### `video-job-list`
- **Method:** GET
- **Inputs:** query `{ status?, category?, platform?, limit?, cursor? }`
- **Output:** `{ jobs: [summary...], nextCursor }`
- **Auth:** Admin.
- **Failures:** 401; 400 bad filter.

### `video-job-detail`
- **Method:** GET
- **Inputs:** `{ jobId }`
- **Output:** full `video_job`.
- **Auth:** Admin.
- **Failures:** 401; 404 not found.

### `video-job-approve-script`
- **Method:** POST
- **Inputs:** `{ jobId, reviewer_id }`
- **Output:** `{ jobId, status: "script_approved" }`
- **Auth:** Admin.
- **Failures:** 401; 404; 409 wrong state (not `script_pending_review`).

### `video-generate-voice`
- **Method:** POST
- **Inputs:** `{ jobId }` (uses stored approved script + voice_id)
- **Output:** `{ jobId, status: "voice_generating" }` (async; resolves to `voice_ready`/`failed`)
- **Auth:** Admin.
- **Failures:** 401; 404; 409 not `script_approved`; 402/429 spend or rate cap exceeded; 502 provider error → `failed`.

### `video-generate-avatar`
- **Method:** POST
- **Inputs:** `{ jobId }` (uses stored audio + avatar_id)
- **Output:** `{ jobId, status: "video_generating", render_id }` (async; webhook completes)
- **Auth:** Admin.
- **Failures:** 401; 404; 409 not `voice_ready`; 402/429 caps; 502 provider error → `failed`.

### `video-webhook-heygen`
- **Method:** POST
- **Inputs:** HeyGen callback `{ render_id, status, asset_ref, signature }`
- **Output:** `200` ack.
- **Auth:** **Signature verification** against a shared signing secret (no admin session).
- **Failures:** 401 bad/missing signature (rejected, logged); 404 unknown render_id; 409 duplicate (idempotent no-op).

### `video-job-approve-final`
- **Method:** POST
- **Inputs:** `{ jobId, reviewer_id }`
- **Output:** `{ jobId, status: "approved" }`
- **Auth:** Admin.
- **Failures:** 401; 404; 409 not `final_pending_review`.

### `video-job-reject`
- **Method:** POST
- **Inputs:** `{ jobId, reviewer_id, stage, reason }` (`reason` required)
- **Output:** `{ jobId, status: "rejected" }`
- **Auth:** Admin.
- **Failures:** 401; 404; 400 missing reason.

### `video-job-archive`
- **Method:** POST
- **Inputs:** `{ jobId }`
- **Output:** `{ jobId, status: "archived" }`
- **Auth:** Admin.
- **Failures:** 401; 404; 409 invalid source state.

### `video-publish-mark`
- **Method:** POST
- **Inputs:** `{ jobId, platform, public_url? }`
- **Output:** `{ jobId, status: "published", published_targets }`
- **Auth:** Admin.
- **Failures:** 401; 404; 409 not `approved`; 400 invalid platform.

---

## 5. Security Model

- **Admin-only access.** Every screen and endpoint (except the signed webhook) requires authenticated admin identity via the platform's passwordless/SSO provider. No anonymous access; no self-serve account creation.
- **Environment variables only.** `ELEVENLABS_API_KEY`, `HEYGEN_API_KEY`, and `HEYGEN_WEBHOOK_SECRET` (names only) live in backend env vars. Never in frontend, never in the repo, never logged, never returned by any endpoint.
- **No frontend API keys.** The browser only ever talks to Lucy Studio's own backend functions, never directly to ElevenLabs/HeyGen.
- **Webhook signature verification.** The HeyGen webhook validates an HMAC/signature against `HEYGEN_WEBHOOK_SECRET`; unsigned/invalid calls are rejected and logged.
- **Spending limits.** Per-day spend budget and per-job cost ceiling; generation endpoints refuse (402/429) when a cap would be exceeded; high-cost renders require explicit confirmation.
- **Rate limits.** Per-admin and global rate limits on generation endpoints to prevent runaway loops.
- **Audit logs.** Every create/approve/reject/generate/publish/archive action is attributed to an admin id with a timestamp and stored in `approval_history` + an internal audit log. No secrets or PII in logs.
- **Asset access control.** Draft/in-progress assets stay in private storage; public URLs are minted only after approval and only for intended embeds.

---

## 6. Storage Model

Asset types: **audio** (MP3/WAV), **video** (MP4), **thumbnails** (JPG/PNG), **captions** (VTT/SRT), **transcripts** (text/JSON). Job records (metadata) live in the job store; media binaries live in object storage. Drafts are private; only approved assets get public/CDN URLs.

| Option | Pros | Cons | Fit |
|---|---|---|---|
| **Netlify Blobs** | Native to Netlify Functions, zero extra setup, simple for metadata + small assets | Less ideal for large video delivery/CDN; fewer media features | Great for **job metadata** and small files; weak for video CDN |
| **Supabase Storage** | Integrated with the platform's future DB/auth direction, signed URLs, RLS, simple API | Another dependency; egress/CDN considerations at scale | Strong all-rounder, aligns with [Platform Architecture](./platform-architecture.md) DB plans |
| **Cloudflare R2** | Cheap egress, S3-compatible, excellent for video delivery via CDN | Separate account; more infra to wire | Best for **video/thumbnail delivery** at scale |
| **AWS S3** | Mature, ubiquitous, full control | Egress cost, more ops overhead | Solid but heavier than needed for MVP |

### MVP recommendation
- **MVP:** **Supabase Storage** for all media (audio, video, thumbnails, captions, transcripts) with signed/private URLs for drafts and public URLs for approved assets, plus job metadata in the Supabase DB (or Netlify Blobs if staying serverless-only initially). This aligns with the platform's planned auth/DB direction and keeps one integration.
- **At scale:** move **video + thumbnail delivery to Cloudflare R2** (cheap egress, S3-compatible) behind a CDN, keeping metadata and signed-URL logic in Supabase. The storage interface is abstracted so this swap is config, not a rewrite.

---

## 7. Manual Approval Workflow

### Script approval checklist (Gate #1)
- On-brand voice/tone per [Brand Bible](./brand-bible.md); warm, helpful, trustworthy.
- **No medical diagnosis or claims**; "check with your vet" where relevant ([Lucy Brain](./lucy-brain.md)).
- **No fear-based content**; emergency topics framed calmly.
- **No aggressive affiliate language**; product mentions are educational + carry FTC disclosure.
- Accurate, age-appropriate, factually careful; correct category/template; within character limit.
- Required disclaimer present for the category.

### Audio approval checklist (optional gate)
- Correct Lucy voice; natural pacing and pronunciation (esp. breed/medical-adjacent terms).
- Matches the approved script (no drift); appropriate length; clean audio.

### Video approval checklist (Gate #2)
- Correct avatar, on-brand visuals, lip-sync quality acceptable.
- Captions present and accurate; transcript present.
- Synthetic-media disclosure applied where required by the target platform.
- Correct aspect ratio / safe margins for the platform(s); thumbnail acceptable.
- Final tone/safety pass: no diagnosis, no fear, no aggressive selling.

### Rejection reasons (structured enum)
`off_brand_tone | medical_claim | fearmongering | aggressive_affiliate | missing_disclosure | factual_error | poor_audio | poor_lipsync | wrong_format | missing_captions | other (free text)`

### Revision loop
A rejection records `{ stage, reason }` and routes back to the correct re-entry point: re-script (→ `draft`/`script_pending_review`), re-voice (→ `script_approved`), or re-render (→ `voice_ready`). Rejected jobs can be **cloned** into a fresh draft to preserve the original audit trail. No completed paid stage is re-charged on retry.

---

## 8. Content Templates

Each template defines target length, aspect ratio, intro/outro, caption style, required disclaimer, a script skeleton, and a `banned_phrases` list powering the linter.

| Template | Length | Default ratio | Tone & required guardrail |
|---|---|---|---|
| **Pet Tip of the Day** | 15–30s | 9:16 | Warm, practical; general best practice only. |
| **Ask Lucy** | 30–60s | 9:16 | Conversational; "ask your vet" when appropriate. |
| **Emergency Safety Minute** | 45–60s | 9:16 | **Calm, reassuring, never scary**; always "contact your vet or an emergency clinic." No diagnosis. |
| **Breed Spotlight** | 30–60s | 9:16 | Celebratory, factual; avoid stereotypes/health overgeneralizations. |
| **Local Pet Care Tip** | 20–40s | 9:16 | Helpful, neutral; points to Discover Local. |
| **My Pets Onboarding** | 30–45s | 9:16 / 1:1 | Warm welcome — Lucy "meets" the pet ([My Pets MVP](./my-pets-mvp-plan.md)). |
| **Lucy Care Score™ Explainer** | 30–45s | 9:16 / 1:1 | Encouraging; explicitly a **preparedness/organization snapshot, not a medical evaluation**. |
| **Product Education (non-salesy)** | 30–60s | 9:16 | Educational first; honest framing; **FTC affiliate disclosure** required; no pressure. |

---

## 9. Publishing Workflow

**Manual publishing only in the MVP — no auto-posting.**
- Approved assets are exported from the Approved Library; an admin uploads/schedules to the target platform.
- Targets: **TikTok, Instagram Reels, Facebook Reels, YouTube Shorts, Website embeds.**
- After posting, the admin uses **Mark published** to record the platform and the public URL on the job (`published_targets`).
- Website embeds reference only approved, hosted assets via a stable public/CDN URL (the public site never calls providers, never sees keys) — per [Lucy Video Automation](./lucy-video-automation.md) §9.
- Per-platform variants (aspect ratio, captions, copy) of one approved master are each tracked as publish targets of the same job.
- **No automated posting in MVP**; API-based scheduling is Phase 5, gated behind approval.

---

## 10. Cost Control

- **Max jobs per day:** a configurable daily cap; `video-job-create` returns 429 when exceeded.
- **Max duration:** per-category max render seconds; enforced before `video-generate-avatar`.
- **Max characters:** per-script character ceiling; enforced at create and before `video-generate-voice`.
- **Cost estimate before generation:** the New Video Job and Script Review screens show estimated voice + render cost; generation endpoints re-check against the **daily spend budget** and refuse (402/429) if exceeded; high-cost renders require explicit confirmation.
- **Provider usage logging:** `usage_metadata` records actual characters synthesized, render seconds, and provider request ids per job; the Dashboard usage strip aggregates daily spend vs. budget. No secrets in usage logs.

---

## 11. Compliance & Trust

- **Synthetic media disclosure.** Lucy is clearly a brand character; AI-generated-content labels are applied per each platform's requirements.
- **No medical diagnosis.** Hard rule across templates, linter, and all three checklists; "consult your vet" framing; uncertainty acknowledged.
- **No fear-based content.** Emergency content is calm and directional; the linter flags fear language.
- **No aggressive affiliate language.** Product education is genuinely educational; pushy/deceptive phrasing is banned.
- **FTC disclosure.** Any product mention includes a clear affiliate/advertising disclosure in the video and/or caption.
- **Accessibility captions required.** Every published video has captions (VTT/SRT) and a transcript; the Video Review checklist blocks approval without them.
- **Provider terms & likeness.** Lucy voice/avatar usage stays within ElevenLabs/HeyGen TOS and documented voice/likeness rights.
- **Privacy.** No PII in jobs, logs, or analytics; personalized videos (future) carry their own consent + privacy handling.

---

## 12. Future Roadmap

- **Phase 1 — Manual admin tool.** Lucy Studio as specified: full pipeline, two human gates, manual publishing. *(This document.)*
- **Phase 2 — Semi-automated templates.** Stronger template automation, auto-seeded scripts (still human-approved), batch creation, smarter linting.
- **Phase 3 — Personalized videos.** Consent-gated, templated personalization (e.g., birthdays, Care Score recaps); private by default.
- **Phase 4 — In-app Lucy videos.** Approved/personalized videos embedded across the platform (My Pets, Care Score, Emergency, Learn).
- **Phase 5 — Automated publishing with approval.** API-based scheduling/posting to social platforms, still behind a mandatory approval gate.

Sequencing governed by the [Roadmap](./roadmap.md); trust and cost-control gates must be proven before advancing a phase.

---

## 13. Recommended MVP Build Order

Exact implementation order (do **not** implement yet):

1. **Job store + `video_job` schema (v1)** and the lifecycle state machine — the backbone everything attaches to.
2. **Auth + admin shell** — gate all routes/endpoints behind admin login; empty Dashboard scaffold.
3. **`video-job-create` + `video-job-list` + `video-job-detail`** with templates and the banned-phrases linter; **New Video Job** and **Dashboard** screens.
4. **Script Review** screen + **`video-job-approve-script`** / **`video-job-reject`** (Gate #1, revision loop).
5. **Storage integration** (Supabase Storage; private signed URLs) wired for audio/video/thumbnail/captions/transcript.
6. **`video-generate-voice`** (ElevenLabs, server-side key, cost/char caps) → **voice_ready**; optional **Audio Review**.
7. **`video-generate-avatar`** (HeyGen submit) + **`video-webhook-heygen`** (signature-verified) → **video_ready** → **final_pending_review**.
8. **Video Review** screen + **`video-job-approve-final`** (Gate #2) → **approved**; **Approved Library** + **Rejected Jobs** views.
9. **`video-publish-mark`** (manual publishing record) + **`video-job-archive`**; **Job Detail** timeline complete.
10. **Cost control + audit hardening** — daily caps, spend budget enforcement, usage logging, rate limits, audit log review; **Settings** screen.
11. **Pilot** with one or two low-risk categories (Pet Tip of the Day, Ask Lucy) end-to-end before adding the rest.

Build the backbone and gates first; add generation only once review and cost controls are in place. Every later phase slots into the same schema and endpoints.

---

*Internal document. Cross-references: [Lucy Video Automation](./lucy-video-automation.md) · [Brand Bible](./brand-bible.md) · [Lucy Brain](./lucy-brain.md) · [Platform Architecture](./platform-architecture.md) · [Roadmap](./roadmap.md). No code built, no APIs called, no secrets stored. Contains no secrets, API keys, credentials, internal URLs, environment variable values, or PII.*
