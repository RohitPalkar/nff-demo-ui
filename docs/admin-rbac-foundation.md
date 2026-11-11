# Admin/CMS Phase 1: RBAC, policy and data-integrity foundation

Prototype-level permissions for the Admin/CMS. **This is not production
security.** Identity in this app is a browser-held session that nothing
verifies; every check below protects the demo's behaviour, not its data. See
"Security limitations" and "Backend integration requirements".

Code lives in `src/services/rbac/`. Nothing in it depends on React.

## 1. Roles

| Role id | Kind | Meaning |
|---|---|---|
| `visitor` | access context | Not signed in. Never stored on a user. No Admin/CMS access. |
| `practitioner` | learner | Signed-in learner. Learner content access stays with `services/learning/access.ts`. No CMS access. |
| `editor` | staff | Creates and edits content, saves drafts, submits for review, sees review feedback. Cannot approve or publish. |
| `campaign` | staff | Campaign manager. Manages and sends campaigns. No content publishing, no recipient detail. |
| `admin` | staff | Reviews, approves, rejects, publishes, schedules. Manages curriculum, assignments, practitioners and ordinary team membership (Editor and Campaign manager). |
| `super_admin` | staff | Everything, plus roles, system settings and the audit trail. Protected from lockout. |

`admin` and `super_admin` are distinct ids with distinct permission sets. The
UI labels are "Admin" and "Super admin".

## 2. Permission registry

`permissions.ts` is the only list. 37 permissions as `domain.action`. Changes
from the proposed list:

- Added `cms.access` (open the CMS at all; the entry gate).
- Added `content.unpublish`: withdrawing live content is a separate decision
  from publishing it.
- `settings.manage`, `roles.manage` and `audit.view` are registered and held
  by Super admin only. No screen edits roles or settings yet.
- `content.delete` and `team.invite` are registered but have no working
  operation (no delete exists; invitations are not delivered).

## 3. Default role matrix

`roles.ts` holds it; this table is generated from it. `·` = not granted.
Super admin's list is explicit, not a wildcard, so a new permission must be
granted on purpose.

**platform**

| Permission | visitor | practitioner | editor | campaign | admin | super_admin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `cms.access` | · | · | ✓ | ✓ | ✓ | ✓ |

**content**

| Permission | visitor | practitioner | editor | campaign | admin | super_admin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `content.view` | · | · | ✓ | · | ✓ | ✓ |
| `content.create` | · | · | ✓ | · | ✓ | ✓ |
| `content.edit` | · | · | ✓ | · | ✓ | ✓ |
| `content.delete` | · | · | · | · | ✓ | ✓ |
| `content.submit` | · | · | ✓ | · | ✓ | ✓ |
| `content.review` | · | · | · | · | ✓ | ✓ |
| `content.approve` | · | · | · | · | ✓ | ✓ |
| `content.reject` | · | · | · | · | ✓ | ✓ |
| `content.publish` | · | · | · | · | ✓ | ✓ |
| `content.unpublish` | · | · | · | · | ✓ | ✓ |
| `content.schedule` | · | · | · | · | ✓ | ✓ |
| `content.preview` | · | · | ✓ | · | ✓ | ✓ |

**learning**

| Permission | visitor | practitioner | editor | campaign | admin | super_admin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `learning.view` | · | · | ✓ | · | ✓ | ✓ |
| `learning.manage` | · | · | · | · | ✓ | ✓ |
| `learning.assign` | · | · | · | · | ✓ | ✓ |
| `learning.withdraw` | · | · | · | · | ✓ | ✓ |
| `learning.groups.manage` | · | · | · | · | ✓ | ✓ |

**people**

