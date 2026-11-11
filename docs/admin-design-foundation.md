# Admin design foundation (Phase 2)

The structure, tokens and shared components of the Meadow Admin. Future Admin
modules should be built from this. Permissions are unchanged: see
`admin-rbac-foundation.md`.

Correction to the Phase 0 audit: it said Admin page titles were 40px. They
were already 24px, because the layout carries `data-surface="cms"` and the
existing `[data-surface="cms"]` scope overrides the heading scale. What was
wrong was portalled UI (menus, dialogs, toasts), which sat outside that scope.
The shell now fixes that (see "Scope").

## 1. Information architecture

Generated from `CMS_ROUTES` in `services/rbac/navigation.ts`. A destination is
shown only when the account holds one of its permissions **and** its route
exists. Nothing in the sidebar is a placeholder.

| Group | Shown now | Route | Permission (any of) |
|---|---|---|---|
| Overview | Dashboard | `/cms` | `cms.access` |
| Content | Explorations | `/cms/explorations` | `content.view` |
| | Meditations | `/cms/meditations` | `content.view` |
| Learning | Curriculum | `/cms/curriculum` | `learning.view` |
| Publishing | Review Queue | `/cms/publishing` | `content.view` |
| People | Practitioners | `/cms/users` | `practitioners.view` |
| | Team & Roles | `/cms/roles` | `team.view`, `roles.view` |
| Insights | Visitors | `/cms/analytics/visitors` | `insights.visitors.view` |
| | Engagement | `/cms/analytics/engagement` | `insights.engagement.view` |
| Campaigns | Campaigns | `/cms/campaigns` | `campaigns.view` |
| | Templates | `/cms/templates` | `campaigns.view` |
| | Delivery | `/cms/delivery` | `campaigns.view` |
| Settings | Score Settings | `/cms/settings/score` | `insights.scores.configure` (Super admin only) |

Detail routes keep their paths and appear in breadcrumbs only
(`/cms/explorations/:id`, `/cms/meditations/:id`,
`/cms/curriculum/stages/:stageId`, `/cms/preview/:type/:id`,
`/cms/users/:id`, `/cms/campaigns/:id`, `/cms/templates/:id`).

**Hidden until their module exists** (decision: hide, not placeholder): Media
Library, Learning Paths, Modules & Lessons, Assignments, Groups, Scheduled,
Publishing History, Audit Log, Platform Settings. Add the route to
`CMS_ROUTES` with its permission and group when the module is built; the
sidebar, breadcrumbs and guard follow.

**Documented adjustments to the target labels**

- Learning > **Curriculum** is the existing stage editor. It is not renamed
  "Learning Paths" because it is not that module.
- Publishing > **Review Queue** is the existing `/cms/publishing` page. Its
  tabs already include scheduled and published items, so Scheduled and History
  are not separate destinations yet.
- Overview > **Dashboard** is the existing overview page. The dashboard itself
  is not rebuilt in this phase.
- The Settings group is shown only to the Super admin today (Score Settings).

## 2. Permission-based visibility

- `getAccessibleNavigationGroups(actor)` returns the groups and items for an
  account; a group with no authorised item is omitted. No role names are
  compared anywhere in the shell.
- Direct URLs are still protected by `RequireCmsAccess` and
  `RequireRoutePermission` (unchanged). Staff without access to a section get
  the in-place `AccessDeniedState`; non-staff go to `/403`.
- The sidebar reflects access; it never grants it.
- Profile actions come from the session: name, email, role label, the learner
  preview link only for roles that may preview (`isPreviewRole`), the public
  website, and Log out. A deactivated account has no session, so the shell
  does not render.

| Role (demo account) | Groups |
|---|---|
| Editor (`editor@nff.demo`) | Overview, Content, Learning, Publishing |
| Campaign manager (`campaign@nff.demo`) | Overview, Campaigns |
| Admin (`ops.admin@nff.demo`) | Overview, Content, Learning, Publishing, People, Insights, Campaigns |
| Super admin (`admin@nff.demo`) | All, including Settings |

