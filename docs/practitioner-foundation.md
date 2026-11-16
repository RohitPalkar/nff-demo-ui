# Practitioner foundation (Phase 0)

Data, access and migration groundwork for the Practitioner learning platform.
No Practitioner screens were redesigned in this phase.

## 1. CMS investigation

**Finding: CMS edits do not reach learner screens.** The two sides read
different stores and nothing connects them.

| | CMS (`src/services/cms.ts`) | Learner (`src/services/content.ts`) |
|---|---|---|
| Source | Seeds `CmsItem[]` from `mocks/db.ts` `content`, then overlays `localStorage` `nff.cms.items` | Reads `mocks/db.ts` `content` and `stages` constants directly |
| Stage order and membership | `nff.cms.stage-order`, `nff.cms.stage-items`, `nff.cms.stage-details`, `nff.cms.new-stages` | `stages[].itemIds` from the constant |
| Publishing | `setCmsStatus` writes `status` into `nff.cms.items` | Filters on `item.published` from the constant |
| Users | Reads `users`; status overrides in `nff.cms.user-status` | `userByEmail` / `userById` from the constant |

Consequences:

- Publishing, unpublishing, editing, re-ordering or creating content in the
  CMS changes only `nff.cms.*` keys. The public site, library and learner
  screens never read those keys, so they do not change.
- `CmsItem` is a flat editor record (title, excerpt, body as one string,
  category, `stageId`, status, owner, SEO, preview, transcode, duration). It
  has no modules, lessons, access level or assignment. Video and video
  captions are permanently unsupported.
- The mock database in `mocks/db.ts` is shared module state, seeded with a
  fixed random seed, so the same content appears on every load.
- No learner data is written by the CMS, and the CMS never reads learner
  progress (its engagement pages use seeded `Event` records).

Missing integrations (all CMS-DEPENDENCY or BACKEND-DEPENDENCY):

- A single content source that both the CMS and learner services read.
- Editors for paths, modules, lessons, blocks and transcripts.
- Assignment, group and access-level management.
- Publishing that actually changes what learners see.

The new learning catalogue (`services/learning/catalogue.ts`) is derived from
the same constants the learner side already used. It inherits the same
disconnection from the CMS.

## 2. New data structures (`src/types/learning.ts`)

`LearningPath`, `Module`, `Lesson`, `LessonBlock`, `Resource`, `Group`,
`Assignment`, `Enrolment`, `LessonProgress`, `MediaProgress`,
`LearningActivity`, `LearningProgressStore`.

Single source of truth: a child holds its parent id and order
(`Module.pathId`, `Lesson.moduleId`); parents do not list children. A Lesson
points at Resources through blocks and does not copy their title or body.
Migrated Resources reuse the existing content id, so every saved id is valid.

## 3. Migration

**Catalogue.** `buildResource`, modules and lessons are derived from the six
stages and the content list on demand (deterministic ids:
`path-meadow-journey`, `module-{stageId}`, `lesson-{itemId}`). Idempotent by
construction. `stageId` stays on every content item for the public site;
`Module.legacyStageId` points back.

**Progress.** `nff.progress.{userId}` becomes `meadow.progress.v2.{userId}` on
first read, per user. Source order: stored legacy record, then the seeded
mock progress (this is how the demo user keeps their seeded progress), then
empty.

- Versioned (`version: 2`); migration does not replace a valid v2 record.
  Unsupported legacy media entries are sanitized in place without a version
  bump.
- Recoverable: the legacy key is left untouched, and `migratedFrom` records
  the source and time.
- Preserves completed ids (and order), the in-progress item, audio positions.
- Creates no activity, completion dates, played time or other history.
- Existing screens keep the legacy `Progress` shape through adapters
  (`toLegacyProgress`, `saveLegacyProgress`), so none had to change.

**Assignments.** Every practitioner gets the default Meadow Journey
assignment once (`ensureDefaultAssignment`), applied lazily when their access
is first evaluated, so people who sign up later are covered. The assignment
time is the real time it was created, `assignedBy` is `system:migration`, and
there is no due date. A withdrawn default assignment is never re-created.

## 4. Access service (`services/learning/access.ts`)

`canAccess(ctx, target)` over resources, paths, modules and lessons. Returns a
mode (`full`, `preview`, `none`), a reason, whether progress may be recorded,
and for locked modules, the blocking module.

