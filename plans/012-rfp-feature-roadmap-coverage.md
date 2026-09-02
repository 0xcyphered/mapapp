# Plan 012: Close RFP gaps in `resources/features-roadmap.md`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 09678ee..HEAD -- resources/features-roadmap.md resources/RFP.pdf plans/README.md`
> If `resources/features-roadmap.md` changed since this plan was written,
> compare the "Current state" excerpts against the live file before editing.
> If `resources/RFP.pdf` is missing, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (docs only; land before the next product slice so OTP / multi-modal cargo are not invented ad hoc)
- **Category**: docs
- **Planned at**: commit `09678ee`, 2026-09-03

## Why this matters

`resources/RFP.pdf` is the live AminTajeran / Taticom freight-platform RFP
(16 pages, published 10 Shahrivar 1405). `resources/features-roadmap.md` is
the V5 feature extract that later slices treat as the product spec.

The extract is **not complete**. It lists user/driver/admin/company bullets
well, but it never names the RFP's required **transport modes** (road, sea,
air, rail, combined), **OTP**, **routing** (as distinct from map picking),
the **Phase 1 surfaces** in §4.3, **out-of-scope** items in §4.4, or the
§7 non-functional / security requirements. Citation markers like `[14]`
do not match this 16-page PDF.

If the next OTP / cargo-CRUD plans follow the current file, they will miss
mode-specific cargo and treat "User login" as unspecified auth. This plan
is **markdown only**. It does not move GPS, companies, ratings, or payments
into Phase 1, and it does not touch `backend/` or `mobile/`.

## Current state

Repo layout at plan time:

```
iran-map/
  resources/RFP.pdf                    ← live 16-page RFP (Persian)
  resources/features-roadmap.md        ← V5 extract (170 lines) — INCOMPLETE
  plans/README.md                      ← still points at missing root spec
  backend/                             ← 010 + 011 landed; do not touch
  mobile/                              ← Expo map; do not touch
```

There is **no** `amin-tajeran-features-roadmap-v5.md` at repo root, but
`plans/README.md` (lines 3, 32), `plans/010-backend-scaffold.md`, and
`plans/011-phase1-mongo-models.md` still name that path. This plan adds a
short pointer file so those references resolve.

`resources/features-roadmap.md` header and Phase 1 close (live excerpts):

```markdown
# AminTajeran Transportation & Logistics Platform - Feature Implementation Roadmap (V5)

This document contains a comprehensive, granular list of all features specified in the RFP for the **AminTajeran (Taticom Ecosystem) Transportation and Logistics Platform** [1].
```

```markdown
### 7. Core Integrations & APIs (ارتباط با سایر سامانه‌ها)
*   **Map and location services API**: Integrates base map APIs for visual address picking [21].
```

Phase 2 already contains companies, GPS stream, ratings, SMS, payments,
Telegram/WhatsApp, KYC, BI, audit logs. **Do not reshuffle those.**

Existing Phase 1 vs Phase 2 split is a product decision (booking MVP first).
Keep it. Only **add missing mentions**.

### RFP source (do not re-extract from memory)

File: `resources/RFP.pdf` (16 pages, A4, not encrypted).

Extract locally if you need to re-check wording (pymupdf is enough; this PDF
is text-based, not a scan):

```bash
python3 -c "
import pymupdf
doc = pymupdf.open('resources/RFP.pdf')
print('pages', doc.page_count)
for i, page in enumerate(doc):
    print('---', i+1, '---')
    print(page.get_text())
"
```

Expected: 16 pages. Section 4 starts around page 6. Feature bullets are
§4.2.1–§4.2.8 (pages 7–10). Surfaces are §4.3 (page 10). Out of scope is
§4.4 (page 10). NFRs are §7.1 and §7.3–§7.4 (pages 13–14).

Do **not** paste RFP prose into git beyond the short bilingual labels
already used in the roadmap. The PDF stays the legal source.

### Coverage verdict (vetted against the PDF)

Already mentioned (keep; do not duplicate):

