# Meadow Admin / CMS: Phase 0 audit

Audit only. No application code, routes, data models, roles or auth were
changed. This file is the only thing created.

Method: read the source (`src/app/router.tsx`, `src/app/layouts/CmsLayout.tsx`,
`src/app/RequireAuth.tsx`, `src/services/{cms,auth,content}.ts`,
`src/services/learning/*`, `src/mocks/db.ts`, `src/types/*`, every
`src/pages/cms/*`), read `docs/screens.md` and `docs/practitioner-foundation.md`,
and opened the running CMS in the browser pane as the admin demo identity.
Claims below are from code unless marked "observed".

Classification key used throughout:

- **Working**: does what it says and persists (to localStorage, the only store).
- **Partial**: works, but with a gap that matters.
- **UI only**: looks functional, changes nothing durable (toast, local state).
- **Static/demo**: numbers or rows are constants, seeded or scaled.
- **Missing**: expected for an admin product, not present.
- **Broken**: misleading, or does the opposite of what the screen claims.

---

## Executive summary

The CMS is a **screen-complete prototype on a mock backend**. Every list,
editor and dashboard in `docs/screens.md` exists and navigates. Underneath:

1. **CMS and Practitioner do not share a source of truth.** CMS writes only
   `nff.cms.*` localStorage keys. Nothing outside the CMS reads them (verified
   by search). Publishing, unpublishing, editing, reordering and creating in
   the CMS change nothing a learner or visitor sees.
2. **RBAC is hardcoded and mostly cosmetic.** Five roles in a union type,
   "Admin" and "Super admin" are the same role, the permission matrix is a
   read-only constant, `/cms/*` is guarded by one role list, and most
   restrictions are a hidden nav item or a disabled button. Role changes on the
   Roles page are saved but never read by anything.
3. **Sessions are not authenticated.** The stored session is trusted by email
   alone, and login accepts any password of 8+ characters.
4. **Analytics are not analytics.** Visitors is scaled constants labelled
   "Source: GA4". Engagement mixes 160 seeded events with invented numbers.
   Score weights are saved but nothing calculates a score from them.
5. **Content creation is form-driven and thin.** Exploration "rich text" is a
   monospace Markdown textarea. Meditation upload is a timer simulation; the
   audio file and artwork are not stored. Exploration has no artwork field.
6. **The curriculum editor edits legacy Stages**, which the Practitioner
   catalogue reads from the *constant*, not from the CMS overrides. Required
   toggles and unlock rules are not persisted or connected.

What is solid and worth keeping: the route set and IA skeleton, the status
vocabulary, the editor-to-review-to-publish *shape*, unsaved-changes blocking,
the compact density token set, shared `PageHeader`/`StatusChip`/`MetricCard`
parts, and the stable content ids shared with Practitioner.

---

## A. Current architecture

| Concern | Implementation |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind 4, Radix-based `components/ui`, TanStack Query, React Router 6 (`createBrowserRouter`), react-hook-form + zod (auth only) |
| Surfaces | Public (`PublicLayout`), Auth (`AuthLayout`), Practitioner `/learn` + `/account` (`LearnLayout`), CMS `/cms` (`CmsLayout`) |
| CMS shell | `CmsLayout`: 264px sidebar (collapsible to 72px) from `lg`, sheet menu below; `data-density="compact"`; breadcrumb built by title-casing URL segments; top bar has "Demo data" pill, a notifications button that does nothing, a user menu with Log out only |
| "Backend" | `mockApi()` in `src/mocks/api.ts`: 300 to 800 ms artificial latency, optional forced error scenario, then runs a synchronous function. There is no network layer |
| State | TanStack Query for reads (`['cms', ...]` keys, invalidated by hand after writes), `useState` for drafts, localStorage for persistence. No global store |
| Persistence | localStorage only, all keys under `nff.cms.*` plus `nff.session` (see D) |
| Seed data | `src/mocks/db.ts`: 101 content items (41 explorations, 60 meditations), 6 stages, users, 160 events, campaigns, 90 email logs. Deterministic (`mulberry32(20261109)`) |
| Auth | `services/auth.ts` + `AuthProvider` + `RequireAuth` (see section F) |
| Typography | Outfit via `nff-*` type tokens. Compact density tokens exist (`[data-density="compact"]`: 36px controls, 40px rows) but the type scale is not density-aware |
| Tests | **Zero CMS tests.** 339 tests pass overall; none import a CMS page or `services/cms.ts` |

Practitioner link: see section G. Short version: shared *ids*, not a shared
*store*.

---

## B. Route inventory

All under `RequireAuth roles={['editor','campaign','admin']}` (single guard for
the whole subtree).

| Route | Page | Purpose | Sidebar visibility |
|---|---|---|---|
| `/cms` | `CmsOverviewPage` | Role-flavoured landing: greeting, alerts, 3 cards, "My tasks", recent activity | all |
| `/cms/explorations` | `ExplorationsListPage` | Table: search title, stage, category, status tabs, 10/page, row menu (Duplicate, Unpublish) | editor, admin |
| `/cms/explorations/:id` | `ExplorationEditorPage` | Create/edit (new items are created immediately, then opened by id) | editor, admin |
| `/cms/meditations` | `MeditationsListPage` | Same pattern; fewer row actions | editor, admin |
| `/cms/meditations/:id` | `MeditationEditorPage` | Upload simulation, metadata, free-preview flag | editor, admin |
| `/cms/curriculum` | `CurriculumPage` | Reorder stages, add stage | editor, admin |
| `/cms/curriculum/stages/:stageId` | `StageSequencePage` | Stage title/intro, item order, per-item "Required" switch | editor, admin |
| `/cms/publishing` | `PublishingPage` | Queue tabs: Awaiting review, Scheduled, Recently published, Rejected; review sheet | editor, admin |
| `/cms/preview/:type/:id` | `ContentPreviewPage` | Device and audience preview (a rough mock, not the real screens) | via editors only |
| `/cms/campaigns`, `/cms/campaigns/:id` | `CampaignsPage`, `CampaignSetupPage` | Daily-email campaigns, 3-step setup | campaign only |
| `/cms/templates`, `/cms/templates/:id` | `TemplatesPage`, `TemplateEditorPage` | Email templates | campaign only |
| `/cms/delivery` | `DeliveryPage` | Delivery/bounce log | campaign only |
| `/cms/users`, `/cms/users/:id` | `UsersPage`, `UserDetailPage` | Practitioner directory and detail | admin |
| `/cms/analytics/visitors` | `VisitorDashboardPage` | Visitor analytics | admin |
| `/cms/analytics/engagement` | `EngagementDashboardPage` | Engagement analytics | admin |
| `/cms/settings/score` | `ScoreSettingsPage` | Score weights | admin |
| `/cms/roles` | `RolesPage` | Team members, role matrix | admin |
| `/cms/*` | `ComingSoonPage "Not found"` | Catch-all (title is wrong: it is a 404) | n/a |