| Permission | visitor | practitioner | editor | campaign | admin | super_admin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `practitioners.view` | · | · | · | · | ✓ | ✓ |
| `practitioners.manage` | · | · | · | · | ✓ | ✓ |
| `practitioners.progress.view` | · | · | · | · | ✓ | ✓ |
| `team.view` | · | · | · | · | ✓ | ✓ |
| `team.invite` | · | · | · | · | ✓ | ✓ |
| `team.roles.assign` | · | · | · | · | ✓ | ✓ |
| `team.remove` | · | · | · | · | ✓ | ✓ |

**insights**

| Permission | visitor | practitioner | editor | campaign | admin | super_admin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `insights.visitors.view` | · | · | · | · | ✓ | ✓ |
| `insights.engagement.view` | · | · | · | · | ✓ | ✓ |
| `insights.scores.configure` | · | · | · | · | ✓ | ✓ |

**campaigns**

| Permission | visitor | practitioner | editor | campaign | admin | super_admin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `campaigns.view` | · | · | · | ✓ | ✓ | ✓ |
| `campaigns.manage` | · | · | · | ✓ | · | ✓ |
| `campaigns.send` | · | · | · | ✓ | · | ✓ |
| `campaigns.recipients.view` | · | · | · | · | ✓ | ✓ |

**settings**

| Permission | visitor | practitioner | editor | campaign | admin | super_admin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `settings.view` | · | · | · | · | ✓ | ✓ |
| `settings.manage` | · | · | · | · | · | ✓ |
| `roles.view` | · | · | · | · | ✓ | ✓ |
| `roles.manage` | · | · | · | · | · | ✓ |
| `audit.view` | · | · | · | · | · | ✓ |

Total permissions: 37


Decisions behind the matrix (flag any you disagree with):

- **Admin and campaigns:** Admin gets `campaigns.view` only (oversight,
  read-only). The brief did not list campaigns for Admin.
- **Admin and scores:** Admin may configure score weights; the old Roles/Score
  pages were admin-only and Admin is the operational role.
- **Recipients:** only Admin and Super admin hold `campaigns.recipients.view`.
  The Campaign manager does not; the old `recipientDetailMasked` flag is
  superseded and no longer read. `editorCanPublish` is likewise superseded.
- **Audit:** `audit.view` is Super admin only.
- **Role assignment:** an Admin may assign Editor and Campaign manager only
  (`assignableRoles`). Granting Admin needs a Super admin.

## 4. Authorisation API

`authorize.ts`, `navigation.ts`, `roleManagement.ts`, `contentWorkflow.ts`
(barrel: `index.ts`).

| API | Purpose |
|---|---|
| `Actor` `{ id, role, assurance? }` | The typed identity. `assurance` is `prototype-session` here; a server supplies `verified`. |
| `toActor(value)` | Narrows anything to an Actor or `null`. Unknown role strings, missing ids and inherited keys fail. |
| `can(actor, permission, context?)` | Boolean. Denies unknown roles, permissions, malformed actors and visitors. |
| `canAny`, `canAll` | Combinations. `canAll([])` is false. |
| `requirePermission`, `requireAll` | Throw `ForbiddenError`. |
| `getRolePermissions(role)`, `getRoleCapabilities(role)` | Registry reads. |
| `getAccessibleNavigation(actor)` | Sidebar entries for an actor, from the route registry. |
| `authorizeAction(actor, permissions, event, run)` (`guard.ts`) | Service-boundary check + audit + run. |

`context` (`ownerId`, `status`) is accepted so scope rules can be added without
changing callers. **No default rule uses it yet:** `owner` on CMS items is a
fabricated label, so ownership scoping would be fiction. "Edit within
authorised scope" is therefore enforced only by role.

The Practitioner access service is untouched and remains the authority for
learner content visibility.

## 5. Route enforcement

`services/rbac/navigation.ts` is one registry (`CMS_ROUTES`): route pattern,
permissions (any-of) and sidebar label. `app/cmsRoutes.tsx` wraps every `/cms`
child route with it; `app/RequirePermission.tsx` implements the guards.

- Signed out: `/login`, return path kept (existing `RequireAuth`).
- Signed in without `cms.access` (practitioner, unknown role): the existing
  `/403` page.
