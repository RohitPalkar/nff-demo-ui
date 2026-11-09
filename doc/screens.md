# NFF — Screen specifications (source of truth for the build)

Source: SOW + Product Discovery Blueprint v0.1 · NFF Features by Persona & Screen Structure (9 Nov 2026).
40 page templates (24 P0, 16 P1). Feature IDs (WEB-, IDN-, PRC-, PLY-, EML-, PRV-, CMS-, MED-, ANA-, SEC-) trace to the blueprint.
Each screen lists its regions top to bottom, then the states it must support. "If approved" items are behind a feature flag in `src/config/flags.ts` (default off).

## Personas and roles
| Persona | Portal | Can do |
| --- | --- | --- |
| P-01 Visitor | Public web | Browse public pages and catalogue, play free preview tracks (~1 hour total), manage cookie consent, sign up |
| P-02 Practitioner | Public web (signed in) | Full explorations and meditations, staged curriculum with unlocks, resume playback on any device, progress dashboard, email preferences, export data, delete account |
| P-03 Content editor | CMS | Create/edit explorations, upload meditations + artwork, monitor transcoding, arrange curriculum, draft → review → publish |
| P-04 Campaign manager | CMS | Configure, trigger, pause and monitor the daily email; manage templates; delivery, bounce and complaint reports |
| P-05 Super admin | CMS | Visitor and engagement dashboards, user management, engagement-score weights, roles and permissions; inherits editor + campaign access |

## Shells
- **Public shell:** header (logo, Home, Foundations, Understand, Contemplate, Explore, About, Log in, Sign up; mobile = menu Sheet) + footer (About links, Cookie preferences, Privacy, Terms, Contact). Cookie banner overlays the first visit.
- **Practitioner shell:** header (logo, Journey, My Journey, Explore, account menu: Profile, Email preferences, Privacy, Theme, Log out). Persistent mini player docked at the bottom while audio plays (shadow-nff-player); it must never cover keyboard focus.
- **Auth shell:** centred card on a calm background, logo above.
- **CMS shell (data-density="compact"):** left Sidebar 264px (collapsible to 72px), filtered by role; top bar (breadcrumb, environment label "Demo data", notifications, user menu with theme + role switcher in dev); content area.
  - Editor sidebar: Overview, Explorations, Meditations, Curriculum, Publishing.
  - Campaign sidebar: Overview, Campaigns, Templates, Delivery reports.
  - Admin sidebar: everything + Users, Analytics (Visitors, Engagement), Score settings, Roles.
  - List template: page header (title + primary action) › filter bar › data table › pagination.
  - Editor template: header with status chip › main form/canvas › right metadata panel › sticky Save/Publish bar.

## Routes
| Screen | Route |
| --- | --- |
| S-WEB-01 Home | `/` |
| S-WEB-02 About | `/about/:slug` (who-we-are, what-we-do, how-we-do-it) |
| S-WEB-03 Explorations catalogue | `/explorations?tab=` |
| S-WEB-04 Exploration detail | `/explorations/:slug` |
| S-WEB-05 Meditations catalogue | `/meditations?tab=` |
| S-WEB-06 Meditation detail + preview | `/meditations/:slug` |
| S-WEB-07 Cookie preferences | banner + `/cookie-preferences` panel |
| S-IDN-01..04 | `/signup`, `/verify-email`, `/login`, `/forgot-password`, `/reset-password` |
| S-PRC-01 Journey | `/journey` |
| S-PRC-02 Stage detail | `/journey/stages/:stageId` |
| S-PRC-03 Exploration reader | `/journey/stages/:stageId/read/:contentId` |
| S-PRC-04 Full player | `/journey/stages/:stageId/listen/:contentId` (+ global mini player) |
| S-PRC-05 My Journey | `/my-journey` |
| S-PRC-06..09 | `/account/profile`, `/account/email`, `/account/privacy` (export + delete), `/unsubscribe/:token` |
| S-CMS-01 | `/cms` |
| S-CMS-02 / 03 | `/cms/explorations`, `/cms/explorations/:id` (`new`) |
| S-CMS-04 / 05 | `/cms/meditations`, `/cms/meditations/:id` (`new`) |
| S-CMS-06 / 07 | `/cms/curriculum`, `/cms/curriculum/stages/:stageId` |
| S-CMS-08 / 09 | `/cms/publishing`, `/cms/preview/:type/:id` |
| S-CMS-10..14 | `/cms/campaigns`, `/cms/campaigns/:id`, `/cms/templates`, `/cms/templates/:id`, `/cms/delivery` |
| S-CMS-15..20 | `/cms/users`, `/cms/users/:id`, `/cms/analytics/visitors`, `/cms/analytics/engagement`, `/cms/settings/score`, `/cms/roles` |
| Errors | `/403`, `*` (404), error boundary (500), offline banner |