Notes:
- The Campaigns, Templates and Delivery group was not in the audit brief but is
  in the CMS and is included in this audit.
- `docs/screens.md` specifies `/cms/explorations/new`. The code has no `new`
  route; "New exploration" creates and saves a record (`new-exploration-<ts>`)
  *before* the user types anything, then navigates to it.
- Admin's sidebar is Editor nav + Admin extras. It omits Campaigns, Templates
  and Delivery even though `docs/screens.md` says admin "inherits editor +
  campaign access" and the matrix grants admin that. Routes work by URL; there
  is no link.
- Related non-CMS routes: `/login`, `/forgot-password`, `/reset-password`,
  `/signup`, `/verify-email`, `/403`.

---

## C. Feature inventory

### Overview
| Feature | Status | Evidence |
|---|---|---|
| Greeting, role label | Working | From session. Label says "Super admin" for `admin` |
| Alerts | Partial | Real counts of failed transcodes, paused campaigns, in-review items, but the item statuses themselves are partly seeded (see Publishing) |
| Summary cards | Partial / Static | Editor cards are counts. Campaign: "Next send: Tonight 07:00" is a literal. Admin: "Engagement trend +4.2% vs last month" is a literal |
| My tasks | Partial | Lists *all* in-review items, not tasks assigned to the user |
| Recent activity | Static/demo | Built from `updatedAt` and `owner`. Owners are assigned round-robin from a 4-name list at seed time, so "Rowan Ellis updated X" is fabricated attribution |
| Notifications bell | UI only | No handler |

### Explorations
| Feature | Status | Evidence |
|---|---|---|
| Catalogue list, status tabs, stage/category filters, title search, pagination (10) | Working | In memory over `allItems()` |
| Sort | Missing | No sort control; order is seed order, new items first |
| Create | Partial | Writes an empty record immediately. Abandoned clicks leave "Untitled" drafts (observed: an orphan "Untitled / You" draft is in the list) |
| Edit: title, slug, category, stage, excerpt, SEO title/description, featured, body | Working | `saveCmsItem` to `nff.cms.items` |
| "Rich-text" editor | Partial | Plain `<textarea>` (monospace) with a toolbar that inserts Markdown characters (H2, H3, bold, italic, list, link, quote). No WYSIWYG, no images, no embeds, no live preview. 18 rows, resizable |
| Reading time | Missing | Not editable and not recomputed. `CmsItem` has no `readingTimeMin` |
| Artwork / hero image | Missing | No field. `checksFor().artwork` is hard-coded `true`, so the publish checklist always passes it |
| Topic (`understandTopic`), transcript, video, captions | Missing | Not in `CmsItem` |
| Autosave | Working | Saves 10 s after the last change, quietly |
| Version history | Partial | Last 10 saves, per item, restore to draft. Autosave also writes versions, so 10 slots fill with autosaves. No diff, no label, no author beyond display name |
| Unsaved-changes guard | Working | `useBlocker` on in-app navigation. No `beforeunload`, so tab close/reload loses work between autosaves |
| Validation | Partial | title >= 3, slug required and `[a-z0-9-]`, excerpt >= 10. **No slug uniqueness check** (public and learner routes resolve by slug). Body can be empty at publish |
| Submit for review | Working | Sets `in_review`. No reviewer, no note to reviewer, no notification |
| Publish | Partial | Admin always, editor only if `FLAGS.editorCanPublish`. Sets status only (see G) |
| Preview | Partial | Separate route; renders a simplified mock, not the public or learner component |
| Duplicate | Working | Creates `copy-<id>-<ts>`, slug `<slug>-copy` |
| Unpublish | Working (CMS only) | Row menu sets `unpublished` |
| Delete / archive | Missing | Neither exists. Only "Unpublish" |
| Bulk actions, saved views | Missing | |

### Meditations
| Feature | Status | Evidence |
|---|---|---|
| Catalogue list, filters, pagination | Working | |
| Row actions (Duplicate, Unpublish) | Missing | Explorations list has them; Meditations list does not |
| Upload | UI only | MP3-only check, then a timer walks Uploaded, Validating, Transcoding, Ready (about 3.6 s). A filename containing "fail" forces a failure. The file is never stored; the object URL is lost on reload |
| Duration | Partial | Read from the file with an `Audio` probe in-session; falls back to 600 s. Not persisted from a real file |
| Transcode state | Partial | Persisted only on Save. Leaving the page mid-"processing" drops the simulation and the saved state |
| Retry on failure | UI only | Re-runs the simulation |
| Artwork | UI only | Local `useState` + object URL. Not saved, not shown to learners. `CmsItem` has no image field |
| Category, stage, description, slug | Working | Same validation as Explorations |
| Free preview flag | Working (CMS only) | Persisted; consumed only by the CMS preview |
| Transcript | Missing | `Meditation.transcript` exists in the type; no editor |
| Autosave, version history, unsaved-changes guard | Missing | Present on Explorations only |
| Publish guard | Working | Publish disabled unless `transcode === 'ready'` |