- Staff without access to a section: an in-place "You do not have access to
  this section" state naming their role, with a link back to the overview.
  The URL is kept; there is no silent redirect.
- Route paths are unchanged. Public and Practitioner routes are unchanged.

## 6. Mutation enforcement

Every CMS mutation in `services/cms.ts` takes an optional trailing `actor` and
runs through `authorizeAction`. Omitted, the actor is the current browser
session; `null` means nobody. A refusal throws `ForbiddenError` (UIs catch it
with `attempt()` and toast) **before any data changes**.

- **Content status** is a transition table (`contentWorkflow.ts`):
  submit = `content.submit`; publish from review = `review + approve +
  publish`; schedule = `... schedule`; reject (from review only) = `review +
  reject`; unpublish = `content.unpublish`. Invalid transitions are refused
  for everyone.
- **`saveCmsItem` cannot smuggle a status**: a changed `status`,
  `scheduledFor` or `rejectionNote` is checked as the matching workflow step.
- `setCmsStatus` accepts only `scheduledFor` and `rejectionNote` as extras.
- Curriculum (`addStage`, `saveStageOrder`, `saveStageItems`,
  `saveStageDetails`): `learning.manage`. Editors see it read-only.
- Users (`setUserStatus`): `practitioners.manage`; for staff accounts see
  section 8. The status is now read by login and the session, so deactivation
  takes effect.
- Campaigns (`patchCampaign`, `addCampaign`): `campaigns.manage`, plus
  `campaigns.send` when the result is running.
- Scores (`saveScoreWeights`): `insights.scores.configure`; the log records the
  actor id.
- Reads are checked too (`listAllCmsItems`: `content.view`, `getUsers`:
  `practitioners.view`, ...). `getDelivery` **redacts recipient ids** unless the
  actor holds `campaigns.recipients.view`.
- Assignments: `rbac/assignmentGuards.ts` wraps `assignPath`,
  `withdrawAssignment` and `saveGroup` for the future screens
  (`learning.assign`, `learning.withdraw`, `learning.groups.manage`). The
  original functions are unchanged because Practitioner code calls them
  without an actor. **Admin code must use the wrappers.**

## 7. Legacy Admin migration

Rule (`roleResolution.ts`), in order:

1. A role we do not define is treated as `visitor` (denied).
2. A legacy `admin` record is an **Admin**, except ids in
   `BOOTSTRAP_SUPER_ADMIN_IDS` (`u-admin`, `admin@nff.demo`), which is a
   **Super admin**. That list is the single, explicit bootstrap. It keeps the
   demo's existing "Super admin" account whole; no other record is promoted.
3. A validated role assignment (made through `changeMemberRole`) replaces it
   for staff accounts. The old `nff.cms.member-roles` key, which never took
   effect, is deliberately ignored.
4. Removed staff become `practitioner`.

A new demo Admin, `ops.admin@nff.demo` ("Imani Okafor"), was added last in the
seed without consuming random numbers, so seeded data is unchanged. The dev
role switcher now has Admin (`ops.admin`) and Super admin (`admin`). Sessions
re-resolve the role on every read, so a role written into the stored session
is ignored.

`STAFF_PREVIEW_ROLES` (Practitioner staff preview) and the public header's
`STAFF_ROLES` gained `super_admin` so the Super admin keeps read-only preview
and the "Open CMS" link. No other Practitioner code changed.

## 8. Super Admin protection

Pure rules in `roleManagement.ts`, used by every caller:

- Only roles in the actor's `assignableRoles` can be granted or taken away,
  so an Admin cannot touch an Admin or Super admin, or grant either.
- No one raises their own role; no one removes their own access.
- The last **active** Super admin cannot be demoted, removed or deactivated
  (an inactive Super admin does not count as a safeguard).