- public: everyone. registered: practitioners fully; others get the existing
  preview (article excerpt, free-preview track). assigned: needs an active
  assignment (individual or through a group) to a path containing it.
  restricted: explicit grant (user, group or role) only; no preview; neither
  assignment nor being a practitioner opens it.
- Modules: `sequential` needs the previous module complete; `open` always
  unlocked; the first module is always unlocked; an empty previous module does
  not block.
- Staff preview: editors and admins, only on the learner surface, read-only
  (`recordProgress: false`), bypassing locks. They are not practitioners, and
  on the public site they get exactly what they got before.
- Used by: the lesson routes (`app/RequireLessonAccess.tsx`), the public
  detail pages, and library card playback (`useLibraryPlayback`).

**Limitation.** This is mock, client-side enforcement. The rules, assignments,
progress, content and audio all live in the browser or the bundle, so anyone
with devtools can bypass them. It is not production security. A backend must
evaluate the same rules before returning content or media.

## 5. Route compatibility

`services/learning/legacyRoutes.ts` holds the verified mapping:

| Old | New |
|---|---|
| `/journey` | `/learn` |
| `/my-journey` | `/learn/progress` |
| `/journey/stages/:stageId` | `/learn/paths/meadow-journey?module=module-:stageId` |
| `/journey/stages/:stageId/read/:contentId` | `/learn/paths/meadow-journey/lessons/lesson-:contentId` |
| `/journey/stages/:stageId/listen/:contentId` | same as read |

Tests assert the mapping covers every registered route and every link to an
old route found in `src`. **No redirects are installed**, because the `/learn`
screens do not exist yet. Account routes (`/account/profile|email|privacy`) do
not move. "Preferences" in the new profile menu has no page today.

## 6. Shared component audit

| Component | Used by | Safe reuse or extension |
|---|---|---|
| `PlayerProvider` | Practitioner layout, player page, `useLibraryPlayback` (public cards for practitioners) | Do not change its `load(track, stageId, startAt, autoplay)` signature or its use of `getProgress`/`saveProgress`. Generalise behind an adapter. It still runs a simulated clock and persists through the legacy adapters. |
| `MiniPlayer` | Practitioner layout only | Audio only. Video is permanently unsupported. Low regression risk. |
| `BrandLogo` | Public header, auth, practitioner, CMS (compact) | Changed earlier this session for Meadow. Do not restyle per surface; use `className`. |
| `Button` | Everywhere, including 16 CMS files | Add variants, never alter defaults. |
| `Progress` | Practitioner pages, CMS (`UserDetail`, `ScoreSettings`) | Fully rounded track today. A square variant must be opt-in via `className`/new prop. |
| `Tabs` | `MyJourneyPage` only | Safe to replace there; not used by the public site or CMS. |
| `StatusChip` | Practitioner, public detail pages, 12 CMS pages | Pill shape is shared with the CMS. Add a `shape` prop, default unchanged. |
| `ButtonGroup` | Public home library, category filters | Pill shape fits the public site. Practitioner needs a square shape option, opt-in. |

## 7. Remaining backend and CMS dependencies

- Server-side access checks and real sessions.
- Durable assignments, groups, enrolment and progress (currently localStorage).
- A shared content store so CMS changes reach learners.
- Transcripts and captions for audio; real audio files and durations.
- CMS editors for paths, modules, lessons, access levels and assignments.

## 8. Phase 1: application shell

- `app/layouts/LearnLayout.tsx` is the Practitioner shell (wordmark, five-item
  horizontal navigation, profile menu, content area, audio mini-player). It
  replaces `PractitionerLayout`. Nothing in it links to the public website.
- Routes live under `/learn` (see `services/learning/routes.ts`). Old
  `/journey*` and `/my-journey` URLs redirect through `app/LegacyRedirect.tsx`
  using the verified mapping in `legacyRoutes.ts`; query and hash survive.
- Lessons open at `/learn/paths/:pathSlug/lessons/:lessonId`, gated by
  `RequireLessonAccess`. Denied or missing content shows an in-app state.
- Staff preview (editor, admin) is read-only: `previewRoles.ts` makes progress,
  activity, enrolment and assignment writes no-ops at the service layer, and
  the reader hides "Mark as complete". A "Preview mode" strip shows in the shell.
- Preferences (`/account/preferences`) holds one real setting, default playback
  speed, saved per account and applied when the lesson player opens a track.
  It does not yet apply to meditation cards on the public site.