### Curriculum
| Feature | Status | Evidence |
|---|---|---|
| Stage list, move up/down, Save/Discard | Working | `nff.cms.stage-order` |
| Warning when reordering live stages | Working | Copy is accurate in intent but see G |
| Add stage | Partial | Writes `nff.cms.new-stages`: `{ title, description: 'A new stage.', intro: '', itemIds: [], published: false }` |
| Edit stage title, intro | Working (CMS only) | `nff.cms.stage-details` |
| Item membership and ordering | Working (CMS only) | `nff.cms.stage-items`. New stages and edited orders never reach the learner catalogue |
| **Required toggle** | **UI only** | `useState({})`; defaults on; **not saved** by the Save button |
| **Unlock rule** | **Static text** | Fixed copy: next stage opens when required items are done. Not editable, not stored. Real unlock logic lives in Practitioner `getModuleUnlockState` on `Module.unlock` ('open' or 'sequential') |
| Publish / unpublish a stage | Missing | `published` is read from seed; shown as Live/Draft; no control |
| Delete stage, remove-from-stage safety | Partial | Item can be removed from a stage; no check that it leaves the item orphaned or in use by a path |
| Learning Paths, Modules, Lessons | **Missing** | The new architecture has no CMS surface at all |

### Publishing
| Feature | Status | Evidence |
|---|---|---|
| Review queue (Awaiting review) | Partial | Real list of items with status `in_review`, but the initial population is seeded by index math in `seedItems()` (`index % 11 === 4` and `!published && index % 5 === 0` become `in_review`), not by anyone submitting |
| Scheduled tab | Partial / Broken | Seeded items get `scheduledFor = now + 3 days` at *every load* (value changes each reload until saved). **Nothing ever publishes a scheduled item**: there is no timer, job or check at `scheduledFor` |
| Recently published tab | Partial | Any item with `published` status. No "recently" ordering or limit |
| Rejected tab | Working | Status `rejected` |
| Approve and publish | Partial | `setCmsStatus('published')`. Comment is discarded on approve |
| Schedule | Partial | Stores a date; see Scheduled above. No past-date validation |
| Reject | Partial | Saves `rejectionNote` **but nothing displays it**: the editor never shows the note, so an editor never learns why |
| Comments | UI only | One textarea; only used as the rejection note. No thread, author or history |
| Validation checklist | Partial | Artwork always passes (hard-coded). Audio and metadata are real |
| Queue size | Partial | `rows.slice(0, 12)`, no pagination: items beyond 12 are unreachable |
| Permissions | Partial | Buttons disabled for non-publishers; no service-level check |

State transitions that exist (all via `setCmsStatus`, all persisted to
`nff.cms.items`, none effective outside the CMS):

```
draft ──submit──► in_review ──approve──► published ──unpublish──► unpublished
  ▲                  │  │                     ▲                       │
  │                  │  └──schedule──► scheduled (no executor)        │
  └──────reject──────┘                                                │
rejected ◄──reject── in_review         (unpublished can be re-published; re-submit allowed from rejected)
```

There is no transition table. Any code can set any status on any item
(`setCmsStatus` takes a status and trusts the caller). Editors can reach
`published` through the editor's Publish button only if the flag is on, and
the preview page has its own Publish button gated to admin only (a third rule).

### Users
| Feature | Status | Evidence |
|---|---|---|
| Directory (practitioners only), search name/email, status, stage, engagement band, 10/page | Working | Over the seeded `users` array |
| Detail: summary cards, profile, progress by stage, email history, consent | Partial | **Progress reads seeded `progressByUser`, not the real learner store** (`meadow.progress.v2.*`), so a learner's real activity never appears. Consent tab is a fixed sentence |
| Account status filter | Partial | Includes `pending_deletion`, but no screen can create it from the CMS and the learner delete flow does not feed it |
| Deactivate / Reactivate | **Broken** | Writes `nff.cms.user-status`. Copy promises "They will be signed out and unable to log in". Login reads status from the seed `userByEmail`, not the override, so deactivation changes nothing. Only the Users list/detail read the override |
| Engagement score | Static/demo | Seeded per user; see Engagement |
| Deletion requests | Missing | No queue, no export request queue |
| Assignment / groups | **Missing** | `assignPath`, `withdrawAssignment`, `saveGroup` exist in `services/learning/assignments.ts` and are used by **no screen** |
| Invite, edit, export users | Missing | |

### Visitors
| Metric | Real / seeded / simulated / static |
|---|---|
| Page views, preview plays, sign-ups from preview | **Static** constants × range factor (0.25 / 1 / 2.8) |
| Avg session "3m 12s" | Static literal |
| Page views over time | Simulated: `180 + ((i*37)%90)` × factor |
| Top pages, referral paths | Static constant arrays × factor |
| Top preview tracks | Derived from the first 5 `preview: true` meditations with invented counts (`900 - i*140`) |
| Header "Source: GA4, consented visitors only" | **Claim is false**: nothing calls GA4 and nothing reads consent state (`services/privacyChoices.ts` is not used here) |
| Error state | Says "We could not reach GA4" (copy for a path that cannot occur) |

### Engagement
| Metric | Classification |
|---|---|
| Active practitioners, score distribution, stage funnel | Seeded users (real arithmetic over seed) |
| Completions, plays | Seeded `events` (160 deterministic records) |
| **Repeat plays** | Simulated: `plays × 0.4` |
| **Avg logins / week "3.4"** | Static literal |
| **Weekly activity** | Simulated: `40 + ((i*23)%55)` |
| **Top content** | Fabricated: first 6 published items with `320 - i*41` plays |
| "Rolled up nightly · scores weekly" | Claim; no job exists |
| Real learner data | **Not used.** The Practitioner progress/activity store is never aggregated |

### Score settings
| Feature | Status |
|---|---|
| 5 weights (login recency 20, minutes listened 25, completion 25, progression 20, email 10), sliders + numeric inputs | Working UI |
| Validation (sum must be 100, integers 0 to 100) | Working |
| Save, 5-entry change log | Working (CMS only). Log stores weights and time, **no author**, shows no diff |
| Admin-only | Page-level check only (see RBAC) |
| Dependency | **None.** `User.engagementScore` is seeded; nothing recalculates it from the weights. Toast promises "Scores recalculate this weekend" |
| Behavioural definition | Missing: no description of how each factor is measured |

