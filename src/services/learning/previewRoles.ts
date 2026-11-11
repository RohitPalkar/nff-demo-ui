import { userById } from '@/mocks/db'
import type { Role } from '@/types'

/** Roles that may preview the learner area. They are not practitioners. */
export const STAFF_PREVIEW_ROLES: readonly Role[] = ['editor', 'admin', 'super_admin']

export const isPreviewRole = (role: Role | undefined) =>
  role !== undefined && STAFF_PREVIEW_ROLES.includes(role)

/**
 * True when this user id belongs to a staff identity. Staff preview the
 * learner area read-only, so progress, activity, enrolment and assignment
 * writes are skipped for them at the service layer, whatever the UI does.
 */
export const isPreviewIdentity = (userId: string) =>
  isPreviewRole(userById.get(userId)?.role)