## 3. Design tokens

Admin-specific tokens live in `src/styles/admin.css`, scoped to
`[data-surface="cms"]`. They extend the existing layers in `nff-tokens.css`;
the public and Practitioner palettes are untouched. The shell also sets
`data-surface="cms"` on `<body>` while mounted so portalled UI is in scope.

| Token | Value | Use |
|---|---|---|
| `--admin-canvas` | `neutral-50` `#F4F5F1` | warm neutral application background |
| `--admin-surface` | `neutral-0` `#FFFFFF` | white working surfaces |
| `--admin-surface-subtle` | `neutral-25` | quiet bands |
| `--admin-border` / `-strong` | `neutral-200` / `-300` | subtle warm grey borders |
| `--admin-text` | `neutral-900` | deep charcoal primary text |
| `--admin-text-muted` | `neutral-600` | secondary text (about 5.9:1 on white) |
| `--admin-primary` | `forest-900` | primary action, active nav text |
| `--admin-nav-active-bg` | `sage-100` | active navigation row |
| `--admin-sidebar-width` | 256px (72px collapsed) | |
| `--admin-topbar-height` | 56px | |
| `--admin-content-max` | 1280px | |
| `--admin-gutter` | 16px, 24px (sm), 32px (lg) | page side padding |

Semantic status colours are the existing `nff-*` success, warning, error and
info tokens. The scope also remaps `--nff-radius-xl` to 12px (so existing
`rounded-xl` cards are 12px), `--nff-color-bg-muted` and surface-sunken to
`neutral-100` (so muted panels stay distinct on the new canvas), and the
metric size to 24px.

## 4. Typography

Outfit throughout. Scale (existing `cms` scope plus `admin.css` roles):

| Role | Class | Size / line |
|---|---|---|
| Page title | `admin-page-title` (h1) | 24 / 32, 600 |
| Section title | `admin-section-title` (h2) | 18 / 26, 600 |
| Card or panel title | `nff-label-lg` | 15 / 20 |
| Body, helper copy | `nff-body-sm` | 14 / 22 |
| Label, nav item | `nff-label-md` | 14 / 20 |
| Nav group heading | `admin-nav-group` | 12 / 16, caps, 600 |
| Table text / header | `nff-data-table` / `nff-data-table-header` | 14 / 20, 12 / 16 |
| Metric | `nff-data-metric` | 24 / 32 |
| Caption, badge | `nff-caption`, `nff-label-sm` | 12 / 16 |

One `h1` per page (the page title). 12px text is for badges and captions,
never for the only copy that carries meaning.

## 5. Spacing, radius, elevation

- Spacing is Tailwind's 4px grid. Page gutters 16/24/32; vertical gap between
  page blocks 24px (`AdminContentContainer`); field gap 16px; compact control
  heights 28/36/44px, table rows 40px (the `data-density="compact"` tokens).
- Radius: controls 8px (`radius-md`), cards and panels 12px, dialogs 16px
  (`--admin-radius-dialog`, applied to centred dialogs; drawers on the screen
  edge stay square), badges 8px (rounded rectangles, not pills).
- Elevation: borders and spacing first. The scope's shadows are
  1px/2px at 5 to 6% opacity; nothing in the shell uses a shadow beyond that.

## 6. Shell (desktop, tablet, mobile)

`components/admin/AdminLayout.tsx` (exported as `CmsLayout` for the router):

- **From 1024px:** sticky sidebar (Meadow logo, grouped nav, account menu at
  the foot) and a 56px top bar with breadcrumbs and the "Prototype · demo
  data" label. The sidebar collapses to icons (`aria-expanded`, names kept as
  `aria-label`); the editors' fixed action bars follow the width through
  `--nff-layout-admin-sidebar`.
- **Below 1024px (tablet and mobile):** the sidebar becomes a drawer opened by
  a 40px menu button; same destinations, 44px rows, closes on selection and on
  Escape, focus returns to the button. The account menu moves to the top bar.