| RFP | Roadmap home |
|-----|----------------|
| 4.2.1 user register/login, profile, cargo request, status, search, select, notifications, history, support | Phase 1 §1 |
| 4.2.2 cargo origin/destination, dimensions, special characteristics, timing, offers, select carrier, stage tracking, history, alerts | Phase 1 §2 |
| 4.2.2 live GPS view | Phase 2 §1 (parked — correct) |
| 4.2.3 driver + vehicle + documents, match, accept/reject, trip status, checkpoints, trip history | Phase 1 §3 |
| 4.2.3 GPS send | Phase 2 §1 (parked — correct) |
| 4.2.4 transport companies / fleet / staff / assign loads | Phase 2 §2 (parked — correct) |
| 4.2.5 status, event log, history, status-change alerts, timestamps, owner portal | Phase 1 §4 |
| 4.2.5 GPS map display | Phase 2 §1 (parked — correct) |
| 4.2.6 admin users/drivers/cargo/trips/base data/docs/RBAC/settings | Phase 1 §5 |
| 4.2.6 BI, audit, reviews, admin broadcasts | Phase 2 §3–§5 |
| 4.2.7 push + lifecycle alerts | Phase 1 §6 |
| 4.2.7 SMS, in-app, email | Phase 2 §5 / §9 |
| 4.2.8 Taticom API, KYC APIs, SMS gateway, payments, Telegram, WhatsApp, social broadcast, custom hooks | Phase 2 §7–§9 |
| 4.2.8 map API | Phase 1 §7 (incomplete — picking only) |

**Missing — must add in this plan:**

1. **Transport modes** (RFP 4.2 preamble, page 6): زمینی، دریایی، هوایی، ریلی، ترکیبی (road, sea, air, rail, combined/multimodal). Per-mode fields finalized in SRS.
2. **Phase 1 surfaces** (RFP 4.3): Android app, iOS app, web admin panel, independent scalable backend/API.
3. **Phone OTP** (RFP 7.3 "درگاه پیامک/OTP"): named login channel. Today the file only says "User login".
4. **Routing** (RFP 7.3 "نقشه و مسیریابی"): maps **and** routing, not only address picking.
5. **SRS leftover user capabilities** (RFP 4.2.1 last bullet).
6. **User activity logs vs transport history**: 4.2.1 "سوابق فعالیت و حمل‌ونقل" is two things. Transport history is Phase 1 §1; activity logs are already Phase 2 §6. Add a one-line cross-reference under Phase 1 §1 so the pair is visible.
7. **Value-added / adjacent revenue services bed** (RFP 4.1 / page 5).
8. **Out of scope** (RFP 4.4): hardware, phones/GPS devices, datacenter unless agreed, external services that need their own contract, content/marketing, operational HR, post-SRS fundamental scope changes.
9. **Non-functional / platform requirements** (RFP 4.5, 7.1, 7.4): page load <2s, API <500ms, horizontal scale, 99.5% annual uptime, OWASP Top 10, last two major Android/iOS + major browsers, accessibility + responsive, backup & DR, encrypted sensitive data, security audit trail, pre-release pentest, logging + monitoring, file/image storage.
10. **Citation cleanup**: replace `[n]` notebook markers with `(RFP 4.2.x)` section refs.

**Present in the roadmap but not in the RFP** (keep, mark as extension):

- Phase 1 §3 **Viewing earnings history** — RFP 4.2.3 only asks for trip/transport history, not payouts. Leave the bullet; suffix it `(extension beyond RFP 4.2.3)`.

**Intentionally not copied into the features list** (process / commercial, not app features):

- §1 confidentiality, §2 bidding instructions, §5 SOW (agile, UAT, change requests), §6 supplier qualifications, §8 contractor deliverables (wireframes, Play/App Store publish, OpenAPI, Git-owned-by-employer), §9 contracts/NDA/IP/SLA.

Do not turn those into feature bullets.

### Conventions