### Roles and permissions
| Feature | Status |
|---|---|
| Team members table (editor, campaign, admin users from the seed) | Working (read of seed + override) |
| Change role (with confirm; last-admin protection) | **Broken**: saved to `nff.cms.member-roles`, which **nothing reads**. The person's real role (login, nav, guards) comes from the seed |
| Remove member | UI only: removes from component state; not persisted; reappears on reload |
| Invite member | UI only: toast "Invitation sent (demo)" |
| Roles tab (permission matrix) | Static, read-only constant `MATRIX` ("Read-only for now") |
| Super admin protection | Partial: client-side "at least one admin" check against the *displayed* list; no protection of self-demotion beyond that; no audit |

### Campaigns, Templates, Delivery (not in brief)
| Feature | Status |
|---|---|
| Campaign list, pause/resume | Working (CMS only), persisted in `nff.cms.campaigns` |
| New campaign wizard | Partial: persists a new campaign record with zeroed counts; no scheduler, no sending |
| Templates list/editor | **UI only**: `getTemplates()` returns the seed constant; **Save is only a toast**, "Duplicate" and "Send test" are toasts |
| Delivery report | Static/demo (90 seeded logs; date-range filter uses `Date.now()`) |
| Recipient masking | Partial: masked only when role is `campaign` and flag set |

---

## D. Data and persistence map

### Types (`src/types/index.ts`, `src/types/learning.ts`)

- `CmsItem` (flat editor record, `services/cms.ts`): id, type, slug, title,
  excerpt, **body (single string)**, category, stageId, status
  (`draft | in_review | scheduled | published | unpublished | rejected`), owner
  (display-name string), updatedAt, featured, seoTitle, seoDescription,
  preview, transcode, durationSec, scheduledFor?, rejectionNote?.
- `ContentItem` (`Exploration | Meditation`, public/learner source): adds
  `artwork`, `heroImage`, `image`, `understandTopic`, `readingTimeMin`,
  `body: string[]`, `audioUrl`, `transcript`, `published: boolean`.
  **`CmsItem` carries none of the media/artwork/topic/reading-time fields,** so
  the CMS cannot author a complete learner-facing item.
- `Stage` (legacy) and `CmsStage` (same plus nothing new).
- `LearningPath`, `Module` (`unlock: 'open' | 'sequential'`, `status`,
  `legacyStageId`), `Lesson` (blocks, `required`), `Resource` (`status`,
  `access`, `roles?`), `Assignment`, `Group`, `Enrolment`, `LessonProgress`,
  `MediaProgress`, `LearningActivity`, `LearningProgressStore`.
- `User`: role, status, engagementScore (seeded), minutesListened (seeded).
- `Role = visitor | practitioner | editor | campaign | admin`.

### Storage keys

| Key | Owner | Written by | Read by |
|---|---|---|---|
| `nff.session` | auth | login, switchRole | `getStoredSession` |
| `nff.cms.items` | CMS | `saveCmsItem`, `setCmsStatus`, `createCmsItem` | CMS only |
| `nff.cms.versions.<id>` | CMS | Exploration editor | Exploration editor |
| `nff.cms.stage-order`, `.stage-items`, `.stage-details`, `.new-stages` | CMS | curriculum pages | CMS only |
| `nff.cms.campaigns`, `.campaigns-new` | CMS | campaign pages | CMS only |
| `nff.cms.user-status` | CMS | UserDetail | Users, UserDetail only (not login) |
| `nff.cms.member-roles` | CMS | Roles page | **Roles page only** |
| `nff.cms.score-weights`, `.log` | CMS | Score settings | Score settings only |
| `meadow.progress.v2.<userId>` | Practitioner | learner screens | learner screens |
| `meadow.assignments.v1`, `.groups.v1`, `.enrolments.v1` | Practitioner | `services/learning/assignments.ts` | learner services |
| `nff.account.<userId>.*` | Account | account pages | account pages |

No key is shared across the CMS/Practitioner boundary.

### Services

- `services/cms.ts`: overlay pattern. `allItems()` = seed from `mocks/db`
  re-derived **on every call** (statuses/owners/scheduled dates recomputed,
  `Date.now()` inside) + stored overrides by id + stored extras.
- `services/content.ts`: public/learner reads of `mocks/db` constants.
- `services/learning/catalogue.ts`: derives paths/modules/lessons/resources
  from `stages` and `content` constants (not `loadStages()`, not `allItems()`).
- `services/learning/assignments.ts`, `access.ts`: assignments, groups,
  access decisions. No CMS writer.

---

## E. Workflow analysis

### Create and edit an Exploration (today)
1. List: **New exploration** immediately creates and persists a blank record
   (`new-exploration-<ts>`), then opens `/cms/explorations/:id`.
2. Title edit auto-fills slug and SEO title *only while empty*; editing the
   title later does not update the slug (can leave a misleading slug).
3. Body in a monospace textarea with Markdown insert buttons.
4. Right rail: slug, category, stage, excerpt, SEO title, SEO description,
   featured.
5. Autosave every 10 s while dirty; "Save draft" manually. Version history
   sheet.
6. **Submit for review** (draft/rejected) or **Publish** (admin/flag).
   Both run validation first. Nothing asks "what changed?".
7. **Preview** is a separate page (no inline preview).

Required to submit: title, slug, excerpt. Optional: everything else. A body
may be empty. No artwork requirement. Default category `foundations`, default
stage = first stage.

### Create and edit a Meditation (today)
1. Same create-then-open pattern, default `transcode: 'uploading'`.
2. Drop/choose an MP3. A timer simulation advances the steps; the real file is
   only held in memory.
3. Artwork is chosen but **not saved**.
4. Metadata rail: title, slug, description, stage, category, duration
   (read-only), free-preview switch.
5. Buttons: Save draft, Submit for review, Publish (requires `ready`).
6. No autosave, no history, no unsaved-changes guard, no artwork
   persistence. Leaving mid-upload silently abandons it.

### Shared vs different
- **Shared (should be one workflow):** slug/title rules, status model, category,
  stage placement, excerpt, SEO, featured, review/publish transitions, preview,
  history, autosave, unsaved guard, validation messages.
- **Different:** Exploration = long-form body, reading time, artwork, topic.
  Meditation = audio asset lifecycle (upload, validate, transcode, retry),
  duration (derived), transcript, artwork, free-preview, "ready" gate.
- Today the two editors are ~450 lines each with duplicated field markup and
  inconsistent capabilities (see matrix above).