---

## Public web (Visitor; practitioners see the same pages with their state)

### S-WEB-01 Home · P0 · WEB-01
1. Header.
2. Hero: headline, one-line mission, primary CTA "Start a free meditation", secondary "How it works".
3. Mission introduction: short paragraph + link to About.
4. Four content tabs: Foundations, Understand (two sub-tabs), Contemplate, Explore; each shows 3–4 essay and audio cards.
5. Featured content: CMS-managed row of exploration and meditation cards.
6. How the journey works: 3 steps (preview free, sign up, follow stages).
7. Sign-up band: benefits (full library, progress, daily email) + CTA.
8. Footer.
States: loading skeleton, no featured content (section hidden), content error.

### S-WEB-02 About template · P0 · WEB-02
1. Header. 2. Breadcrumb + page title. 3. About sub-navigation (3 tabs or side links). 4. Editorial body at 720px reading width (NFF copy + images). 5. Next topic + CTA to catalogue. 6. Footer.
States: long content, missing image, 404.

### S-WEB-03 Explorations catalogue · P0 · WEB-04
1. Header. 2. Page intro (title + one line). 3. Category tabs. 4. Toolbar: result count; search/filter/sort only if approved. 5. Card grid: image, title, excerpt, stage tag, reading time; lock icon for practitioners on content in locked stages. 6. Pagination or Load more. 7. Footer.
States: loading, empty, error, no results.

### S-WEB-04 Exploration detail · P0 · WEB-04
1. Header + breadcrumb. 2. Lesson header: category, title, stage tag, reading time. 3. Hero image. 4. Body: full lesson for practitioners; intro excerpt + gate for visitors (rule TBC; flag `visitorFullExplorations`). 5. Access gate (visitor): "Sign up free to read the full lesson" + Sign up / Log in. 6. Related content (3 cards). 7. Footer.
States: loading, unpublished, missing content, access-gated.

### S-WEB-05 Meditations catalogue · P0 · WEB-05
1. Header. 2. Page intro. 3. Category tabs + optional "Free previews" filter. 4. Track grid: square artwork, title, duration, stage tag, "Preview" badge on free tracks, play button on previews. 5. Pagination. 6. Footer + mini player when playing.
States: loading, empty, track unavailable.

### S-WEB-06 Meditation detail + preview player · P0 · WEB-06, PLY-03
1. Header + breadcrumb. 2. Track hero: artwork (320px), title, duration, stage, Preview badge. 3. Player: play/pause, seek bar, elapsed/remaining, volume. 4. Description; transcript link if approved. 5. Preview notice: how the free preview works + sign-up CTA. 6. More from this stage (track cards). 7. Footer.
Non-preview track for a visitor: artwork + description + sign-up gate instead of player.
States: loading, buffering, ended (sign-up prompt), network error, preview not available.

