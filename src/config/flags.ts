/**
 * Feature flags for open questions in docs/screens.md.
 * Defaults follow the spec; flip here during a demo.
 */
export const FLAGS = {
  /** Home tabs appear as global navigation and on the home page. */
  homeTabsInGlobalNav: true,
  /** Visitors see an excerpt and a sign-up gate for full explorations. */
  visitorFullExplorations: false,
  /** 'button' shows a Mark as complete control; 'scroll' completes at the end. */
  completionMode: 'button' as 'button' | 'scroll',
  /** Editors can publish without admin review. */
  editorCanPublish: false,
  /** Catalogue search, filter and sort controls. */
  catalogueSearch: false,
  /** Free previews filter on the meditations catalogue. */
  meditationPreviewFilter: true,
  /** Meditation transcripts. */
  transcripts: false,
  /** Deletion grace period in days. */
  deletionGraceDays: 14,
  /** Recipient-level campaign detail is masked for campaign managers. */
  recipientDetailMasked: true,
} as const