### Review and publish (today)
`in_review` list, a review sheet (checklist, one comment box, schedule
picker), approve/schedule/reject. Editors see a banner "only an admin can
approve". No assignment of reviewers, no threaded comments, no notifications,
rejection reason invisible to the author, scheduled items never execute.

### Recommended target workflows (not implemented)

**Exploration** (document-first):
1. *Start*: "New exploration" opens a lightweight dialog (title, category) that
   creates the record only on confirm.
2. *Write*: single-column writing canvas with a real block/rich-text editor
   (headings, quotes, lists, links, inline images), live reading-time, inline
   preview toggle (reader view), autosave with visible "Saved" state and
   versioned snapshots at meaningful points (manual save, submit).
3. *Details*: right drawer (Details, Media, SEO, Placement) instead of a fixed
   long form; hero/card artwork with alt text (required to publish).
4. *Review*: sticky status header with next action ("Submit for review"),
   checklist of blockers, comment thread, reviewer.
5. *Publish*: Publish now / Schedule, with a **real** effect (see section J).

**Meditation** (asset-first):
1. *Start*: "Upload audio" as the first step (file first, then details), with
   a persistent processing panel that survives navigation.
2. *Asset*: waveform/player, duration (derived), transcode status with retry,
   transcript, artwork with crop to 1:1 and alt text.
3. *Details*: same drawer as Exploration; add free-preview and learner
   availability notes.
4. *Gate*: publish only when asset ready + artwork + transcript or an explicit
   "no transcript" decision (product decision).
5. Same review and publish stages as Exploration.

---

## F. RBAC analysis

### What each "role" really is

| Role | Type today | Notes |
|---|---|---|
| Visitor | **Not a role.** It is the *absence of a session* | Used as a union member; `switchRole('visitor')` clears the session |
| Practitioner | System identity **and** content-access category | Learner surface. Learning catalogue checks access levels (public/registered/assigned/restricted) with `Resource.roles` for role-gated material |
| Editor | Application role (CMS) **and** a learner-preview identity | `STAFF_PREVIEW_ROLES = ['editor','admin']`. `campaign` is *not* a preview role |
| Campaign Manager | Application role (CMS) | Role id `campaign` |
| Admin | Application role | Label "Super admin" in two places; id `admin`. **There is no separate Admin and Super Admin** |
| Super Admin | **Does not exist** as a role | It is the display label for `admin` |

So: five hardcoded role ids, one of which is not a role, and the six-role model
in the brief (Visitor, Practitioner, Editor, Campaign Manager, Admin, Super
Admin) is **not what the code implements**. A distinct Admin vs Super Admin is
a product decision (section J).

### Enforcement inventory

| Layer | What exists |
|---|---|
| Route | One guard: `RequireAuth roles={['editor','campaign','admin']}` on all of `/cms`. Non-staff get `/403`; signed-out get `/login` with return path. **No per-route role list** |
| Navigation | `navForRole()`: editor sees content nav; campaign sees campaign nav; admin sees content + admin extras (no campaign nav) |
| Component | `canPublish = role === 'admin' || FLAGS.editorCanPublish` in 4 places; `ContentPreviewPage` uses `role === 'admin'` only; Roles and Score pages render an inline "Permission denied" if not admin; Delivery masks recipients when role is `campaign` |
| Action / service | **None.** `setCmsStatus`, `setMemberRole`, `setUserStatus`, `saveScoreWeights`, `saveStageOrder`, `patchCampaign` etc. accept any caller |
| Data | Practitioner side has real data-level rules in `services/learning/access.ts` (`canAccess*`). CMS has none: any staff role can read all users and all analytics |
| Assignment / persistence | Role is read from the seed (`userByEmail`). `nff.cms.member-roles` is never read |
| Defaults | Editor cannot publish (flag false); campaign recipient detail masked (flag true) |
| Super Admin safeguards | "At least one admin" check on the Roles page; demote/remove disabled for the last displayed admin |

### Where a control is hidden but the operation stays reachable

| # | Gap | How to reach it |
|---|---|---|
| 1 | Editor and campaign can open **any** `/cms/*` route | Type the URL. Only Roles and Score pages self-check; **Users, User detail, Visitors, Engagement, Campaigns, Templates, Delivery have no role check** |
| 2 | Editor sees **unmasked recipient details** | `/cms/delivery`: masking is `role === 'campaign'` only |
| 3 | Campaign can edit/publish content | `/cms/explorations/:id` is reachable; publish is flag-gated, but Save, Submit, status edits are not |
| 4 | "Publish" disabled for editors | The check is in the button; the service has none |
| 5 | Admin cannot navigate to Campaigns/Templates/Delivery | Nav omits them though matrix says admin has access (route works) |
| 6 | Role change "applies next page load" | Copy is false; it never applies |
| 7 | Deactivate user "signs them out" | It does not (see Users) |
| 8 | Roles/Score admin-only | Inline message only; the service functions behind them (`setMemberRole`, `saveScoreWeights`) have no check, and nothing server-side exists |

### Session and login (demo-only)

| Part | Status |
|---|---|
| Login | UI works. **Any email in the seed + any password of 8+ characters succeeds** (`locked@nff.demo` fakes a lockout). Unverified and deactivated checked against the seed, not overrides |
| Session | `nff.session` JSON in localStorage. `getStoredSession` re-resolves the user **by email from the seed**, so a changed `role` field is ignored, but **a forged `{ user: { email: 'admin@nff.demo' } }` yields admin with no password and no token check**. (I used this to browse the CMS during the audit; the demo needs no exploit.) |
| Logout | Clears the key; no server session to revoke |
| Password recovery | Demo: request returns `sent: true` for any email; reset accepts one fixed demo code and does not change any password |
| Dev role switcher | `DevScenarioPanel` can switch to any role; gated by `import.meta.env.DEV` (removed from production builds) |
| Redirects | Works: return path preserved; practitioners default to `/learn`, staff to `/cms` |
| Staff identity in Practitioner | Editor/admin preview `/learn` read-only; a *campaign* user reaching `/learn` is treated as a normal learner |

### Recommended configurable RBAC architecture

Keep the five-role seed as a **migration baseline**, not the model.