### S-WEB-07 Cookie preferences · P0 · WEB-03, PRV-01
Banner (first visit) + preferences panel (Dialog on desktop, Drawer on mobile).
1. Banner: short explanation; Accept all, Reject non-essential, Customise. 2. Panel header + cookie policy link. 3. Categories: Essential (always on), Analytics (GA4), each with Switch + description. 4. Actions: Save choices, Accept all, Reject all.
Store choice + timestamp + policy version (consent ledger mock). Analytics scripts only "load" after consent (log to console in demo).
States: first visit, saved toast, updated, save error.

## Identity (Visitor)

### S-IDN-01 Sign up · P0 · IDN-01
1. Logo + "Create your free account" + benefits line. 2. Form: name, email, password (strength rules, show/hide), terms & privacy checkbox. 3. Create account. 4. "Already have an account? Log in".
States: field errors, submitting, email already registered, success → verify.

### S-IDN-02 Verify email · P0 · IDN-01
1. Illustration + "Check your inbox". 2. Message with the address. 3. Code input (Input OTP, 6 digits; demo code 123456). 4. Resend (60 s cooldown), Change email, Back to log in.
States: pending, expired, verified (→ /journey), resend limit reached.

### S-IDN-03 Log in · P0 · IDN-01
1. Logo + "Welcome back". 2. Email, password (show/hide), Forgot password link. 3. Log in (returns to the page the user came from). 4. Sign up link.
States: invalid credentials, too many attempts (locked), unverified account, success.

### S-IDN-04 Forgot / reset password · P0 · IDN-01
1. Request: email + Send reset link (same response whether or not the email exists). 2. Reset: code, new password, confirm, Save. 3. Back to log in.
States: email sent, expired code, password rules not met, success.

## Practitioner workspace

### S-PRC-01 Curriculum journey · P0 · PRC-02 (post-login home)
1. Shell header. 2. Greeting + Continue card: "Continue Stage 2 · Lesson 3", progress %, Resume (opens last item at saved position). 3. Journey overview: overall progress bar + stages completed / total. 4. Stage timeline: vertical list; each stage number, title, short description, item count, status (Completed, In progress, Available, Locked). 5. Locked-stage reason inline ("Complete Stage 2 to unlock"). 6. Mini player when active.
Unlock rule: next stage opens when all items in the previous stage are complete.
States: loading, no curriculum published, all completed, sync issue (progress not saved).

### S-PRC-02 Stage detail · P0 · PRC-02
1. Breadcrumb Journey › Stage 2. 2. Stage header: number, title, intro, progress (3 of 7 complete). 3. Content sequence: ordered rows mixing explorations (reading time) and meditations (artwork, duration); status (not started, in progress, completed) + Open / Play. 4. Prerequisite note if locked. 5. Next stage preview card (locked/unlocked).
States: locked, empty stage, item unavailable, stage completed (celebration banner + Next stage CTA).

### S-PRC-03 Exploration reader · P0 · PRC-03
1. Reader top bar: back to stage, lesson x of y, reading progress bar. 2. Lesson header: title, stage tag, reading time. 3. Body: rich text + images with captions, 720px, Literata (nff-reading-body). 4. Completion block: "Mark as complete" OR auto-complete at end (flag `completionMode`: 'button' | 'scroll'), then confirmation. 5. Previous / Next.
States: loading, content error, incomplete, completed.

### S-PRC-04 Full audio player · P0 · PLY-01..03
Full-screen player; a mini player persists across pages.
1. Top bar: minimise, stage context, more menu (transcript if approved). 2. Large square artwork. 3. Title, stage, duration. 4. Seek bar with elapsed/remaining + resume marker. 5. Controls: back 15 s, play/pause, forward 15 s, speed (0.75×, 1×, 1.25×, 1.5×). 6. Resume prompt "Resume from 12:40?" (Resume / Start over). 7. Up next.
Save position every 15 s; completion at ≥ 95%. Media Session API for lock-screen controls.
States: buffering, reconnecting, token expired (re-auth), blocked (not entitled), ended (marked complete → Next), playback error.

