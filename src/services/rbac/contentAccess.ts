import { can, toActor } from './authorize'

/**
 * Who may open and change a content record. Pure.
 *
 * Ownership is real account ids only, never display names:
 * - `createdBy` is set once, when a record is created in the CMS, and never changes.
 * - `ownerId` is explicit and is changed only by someone with
 *   `content.ownership.manage`.
 * - `collaboratorIds` are explicit.
 * - Legacy seeded records have none of these: they are **unassigned**.
 *
 * Reviewers (`content.review`: Admin and Super admin) can access everything,
 * including unassigned records. Anyone else with `content.view` (Editors) can
 * access only records they own or were explicitly added to.
 */

export interface OwnedContent {
  createdBy?: string
  ownerId?: string
  collaboratorIds?: string[]
}

export type OwnershipState = 'owned' | 'unassigned'

export const ownershipState = (item: OwnedContent): OwnershipState =>
  item.ownerId ? 'owned' : 'unassigned'

export function canAccessContent(actorInput: unknown, item: OwnedContent): boolean {
  const actor = toActor(actorInput)
  if (!actor || !can(actor, 'content.view')) return false
  if (can(actor, 'content.review')) return true
  return item.ownerId === actor.id || item.collaboratorIds?.includes(actor.id) === true
}