- Bilingual headings already used: English title + Persian in parentheses. Match that.
- Bullet style: `*   **Name**: sentence.` (three spaces after `*`).
- Phase 1 = booking MVP. Phase 2 stays parked. Same rule as plans 010/011.
- Product vocabulary: صاحب کالا = cargo owner, راننده = driver, بار = cargo. Do not rename to "shipper" / "trucker".
- 2-space / CommonJS rules do **not** apply; this is markdown in `resources/`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Confirm RFP | `python3 -c "import pymupdf; d=pymupdf.open('resources/RFP.pdf'); print(d.page_count)"` | `16` |
| Drift | `git diff --stat 09678ee..HEAD -- resources/features-roadmap.md resources/RFP.pdf plans/README.md` | empty, or only files you understand |
| Coverage greps | see Done criteria | every pattern hits |
| No code churn | `git diff --stat -- backend mobile` | empty |

No install, test, or lint. Do not run `npm test`.

## Suggested executor toolkit

- Skill `amintajeran-project` if present — Phase 1 vs Phase 2 boundary.
- Do **not** load `mongoose-patterns` / `react-native-mobile`; no code.

## Scope

**In scope** (the only files you should modify):

- `resources/features-roadmap.md` (edit)
- `amin-tajeran-features-roadmap-v5.md` (create —  pointer only)
- `plans/README.md` (index row + product-source path)

**Out of scope** (do NOT touch, even though they look related):

- `resources/RFP.pdf` — legal source; never rewrite or OCR-replace it.
- `backend/**`, `mobile/**`, `plans/001-*.md` … `plans/011-*.md` — historical plans keep their original spec filename; the pointer file is the compatibility shim.
- Phase 1 ↔ Phase 2 moves (GPS, companies, ratings, payments, KYC, Telegram, SMS gateway, BI).
- New Mongoose fields (`transportMode`, OTP columns, etc.). Spec first; schema is a later slice.
- Copying §5/§8/§9 RFP process into the roadmap.
- Recreating `webapp/`.

## Git workflow

- Branch: `advisor/012-rfp-feature-roadmap-coverage`
- Commit per logical unit. Message style from this repo: `feat(012): close RFP gaps in features-roadmap` and `chore(012): mark plan DONE in index`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm the RFP and the current extract

From repo root:

```bash
python3 -c "import pymupdf; d=pymupdf.open('resources/RFP.pdf'); print(d.page_count)"
wc -l resources/features-roadmap.md
test -f amin-tajeran-features-roadmap-v5.md && echo HAS_ROOT_SPEC || echo NO_ROOT_SPEC
```

**Verify**: prints `16`, line count around 170, `NO_ROOT_SPEC`.

If page count is not 16, STOP — you may be looking at a different PDF.

### Step 2: Rewrite the header and add the missing Phase 1 blocks

Edit `resources/features-roadmap.md` in place. Keep every existing feature
bullet. Insert the new material at the locations below. Replace every
`[digits]` citation with the RFP section that owns that bullet
(`(RFP 4.2.1)` … `(RFP 4.2.8)`, `(RFP 7.3)`, etc.).

**A. Replace the title block** with:

```markdown
# AminTajeran Transportation & Logistics Platform — Feature Implementation Roadmap (V5)

Canonical product feature list for **AminTajeran (Taticom Ecosystem)**
freight and logistics. Source of truth for *what* to build:
`resources/RFP.pdf` (16 pages, published 10 Shahrivar 1405). This file is
the implementation checklist derived from that RFP. Contractor process
(SOW, bidding, contracts, NDA) stays in the PDF and is not duplicated here.

Phase 1 is the booking MVP (cargo owner + driver + admin oversight).
Phase 2 stays parked until Phase 1 booking works: live GPS, companies/fleet,
ratings, payments, KYC APIs, Telegram/WhatsApp, SMS gateway, BI.

Mode-specific cargo fields, final notification channels, and API contracts
are finalized in the joint SRS (RFP 4.2, 4.2.7, 4.2.8, 4.6). This checklist
must still *name* every RFP-requested capability so later slices cannot
drop them.
```

**B. Insert a new Phase 1 section *before* current `### 1. User Application Features`:**