- Deactivating a staff account is treated as removal.
- Role changes are stored (`nff.rbac.role-assignments.v1`) and read by login,
  the session and every permission check. Changing your own role calls
  `refresh()` so the UI follows.

There is no unrestricted bypass: Super admin holds explicit permissions and is
still bound by these invariants.

## 9. Audit event contract

`audit.ts`: `AuditEvent { id, actorId, action, resourceType, resourceId, at,
outcome: success|denied|failure, metadata? }`. Metadata keeps only small
primitives under non-sensitive keys (keys like email, name, note, password are
dropped; strings truncated). Store: localStorage `nff.audit.events.v1`, newest
200. No audit screen, no invented history; the list starts empty.

Emitted now: content create/duplicate/submit/approve-publish/reject/schedule/
unpublish, role changes, team removal, user status, curriculum changes, score
configuration, campaign changes, and every denial. Not audited: draft saves
(too frequent). Not yet emitted: content deletion (none exists), invitations,
the raw assignment functions (the guarded wrappers do emit).

## 10. Data-source classifications

`services/dataSources.ts` and `DataSourceBadge`/`DataSourceNotice`:

- **Live**: measured from a connected source. Nothing qualifies in this
  prototype; a test asserts no screen claims it.
- **Demo**: fixed seeded data, or counts over it.
- **Simulated**: generated by a formula or scaled to look like activity.
- **Unavailable**: no source exists; no value shown.

Applied: Overview cards are Demo; "Engagement trend" is now `—` / Unavailable
(the +4.2% was a literal). Visitors: GA4 and consent claims removed;
Unavailable notice, scaled figures Simulated, literals Demo. Engagement:
"rolled up nightly" removed; notice that learner activity is not aggregated;
seeded counts Demo, formula figures Simulated. Score settings: says nothing
recalculates scores; the save toast no longer promises recalculation.

## 11. Security limitations

- The session is `nff.session` in localStorage and is trusted by email; login
  accepts any seeded email with a password of 8+ characters. A forged session
  for an admin email is an admin. Role assignments, removed-staff lists,
  status overrides and the audit log are also editable browser storage.
- Service checks stop the app's own code paths and accidental misuse; anyone
  with the browser console can write storage directly.
- Route guards and hidden buttons are conveniences on top of the service
  checks, not protection.
- Nothing here claims production readiness.

## 12. Backend integration requirements

A server must: authenticate users and issue verified sessions with role
claims; build the same `Actor` (`assurance: 'verified'`) and run the same
`can()` and `roleManagement` rules on every operation; persist role
assignments, statuses, content and the audit log server-side and append-only;
redact recipient data in responses; and enforce the content transition table.
The registry, matrix and invariants are written to be reused as-is.

## 13. Known gaps

- Ownership/category scoping is not enforced (no reliable owner data).
- Role and permission definitions are fixed in code; `roles.manage` has no
  screen. Invitations, content deletion and assignment screens do not exist.
- Curriculum "Required" toggle, template save, scheduled-publish execution and
  rejection note delivery beyond the editor/queue views remain prototype-only.
- Admin Users > Progress still reads seeded progress.
- Score weights are stored but drive nothing.
- Practitioner `isPreviewIdentity` reads the seed role, not role assignments.
- The unguarded assignment functions remain for Practitioner internals.

## 14. Product decisions still needed

1. Should Admin hold `campaigns.manage`/`send`, or stay view-only?
2. Should Admin configure score weights, and view the audit trail?
3. May an Admin grant Admin, or only a Super admin?
4. Do removed staff become practitioners (current) or deactivated?
5. Should editors edit published content directly, or only via unpublish and
   review?
6. Who owns content (needed before ownership scoping)?


---

# Phase 1.1: policy alignment and assignment hardening

Extends the foundation above; the architecture is unchanged.

## 1.1.1 Policy changes applied