1. **Permissions as data.** A flat catalogue of permission keys, e.g.
   `content.read`, `content.edit`, `content.submit`, `content.publish`,
   `content.unpublish`, `content.delete`, `curriculum.edit`,
   `media.upload`, `users.read`, `users.manage`, `analytics.read`,
   `score.manage`, `roles.manage`, `campaigns.manage`, `delivery.read`,
   `delivery.recipients.read`, `assignments.manage`.
2. **Roles as named permission sets** (`Role { id, label, permissions[],
   system: boolean }`). Seed the existing five as system roles with today's
   effective permissions. Add Admin vs Super Admin only if product wants it:
   Super Admin = `*` and is the only holder of `roles.manage`.
3. **One policy module** `can(user, permission, resource?)`, used identically by:
   route guards (`RequirePermission`), nav building, button state, **and the
   service layer** (every write function takes an actor and calls `can()`,
   throws `ApiError('forbidden', ..., 403)`). Hidden buttons become a UX
   nicety on top of enforced checks.
4. **Role assignment model**: `staff` records `{ userId, roleIds[] }`
   persisted and **read by `getStoredSession`** so changes take effect.
5. **Safeguards** in the policy layer: last Super Admin cannot be removed or
   demoted; no self-escalation; system roles' permission sets editable only by
   Super Admin; every role/permission change appended to an audit log.
6. **Resource scoping** (later): `content.edit` can be limited by owner or
   category; `delivery.recipients.read` independent of `delivery.read`.
7. The permission matrix page becomes a real editor over this data.

Honest limit: client-only RBAC is not security. It becomes enforceable only
when the same checks run on a server (section J).

---

## G. Practitioner integration

### Answers to the brief

| Question | Answer |
|---|---|
| Same source of truth? | **No.** CMS = `nff.cms.*` overlay on seed; Practitioner = seed constants (`content`, `stages`) through `catalogue.ts` and `content.ts` |
| Do CMS edits appear in Practitioner? | **No.** Nothing outside the CMS reads `nff.cms.*` (searched). Title, body, slug, status, stage order and stage membership edits are invisible to learners |
| Is draft content excluded? | By accident: learners read `item.published` from the seed, which CMS never changes. Unpublishing a published item in the CMS does **not** remove it from the learner library; publishing a draft does not add it |
| Is publication state respected? | CMS statuses (6 values) and learner `published: boolean` + `Resource.status` are unrelated. There is no mapping |
| Are content ids stable? | **Yes for seeded items.** CMS ids = seed ids = `Resource.id` = progress ids; lesson ids derive from them (`lesson-{itemId}`). New CMS items get `new-<type>-<ts>` ids that no learner structure knows. Duplicates get `copy-…` |
| Curriculum relationships consistent? | **No.** CMS Stages are the legacy structure. The catalogue maps `stages` → `Module` (`module-{stageId}`, `legacyStageId`) and `content` → lessons *from the constants*. CMS stage order/membership overrides, new stages, and "Required" toggles never reach modules/lessons. Unlock rules: CMS text is static; Practitioner uses `Module.unlock` (open/sequential), which no CMS control sets |
| Does Practitioner progress survive content change? | **Yes today, because nothing changes.** Risk once CMS drives content: progress is keyed by `lesson-{itemId}` and per-user; removing/renaming an item or stage would orphan records unless ids are never reused and removals soft-delete |
| Assignments / paths / access | No CMS UI. Demo paths come from `config/demoPaths.ts`; assignments from `ensureDefaultAssignment`/`ensureDemoAssignments`. Practitioner access (`canAccess*`) is entirely independent of CMS status |

### Legacy Stage to new architecture

```
Stage (legacy, 6)  ──►  Module  (id module-{stageId}, legacyStageId, unlock)  ──► part of
Stage.itemIds      ──►  Lesson  (id lesson-{itemId}, one resource block)           LearningPath
content item       ──►  Resource (id = item id, status from item.published)        path-meadow-journey
```

`Meadow Journey` = the 6 stages as 6 modules. Demo paths (3) are configuration
files, not CMS data. So "Curriculum" in the CMS is, in the new model, only the
**Meadow Journey path's modules and lesson order**, and even that is
disconnected.

### Consistency issues to carry into the redesign

1. Two parallel status vocabularies (`CmsStatus` vs `published` + `Resource.status`).
2. `CmsItem` lacks fields the learner models need (artwork, image, readingTime,
   topic, transcript, audio URL, video, captions).
3. Two stage structures (`stages` constant, `CmsStage` overlay) and a derived
   module layer.
4. Ownership strings (`owner`) are fabricated labels, not user ids.
5. `allItems()` recomputes seed status/dates on each call (non-deterministic
   `scheduledFor`).
6. Orphan `new-*` drafts and `copy-*` items have no path into any lesson.
7. Per-user progress, assignments and enrolments sit under different keys with
   different shapes than anything the CMS reads (Users > Progress uses the
   seed, not the real store).
8. Migration: content ids and lesson ids must stay stable; any CMS → learner
   bridge must write the *same* records `catalogue.ts` derives, or replace that
   derivation with reads from the shared store.

---

## H. UX and design findings

Observed in the running CMS (1440 and ~800 px) and in code.

### Why it feels inconsistent, form-driven and hard to operate

1. **Everything is a form.** The two editors are label/input stacks beside a
   narrow rail. There is no writing surface, no asset surface, no sense of the
   item as a thing with a lifecycle. State (status, saved, autosave, history,
   preview, publish) is scattered: chip in the header, caption beside it,
   buttons in a fixed bottom bar, history in a sheet.
2. **Fixed bottom action bar** (`fixed inset-x-0 bottom-0`) offsets by the
   sidebar width but not the collapsed width (72 px), so it misaligns when the
   sidebar is collapsed; it covers the last form field (page needs `pb-24`).
3. **Editors disagree with each other.** Explorations: autosave, history,
   unsaved guard, status caption. Meditations: none of those. Different
   headers, different button sets, different title placement.
4. **Actions don't match the object.** Explorations list can Duplicate and
   Unpublish; Meditations list cannot. Neither can Delete/Archive.