### S-PRC-05 My Journey dashboard · P1 · PRC-04
1. Title + date range (Week, Month, All). 2. Metric cards: minutes listened, items completed, current streak, stages completed. 3. Progress by stage (bar per stage). 4. Listening activity (weekly minutes chart). 5. Recently completed (with dates). 6. Continue CTA.
States: no activity (onboarding prompt), loading, partial data ("updated nightly"), error.

### S-PRC-06 Profile and preferences · P1 · PRC-01
1. Account settings layout: tabs Profile, Email, Privacy. 2. Profile: display name, email (read-only), time zone combobox ("Your daily email arrives at 7:00 in this time zone"). 3. Curriculum preferences (fields TBC; placeholder group). 4. Sticky Save / Cancel.
States: loading, field errors, saved toast, save error.

### S-PRC-07 Email preferences · P0 · EML-01
1. Email tab. 2. Daily email master toggle + delivery time. 3. Toggle per email type with description. 4. Unsubscribe from all (confirm). 5. Note "Changes apply from tonight's send".
Plus one-click unsubscribe landing page `/unsubscribe/:token` (works signed out).
States: saved, unsubscribed, pending nightly job, error.

### S-PRC-08 Export my data · P1 · PRV-02
1. Privacy tab. 2. What the export contains (profile, progress, events) + format (JSON). 3. Request export. 4. Status card: Pending, Ready (Download, expires date), Expired, Failed (Retry).
Demo: request → pending 5 s → ready; download a real JSON of mock data.

### S-PRC-09 Delete account · P0 · PRV-03
1. Privacy tab danger zone. 2. Consequences (account, progress, email data erased) + grace period (default 14 days, TBC). 3. Confirm: type DELETE + acknowledgement checkbox. 4. Delete account (destructive, Alert Dialog). 5. Pending deletion banner across the app with date + Cancel deletion.
States: confirm, pending, cancelled, completed (signed out + confirmation page), failure.

## CMS — content (Editor, Admin)

### S-CMS-01 Admin landing · P1 · SEC-01
1. "Good morning, {name}" + role label. 2. Alerts strip (transcode failures, campaign paused, items awaiting review). 3. Role summary cards — Editor: drafts, in review, processing; Campaign: next send, last-send delivery rate; Admin: active users, engagement trend. 4. My tasks table. 5. Recent activity.
States: role-specific, loading, no tasks.

### S-CMS-02 Explorations list · P0 · CMS-01, CMS-04
1. Header + "New exploration". 2. Status tabs: All, Draft, In review, Published, Scheduled. 3. Filter bar: search, stage, category. 4. Data table: title, category, stage, status chip, owner, updated, row menu (Edit, Preview, Duplicate, Unpublish). 5. Pagination.
States: empty (first-run CTA), loading, error, no results.

### S-CMS-03 Exploration editor · P0 · CMS-01
1. Header: back, title, status chip, "Saved 2 min ago", Preview, Submit for review / Publish. 2. Canvas: title, rich-text toolbar (H2, H3, bold, italic, lists, link, quote), body, image blocks with alt text + caption (use Tiptap). 3. Right panel: slug, category, stage, excerpt, featured image, SEO title/description, featured-on-home switch. 4. History Sheet: versions with author + time, Restore.
Autosave every 10 s to mock.
States: unsaved changes (leave dialog), validation errors, image uploading, save conflict.

### S-CMS-04 Meditations list · P0 · CMS-02, MED-01
1. Header + "Upload meditation". 2. Processing summary: Ready / Processing / Failed counts. 3. Filters: search, stage, preview flag, transcode status, publish status. 4. Table: artwork thumb, title, stage, duration, Preview badge, transcode chip (Uploading, Validating, Transcoding, Ready, Failed), publish chip, updated, row menu.
States: empty, processing, failed (Retry), ready.