- Home, My Learning, Library, Meditations and Progress are deliberate
  placeholders showing only real data. The old My Journey screen (with its
  fabricated streak and chart) is no longer routed.

## 9. Phase 2: Practitioner Home (`/learn`)

### Data available to Home

| Need | Source | Notes |
|---|---|---|
| Name | `useAuth().user.name` | First word only. No "welcome back": there is no last-visit record. |
| Assignments | `getAccessContext(user).assignments` (`assignmentsForUser`) | Active only, direct or via a group. Staff have none. |
| Path, modules, lessons | `catalogue.ts` (`getPath`, `getModulesOf`, `getLessonsOf`) | One path today (Meadow Journey), six modules. |
| Completion | `progress.ts` `pathCompletion` / `moduleCompletion` | Derived from `lessons[id].status === 'completed'`. |
| In-progress lesson | `store.inProgressLessonId` | Set by the legacy reader/player saves and migration. |
| Audio position | `store.media[id].positionSec`, `updatedAt` | `updatedAt` exists only for positions saved after migration. Migration invents no dates. |
| Reading position | `store.lessons[id].reading` | Recorded by `recordReading`, which nothing calls yet, so it is usually absent. |
| Activity | `store.activity` (`started`, `completed`, `opened`) | Real events only. Migration creates none, so a migrated learner starts with an empty list. |
| Library resources | `getLearningCatalogue().resources` + `content` | Every published item, gated by `canAccessResource`. |
| Thumbnails | `content[].image` | Every item has one. Paths have no image. |

### The "21 of 100 lessons" denominator

Verified correct for today's data. `pathCompletion` counts required lessons
in Meadow Journey. Lessons come from `stages[].itemIds` (six stages of
17, 17, 17, 17, 16, 16 = 100). The mock has 101 items: 100 published (41
explorations, 60 meditations, less the one draft), and the one draft item is
in no stage. So 100 lessons = 100 published items, none duplicated, none
missing. Four of the meditations are still transcoding; they are real
lessons, so they stay in the count, but Home never suggests them.

The count was not guarded, though: a draft stage or a draft item added to a
stage would have been counted. Completion now counts only lessons in
published modules whose resources are all published
(`countsTowardCompletion` in `progress.ts`). Today's number does not change.

### Home structure and rules

Order: welcome, continue learning, assigned learning, up next, recently
accessed, explore the library. On wide screens, up next and recently accessed
sit in a right-hand column.

- **Welcome.** "Welcome, {first name}", one calm line, and the next action
  (start or continue the path, or open the library). When a Continue card
  is shown, that card is the next action and the header has no button.
- **Continue learning.** One item, chosen in this order, skipping anything
  completed, missing or not openable (`canAccessLesson`):
  1. the in-progress lesson (`inProgressLessonId`);
  2. the audio lesson with the newest saved position (`media.updatedAt`,
     position above zero);
  3. the reading lesson read most recently (`reading.lastReadAt`).
  Nothing is shown if none apply. Never the "next" lesson: that is a
  suggestion, not something in progress.
- **Assigned learning.** One card per assigned path (deduplicated), with
  module and lesson counts and completion from `pathCompletion`. Staff in
  preview see published paths marked as preview.
- **Up next (suggestions).** Rule, shown on the page: the first lessons not
  yet completed, in path order, from unlocked modules, skipping the
  Continue item and audio that is not ready. At most three.
- **Recently accessed.** Merged from activity events, saved audio
  positions with a date, and reading records, newest first, one row per
  lesson, excluding the Continue item, at most five. Empty state otherwise.
- **Explore the library.** Featured (`featured: true`), published,
  openable (`canAccessResource`), audio ready, newest first, at most six.
  Cards open `/learn/library/:type/:slug`. A link opens `/learn/library`.

The rules live in `services/learning/home.ts` (pure, tested); the page
and `components/learn/home/*` only present them.

## 10. Video support (permanently unsupported)

- Video is permanently unsupported. The platform supports article and audio
  content only; video models, routes, players, mini-players, card previews and
  video progress have been removed rather than feature-flagged.
- `/learn/library/video/...` and `/learn/library/mixed/...` are not valid
  library formats and resolve to the in-app not-found state.
- Legacy media records with composite ids or unsupported kinds are discarded
  when a v2 progress store is read, without changing the store version. They
  are never interpreted as audio progress or copied back to the legacy shape.