```markdown
### 0. Phase 1 platform surfaces (سامانه‌های مورد انتظار)

*   **iOS mobile application**: Native or cross-platform client on the App Store path (RFP 4.3).
*   **Android mobile application**: Native or cross-platform client on the Google Play path (RFP 4.3).
*   **Web administrator panel**: Browser admin shell for oversight and verification (RFP 4.3, 4.2.6).
*   **Independent scalable backend API**: Separate service, not embedded in a client (RFP 4.3).
```

**C. Under Phase 1 `### 1. User Application Features`, add these bullets**
(do not remove registration/login):

```markdown
*   **Phone OTP sign-in**: Authenticate with `User.phone` via SMS OTP gateway, not email/password (RFP 7.3).
*   **Viewing activity logs**: Full user action history is Phase 2 §6; this Phase 1 surface only needs transport history (RFP 4.2.1).
*   **SRS-deferred user capabilities**: Additional user-app features finalized during analysis/SRS without a fundamental scope change (RFP 4.2.1).
```

**D. Insert a new Phase 1 section after cargo-owners (current §2) and
before drivers (current §3).** Renumber later Phase 1 headings so they
stay sequential (User, Cargo owners, **Transport modes**, Drivers,
Tracking, Admin, Notifications, Integrations):

```markdown
### 3. Cargo transport modes (حوزه‌های حمل‌ونقل)

The platform must register and manage cargo across the primary modes.
Final mode list and per-mode fields are locked in the SRS (RFP 4.2).

*   **Road / land cargo (زمینی)**: Register and manage ground freight (RFP 4.2).
*   **Sea / maritime cargo (دریایی)**: Register and manage sea freight (RFP 4.2).
*   **Air cargo (هوایی)**: Register and manage air freight (RFP 4.2).
*   **Rail cargo (ریلی)**: Register and manage rail freight (RFP 4.2).
*   **Combined / multimodal cargo (ترکیبی)**: Register and manage shipments that use more than one mode (RFP 4.2).
*   **Mode-specific cargo fields**: Each mode may add its own attributes; do not assume truck-only dimensions (RFP 4.2).
```

After this insert, current "### 3. Drivers" becomes "### 4. Drivers",
tracking `### 5`, admin `### 6`, notifications `### 7`, integrations `### 8`.
Update those heading numbers. Do not change the bullet text except citations
and the two edits in E–F.

**E. Phase 1 integrations — extend the map bullet and add routing:**

Replace

```markdown
*   **Map and location services API**: Integrates base map APIs for visual address picking [21].
```

with

```markdown
*   **Map and location services API**: Base map APIs for visual address picking (RFP 4.2.8, 7.3).
*   **Routing services API**: Route geometry and directions, not only geocoding (RFP 7.3 نقشه و مسیریابی).
*   **SMS / OTP gateway (auth)**: Third-party SMS used for OTP sign-in; transactional SMS alerts stay Phase 2 (RFP 7.3).
*   **Push notification provider**: Device push via a third-party push service (RFP 7.3, 4.2.7).
```

**F. Drivers earnings bullet** — keep, mark extension:

```markdown
*   **Viewing earnings history**: Displays a dashboard of driver's financial history and past completed payouts (extension beyond RFP 4.2.3; RFP only requires trip/transport history).
```

**Verify**:

```bash
rg -n "زمینی|دریایی|هوایی|ریلی|ترکیبی" resources/features-roadmap.md
rg -n "Phone OTP|Routing services API|Phase 1 platform surfaces" resources/features-roadmap.md
rg -n "\[1[0-9]\]|\[2[0-9]\]" resources/features-roadmap.md || true
```

Expected: mode names hit; OTP + routing + surfaces hit; old `[14]`-style
citations gone (or only inside this plan file, which you are not editing
here).

### Step 3: Add Phase 2 value-added bed + out-of-scope + NFR sections

Append **after** the existing Phase 2 `### 9. Core Gateway Integrations`
block (end of file today). Do not insert into the middle of Phase 2
company/ratings lists.

