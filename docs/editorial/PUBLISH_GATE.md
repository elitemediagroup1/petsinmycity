# Publish Gate, Verification & Content Maintenance

> **Part of:** The PetsInMyCity Editorial Operating System (`EDITORIAL_OS.md`, Sections 6 & 12).
> **Purpose:** The verification statuses every meaningful claim carries, the gate a page must clear before publishing, and the maintenance system that keeps published knowledge true over time.
> **Companion:** `RESEARCH_WORKFLOW.md` (source tiers), `KNOWLEDGE_OS.md` (how statuses live in the graph), `EDITOR_CHECKLIST.md` (the review that enforces this gate).

---

## 1. Claim verification statuses

Every meaningful claim in a dossier carries exactly one status:

| Status | Meaning | Publishable as fact? |
|---|---|---|
| **Verified** | Confirmed against an authoritative source, dated. | Yes |
| **Multi-source verified** | Confirmed by two or more independent credible sources. | Yes |
| **Officially confirmed** | Direct from the governing authority (ordinance text, parks dept). | Yes |
| **Observed pattern** | Convergence across many credible sources, reported as a pattern in our words. | Yes, as a pattern |
| **Expert opinion** | Attributable, on-the-record view from a qualified expert. | Yes, labeled as opinion |
| **Community pattern** | A lead seen repeatedly in Tier 4, NOT independently verified. | **No** — hold, or hedge + date only |
| **Needs further reporting** | Open question; not yet resolved. | **No** — blocks the page |
| **Rejected** | Failed verification; recorded so it is not re-litigated. | **No** |
| **Unknown** | We cannot determine it. | Say so honestly; do not fill the gap |
| **Outdated** | Was verified; now past its review window. | **No** — triggers re-reporting |

---

## 2. The publish gate

A page may publish **only when all of the following hold**:

1. Every **safety-floor** claim (toxicity, emergency/first-aid, medication, venomous wildlife, heat/cold thresholds, medical-adjacent) is **Verified** or **Officially confirmed** to a **Tier 1–2** source.
2. Every other **meaningful** claim is at least **Multi-source verified** or **Observed pattern**, with sources logged in the dossier.
3. **No** meaningful claim remains **Needs further reporting**.
4. The page passes the **Local Authenticity Test** (`LOCAL_JOURNALISM.md`, Section 8).
5. The page has cleared the **review chain** (`EDITOR_CHECKLIST.md`), including AI review if AI drafted or assisted.

If a page cannot meet the gate, it does not ship. **"No page" always beats "a page we can't stand behind."**

---

## 3. Confidence scoring

Each claim also carries a confidence level, recorded in the dossier and stored on the graph fact:
- **High** — Tier 1–2, current, corroborated.
- **Medium** — Tier 3 corroborated, or Tier 1–2 slightly dated.
- **Low** — single Tier 3, or an observed pattern with limited convergence. Low-confidence claims are either strengthened before publish or clearly framed as such.

Confidence is distinct from status: a claim can be *Verified* but *Medium* confidence if the only authoritative source is a few years old.

---

## 4. Staleness & review cadence

Every published page and every graph fact carries a **next-review date**.

Default cadence:
- **Safety, emergency, and legal content:** every **6 months**.
- **Standard local pages:** **annually**.
- **Evergreen animal-care content:** every **18–24 months**.

---

## 5. Immediate-review triggers (override the calendar)

Re-report and update as soon as any of these occur:
- A **law or ordinance change** (leash, licensing, breed rules, travel requirements).
- A **business closure** — especially an **emergency vet or 24-hour clinic**.
- A **park, beach, or trail closure or rule change**.
- A **natural disaster or public-safety event** affecting the area.
- A **product recall**.
- **New veterinary or scientific guidance**.

Outdated content is updated promptly or, if it cannot be, clearly flagged or unpublished — never left silently wrong.

---

## 6. How old content stays trustworthy

Because facts live in the Knowledge OS with review dates and named owners, the system **surfaces** what is going stale rather than waiting for a reader to find an error. When a fact changes, it is corrected once in the graph and the correction **propagates to every surface** — articles, Lucy, search, tools — at once. A page is a living claim about the world, and we are responsible for it for as long as it is published. There is no such thing as "finished."

---

## 7. Corrections

When we get something wrong, we fix it promptly in the graph and on every surface. For anything material or safety-relevant, we note that a correction was made and when. Readers must have an obvious way to report a suspected error; every report is triaged against the immediate-review triggers above. We never quietly alter a safety-relevant fact and pretend it was always right. (See `EDITORIAL_OS.md`, Section 16.)