- Audio playback, captions/transcript support, public previews, transcoding
  states, resume and one-at-a-time playback remain supported.

## 11. Phase 3: My Learning (`/learn/my-learning`)

### Data

- **Paths:** one (Meadow Journey: 6 published modules, 100 lessons; see
  section 9 for the count). There are no courses in the architecture, so the
  page shows learning paths only and has no type filter.
- **Assignments:** active ones from `getAccessContext` (direct or via a
  group), one card per path. Withdrawn direct assignments for paths not
  assigned again are listed under "No longer assigned" with the real
  withdrawal date; group withdrawals are not visible per person.
- **Enrolment:** `startEnrolment` is never called anywhere, so enrolment
  records do not exist yet. "Started" is therefore derived from progress.

### Classification (`services/learning/myLearning.ts`)

- **Completed:** every counted lesson complete (`pathCompletion.complete`).
- **In progress:** not complete, and at least one of: a completed lesson,
  the in-progress lesson belongs to this path, or a dated audio or reading
  record against one of its lessons. Undated migrated positions do not count.
- **Not started:** everything else.
- **Next lesson:** the Home Continue item if it is in this path (shown as
  "Resume"), otherwise the first unfinished, openable lesson in path order.
- **Last accessed:** the newest dated record against the path's lessons.
  Absent when there is none.
- **Actions:** Start learning, Continue learning (to the lesson), Review
  learning (completed, to the path page), View learning path (staff preview,
  or nothing openable).

Tabs (`?tab=`) and sort (`?sort=`: recently accessed, recently assigned,
progress, title) are views of the same list and live in the URL. The sort
control appears only when a view has more than one path. Staff in preview
see published paths, marked as preview; nothing is written.

### Known gaps

- The path detail page (`/learn/paths/meadow-journey`) still renders the old
  Journey screen, whose heading says "Welcome back, {name}". That greeting
  is not backed by a last-visit record; it should be replaced when the path
  page is redesigned.
- No certificates exist, so none are shown.
- Enrolment, courses and per-person group withdrawal history need backend
  and CMS support before they can appear here.

## 12. Several learning paths

The app now works with any number of assigned paths, not only Meadow Journey.

- **Demo paths.** `config/demoPaths.ts` adds three labelled demo paths that
  regroup existing items: First steps (open), Rest and sleep (sequential)
  and Attention in daily life (open). No new content. They are assigned to
  each practitioner once (`ensureDemoAssignments`, `assignedBy:
  'system:demo'`), after Meadow Journey; a withdrawn one is never re-created.
  Remove the config to remove them.
- **Ids.** Meadow Journey lessons stay `lesson-{itemId}`, so no saved record
  changes. Other paths use `lesson-{itemId}@{pathKey}`; `itemIdForLesson`
  reads both. Links use `pathLessonHref(slug, lessonId)`.
- **Completion is shared by item.** The reader and player save completion
  against the item, so finishing an item counts in every path that uses it
  (`isLessonComplete`). This is why First steps shows as complete for the
  seeded learner: all of its items are stage-one items they have finished.
- **Path page.** Paths not built from the six stages use
  `pages/learn/PathOverviewPage.tsx` (modules in order, unlock rule, lock
  reason, lesson completion and access). Meadow Journey keeps its old screen.
- **Lessons.** The reader and player take an optional `outline`
  (`services/learning/outline.ts`) for other paths: back link, "Lesson 2 of
  2", previous and next follow that path. A locked module says "module"
  instead of "stage".
- **Home.** Paths are ordered in progress, not started, complete; up to
  three are shown with "View all N". Up next takes the next lesson from each
  path in turn and never suggests the same item twice.
- **My Learning.** Unchanged rules; with four paths every tab and the sort
  control have real content.

## 13. Phase 4: Library and discovery (`/learn/library`)

### Audit (before building)

