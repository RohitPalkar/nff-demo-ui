import { storageRemove, storageSet } from '@/mocks/api'
import { emitAuditEvent } from './audit'
import { ForbiddenError, can, toActor } from './authorize'
import { resolveActor, type ActorInput } from './guard'
import { ALL_PERMISSIONS, isPermission, prerequisitesOf, type Permission } from './permissions'
import { ROLE_DEFINITIONS } from './roles'
import {
  ROLE_PERMISSIONS_KEY,
  effectiveRolePermissions,
  isEditableRole,
  readRolePermissionOverrides,
  type EditableRole,
} from './rolePermissionStore'

export {
  EDITABLE_ROLES,
  ROLE_PERMISSIONS_KEY,
  defaultRolePermissions,
  effectiveRolePermissions,
  isEditableRole,
  isRoleCustomised,
  readRolePermissionOverrides,
  type EditableRole,
} from './rolePermissionStore'

/**
 * Editable role permissions (Super admin only).
 *
 * The defaults stay in `roles.ts`. A Super admin can change what the Editor,
 * Campaign manager and Admin roles can do; the changed list is stored here and
 * `getRolePermissions` (and so every `can()` check, route guard and sidebar)
 * reads it. The rules, as pure functions so they are tested in isolation:
 *
 * 1. Changing a role needs `roles.manage`.
 * 2. Super admin is never editable: it always holds every permission, so the
 *    platform cannot be locked out. Visitor and Practitioner have no Admin
 *    permissions to edit.
 * 3. An actor only edits roles it may assign, and only grants permissions it
 *    holds itself.
 * 4. `cms.access` stays on for every staff role, and `roles.manage` stays with
 *    Super admin: only a Super admin decides who can grant what.
 * 5. A saved list must include every prerequisite (see `PERMISSION_REQUIRES`).
 *
 * Browser storage, like the rest of the demo: prototype behaviour, not a
 * security boundary.
 */

/** Permissions no edit may change for a staff role, with the reason. */
export const LOCKED_PERMISSIONS: Partial<Record<Permission, { on: boolean; reason: string }>> = {
  'cms.access': { on: true, reason: 'Every staff role opens the Admin.' },
  'roles.manage': { on: false, reason: 'Only a Super admin can change what roles can do.' },
}

export type PermissionEditDenial =
  | 'not_permitted'
  | 'role_locked'
  | 'role_not_manageable'
  | 'locked_permission'
  | 'not_held'
  | 'missing_prerequisite'
  | 'unknown_permission'

export type PermissionEditEvaluation =
  | { ok: true }
  | { ok: false; reason: PermissionEditDenial; message: string; permission?: Permission }

const MESSAGES: Record<PermissionEditDenial, string> = {
  not_permitted: 'Only a Super admin can change what roles can do.',
  role_locked: 'This role cannot be edited.',
  role_not_manageable: 'You cannot change a role at or above your own level.',
  locked_permission: 'That permission is fixed for this role.',
  not_held: 'You can only grant permissions you hold yourself.',
  missing_prerequisite: 'A permission is missing something it needs.',
  unknown_permission: 'That is not a permission.',
}

const deny = (reason: PermissionEditDenial, permission?: Permission): PermissionEditEvaluation => ({
  ok: false,
  reason,
  message: MESSAGES[reason],
  ...(permission ? { permission } : {}),
})

/** May this actor edit this role at all? */
export function canEditRole(actorInput: unknown, role: unknown): PermissionEditEvaluation {
  const actor = toActor(actorInput)
  if (!actor || !can(actor, 'roles.manage')) return deny('not_permitted')
  if (!isEditableRole(role)) return deny('role_locked')
  if (!ROLE_DEFINITIONS[actor.role].assignableRoles.includes(role) || actor.role === role) {
    return deny('role_not_manageable')
  }
  return { ok: true }
}