```markdown
### 10. Value-added services foundation (خدمات ارزش افزوده)

*   **Adjacent revenue / value-added services bed**: Architecture must allow later supply-chain add-ons without rewriting the core (RFP 4.1, page 5). No specific add-on is in Phase 1 or Phase 2 scope until the SRS names it.

## Out of scope (RFP 4.4)

Unless a signed contract or the final SRS says otherwise, these are **not**
product features for the initial project:

*   Hardware or physical equipment development
*   Supplying mobile phones or GPS devices
*   Server / datacenter provisioning, unless separately agreed
*   External services that require their own contract or license
*   Content production and marketing
*   Operational business support and human resources
*   Features added after SRS approval that require a fundamental scope change
    (those go through Change Request, RFP 4.4 / 5.6)

## Non-functional and platform requirements (RFP 4.5, 7.1, 7.4)

Not user-facing screens, but they are requested and must stay visible:

*   **Page load**: under 2 seconds in normal conditions (RFP 7.1)
*   **API latency**: under 500 ms in normal conditions (RFP 7.1)
*   **Horizontal scalability**: users and transaction volume (RFP 4.5, 7.1)
*   **Availability**: at least 99.5% annual uptime with monitoring and alerts (RFP 7.1)
*   **Security**: encryption, secure auth, OWASP Top 10 hardening (RFP 7.1)
*   **Sensitive-data encryption**: passwords and payment data at rest (RFP 7.4)
*   **Privacy**: applicable user data-protection and privacy rules (RFP 7.4)
*   **Security audit trail**: record and trace security-relevant events (RFP 7.4)
*   **Penetration test**: before final production release (RFP 7.4)
*   **Client compatibility**: last two major Android and iOS versions, plus major browsers (RFP 7.1)
*   **Accessibility and responsive design**: usable across device sizes (RFP 7.1)
*   **Backup and disaster recovery**: automated backup and restore (RFP 4.5, 7.1)
*   **Logging and monitoring**: operational event logging and health checks (RFP 4.5)
*   **File / image storage**: documents and images live in an object store, not in Mongo documents (RFP 7.2)
*   **Modular APIs**: add modules and external systems without a core rewrite (RFP 4.5)
```

**Verify**:

```bash
rg -n "Out of scope|99\\.5|OWASP|Penetration test|value-added" resources/features-roadmap.md
```

Expected: each phrase hits once (or more for OWASP if you also mention it
in security).

### Step 4: Add the root pointer file

Create `amin-tajeran-features-roadmap-v5.md` at repo root with **only**:

```markdown
# AminTajeran features roadmap

The live checklist is `resources/features-roadmap.md` (derived from
`resources/RFP.pdf`). This filename is kept so plans 010–011 and older
notes still resolve.
```

**Verify**: `test -f amin-tajeran-features-roadmap-v5.md` succeeds; file
is under 20 lines; it does not duplicate the feature list.

### Step 5: Update the plan index

In `plans/README.md`:

1. Set this plan's status row to **DONE** after the file edits land (executor
   does that at the end). While implementing, you may set it **IN PROGRESS**.
2. Change the product-source sentence in "Recommended next slices" from
   `` `amin-tajeran-features-roadmap-v5.md` `` to
   `` `resources/features-roadmap.md` (RFP: `resources/RFP.pdf`) ``.
3. Add one dependency note:

   `012 is docs-only. It does not block 011 (already DONE). Later OTP and
   cargo-CRUD slices must read the updated modes + OTP bullets.`

4. Under "Findings considered and rejected" add:

   - **Copying RFP §5/§8/§9 (SOW, Play Store publish, NDA, SLA) into the
     feature list**: rejected — those are contractor process, not app
     features.
   - **Moving GPS / companies / payments into Phase 1 because the RFP lists
     them in 4.2**: rejected — RFP 4.6 allows phasing; existing V5 split
     stays. 012 only ensures they remain *named* (already true in Phase 2).

**Verify**: `rg "^\\| 012" plans/README.md` shows the new row.

## Test plan

No Jest. Characterization is grep + a mapping table you tick in the PR
description (or a short `## RFP mapping` appendix at the **bottom** of
`resources/features-roadmap.md` — optional, only if it stays <40 lines).

If you add the appendix, use this exact table. Every RFP row must point at
a heading that exists in the file after your edits:

```markdown
## RFP mapping (machine check)

| RFP | Must appear in this file |
|-----|--------------------------|
| 4.2.1 user app | Phase 1 User Application |
| 4.2.2 cargo owners | Phase 1 Cargo Owners |
| 4.2 preamble modes | Phase 1 Cargo transport modes |
| 4.2.3 drivers | Phase 1 Drivers |
| 4.2.4 companies | Phase 2 Transportation Companies |
| 4.2.5 tracking | Phase 1 Shipment Tracking |
| 4.2.6 admin | Phase 1 Web Administrator + Phase 2 Advanced Admin |
| 4.2.7 notifications | Phase 1 § notifications + Phase 2 Advanced Notification |
| 4.2.8 integrations | Phase 1 Core Integrations + Phase 2 Advanced Integrations |
| 4.3 surfaces | Phase 1 platform surfaces |
| 4.4 out of scope | Out of scope |
| 7.1 / 7.4 NFR | Non-functional and platform requirements |
| 7.3 OTP, maps+routing, push, SMS, payments | OTP + Routing in Phase 1 integrations; SMS/payments remain Phase 2 |
```

Verification: `rg -n "^### |^## " resources/features-roadmap.md` lists
headings that match the table.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `python3 -c "import pymupdf; d=pymupdf.open('resources/RFP.pdf'); print(d.page_count)"` prints `16`
- [ ] `rg -n "زمینی" resources/features-roadmap.md` matches
- [ ] `rg -n "دریایی" resources/features-roadmap.md` matches
- [ ] `rg -n "هوایی" resources/features-roadmap.md` matches
- [ ] `rg -n "ریلی" resources/features-roadmap.md` matches
- [ ] `rg -n "ترکیبی" resources/features-roadmap.md` matches
- [ ] `rg -n "Phone OTP" resources/features-roadmap.md` matches
- [ ] `rg -n "Routing services API" resources/features-roadmap.md` matches
- [ ] `rg -n "Phase 1 platform surfaces" resources/features-roadmap.md` matches
- [ ] `rg -n "Out of scope" resources/features-roadmap.md` matches
- [ ] `rg -n "OWASP" resources/features-roadmap.md` matches
- [ ] `rg -n "99\\.5" resources/features-roadmap.md` matches
- [ ] `rg "\\[[0-9]+\\]" resources/features-roadmap.md` returns no matches
- [ ] `test -f amin-tajeran-features-roadmap-v5.md` succeeds
- [ ] `rg "resources/features-roadmap.md" plans/README.md` matches
- [ ] `git diff --stat -- backend mobile` is empty
- [ ] `git status` shows only in-scope paths (+ this plan file if you
      edited nothing else)
- [ ] `plans/README.md` status row for 012 is DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `resources/RFP.pdf` is missing, encrypted, or not 16 pages.
- `resources/features-roadmap.md` no longer has Phase 1 §1–§7 / Phase 2 §1–§9
  (the extract was rewritten already).
- You believe a Phase 2 item (GPS, companies, payments) must move to Phase 1
  to "match the RFP" — that is a product decision, not this plan.
- A step seems to require editing `backend/` or `mobile/` (e.g. adding
  `transportMode` to `Cargo`). File a follow-up plan; do not sneak schema in.
- You cannot find pymupdf and cannot confirm page count another way
  (`pdfinfo resources/RFP.pdf` is an acceptable substitute; still expect
  16 pages).

## Maintenance notes

- Next OTP plan must implement **phone OTP**, not email/password, per the
  new Phase 1 bullet and the existing 011 `User.phone` field.
- Next cargo CRUD plan must not assume truck-only cargo. Add a
  `transportMode` (or equivalent) only in that later plan, using the five
  RFP modes. Until then the checklist is the reminder.
- Do not treat `Viewing earnings history` as RFP-mandatory if a later cut
  needs to shrink Phase 1.
- Reviewers: confirm Phase 2 company/GPS/ratings blocks were not deleted
  or merged into Phase 1.
- Pointer file `amin-tajeran-features-roadmap-v5.md` is a compatibility
  shim. If it grows a second copy of the list, delete the duplicate and
  keep `resources/features-roadmap.md` as the only checklist.