| Question | Answer from the code |
| --- | --- |
| Resources that exist | 101 catalogue items (`mocks/db.ts`): 41 explorations (articles), 60 meditations (audio). |
| Published | 100. `exp-draft` is unpublished. |
| Accessible | Every Resource is `access: 'registered'`, so a signed-in practitioner gets all 100 in full; staff get a read-only preview; visitors get none on `/learn`. No item is `public`, `assigned` or `restricted` today. |
| Metadata | title, slug, excerpt, image, category (4), `understandTopic` (mind / wellbeing, Understand only), `featured` (12 items), `updatedAt`, reading time or audio length, `stageId`, `transcode` (audio). No tags, no authors, no publication date. |
| Content types | Article and audio. Video is an extra format on 4 items (`CONTENT_VIDEOS`: exp-1, exp-7, exp-20, med-56); med-5's video is unavailable. |
| Detail routes | `/learn/library/:type/:slug` existed as a placeholder; article and audio now open in the real reader and player. `video` and `mixed` keep the "not available yet" state (no such resources exist). |
| Missing for discovery | Tags (search uses title, description, category and topic instead); a publication date ("Recently updated" sorts by `updatedAt` and says so); any discoverable path (all paths are `assigned`, so none are listed as discovery entries); real access variety (no access filter, since every item is open to every learner). |

Category counts (learner, unfiltered): Foundations 25, Understand 25, Contemplate 25, Explore 25. Formats: Article 40, Audio 60, Video 4. Four audio items are still processing (med-1, med-20, med-39, med-58).

### What was built

- **Service** `services/learning/library.ts`: `listLibraryResources(ctx)` (published, Resource published, `canAccessResource` full on the learner surface; unpublished is left out even for staff), `filterLibrary` (search, category, format), `sortLibrary` (Recently updated, Title A–Z, Shortest, Longest; stable ties), `libraryCounts` (each count with the other filters applied; categories and formats with no content are not offered), `featuredResources` (the real `featured` flag, ready to play, newest first, 3), `relatedResources` (the public site's rule: same kind, same stage for audio, same category first, newest), `pathsUsingItem` (the viewer's active assigned paths that use the item), `libraryOutline`, URL parsers.
- **Page** `pages/learn/LibraryPage.tsx`: "Explore the Library", search (250 ms debounce, Enter applies at once, Escape and a clear button empty it), Featured only while browsing with no filters, category chips with live counts, a format control, a sort select, a results line ("Showing 24 of 100 resources"), removable active-filter chips and Clear all, 24 cards per "Show more", empty and no-result states. The URL holds `q`, `category`, `format` and `sort`.
- **Components** `components/learn/library/`: `LibrarySearch`, `LibraryControls` (`LibraryCategoryNavigation`, `LibraryFilters`, `LibrarySort`, `LibraryResultsSummary`), `ResourceGrid` (`ResourceGrid`, `FeaturedResource`, `LibraryEmptyState`), `ResourceDetailSections`. Cards reuse Home's `ResourceCard`, which gained an optional `note` (used for "Audio is still being prepared").
- **Detail** `pages/learn/ResourcePage.tsx`: access is checked on the direct URL; denied, unpublished, not-found and processing-audio states stay inside the app with "Back to Library". Articles open in `ExplorationReaderPage`, audio in `PlayerPage`, with a Library outline (back to Library, overline "Library · Category", no lesson counter or previous/next; `position`/`total` are now optional on `LessonOutline`). Below: the learner's assigned paths that use the item, and three related items. Opening a resource assigns nothing; staff preview records nothing.

### Notes and gaps

- Library access is resource-level. An item in a locked module of a sequential path can still be opened from the Library because its Resource is `registered`; module locks order a path, they are not a restriction on the item. Finishing it in the Library counts in every path that uses it (shared completion).
- Cards show no access badge or path association: every item is open to the learner and every item is in Meadow Journey, so either would repeat on all 100 cards. Paths appear on the detail page instead.
- The reader's completion copy still says "lesson" when opened from the Library.
- The app has no scroll reset between routes; the resource detail now starts at the top on its own.
- Client-side access here is a demo, not production security.

## 14. Phase 5: learning path overview (`/learn/paths/:pathSlug`)

### Audit

- **Construction.** `catalogue.ts` builds Meadow Journey from the six stages (`legacyStageId` on each module, lesson id `lesson-{itemId}`), and each demo path from `config/demoPaths.ts` (`lesson-{itemId}@{key}`). Order is `Module.order` then `Lesson.order`.
- **Progress.** One rule: `pathCompletion` / `moduleCompletion` in `progress.ts`, counting required lessons in published modules whose resources are published; completion is shared by item (`isLessonComplete`). Home, My Learning and the path page all read it.
- **Unlock.** `getModuleUnlockState` (access.ts): `open` modules are always unlocked; a `sequential` module needs the previous module (by order) complete, and an empty previous module never blocks. Staff preview ignores locks and records nothing.
- **Access levels.** `canAccessResource` (the item), `canAccessModule` (path assignment plus unlock), `canAccessLesson` (module, then each resource with `viaPath`).
- **Direct lesson URLs.** `RequireLessonAccess` runs `canAccessLesson` on `/learn/paths/:slug/lessons/:id`, so a locked lesson URL shows the in-app "not open yet" state.