| # | Policy | Implementation |
|---|---|---|
| 1 | Campaign manager keeps create, manage, send | unchanged (`campaigns.view/manage/send`) |
| 2 | Admin view-only for campaigns and delivery | `campaigns.view` + `campaigns.recipients.view` only; campaign, template and delivery controls are disabled for Admin and the services refuse writes |
| 3 | Super admin full campaign access | holds every permission |
| 4 | Scores: Super admin only | `insights.scores.configure` removed from Admin; the route, nav and `saveScoreWeights` follow |
| 5 | Admin and Super admin view the audit trail | `audit.view` added to Admin; `readAuditTrail(actor)` is the guarded read (no screen yet) |
| 6 | Only Super admin grants or modifies Admin/Super admin | already enforced by `assignableRoles` (Admin: Editor, Campaign manager); re-tested |
| 7 | Removal = deactivation | `removeMember` sets the account `deactivated`; the role is kept; login and the session refuse it; Roles page shows "Deactivated" and a Reactivate button. The Phase 1 removed-staff key is read as deactivated |
| 8-9 | Editors do not modify live content; they work on a draft revision | see 1.1.3 |
| 10 | Ownership by real ids | see 1.1.4 |

Permissions: 38 (added `content.ownership.manage`, Admin and Super admin).

## 1.1.2 Assignment mutation hardening

Call-site audit of `services/learning/assignments.ts`:

| Export | Production callers | Kind |
|---|---|---|
| `ensureDefaultAssignment(s)`, `ensureDemoAssignments` | `accessContext` (Practitioner) | system bootstrap for a practitioner; ignores other roles |
| `startEnrolment`, `setEnrolmentStatus` | none yet | Practitioner self-service (own record; ignored for staff preview) |
| `assignPath`, `withdrawAssignment`, `saveGroup` | the bootstrap above and `rbac/assignmentGuards.ts` only | administrative primitives |

Decision: the administrative primitives keep their names and signatures,
because Practitioner code and six existing test files use them as store
primitives without an actor; changing them is a broad Practitioner refactor,
which the brief said to report rather than do. They are guarded structurally:

- `assignLearning`, `withdrawLearning`, `saveLearningGroup` (Admin and Super
  admin only) authorise first, validate the path, person, group or assignment
  against real records (no invented identities), and audit.
- `assignmentBoundary` tests (in `policy.test.ts`) fail if any production file
  other than the store and the wrappers references the primitives, or if any
  CMS or Admin file imports the assignment store or the enrolment writes.

**Remaining gap:** the boundary is enforced by a test, not by the type
system or at runtime. Code outside the CMS that imports the primitives (and
the browser console) can still call them. A real fix is a server boundary, or a
Practitioner refactor that makes the primitives take an actor or moves them
behind an internal module.

## 1.1.3 Content revisions

Smallest compatible model, stored on the existing `CmsItem` in
`nff.cms.items`:

- `CmsItem.revision?: { fields, status: draft | in_review | rejected,
  rejectionNote?, authorId, createdAt, updatedAt }`: one pending revision per
  live item, holding only the changed content fields.
- **Live** = `published` or `scheduled`.
- A save by someone without `content.publish` on live content writes the
  revision and leaves the live fields and `updatedAt` untouched. Authors read
  and edit a working copy (live + revision). Admin and Super admin still edit
  live content directly.
