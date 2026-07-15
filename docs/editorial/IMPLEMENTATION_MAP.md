TEST-PASTE-123# PetsInMyCity — Editorial & Knowledge Implementation Map

> **Status:** Living implementation index for the Editorial & Knowledge Foundation.
> **Purpose:** Explain what already exists in the repository, what the Editorial Operating System adds, and how the two integrate — so no documentation is duplicated and every new file has a clear reason to exist.
> **Scope:** Documentation, schemas, templates, and research workspaces only. This phase does not touch production code, Netlify functions, environment variables, or secrets.
> **Owner of record:** PetsInMyCity (Elite Media Group).

---

## 1. Why this document exists

PetsInMyCity is evolving from a content website into a **trusted local pet knowledge platform**. The strategy for that evolution already lives in the repository. What was missing was the **operational layer** — the newsroom system that governs how knowledge is researched, verified, written, and maintained.

This map is the bridge. It records the audit that preceded the new `docs/editorial/` documentation set, states which existing files are authoritative and must be preserved, and shows exactly where the editorial system plugs into the existing architecture.

Read this first. It is the table of contents for the whole foundation.

---

## 2. Repository audit — what already exists

The following files were reviewed in full before any new file was created. They are the existing foundation and are considered **authoritative**.

### Strategy & architecture (preserve — do not modify)
- `docs/platform-architecture.md` — the long-term product/tech/design vision (pet operating system across web, PWA, native). Defines the product pillars (My Pets, Lucy, Health, Emergency, Discover, Learn, Marketplace) and the information architecture.
- `docs/roadmap.md` — what gets built and when, including the Local Platform Roadmap, SEO Roadmap, and Content Roadmap (topic clusters).
- `docs/knowledge-graph.md` — the conceptual entity map: domains, ~17 live local categories, tool graph, and relationship examples. **This is the direct ancestor of the Knowledge Operating System added in this phase.**
- `docs/brand-bible.md` — voice, tone, visual identity, and trust principles.
- `docs/lucy-brain.md` — Lucy's AI behavior, boundaries, and safety guardrails.
- `docs/my-pets-mvp-plan.md` — the first product step toward the pet operating system.
- `docs/master-project-checklist.md`, `docs/lucy-studio-spec.md`, `docs/lucy-video-automation.md` — supporting product/ops specs.

### Published trust surfaces (preserve — do not modify)
- `/about/`, `/trust/`, `/editorial-standards/`, `/privacy/` — the public E-E-A-T and trust pages. The new internal Editorial OS is the private engine behind the public `/editorial-standards/` promise.

### Product surfaces reviewed (context only — untouched this phase)
- `/lucy/`, `/today/`, `/my-pets/` and their JS (`assets/lucy*.js`, `assets/my-pets.js`, `assets/platform-shell.js`) — the app spine.
- `/tools/*` (11 live tools), the service/category pages, and the six existing city pages (`/cities/austin`, `chicago`, `denver`, `houston`, `phoenix`, `seattle`).
- `netlify/functions/*` — live integrations (Places search, Lucy chat, pet tools). **Not touched this phase.**

---

## 3. Audit findings that shaped this foundation

1. **A strategy layer exists, but no editorial/operational layer existed.** The repo explained *what* to build and *why*, but not *how knowledge is researched, verified, and kept true*. That gap is what `docs/editorial/` fills.
2. **`knowledge-graph.md` is conceptual, not operational.** It maps entities and relationships beautifully but does not define verification status, confidence scoring, provenance, ownership, or update cadence. The Knowledge Operating System extends it into an operational asset without rewriting it.
3. **City pages were hand-built and thin.** The Phoenix GA4 bug in history is evidence of copy-paste page creation — a duplicate-content and maintenance risk. The dossier system exists to make every location page begin from verified research instead of a copied skeleton.
4. **No research or verification artifacts existed.** There was no place to record sources, verification dates, confidence, or open questions. The Research Dossier system introduces that source of truth.

---

## 4. What remains unchanged, expanded, or new

### Unchanged (authoritative — preserved as-is)
All files in Section 2. Nothing in this phase deletes, renames, or substantially rewrites them.

### Expanded (extended by new docs, not edited)
- `docs/knowledge-graph.md` → operationalized by `docs/editorial/KNOWLEDGE_OS.md` (adds lifecycle, confidence, provenance, ownership).
- `docs/lucy-brain.md` → its guardrails are inherited and referenced by `docs/editorial/AI_EDITOR_GUIDELINES.md`.
- Public `/editorial-standards/` → its private engine is the new `docs/editorial/` set.