- **Main:** `AdminContentContainer` (max 1280px, gutters above). Pages are not
  wrapped in cards; the page is the surface.
- **Not included, deliberately:** global search and notifications. There is no
  search destination and no notification system, so no entry points exist.
- The document title is `<page> · Meadow Admin`; a skip link targets
  `#admin-main`.
- Breadcrumbs (top bar) come from the registry: group, ancestors, current page
  (`aria-current="page"`). Below 640px only the last two show. Detail routes use
  a generic title ("Exploration") because the registry knows no record names.

## 7. Component inventory (`components/admin`)

| Area | Components | Notes |
|---|---|---|
| Layout | `AdminLayout`, `AdminContentContainer`, `AdminPageHeader`, `AdminBreadcrumbs` | sidebar and top bar are part of `AdminLayout` |
| Navigation | `AdminNavigation`, `AdminNavGroup`, `AdminNavItem`, `AdminProfileMenu` | data from the registry |
| Page structure | `SectionHeader`, `ContentSection`, `PageToolbar`, `FilterBar` | |
| States | `EmptyState`, `ErrorState`, `LoadingState`, `AccessDeniedState` | announced: empty `status`, error `alert`, loading `aria-busy` |
| Feedback | `StatusBadge`, `InlineNotice`, `ConfirmationDialog` | `adminStatus.ts` is the status vocabulary |
| Data | `AdminTable`, `SortableHead`, `TableToolbar`, `AdminPagination` | built on the existing `ui/table` |
| Forms | `FormSection`, `FormField`, `FormActions` | controls are the existing `ui` ones |

Existing CMS code now uses them: `PageHeader` (CmsParts) renders
`AdminPageHeader`; `ContentStatusChip` renders `StatusBadge`; `Pager` renders
`AdminPagination`; CMS pages import the Admin `EmptyState`/`ErrorState`; the
Roles confirmation uses `ConfirmationDialog`; the access-denied route state is
`AccessDeniedState`. The shared `nff` components and the Practitioner and
public components are untouched.

## 8. Standards for pages

- **Header:** `AdminPageHeader` (title, one-line description, `meta` for a
  status badge, `actions` with the primary action first).
- **Tables:** `AdminTable` inside the page (it scrolls inside its own panel,
  never the page); `TableToolbar` above; `SortableHead` for sortable columns;
  `AdminPagination` below; empty and loading states in place of the table.
- **Forms:** `FormSection` groups, `FormField` per control (label, helper,
  error, required marker), `FormActions` at the end (primary first; stacks on
  small screens). Use `Switch` only for a setting that is saved and read.
- **Status:** always `StatusBadge` (word + icon + tone). Statuses: Draft, In
  review, Published, Scheduled, Rejected, Unpublished, Deactivated,
  Unassigned.
- **Data honesty:** `DataSourceBadge` and `DataSourceNotice` (Phase 1) stay the
  way to label demo, simulated and unavailable data.

## 9. Accessibility decisions (WCAG 2.2 AA)

- Landmarks: skip link, `aside` named "Admin sidebar", `nav` "Admin" (and
  "Admin (mobile)" in the drawer), "Breadcrumb", one `main`.
- Navigation: `NavLink` gives `aria-current="page"`; collapsed items keep
  accessible names; group headings are `h2` with `aria-labelledby` sections.
- Focus: the existing `nff-focus-ring` on every control; dialogs and the
  drawer are Radix (focus trap, Escape, focus return) and are covered by tests.
- Targets: nav rows 36px on desktop and 44px in the drawer; icon buttons 32px
  or more (above the 24px minimum).
- Status and notices never rely on colour alone; warnings and errors are
  `role="alert"`, info is `role="status"`.
- Tables: named, with `aria-sort` and a button per sortable header.
- Contrast: audited on the rendered UI in Phase 2.1 (section 12).
- Reduced motion: the shell adds no motion of its own.

## 10. Using this for future modules