### S-CMS-05 Meditation editor + upload · P0 · CMS-02, MED-01
1. Header: title, status chips, Preview, Publish. 2. Audio drop zone (MP3) + progress + stepper: Uploaded › Validating › Transcoding 64/128/256 › Published to CDN (simulated timings). 3. Artwork upload with square crop preview. 4. Metadata: title, description, stage, category, duration (auto), "Free preview track" switch, transcript (flag). 5. Audio preview player when Ready.
States: uploading, validating, transcoding, ready, failed with reason + Retry.

### S-CMS-06 Curriculum manager · P0 · CMS-03
1. Header + Add stage + Save order. 2. Stage list: drag handle (dnd-kit), number, title, item count, status, Edit; keyboard reorder with up/down buttons. 3. Impact warning when reordering a live stage. 4. Unsaved-order bar (Save, Discard).
States: empty curriculum, unsaved order, dependency warning.

### S-CMS-07 Stage sequence editor · P0 · CMS-03, PRC-02
1. Breadcrumb Curriculum › Stage 2. 2. Stage details: title, intro, unlock rule summary. 3. Sequence list: type icon, title, duration, Required switch (flag), Remove; reorderable. 4. Add content: Sheet with Command search across explorations + meditations. 5. Save bar.
States: missing content, duplicate item, published-stage warning.

### S-CMS-08 Publish workflow queue · P0 · CMS-04, SEC-01
1. Header "Publishing". 2. Tabs: Awaiting review, Scheduled, Recently published, Rejected. 3. Table: item, type, submitted by, date, checks (artwork, audio ready, metadata), actions. 4. Review Sheet: change summary, checklist, comment, Approve / Reject / Publish now / Schedule (date-time).
Who can publish is a flag (`editorCanPublish`, default false → editor submits, admin approves).
States: empty queue, permission denied, validation block.

### S-CMS-09 Content preview · P1 · CMS-01..04
1. Toolbar: Desktop/Tablet/Mobile, Visitor/Practitioner view, Back to edit, Approve/Publish. 2. Rendered page in a device frame (reuse the real public components). 3. Stage placement note.
States: missing asset, unpublished banner.

## CMS — campaigns (Campaign manager, Admin)

### S-CMS-10 Campaign dashboard · P1 · CMS-05
1. Header + New campaign. 2. Daily campaign status card: Running/Paused/Scheduled, next send, eligible audience, Pause/Resume (confirm). 3. Last send: sent, delivered, bounced, complained, failed (dead-letter). 4. Campaign table: name, state, schedule, audience, last run, actions.
States: no campaigns, queued, paused, send failure alert.

### S-CMS-11 Campaign setup + schedule · P1 · CMS-05, EML-02
Stepper: 1. Details (name, description). 2. Audience: eligibility rule summary, live eligible count, excluded (unsubscribed, suppressed). 3. Template + stage/activity variant preview. 4. Schedule: nightly at local hour per user time zone, or trigger now. 5. Review + Send test → Schedule / Trigger (confirm).
States: validation, empty audience, schedule conflict, test sent.

### S-CMS-12 Email templates list · P1 · CMS-05
1. Header + New template. 2. Table: name, variant count, stages covered, status, updated, row menu (Edit, Duplicate).
States: empty, loading, error.