/** Whether `next` may become the role's permission list. No side effects. */
export function evaluatePermissionEdit(
  actorInput: unknown,
  role: unknown,
  next: readonly unknown[],
): PermissionEditEvaluation {
  const allowed = canEditRole(actorInput, role)
  if (!allowed.ok) return allowed
  const actor = toActor(actorInput)!
  const unknown = next.find((permission) => !isPermission(permission))
  if (unknown !== undefined) return deny('unknown_permission')
  const list = next as Permission[]
  for (const [permission, rule] of Object.entries(LOCKED_PERMISSIONS) as Array<[Permission, { on: boolean }]>) {
    if (list.includes(permission) !== rule.on) return deny('locked_permission', permission)
  }
  const current = effectiveRolePermissions(role as EditableRole)
  for (const permission of list) {
    if (!current.includes(permission) && !can(actor, permission)) return deny('not_held', permission)
  }
  for (const permission of list) {
    const missing = prerequisitesOf(permission).find((needed) => !list.includes(needed))
    if (missing) {
      return { ok: false, reason: 'missing_prerequisite', permission, message: `${permission} needs ${missing}.` }
    }
  }
  return { ok: true }
}

function write(overrides: Partial<Record<EditableRole, Permission[]>>) {
  if (Object.keys(overrides).length === 0) storageRemove(ROLE_PERMISSIONS_KEY)
  else storageSet(ROLE_PERMISSIONS_KEY, JSON.stringify(overrides))
}

function enforce(actorInput: ActorInput, role: unknown, evaluation: (actor: unknown) => PermissionEditEvaluation) {
  const actor = resolveActor(actorInput)
  const result = evaluation(actor)
  if (!result.ok) {
    emitAuditEvent({
      actorId: actor?.id ?? 'anonymous',
      action: 'roles.manage',
      resourceType: 'team_member',
      resourceId: `role:${String(role)}`,
      outcome: 'denied',
      metadata: { reason: result.reason },
    })
    throw new ForbiddenError(result.message, 'roles.manage')
  }
  return actor!
}

/** Replace a role's permissions. Saving the defaults clears the customisation. */
export function setRolePermissions(role: EditableRole, next: readonly Permission[], actorInput?: ActorInput) {
  const actor = enforce(actorInput, role, (resolved) => evaluatePermissionEdit(resolved, role, next))
  const before = effectiveRolePermissions(role)
  const ordered = ALL_PERMISSIONS.filter((permission) => next.includes(permission))
  const defaults = ROLE_DEFINITIONS[role].permissions
  const isDefault = ordered.length === defaults.length && ordered.every((permission) => defaults.includes(permission))
  const overrides = { ...readRolePermissionOverrides() }
  if (isDefault) delete overrides[role]
  else overrides[role] = ordered
  write(overrides)
  emitAuditEvent({
    actorId: actor.id,
    action: 'roles.manage',
    resourceType: 'team_member',
    resourceId: `role:${role}`,
    outcome: 'success',
    metadata: {
      granted: ordered.filter((permission) => !before.includes(permission)).join(' ') || null,
      removed: before.filter((permission) => !ordered.includes(permission)).join(' ') || null,
    },
  })
  return ordered
}

/** Back to the defaults in `roles.ts`. */
export function resetRolePermissions(role: EditableRole, actorInput?: ActorInput) {
  enforce(actorInput, role, (resolved) => canEditRole(resolved, role))
  return setRolePermissions(role, ROLE_DEFINITIONS[role].permissions, actorInput)
}

/**
 * Turn one permission on or off in a draft list, keeping it consistent:
 * turning on adds its prerequisites, turning off removes what depends on it.
 * Locked permissions never change.
 */
export function togglePermission(list: readonly Permission[], permission: Permission, on: boolean): Permission[] {
  if (LOCKED_PERMISSIONS[permission]) return [...list]
  const next = new Set(list)
  if (on) {
    next.add(permission)
    for (const needed of prerequisitesOf(permission)) next.add(needed)
  } else {
    next.delete(permission)
    for (const other of ALL_PERMISSIONS) {
      if (next.has(other) && prerequisitesOf(other).includes(permission) && !LOCKED_PERMISSIONS[other]) next.delete(other)
    }
  }
  return ALL_PERMISSIONS.filter((entry) => next.has(entry))
}