1. Add the route to `CMS_ROUTES` (permission, title, group or parent) and the
   page to `app/cmsRoutes.tsx`. The sidebar, breadcrumbs, guard and document
   title follow.
2. Start the page with `AdminPageHeader`; do not add your own container or h1.
3. Compose from `components/admin`; reach for `components/ui` for controls.
4. Do not hard-code colours or radii; use the `--admin-*` tokens or the
   semantic `nff` tokens.
5. Keep page copy honest: label data (`DataSource*`) and say when something is
   not available.

## 11. Known limitations

- Existing CMS pages are placed in the new shell but not redesigned. Many still
  use `rounded-xl`, `rounded-md` and `bg-card` directly (these resolve to the
  Admin values through the scope), their own `Table` markup, and the Phase 1
  copy. They are migrated to the primitives as each module is built.
- The editors keep their fixed bottom action bars.
- Page titles on detail pages are generic in breadcrumbs.
- The shell sets an attribute on `<body>`; it is removed on unmount.
- The dashboard, notifications and search are not built.


## 12. Phase 2.1: validation and accessibility refinement

Decisions applied: unbuilt destinations stay hidden; Dashboard, Curriculum and
Review Queue labels stay; Settings is hidden when no authorised destination
exists (the group already disappears when empty); status badges stay rounded
rectangles.

### 12.1 Full responsive regression

All 20 CMS routes at 1440, 1280, 1024, 768, 390 and 360px: **120 of 120 page
loads, 0 page-level horizontal overflow**, every page rendering one `h1`.
Run as the Super admin in the running app (each route loaded in an iframe of
the target width, scroll width compared with client width).

The full 120-load sweep ran before the last CSS refinements (target sizes,
dialog radius, tab styling). After them, all 20 routes were re-run at 360, 390
and 1024px (60 loads): 0 overflow, one `h1` each. 768, 1280 and 1440px were
not re-run after those last edits.

Intentional internal scrolling (not page overflow): tables scroll inside
their own panel (`ui/table`); tab strips scroll inside their list (Explorations,
Publishing, Delivery, Practitioner detail, Roles). The only "clipped" elements
reported were visually hidden (`sr-only`) text.

Also checked at 360, 390 and 768:
- Invite dialog and confirmation dialog: fit the viewport with 16px margins
  (328px wide at 360); no page overflow while open.
- Review sheet: 270px at 360, 390px max; navigation drawer: 320px; both
  full-height and within the viewport.
- Fixed editor action bars: left edge at the sidebar width from 1024px
  (256px), at 0 below it, right edge at the viewport; no overflow.
- Content preview (device frame) scrolls inside its own container.

Fixed in Admin scope only (`admin.css`): grid children `min-width: 0`;
tab lists `max-width: 100%` with internal scroll.

### 12.2 Contrast and visual-state audit

Method: no automated accessibility tool is installed, and none was added.
The rendered UI was audited with a script that, for every visible text node,
resolves the actual text colour and the composited background of its ancestors
(through a canvas, so `oklch` and `color-mix` values resolve) and computes the
WCAG 2 contrast ratio (4.5:1, or 3:1 for text of 24px or 18.66px bold).
Disabled controls are excluded (exempt). Component boundaries and icons were
computed the same way against their surrounding background. Focus ring colours
were computed from the tokens and checked by tabbing through the real UI.

Coverage: 27 surfaces (20 routes at 1440; the invite dialog, confirmation
dialog, review sheet; the navigation drawer at 390; three routes at 390),
2,233 text nodes. **Result after fixes: 0 text failures.**

Failures found and corrected (Admin scope only):

| Finding | Before | Fix |
|---|---|---|
| Inactive tab text on the tab track | 3.88:1 | text colour `--admin-text-muted` (about 5:1) |
| Selected tab marked only by a 1.07:1 fill change | 1.07:1 | forest 2px underline and semibold (about 10:1) |
| Outline button boundary | 1.37:1 | `--nff-button-outline-border` is neutral-500 in the Admin scope (3.6:1) |
| Audio seek/volume track (shared player, in the editor) | 1.5:1 | neutral-500 track in the Admin scope (3.6:1) |