5. **Review is a modal task.** The review sheet is a narrow drawer with one
   comment box, a datetime input and three buttons; reviewers cannot read the
   content inside it, so "approve" is blind (they must leave to preview).
6. **Dashboards are not decision tools.** Overview "My tasks" are all
   in-review items; cards are literals; activity attribution is fake. Visitors
   and Engagement are decorative bar series with no tooltips, no date
   control on Engagement, and no explanation of source.
7. **Breadcrumbs from URL segments** give "Cms > Explorations > Exp 1" (raw id,
   wrong casing for CMS, nothing for the item title).
8. **Settings-like pages share the content layout.** Score weights, Roles,
   Users, Templates all reuse the same page-header plus card/table, with no
   section navigation (Settings, People, Analytics are flat in one sidebar of
   10 items).
9. **Status is communicated well** (chip with icon + text, not colour alone),
   but the vocabulary mixes states and flags: "Scheduled" is a status while
   "featured", "preview", "ready" are separate toggles.
10. **Honesty gaps in copy**: "Source: GA4", "Scores recalculate this weekend",
    "Their access changes the next time they load a page", "Invitation sent",
    "Template saved" and "Test email sent" all claim effects that don't occur.
    "Demo data" pill is the only disclosure and is dismissible by nothing.
11. **Error/empty/loading states** are present and consistent in structure
    (skeletons, `ErrorState`, `EmptyState`), but the same text ("Check your
    connection and try again") is reused for every failure.

### Typography, density, spacing

- Type tokens are the *public* scale: page title `nff-heading-h2` = **40 px /
  48 px** (34/42 below 1280). In a compact admin this is oversized and pushes
  tables down; section titles use `h3` (32 px) and `h4` (24 px). Metrics use
  `nff-data-metric` (32 px).
- Body and table text are 14 px (`nff-body-sm`, `nff-data-table`), headers 12
  px uppercase: appropriate, but captions/labels at 12 px carry too much
  meaning (checks, status, helper text).
- `data-density="compact"` adjusts controls and row heights (36 and 40 px) but
  not type or page padding; the main area is a flat `p-6` with `overflow-x-hidden`
  and no max width, so wide screens get long, sparse rows.
- Radii: cards use `rounded-xl` (12 px per token) where the practitioner
  system was set to 12 px cards, 8 px controls. Consistent with it, but CMS
  pages also mix `rounded-lg`, `rounded-full` chips, and raw `rounded-md`.
- Tables: a single `Table` primitive with no sticky header, column sorting,
  density toggle, row selection, bulk actions or column control.
- The editor Markdown textarea uses a monospace font and a 18-row fixed height,
  not an editing experience.

### Accessibility

- Positives: skip link, landmarks, labelled filters, `role="alert"` on
  field errors, status chips pair text with icons, dialogs via Radix.
- Gaps: top-bar bell has no function; breadcrumbs use the URL; the save-state
  indicator is a live region that changes text on a timer; the collapsed
  sidebar relies on `title` for labels; the Markdown toolbar buttons have
  labels but no pressed/shortcut model; the fixed action bar covers focused
  fields near the bottom; the permission matrix uses `Minus` with an
  aria-label but cells have no column/row headers semantics beyond a table.
  No automated a11y tests exist for the CMS.

### Responsive

- `lg` is the only breakpoint: sidebar vs sheet. Tables rely on horizontal
  scroll (the matrix does; list tables rely on the container). Editors stack
  the rail under the main column below `lg`.
- The observed 800 px view showed the list table fitting, but with every
  secondary column visible and no column priority.

### Recommended visual system and interaction model (not implemented)

- **Admin type scale** distinct from public: page title 24/32, section 18/24,
  card title 16/24, table 14/20, helper 12/16 (12 only for non-essential text).
  Introduce as an admin-scoped token set; do not change public/practitioner
  tokens.
- **Frame:** persistent sidebar grouped by task (Content, Learning, People,
  Insights, Settings), a slim top bar with global search and an environment
  badge, and real breadcrumbs from page metadata.
- **Content workspace:** a document/asset canvas with a right "inspector"
  (Details, Media, SEO, Placement, History) and a sticky header carrying
  status, save state and the one primary action; no bottom bar.
- **Lists:** one shared data-table pattern (sticky header, sort, column
  visibility, saved filters, bulk actions, row menu, empty/loading/error),
  used for Explorations, Meditations, Users, Team, Templates.
- **Review:** side-by-side review (content on the left, decision panel on the
  right), threaded comments, checklist from real validations.
- **Honest data:** every metric shows its source and freshness; seeded or
  simulated values carry a "Sample data" marker, or are removed.
- **Feedback:** consistent toasts for success, inline errors, undo for
  reversible actions (unpublish, status change).

---

## I. Proposed target architecture

### Information architecture

```
Overview            (role-aware work queue: my drafts, reviews waiting, failures)
Content
  ├─ Explorations
  ├─ Meditations
  └─ Media library            (shared audio/images, reuse, alt text)   [new]
Learning
  ├─ Learning paths           (Meadow Journey + demo paths)            [new]
  │    └─ Path ▸ Modules ▸ Lessons (order, required, unlock, access)
  └─ Assignments & groups     (who sees which path)                    [new]
Publishing
  ├─ Review queue
  ├─ Scheduled
  └─ History                  (published / rejected / unpublished)
People
  ├─ Practitioners
  └─ Team & roles             (staff, roles as permission sets)
Insights
  ├─ Visitors
  └─ Engagement               (+ score definition)
Campaigns                     (Campaigns, Templates, Delivery, as a section)
Settings                      (Score weights, Feature flags/editorial rules, Audit log)
```

Existing routes map cleanly (`/cms/explorations`, `/cms/meditations`,
`/cms/publishing`, `/cms/users`, `/cms/analytics/*`, `/cms/settings/score`,
`/cms/roles`). **New** routes needed: learning paths/modules/lessons,
assignments, media library, audit log. `Curriculum` (stages) evolves into
Learning paths, keeping `legacyStageId` ids as stable aliases.

### Workflow structure

1. **One content lifecycle** (`draft → in_review → approved → scheduled/published
   → unpublished/archived`, plus `rejected`) defined once as a transition table
   with allowed actors per edge (`can()`), usable by both editors, the queue and
   bulk actions.
2. **One editor shell** with type-specific panels (Exploration document panel;
   Meditation asset panel). Shared autosave, history, preview, status, comments.
3. **One data layer** that CMS and Practitioner both read: a content store with
   a `status` that the learner catalogue treats as `published`. The existing
   `catalogue.ts` becomes a *view* over it (preserving ids).
4. **One policy module** for permissions (section F), enforced in services.

---

## J. Implementation dependencies

### Technical prerequisites
1. **Shared content store** the learner catalogue reads (largest dependency).
   Without it the CMS stays a demo; with a mock store it can be demonstrated
   locally, but production needs a real backend.
2. **Expanded content model**: add artwork/image/alt, readingTime (derived),
   topic, transcript, audio asset reference, to `CmsItem` or its successor.
3. **Real auth and session** (server-issued, role claims, expiry). The current
   email-trust session cannot back RBAC.
4. **Audio pipeline**: real upload, storage, validation, transcode, duration,
   waveform; media/artwork storage. Today the pipeline is a timer.
5. **Scheduler** for `scheduled` publishing and a notification/event channel
   for review requests and rejections.
6. **Analytics source**: GA4 (or equivalent) ingestion with consent gating, and
   aggregation of Practitioner events (`LearningActivity`, `MediaProgress`) for
   Engagement. Simulated playback must not be counted as listening time.
7. **Audit log** for status, role, score and assignment changes.

### Risks
- **Id stability**: lesson ids derive from item ids; any rename or merge must
  keep ids immutable and alias slugs/redirects (legacy deep links already exist
  in `legacyRoutes.ts`).
- **Progress orphaning** when items/stages are removed: prefer archive over
  delete; resolve the "published to unpublished while in a learner's progress"
  case (keep progress, hide item, show an unavailable state: the learner
  `UnavailableState` pattern exists).
- **Two curricula during transition** (Stage overlay vs Module) if the path
  editor ships before the store.
- **False claims in the UI** (GA4, scores recalculating, invitations) must be
  fixed or labelled before demos to stakeholders.
- No tests protect any CMS behaviour; a redesign without tests will regress.

### Product decisions needed
1. Admin vs Super Admin: two roles or one? Who owns `roles.manage`?
2. Can editors publish? (`editorCanPublish` is a build-time flag; make it an
   editable editorial policy?) Is there a separate "approve" step?
3. Should a Campaign Manager ever see content, or recipients? (masking policy)
4. Should staff preview identities be `editor` and `admin` only (current)?
5. Is learner assignment a CMS task (and for which role)? Who creates groups?
6. Scheduled publishing: timezone, and who is notified on failure?
7. Retention of version history (count, per autosave or per save)?
8. Which analytics are in scope for launch, and which can be removed rather
   than simulated?
9. Transcripts and captions: required to publish audio/video?
10. Do Learning Paths replace Stages in the CMS vocabulary?

---

## K. Prioritised implementation plan

Phases map findings to redesign work. Each phase should end with a report and
wait for review.

| Phase | Theme | Findings addressed | Notes |
|---|---|---|---|
| **A1** | **Foundations and honesty** (small, safe) | Misleading copy (GA4, recalculate, invite, templates, deactivate, role apply); "Super admin" label vs `admin`; fix `ComingSoonPage` 404 title; "Sample data" markers; add CMS tests (baseline) | No new features. Reduces risk before redesign |
| **A2** | **Policy layer / RBAC core** | Hidden-but-reachable gaps 1 to 8; roles as data; `can()` in routes, nav, buttons and services; session reads role assignments; Super Admin safeguards; audit log | Needs decisions J1 to J3 |
| **A3** | **Admin shell and design system** | Nav grouping, admin type scale and density, breadcrumbs, shared data-table, page header, empty/loading/error, status vocabulary | Admin-scoped tokens only |
| **A4** | **Content model and shared store** | Section G; `CmsItem` completeness; one status/transition table; learner catalogue reads store; id stability, slug uniqueness, archive instead of delete | Biggest dependency; do before editors |
| **A5** | **Exploration workspace** | Editor shell, rich-text/blocks, artwork + alt text, inline preview, autosave/versioning rules, reading time | |
| **A6** | **Meditation workspace** | Real (or realistically mocked) upload lifecycle that survives navigation, artwork, transcript, derived duration, same history/autosave | Needs audio pipeline decision |
| **A7** | **Review and publishing** | Review with content in view, comments thread, reviewer, rejection visible to author, scheduled executor, bulk actions | |
| **A8** | **Learning paths and assignments** | Replace Curriculum with path/module/lesson editor, required and unlock rules persisted, assignments and groups UI | Maps to `LearningPath`/`Module`/`Lesson` |
| **A9** | **People and team** | Users (real progress from learner store), deletion/export queue, team management persisted, invitations | |
| **A10** | **Insights** | Visitors from real source or removed, Engagement from Practitioner events, score definition + recalculation, honest freshness labels | Needs analytics decision |
| **A11** | **Campaigns** | Templates persistence, send/test flows, delivery, masking policy | Lower priority; not in brief scope |

Recommended order: **A1 → A2 → A3 → A4 → A5/A6 → A7 → A8 → A9 → A10 → A11**.
A1 and A2 can ship without any visual change and de-risk everything after.

---

## Appendix: facts verified

- No code outside `src/services/cms.ts` and `src/pages/cms/*` references
  `nff.cms.*` (search of `src/`).
- `memberRoles()` consumed only by `RolesPage`; `userStatusOverrides()` only by
  `UsersPage` and `UserDetailPage`; `loadScoreWeights()` only by
  `ScoreSettingsPage`.
- `assignPath`, `withdrawAssignment`, `saveGroup` have no UI caller.
- `Role` union has no `super_admin`; the only "Super admin" strings are display
  labels for `admin` (`mocks/db.ts`, `CmsOverviewPage`, `RolesPage`).
- No test file imports `services/cms` or a `pages/cms` component.
- Baseline at audit time: `npx vitest run` = 34 files, 339 tests passing.
- Browser observation used the dev server with an `admin@nff.demo` session;
  no CMS data was saved during the audit (the "Untitled" draft in the
  Explorations list pre-existed in browser storage).
