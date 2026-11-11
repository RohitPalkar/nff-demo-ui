/**
 * Feature flags for open questions in docs/screens.md.
 * Defaults follow the spec; flip here during a demo.
 */
export const FLAGS = {
  /** Home tabs also appear in the global nav. Off since Phase 02: the nav links
   *  categories to the catalogue; home tabs stay on the home page. Not read by Header. */
  homeTabsInGlobalNav: false,
  /** Visitors see an excerpt and a sign-up gate for full explorations. */
  visitorFullExplorations: false,
  /** 'button' shows a Mark as complete control; 'scroll' completes at the end. */
  completionMode: 'button' as 'button' | 'scroll',
  /** Superseded by the permission registry (services/rbac): editors cannot publish. Not read. */
  editorCanPublish: false,
  /** Catalogue search, filter and sort controls. */
  catalogueSearch: false,
  /** Free previews filter on the meditations catalogue. */
  meditationPreviewFilter: true,
  /** Meditation transcripts. */
  transcripts: false,
  /** Deletion grace period in days. */
  deletionGraceDays: 14,
  /** Superseded by the `campaigns.recipients.view` permission. Not read. */
  recipientDetailMasked: true,
} as const