Checked and passing:
- Text: navigation labels and group headings, active item (forest on sage-100),
  breadcrumbs, page and section titles, form labels, helper text, placeholders
  (5.9:1), status badges, warning and error notices, metric cards, dialogs,
  the drawer and the profile menu.
- Component boundaries (1.4.11): inputs, selects, textareas, checkboxes and
  switches are 3:1 or better. Icons: every visible icon is 3:1 or better
  against its background.
- Focus indicator: a 2px surface-coloured gap plus a 2px `forest-700` ring
  (about 6.1:1 on white, 5.5:1 on the canvas, 5.2:1 on the selected nav row),
  visible on every control tested by keyboard.
- Hover and active states: nav hover is charcoal text on a light neutral; the
  selected state passes as above. Hover and active fills are not relied on to
  identify a component.

Exceptions and notes:
- Ghost and icon-only buttons (sidebar collapse, row action menus, Duplicate,
  Remove, editor toolbar) have no boundary. Text buttons are identified by
  their text; icon buttons by an icon that passes 3:1 and an accessible name.
- Inactive tabs have no boundary; they are identified by text (passes 4.5:1).
- Dialog and sheet text was measured with their enter animation disabled. In
  the embedded browser pane animations are throttled, which left dialogs
  half-transparent and gave false failures; with animation off, the real
  colours were measured.
- Status badge borders are decoration; the badge text and icon carry the
  meaning.

### 12.3 Interaction regression

Verified in the running app and by tests (the shell test file has 32 tests):
sidebar collapse and expansion (icon-only items keep names, `aria-expanded`);
drawer open, close on selection and on Escape, focus returned to the menu
button; profile menu (account details, learner preview only for roles that
may preview, Log out, Escape returns focus); breadcrumb links; active
navigation (`aria-current`, parent stays active on detail routes);
confirmation dialog (Escape cancels, Confirm acts); access-denied state in
place inside the shell.

**Defect found and fixed:** dialogs opened from a button's `onClick` (the
invite dialog, the removal confirmation) dropped focus to the page body when
closed, because they have no Radix trigger. `useReturnFocus` now returns focus
to the opening control, or to the main region if that control is gone; both are
verified in the browser and in a test.

### 12.4 Other changes in this phase

- Dialog radius was 12px because the 16px token was defined as the remapped
  `--nff-radius-xl`. It is now a literal 16px; confirmed on the rendered dialog
  after the change to the token.
- Targets under 24px (WCAG 2.5.8): switches and the audio range inputs get a
  24px hit area; dialog and drawer close buttons get a 32px target; breadcrumb
  and "Back to" links are 24px high.
- Focused controls are not hidden by the sticky top bar or the fixed action
  bar (`scroll-padding`, 2.4.11).
- Page titles now match their navigation labels (Review Queue, Practitioners,
  Team & Roles, Delivery, Score Settings), so the heading, breadcrumb and
  document title agree.

### 12.5 Accessibility limitations

This is an evaluation of the criteria named above, not a conformance claim.
Not evaluated or not fully evaluated:
- No automated accessibility engine and no screen-reader testing (VoiceOver,
  NVDA) were run; names, roles and landmarks were checked from the DOM and in
  tests only.
- Contrast was measured in the default state of each surface. Hover and
  active fills were checked by reasoning from the tokens, not exhaustively
  per component.
- Reduced motion was not tested; the shell adds no motion, but Radix and
  tw-animate enter and exit animations are the library defaults.
- Existing CMS pages were not audited for reading order, heading hierarchy
  below the page title, or error-message association; they are unchanged.
- The Markdown toolbar in the Exploration editor and the content preview are
  existing components and were checked for contrast and size only.
- Touch behaviour was checked at 360 and 390px in an emulated viewport, not on
  a device.
- Several existing controls remain 16px (checkboxes, in labels that act as the
  target) and rely on the spacing exception of WCAG 2.5.8 rather than a 24px
  target.