- `submitRevision` (`content.submit`), `publishRevision` (review + approve +
  publish; the revision's fields replace the live ones), `rejectRevision`
  (review + reject; live untouched; the note is shown to the author),
  `discardRevision` (author, draft or rejected only).
- Editing a revision that was in review or rejected returns it to `draft`.
  Reverting every change drops the revision.
- Live content can no longer be moved to review, or back to draft, without
  `content.unpublish` (workflow table).
- The Publishing queue lists revisions beside items ("Revision of live
  content"); lists show "Revision: <status>".

Limitations: one revision per item; no revision list or diff beyond the
changed field names; scheduling a revision is not supported; the editor's
local version history (last 10 saves) holds working copies and is not tied to
publication; the preview page shows the live record; an Admin editing live
content directly does not see a pending revision's fields.

## 1.1.4 Ownership

`CmsItem.createdBy`, `ownerId`, `collaboratorIds` (account ids). Pure rule in
`rbac/contentAccess.ts`:

- `createdBy` is set once at creation and never changes (saves ignore it).
- `ownerId` and collaborators change only through `setContentOwnership`
  (`content.ownership.manage`), and only to active staff who can edit content.
- Admin and Super admin can access every record. Editors can access records
  they own or are collaborators on. **Legacy seeded records have no owner and
  are unassigned: Editors cannot open them until an Admin assigns them.** The
  display `owner` string on legacy data is never used for decisions and is no
  longer shown (lists show the owner's real name or "Unassigned").
- Enforced in the reads (`listCmsItems`, `getCmsItem`) and the writes
  (`saveCmsItem`, `setCmsStatus`, `duplicateCmsItem`, revision actions).
  Curriculum titles remain readable to Editors through
  `listCmsItemSummaries` (no body, no ownership).
- The editors show an Ownership block to Admin and Super admin.

Limitation: a legacy record never gains a `createdBy`. Ownership data is
browser storage like everything else (see "Security limitations").

## 1.1.5 Known gaps added or changed

- Demo consequence: apart from the Phase 1.2 demo seed, the Editor sees nothing
  until an Admin assigns content.
- A deactivated staff member is shown on the Roles page; there is no screen to
  deactivate a practitioner's staff access other than Remove.
- Score weights and the audit trail still have no engine or screen.


---

# Phase 1.2: demo ownership seed and revision conflict safeguard

## 1.2.1 Demo ownership seed

`config/demoOwnership.ts` (marked DEMO) lists the records given to the demo
Editor (`u-editor`, Rowan Ellis). It is applied while the CMS builds its seed
items (`seedItems` in `services/cms.ts`), so it is deterministic and
idempotent, writes nothing, and never reruns over a record.

Assigned (`ownerId: u-editor`, `collaboratorIds: []`):

| Record | Seeded state | Shows |
|---|---|---|
| `exp-1` | published | live exploration: Editor edits become a revision |
| `exp-2` | published | a second live exploration |
| `exp-5` | in review | an item in the review queue |
| `exp-7` | scheduled | scheduled content, treated as live |
| `med-2` | published, audio ready | a live meditation |
| `med-8` | in review, audio ready | a meditation in the queue |

Unassigned: the other 95 records (every other exploration and meditation, and
the pre-existing "Untitled" draft). The Editor cannot open them.

Rules kept: only `ownerId` is set; `createdBy` is never invented (these were
not created in the CMS); a stored change always wins, so an Admin who
reassigns or unassigns one of these keeps that result; Practitioner content
and access are not touched. Delete the list, or assign through the CMS, before
launch.

## 1.2.2 Pending-revision safeguard

For Admin and Super admin opening a live record with a pending revision (both
editors):

- A warning names the revision's status and the fields it changes, says the
  Admin is editing the live version, that saving does not discard the
  revision, and that approving it later would replace those fields.
- "Inspect the pending revision" opens a plain list of each changed field with
  the proposed value and the live value. It is a list, not a diff.
- `CmsRevision.basedOn` records the live `updatedAt` when the revision was
  started. If the live record changes afterwards (for example an Admin edits
  it directly), `isRevisionStale` is true and the warning and the Publishing
  review sheet say so. Revisions made before this field existed show no stale
  warning.
- The Publishing review sheet now shows the same field list instead of only
  field names.
- Nothing is overwritten or discarded: an Admin's direct save keeps the
  revision; approve, reject and publish are unchanged.

Limitations: the warning does not block an Admin save and does not offer a
merge; the proposed/live lists show whole field values; a draft revision that
was never submitted is visible only through this warning (it is not in the
queue); "Live now" shows the editor's current value, including unsaved edits.
