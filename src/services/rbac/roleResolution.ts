import { readJson, writeJson } from '@/mocks/api'
import { users } from '@/mocks/db'
import type { AccountStatus, Role } from '@/types'
import { isRoleId, isStaffRole, type StaffRole } from './roles'
import type { StaffSnapshot } from './roleManagement'

/**
 * Turns a stored user record into the role the permission engine sees.
 *
 * Legacy compatibility (the rule, in order):
 * 1. A record whose role is not one we define is treated as `visitor`
 *    (denied everywhere).
 * 2. A legacy `admin` record is an **Admin**, except an account listed in
 *    `BOOTSTRAP_SUPER_ADMIN_IDS`, which is a **Super admin**. That list is
 *    the single, explicit, deterministic bootstrap: the demo's existing
 *    "Super admin" account keeps everything it had, and no other legacy
 *    record is promoted.
 * 3. A validated role assignment (made through `changeMemberRole`) replaces
 *    the above for staff accounts.
 * 4. Removing a staff member **deactivates** the account (Phase 1.1): the role
 *    is kept, the account cannot sign in. Ids in the Phase 1 removed-staff key
 *    are read as deactivated for compatibility.
 *
 * The old `nff.cms.member-roles` key (written by the previous Roles page,
 * never read by anything) is deliberately ignored: it never took effect, so
 * honouring it now would silently change who has access.
 *
 * Everything here reads browser storage, which anyone with the browser can
 * edit. It defines prototype behaviour; it is not a security boundary.
 */

export const BOOTSTRAP_SUPER_ADMIN_IDS: readonly string[] = ['u-admin']

export const ROLE_ASSIGNMENTS_KEY = 'nff.rbac.role-assignments.v1'
/** Phase 1 key. Only read now: its ids count as deactivated. */
export const REMOVED_STAFF_KEY = 'nff.rbac.removed-staff.v1'
export const USER_STATUS_KEY = 'nff.cms.user-status'

export interface RoleAssignment {
  role: StaffRole
  /** The actor who made the change. */
  by: string
  at: string
}

export interface UserLike {
  id: string
  email?: string
  role: unknown
  status?: AccountStatus
}

export function legacyRole(user: UserLike): Role {
  if (!isRoleId(user.role)) return 'visitor'
  if (user.role === 'admin' && BOOTSTRAP_SUPER_ADMIN_IDS.includes(user.id)) return 'super_admin'
  return user.role
}

export function readRoleAssignments(): Record<string, RoleAssignment> {
  const stored = readJson<unknown>(ROLE_ASSIGNMENTS_KEY, {})
  if (typeof stored !== 'object' || stored === null) return {}
  const valid: Record<string, RoleAssignment> = {}
  for (const [id, entry] of Object.entries(stored)) {
    const candidate = entry as Partial<RoleAssignment> | null
    if (candidate && isStaffRole(candidate.role) && typeof candidate.by === 'string') {
      valid[id] = { role: candidate.role, by: candidate.by, at: String(candidate.at ?? '') }
    }
  }
  return valid
}

export function writeRoleAssignment(userId: string, assignment: RoleAssignment) {
  writeJson(ROLE_ASSIGNMENTS_KEY, { ...readRoleAssignments(), [userId]: assignment })
}

export function readRemovedStaff(): string[] {
  const stored = readJson<unknown>(REMOVED_STAFF_KEY, [])
  return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []
}

/** The role used for every permission decision about this user. */
export function effectiveRole(user: UserLike): Role {
  const base = legacyRole(user)
  if (!isStaffRole(base)) return base
  return readRoleAssignments()[user.id]?.role ?? base
}

export function effectiveStatus(user: UserLike): AccountStatus {
  const override = readJson<Record<string, AccountStatus>>(USER_STATUS_KEY, {})[user.id]
  if (override) return override
  if (readRemovedStaff().includes(user.id)) return 'deactivated'
  return user.status ?? 'active'
}

const isClosed = (status: AccountStatus) => status === 'deactivated' || status === 'pending_deletion'

/** Staff as the safeguards see them: who they are now, and whether they can sign in. */
export function staffSnapshot(): StaffSnapshot[] {
  return users
    .filter((user) => isStaffRole(legacyRole(user)))
    .map((user) => ({
      id: user.id,
      role: effectiveRole(user),
      active: !isClosed(effectiveStatus(user)),
    }))
}

export interface StaffMember {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  lastActiveAt: string
}

/** Every staff member, including deactivated ones (`active: false`). */
export function listStaffMembers(): StaffMember[] {
  return users
    .filter((user) => isStaffRole(legacyRole(user)))
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: effectiveRole(user),
      active: !isClosed(effectiveStatus(user)),
      lastActiveAt: user.lastActiveAt,
    }))
}