### S-CMS-13 Email template editor · P1 · CMS-05, EML-02
1. Header: name, status, Send test, Save. 2. Left block editor: subject, preheader, blocks (greeting, today's content, stage message, CTA, footer with unsubscribe), merge fields {first_name}, {today_item}, {stage_name}. 3. Variant switcher by stage + activity. 4. Right live preview at desktop/mobile email widths with sample-user data.
States: validation, missing variable, render issue.

### S-CMS-14 Delivery reports · P1 · EML-03
1. Filters: date range, campaign, status. 2. Metric cards: sent, delivered %, bounce %, complaint %, suppressed. 3. Trend chart (daily sends + failures). 4. Tabs: Sends, Bounces, Complaints, Suppression list (recipient masked unless permitted, type, reason, date).
States: no data, delayed feedback notice, provider outage.

## CMS — administration (Super admin)

### S-CMS-15 User directory · P1 · CMS-06
1. Header + total. 2. Filters: search name/email, status, current stage, engagement band. 3. Table: name, email, status (Active, Unverified, Deactivated, Pending deletion), current stage, last active, engagement score, row menu.
States: empty, loading, error, no results.

### S-CMS-16 User detail · P1 · CMS-06
1. Header: name, email, status chip, Deactivate/Reactivate (confirm). 2. Summary cards: joined, last active, minutes listened, engagement score. 3. Tabs: Profile, Progress (stages + items), Email history, Consent & privacy requests.
States: pending deletion, missing activity, permission denied.

### S-CMS-17 Visitor dashboard · P1 · CMS-07
1. Date range + label "Source: GA4, consented visitors only". 2. Metric cards: page views, preview plays, avg session duration, sign-ups from preview. 3. Trend chart. 4. Tables: top pages, top preview tracks, referral paths.
States: GA4 unavailable, consent-limited note, no data.

### S-CMS-18 Engagement dashboard · P1 · CMS-08, ANA-01..03
1. Filters: date range, segment (stage, sign-up cohort). 2. Metric cards: active practitioners, completions, repeat plays, avg logins/week, avg engagement score. 3. Charts: score distribution, completions by stage (funnel), weekly activity. 4. Top content table. 5. Freshness label "Rolled up nightly · scores weekly".
States: no data, partial roll-up, calculation delayed.

### S-CMS-19 Engagement-score settings · P1 · CMS-08, ANA-03
1. Header + Save. 2. Five Slider + number inputs: login recency 20, minutes listened 25, completion 25, progression 20, email 10. 3. Total meter (must equal 100; Save disabled otherwise). 4. Impact preview (flag). 5. Change log.
States: total ≠ 100, no data, permission denied, save confirmation.

### S-CMS-20 Roles and permissions · P1 · SEC-01
1. Tabs: Team members, Roles. 2. Members table: name, email, role, last login, Change role, Remove; Invite member. 3. Role matrix: roles × capabilities (read-only for now). 4. Confirm dialog for high-impact changes.
States: conflict, last-admin safeguard, permission denied.

## Role × capability matrix
| Capability | Visitor | Practitioner | Editor | Campaign | Admin |
| --- | --- | --- | --- | --- | --- |
| Public pages / catalogue | View | View | View | View | View |
| Preview playback | Yes | Yes | Yes | — | Yes |
| Full content + curriculum | — | Own | Manage | — | Oversee |
| Create/edit content, upload media | — | — | Yes | — | Yes |
| Publish | — | — | Flag | — | Yes |
| Campaigns, templates, delivery | — | — | — | Yes | Yes |
| Users, dashboards, score, roles | — | — | — | — | Yes |

## Shared overlays and system states (components, not screens)
Mini player · Cookie banner/panel · Sign-up gate modal · Destructive confirm (Alert Dialog) · Leave-with-unsaved-changes · Toast (sonner) · Inline alert/banner (info, success, warning, error) · Empty state · Loading skeleton · Error pages (404, 403, 500, offline) · Session expired modal.

## Custom NFF components (compositions of shadcn parts)
ContentCard (exploration | meditation; Preview + Locked badges) · AudioPlayer (preview | full | mini) · StageTimelineItem (completed | in-progress | available | locked) · SequenceRow · ContinueCard · ReaderBody · StatusChip (publish, transcode, campaign, account; icon + label) · UploadStepper · MetricCard (value, trend, freshness label) · EmailBlockEditor + EmailPreview · ScoreWeightsPanel.

## Open questions (build with flags/defaults; do not block)
Home tabs as global nav or home-only (default: both) · Visitor full explorations (default: excerpt + gate) · Completion rule (default: button) · Editor can publish (default: no) · Catalogue search/filter (default: off) · Curriculum preferences (placeholder) · Deletion grace period (default 14 days) · Recipient-level detail for campaign role (default: masked) · Transcripts (default: off) · Product name spelling (constant).
