import type { Permission } from './permissions'

/**
 * The content lifecycle as a transition table: which permissions a status
 * change needs. Pure. `setCmsStatus` and `saveCmsItem` both ask it, so a
 * status cannot be changed by any route that skips the check.
 *
 *   draft ──submit──► in_review ──approve+publish──► published ──unpublish──► unpublished
 *   rejected ──submit──► in_review ──reject──► rejected      in_review ──approve+schedule──► scheduled
 *
 * Returns the permissions required, `[]` for no change, or `null` when the
 * transition is not allowed at all (for example rejecting something that is
 * not in review).
 */

export type WorkflowStatus =
  | 'draft'
  | 'in_review'
  | 'scheduled'
  | 'published'
  | 'unpublished'
  | 'rejected'

export function transitionPermissions(from: WorkflowStatus, to: WorkflowStatus): Permission[] | null {
  if (from === to) return []
  const fromReview = from === 'in_review'
  switch (to) {
    case 'draft':
      // Reverting live content to a draft takes it offline: same authority as unpublishing.
      return from === 'published' || from === 'scheduled' ? ['content.unpublish'] : ['content.edit']
    case 'in_review':
      // Live content is never moved to review (that would pull it offline). Edits to
      // live content are revisions: see `submitRevision` in services/cms.ts.
      return from === 'published' || from === 'scheduled' ? null : ['content.submit']
    case 'published':
      return fromReview
        ? ['content.review', 'content.approve', 'content.publish']
        : ['content.publish']
    case 'scheduled':
      return fromReview
        ? ['content.review', 'content.approve', 'content.schedule']
        : ['content.schedule']
    case 'rejected':
      return fromReview ? ['content.review', 'content.reject'] : null
    case 'unpublished':
      return from === 'published' || from === 'scheduled' ? ['content.unpublish'] : null
    default:
      return null
  }
}