### Library, path and direct URL: what differs today

| Route | Rule applied | Locked-module item |
| --- | --- | --- |
| `/learn/library/:type/:slug` | `canAccessResource` only | Opens (resource is `registered`) |
| `/learn/paths/:slug` (this page) | `canAccessModule` / `canAccessLesson` | Row shows Locked; not a link |
| `/learn/paths/:slug/lessons/:id` | `canAccessLesson` | Denied in-app |

This is deliberate and unchanged: a module lock orders a path, it does not restrict the resource. The current model cannot say "this item is only for people inside the path". The smallest future-proof fix is a Resource flag such as `access: 'assigned'`, which `canAccessResource` already supports; setting it on a resource makes the Library hide it from learners who do not hold the path, with no change to the path or lesson rules. Nothing was changed here; `pathPage.test.ts` pins the current behaviour.

### What was built

- **Service** `services/learning/pathPage.ts`: `buildPathPage` composes `buildPathOverview` (modules, locks, lesson access) and `buildMyLearning` (status, next lesson, action, assigned and due dates), so numbers and actions cannot drift from Home or My Learning. Lesson state is `complete`, `in-progress` (saved reading, audio or video position, or the path's in-progress lesson), `available`, `locked` or `unavailable` (audio still processing). Video is shown only when it can play.
- **Components** `components/learn/path/`: `LearningPathHeader`, `LearningPathProgress`, `CurriculumSection` (Radix accordion, one section per module, Expand/Collapse all), `LessonRow` (`LessonStatus`, `LessonFormatIndicator`). State is always a word plus an icon.
- **Page** `pages/learn/PathOverviewPage.tsx` now serves every path including Meadow Journey. `PathPage` keeps the access check and still accepts `?module=` (old stage links), which opens that module. The current module is open by default; a completed path opens none.
- **Primary action.** Start learning / Continue learning open the lesson the shared logic picks; Review learning scrolls to the curriculum. Staff preview shows no action and records nothing.
- **Greeting.** The "Welcome back, {name}" heading is gone: the old Journey screen is no longer routed and its heading is now just "Meadow Journey".

### Not built, and why

- **Learning outcomes, hero image, duration estimate, instructor, ratings, enrolments, certificates:** none exist in `LearningPath` or `Module`, so none are shown. A path summary and module summary/intro are the only descriptive text.
- **Expansion is not persisted:** it is derived from progress on each visit, so no storage was added.
- **Dead code:** `pages/practitioner/JourneyPage.tsx` (only its `itemHref` helper is still imported) and `StageDetailPage.tsx` (unused) can be removed in a cleanup once the helper moves.

## 15. Phase 6: unified lesson experience

### Existing media and progress behaviour (audit)

- **Completion** is recorded per item through `saveProgress` (legacy shape) into the v2 store (`applyLegacyProgress`), so finishing an item completes every lesson in every path that uses it. Staff in preview never write: `persist` ignores preview identities.
- **Reading.** The old reader tracked scroll only for display and never saved a position (`recordReading` existed but was unused). Completion is the explicit "Mark as complete" button (`FLAGS.completionMode`); `'scroll'` completes at 98%.
- **Audio.** `PlayerProvider` is the one player. It advances position on a 250 ms timer and plays `/audio/meditation-preview.wav` on loop (a short placeholder), saving position every 15 s and completing at 95%. **Time and completion are simulated**: the real `<audio>` element is not the clock, because the placeholder file is not the track's real length. This is a demo limitation, not verified listening. The lesson screen says so in one line under the controls.
- **Video.** `ResourceVideo` / `VideoPlayer` use real media events and `recordMedia` (position, played seconds, completion at the video's end), keyed `{itemId}#video`. Captions come from real `.vtt` tracks when configured. Unavailable and processing videos show an in-app status panel (`data-video-state`). Video completion does not complete the lesson; an article or audio item's own rule does.
- **Catalogue.** Every lesson is a single article or audio item (`kind` `reading` / `audio`). A video is an add-on to those items (exp-1, exp-7, exp-20, med-56; med-5's is unavailable). There are no video-only or mixed lessons.

### What was built

- **Service** `services/learning/lessonView.ts`: `buildLessonPage` composes `buildPathPage` (so states, locks and progress are the same numbers as everywhere) and adds the current lesson's place, previous/next, and completion context (module complete, path complete, whether the next module is open and, if not, what it waits for). Previous/next skip locked lessons and audio that is not ready; they never lead into a closed lesson.
- **Frame** `components/learn/lesson/LessonShell.tsx`: a slim bar (back to the path, "Module · Lesson n of m", Curriculum), a sticky curriculum column from 1024px (`LessonCurriculum`: current module open, state icon plus a word for screen readers, current lesson `aria-current`, locked lessons are not links) and a bottom drawer below it that closes on navigation. From the Library there is no curriculum and no "Lesson n of n".
- **Formats.** `ReadingLesson` (reading column, real reading progress, "pick up where you left off", completion button, optional video above the text, image), `AudioLesson` / `AudioPlayerCard` (the shared player: seek, ±15 s, speed saved per account, resume prompt, processing/failed audio shown as unavailable), `BlockLesson` (renders `text` and `resource` blocks in order for `video`/`mixed` lessons; ready but unused, no lesson invented).
- **Completion** `CompletionPanel`: confirmation, "Stage 2 · Attention: 5 of 17 lessons complete", whether the module is finished and whether the next opens by its own rule, Continue learning, Back to curriculum; "You have completed {path}" at the end. No points, streaks or badges.
- **Routes.** `LessonPage` serves every path's lessons (Meadow Journey included) behind `RequireLessonAccess`; `ResourcePage` (Library) uses the same reading and audio views with no curriculum.
- **Mini-player.** It now hides on the track's own page in any path (`lesson-med-1@key`) and in the Library, not only on the Meadow route, and still carries playback across pages.

### Progress persistence

| What | Where | When |
| --- | --- | --- |
| Reading position | `lessons[lessonId].reading.scrollPct` via `recordReading`, under the item's Meadow lesson id | After a 0.7 s pause in scrolling and on leaving; nothing on open; not once complete; never for staff |
| Completion | `completedItemIds` → `lessons[id].status = completed` | Only the button (or the existing flag) and the player's 95% rule |
| Audio position and speed | `positionsSec[itemId]`, `playback-speed` per account | Every 15 s while playing, on close; speed on change |
| Video position | `media[itemId#video]` via `recordMedia` | From real media events |

### Known limitations and dependencies

- **Audio is simulated** (see above). Real listening data needs real audio files and driving position from media events; that is a change inside `PlayerProvider`, not made here.
- **Video-only and mixed lessons do not exist** in the catalogue, so `BlockLesson` is untested against real content. Video-end completion (`media-end`) is not wired because no lesson uses it.
- **Articles have only paragraphs** (`body: string[]`): no headings, lists or inline images in the model, so none are rendered.
- **Library vs path access is unchanged.** An item in a locked module still opens from the Library (see section 14); the lesson route stays protected.
- **Dead code.** `ExplorationReaderPage`, `PlayerPage`, `JourneyPage`, `StageDetailPage` are no longer routed; `itemHref` in `JourneyPage` is still imported by them and `MyJourneyPage`. Removing them was blocked earlier, so it is left to you.
- The reading bar and position use the article's own box, so related content below it does not skew them.

## 16. Phase 7: Meditations (`/learn/meditations`)

### Catalogue audit

| Question | Answer from the code |
| --- | --- |
| Meditation items | 60 (`type: 'meditation'`), all published |
| Categories | Foundations 15 · Understand 15 · Contemplate 15 · Explore 15 (`Understand` items also carry a mind/wellbeing topic) |
| Audio state | 56 `ready`, 4 `transcoding` (med-1, med-20, med-39, med-58). `failed` exists as a state (the `transcode-failed` scenario) |
| Audio files | All 60 point at one placeholder recording, `/audio/meditation-preview.wav`. No per-track audio exists |
| Length | `durationSec` is catalogue metadata (5 to 29 min), not measured from a file. No transcripts |
| Artwork | Every item has a natural-photograph `image` and a letter `artwork` tile |
| Featured | 6 meditations carry `featured` |
| Access | Every Resource is `registered`: learners open all published ones; staff preview read-only; visitors get none on `/learn` |
| Progress records | Audio position at `media[itemId]` (saved by the player every 15 s and on close), completion at `lessons[lesson-{id}]`; a video position uses `{id}#video` and is not read here |
| Player | One `PlayerProvider` + `MiniPlayer`; position advances on a timer (simulated), see section 15 |

### What was built

- **Service** `services/learning/meditations.ts`: `listMeditations` is the Library's audio items (so access, publication and unpublished handling are the Library's, not a second rule), each with a state: `not-started`, `in-progress` (a saved position and its time), `completed` (the lesson record), `processing`, `unavailable` (failed). `continueListening` (real saved positions, newest first, finished ones excluded), `filterMeditations` (search, category, ready-only), `meditationCategories` (counts that match the result of choosing each; categories without meditations are not offered). The Library's `filterLibrary` / `sortLibrary` / `featuredResources` became generic so they keep the entry type.
- **Page** `pages/learn/LearnMeditationsPage.tsx`: intro panel with search, Continue listening (only with real records), Featured (only the `featured` flag, only playable, only while browsing), category chips with live counts, "Ready to play only", sort (Recently updated, Title A–Z, Shortest, Longest, by listed length), result line, removable chips, "Show more". URL holds `q`, `category`, `ready`, `sort`.
- **Components** `components/learn/meditations/`: `MeditationsHeader`, `MeditationCard`, `MeditationGrid`, `MeditationContinueCard`. Cards lead with artwork, show the category, listed length and one state line ("Resume from 5:10", "Completed", "Audio is still being prepared"). Processing and failed cards are not links and show no play affordance.
- **Detail** `/learn/meditations/:slug` (`pages/learn/MeditationPage.tsx`): `canAccessResource` on the direct URL, then the same `AudioLesson` as lessons and the Library (seek, ±15 s, speed saved per account, resume prompt), with Back to Meditations, the learner's assigned paths that use it, and "More meditations". Processing audio shows an in-app not-ready state and is never counted as complete. Opening assigns nothing and records nothing.
- **Shared fixes.** `AudioLesson` shows the item's real photograph instead of the letter tile; the audio card now waits for saved progress before loading, so the resume prompt is not skipped (a Phase 6 race found by the new resume test); the mini-player hides on a track's own Meditations page.

### Playback verification (browser)

Resume from 5:10 started at 5:12; leaving to Home kept playing (mini-player at 5:14); coming back to the same page showed Pause at 5:17 with no restart and no prompt; speed starts from the account preference.

### Limitations and dependencies

- **Playback is simulated** over one placeholder recording. Saved positions are places to resume from, not listening time, and nothing here is analytics. Lengths are the catalogue's listed lengths.
- **No tags, transcripts, per-track audio, ratings, popularity or recommendations** exist, so none are shown. "Recently updated" is the update date, not a publication date.
- **No access filter:** every meditation is `registered`. A restricted or assigned meditation would be hidden by `listLibraryResources` and denied by the detail route (tested for the Library).
- A meditation opened from a learning-path lesson still uses the lesson route; from Home and the Library it keeps the Library route. Only Meditations links use `/learn/meditations/:slug`.

## 17. Phase 8: Practitioner completion

Audit first: Home, My Learning, Library, Meditations, path, lesson and the
account menu were already built and kept. Gaps found and closed:

- **Progress** (`/learn/progress`) was a one-path placeholder. It is now
  built on `services/learning/progressPage.ts`, which reuses
  `buildMyLearning` and `pathCompletion`, so totals match Home, My Learning
  and the path page. It shows overview totals (a lesson in two paths counts
  once), every assigned path with module progress, completed lessons (dated
  first; carried-over completions say "date not recorded"), and a timeline of
  started and completed lessons only. No time spent, streaks or charts: the
  demo audio is simulated and nothing else is tracked reliably.
- **Staff preview** on Progress uses an empty store: no totals, history or
  timeline, and nothing is written. Playback speed chosen in preview is no
  longer saved as a preference.
- **Account**: tabs renamed to match the account menu (My Profile,
  Preferences, Email Preferences, Privacy & Security). Profile shows the
  signed-in account. Email Preferences says no email is sent. Privacy &
  Security has a sign-in section and the Log out button (returns to
  `/login`). Misleading copy removed (time zone, "tonight's send").
- **Polish**: card radius 12px (`HOME_CARD`), My Learning subtitle no longer
  mentions courses, Meditations "Continue listening" no longer overflows at
  360px.

Limitations: progress, preferences and account data live in browser
localStorage only; client-side access is not production security. Export and
account deletion are simulated; password and device management do not exist.
