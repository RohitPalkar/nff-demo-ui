import type { Role } from '@/types'
import { ForbiddenError, can, toActor } from './authorize'
import { ROLE_DEFINITIONS, isStaffRole, type StaffRole } from './roles'

/**
 * The rules for changing who has which role, as pure functions. Storage and
 * UI call these; nothing here reads either. The safety invariants live here
 * so they apply to every caller and are tested in isolation:
 *
 * 1. Only the roles an actor may assign (`assignableRoles`) can be granted
 *    or taken away. An Admin can therefore never touch an Admin or a
 *    Super admin, and can never grant either.
 * 2. Nobody promotes themselves.
 * 3. The last active Super admin cannot be demoted, removed or deactivated.
 * 4. Nobody removes their own access.
 */

export interface StaffSnapshot {
  id: string
  role: Role
  /** Whether the account can sign in. */
  active: boolean
}

export type RoleChangeDenial =
  | 'not_permitted'
  | 'unknown_role'
  | 'target_not_staff'
  | 'target_protected'
  | 'role_not_assignable'
  | 'self_promotion'
  | 'self_removal'
  | 'last_super_admin'

export type Evaluation = { ok: true } | { ok: false; reason: RoleChangeDenial; message: string }

const deny = (reason: RoleChangeDenial, message: string): Evaluation => ({ ok: false, reason, message })

const MESSAGES: Record<RoleChangeDenial, string> = {
  not_permitted: 'You do not have permission to manage team roles.',
  unknown_role: 'That is not a role you can assign.',
  target_not_staff: 'That person is not a staff member.',
  target_protected: 'You cannot change the role of someone at or above your own level.',
  role_not_assignable: 'You cannot grant that role.',
  self_promotion: 'You cannot raise your own role.',
  self_removal: 'You cannot remove your own access.',
  last_super_admin: 'There must always be at least one active Super admin.',
}

const fail = (reason: RoleChangeDenial) => deny(reason, MESSAGES[reason])

const otherActiveSuperAdmins = (staff: readonly StaffSnapshot[], excludeId: string) =>
  staff.filter((member) => member.role === 'super_admin' && member.active && member.id !== excludeId).length

/** Would losing this member's Super admin standing leave nobody? */
function wouldOrphanSuperAdmin(target: StaffSnapshot, staff: readonly StaffSnapshot[]) {
  return target.role === 'super_admin' && target.active && otherActiveSuperAdmins(staff, target.id) === 0
}

export function evaluateRoleChange(
  actorInput: unknown,
  targetId: string,
  newRole: unknown,
  staff: readonly StaffSnapshot[],
): Evaluation {
  const actor = toActor(actorInput)
  if (!actor || !can(actor, 'team.roles.assign')) return fail('not_permitted')
  if (!isStaffRole(newRole)) return fail('unknown_role')

  const target = staff.find((member) => member.id === targetId)
  if (!target || !isStaffRole(target.role)) return fail('target_not_staff')

  const assignable: readonly StaffRole[] = ROLE_DEFINITIONS[actor.role].assignableRoles
  if (!assignable.includes(target.role)) return fail('target_protected')
  if (!assignable.includes(newRole)) return fail('role_not_assignable')

  if (target.id === actor.id && ROLE_DEFINITIONS[newRole].rank > ROLE_DEFINITIONS[target.role].rank) {
    return fail('self_promotion')
  }
  if (newRole !== 'super_admin' && wouldOrphanSuperAdmin(target, staff)) return fail('last_super_admin')
  return { ok: true }
}

/** Removing staff access, or deactivating a staff account. */
export function evaluateRemoval(
  actorInput: unknown,
  targetId: string,
  staff: readonly StaffSnapshot[],
): Evaluation {
  const actor = toActor(actorInput)
  if (!actor || !can(actor, 'team.remove')) return fail('not_permitted')

  const target = staff.find((member) => member.id === targetId)
  if (!target || !isStaffRole(target.role)) return fail('target_not_staff')
  if (target.id === actor.id) return fail('self_removal')
  if (!ROLE_DEFINITIONS[actor.role].assignableRoles.includes(target.role)) return fail('target_protected')
  if (wouldOrphanSuperAdmin(target, staff)) return fail('last_super_admin')
  return { ok: true }
}

/** The roles the actor may offer in a role picker. Empty without the permission. */
export function assignableRolesFor(actorInput: unknown): readonly StaffRole[] {
  const actor = toActor(actorInput)
  return actor && can(actor, 'team.roles.assign') ? ROLE_DEFINITIONS[actor.role].assignableRoles : []
}

/**
 * Changing an account's status. Practitioners need `practitioners.manage`.
 * A staff account is treated like removing staff access: it needs
 * `team.remove`, a role the actor may manage, and the Super admin safeguards.
 */
export function evaluateStatusChange(
  actorInput: unknown,
  targetId: string,
  nextStatus: string,
  staff: readonly StaffSnapshot[],
): Evaluation {
  const actor = toActor(actorInput)
  if (!actor) return fail('not_permitted')
  const target = staff.find((member) => member.id === targetId)
  if (!target) {
    return can(actor, 'practitioners.manage') ? { ok: true } : fail('not_permitted')
  }
  const closing = nextStatus === 'deactivated' || nextStatus === 'pending_deletion'
  if (closing) return evaluateRemoval(actor, targetId, staff)
  if (!can(actor, 'team.remove')) return fail('not_permitted')
  if (!ROLE_DEFINITIONS[actor.role].assignableRoles.includes(target.role as StaffRole)) {
    return fail('target_protected')
  }
  return { ok: true }
}

/** Thrown when a role or status change breaks a rule. A `ForbiddenError` the UI already handles. */
export class RoleChangeError extends ForbiddenError {
  readonly reason: RoleChangeDenial
  constructor(reason: RoleChangeDenial, message: string) {
    super(message)
    this.name = 'RoleChangeError'
    this.reason = reason
  }
}