### New (added this phase)
See Section 5 for the complete `docs/editorial/` structure and the Austin research workspace.

### Eventually retire (recommendation only — NOT done this phase)
- None of the existing strategy docs should be retired; they remain valuable.
- Candidate for future consolidation: if `docs/master-project-checklist.md` overlaps with `docs/roadmap.md` over time, consider merging. **No action taken now** — flagged for editorial leadership.

---

## 5. The new documentation structure

Placed under `docs/editorial/` to sit alongside — not on top of — existing docs.

```
docs/
  editorial/
    IMPLEMENTATION_MAP.md        # this file — audit + index
    EDITORIAL_OS.md              # the master newsroom manual
    LOCAL_JOURNALISM.md          # local reporting standards + authenticity test
    RESEARCH_WORKFLOW.md         # investigative workflow + source tiers + verification
    PUBLISH_GATE.md              # claim statuses, publish gate, refresh cadence
    KNOWLEDGE_OS.md              # the Knowledge Operating System (entities/lifecycle)
    AI_EDITOR_GUIDELINES.md      # how AI (Lucy + future) operates under the manual
    EDITOR_CHECKLIST.md          # the reviewable checklist run before publish
    dossiers/
      README.md                  # how the dossier system works
      TEMPLATE_STATE.md
      TEMPLATE_CITY.md
      TEMPLATE_NEIGHBORHOOD.md
      TEMPLATE_PARK.md
      TEMPLATE_TRAIL.md
      TEMPLATE_BEACH.md
      TEMPLATE_VETERINARIAN.md
      TEMPLATE_SHELTER.md
      TEMPLATE_RESCUE.md
      TEMPLATE_BREED_LOCATION.md
research/
  austin/                        # gold-standard research workspace (not for publication)
    README.md
    DOSSIER.md
    KNOWLEDGE_GRAPH_SKELETON.md
    RESEARCH_CHECKLIST.md
    VERIFICATION_TRACKER.md
    MISSING_INFORMATION.md
    EXPERT_SOURCES.md
```

### Consolidation decisions (why this differs from the example list)
The Phase 3 brief listed ~20 example files. To optimize for maintainability over document count, the following were **consolidated** — each merger documented here:
- `SOURCE_VERIFICATION.md` + parts of the verification framework → merged into **`RESEARCH_WORKFLOW.md`** (source tiers) and **`PUBLISH_GATE.md`** (claim statuses). Splitting source reliability from the workflow that uses it would fragment one idea across files.
- `RESEARCH_DOSSIER_TEMPLATE.md` → became the **`dossiers/`** folder with one canonical `README.md` spec plus ten production templates, rather than a single template file. Location types have genuinely different research needs; one template cannot serve a state and a single veterinarian well.
- `KNOWLEDGE_GRAPH_EDITORIAL.md` → renamed **`KNOWLEDGE_OS.md`** to signal it is the authoritative operating system, not a style note.
- `CONTENT_REFRESH_PROCESS.md` → merged into **`PUBLISH_GATE.md`** (staleness, cadence, and immediate-review triggers live with the verification statuses they depend on).

No documents were created solely to reach a count.

---

## 6. How the editorial system integrates with existing architecture

- **Articles / location pages** — every page begins as a dossier (`dossiers/`), passes the publish gate (`PUBLISH_GATE.md`), and only then is written per `EDITORIAL_OS.md`.
- **Knowledge graph** — verified facts flow from dossiers into the Knowledge OS (`KNOWLEDGE_OS.md`), which extends `docs/knowledge-graph.md` with lifecycle and provenance.
- **Lucy** — reads verified facts from the Knowledge OS and operates under `AI_EDITOR_GUIDELINES.md`, which inherits `lucy-brain.md` guardrails. Lucy never serves unverified (community-pattern) facts as truth.
- **Search & recommendations** — surface only graph facts at or above the required verification status.
- **My Pets** — the private owner+pet layer; public pages terminate in "save to My Pets" and "ask Lucy" conversion edges, per `platform-architecture.md`.
- **Future APIs / mobile / EMG platforms** — consume the same graph; the Knowledge OS is designed to be surface-agnostic.

---

## 7. Guardrails honored throughout this phase

- No existing document deleted, renamed, or substantially rewritten.
- No production code, Netlify functions, environment variables, or secrets touched.
- No secrets, API keys, or internal URLs placed in any new file.
- The public Austin page is **not** rewritten; Austin is only *prepared for investigation*.
- Documents consolidated where that produced a cleaner system; none padded for volume.

---

*This map is updated whenever a file is added to or retired from the editorial foundation.*
