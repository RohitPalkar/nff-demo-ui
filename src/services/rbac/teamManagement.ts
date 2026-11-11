import { ForbiddenError } from './authorize'
import { emitAuditEvent } from './audit'
import { resolveActor, type ActorInput } from './guard'
import {
  RoleChangeError,
  evaluateRemoval,
  evaluateRoleChange,
  evaluateStatusChange,
  type Evaluation,
} from './roleManagement'
import { USER_STATUS_KEY, staffSnapshot, writeRoleAssignment } from './roleResolution'
import { readJson, writeJson } from '@/mocks/api'
import type { StaffRole } from './roles'

/**
 * Team membership operations: role changes and removal. These replace the
 * previous Roles-page behaviour where a change was saved to a key nothing
 * read. A change made here is what `effectiveRole` (and so login, the
 * sidebar, route guards and service checks) sees on the next evaluation.
 */

function enforce(
  actorInput: ActorInput,
  action: string,
  targetId: string,
  evaluate: (actor: ReturnType<typeof resolveActor>) => Evaluation,
  metadata?: Record<string, string>,
) {
  const actor = resolveActor(actorInput)
  const result = evaluate(actor)
  if (!result.ok) {
    emitAuditEvent({
      actorId: actor?.id ?? 'anonymous',
      action,
      resourceType: 'team_member',
      resourceId: targetId,
      outcome: 'denied',
      metadata: { reason: result.reason, ...metadata },
    })
    throw new RoleChangeError(result.reason, result.message)
  }
  return actor!
}

export function changeMemberRole(targetId: string, newRole: StaffRole, actorInput?: ActorInput) {
  const staff = staffSnapshot()
  const before = staff.find((member) => member.id === targetId)?.role
  const actor = enforce(
    actorInput,
    'team.roles.assign',
    targetId,
    (resolved) => evaluateRoleChange(resolved, targetId, newRole, staff),
    { toRole: String(newRole) },
  )
  if (before === newRole) return newRole
  writeRoleAssignment(targetId, { role: newRole, by: actor.id, at: new Date().toISOString() })
  emitAuditEvent({
    actorId: actor.id,
    action: 'team.roles.assign',
    resourceType: 'team_member',
    resourceId: targetId,
    outcome: 'success',
    metadata: { fromRole: String(before), toRole: newRole },
  })
  return newRole
}

/**
 * Removing staff means deactivating the account: the role is kept for the
 * record, and the account cannot sign in. `setUserStatus(id, 'active')` reverses it.
 */
export function removeMember(targetId: string, actorInput?: ActorInput) {
  const staff = staffSnapshot()
  const actor = enforce(actorInput, 'team.remove', targetId, (resolved) =>
    evaluateRemoval(resolved, targetId, staff),
  )
  writeJson(USER_STATUS_KEY, { ...readJson<Record<string, string>>(USER_STATUS_KEY, {}), [targetId]: 'deactivated' })
  emitAuditEvent({
    actorId: actor.id,
    action: 'team.remove',
    resourceType: 'team_member',
    resourceId: targetId,
    outcome: 'success',
  })
}

/** Used before a user's status changes, so deactivating the last Super admin is refused. */
export function assertCanSetStatus(actorInput: ActorInput, targetId: string, nextStatus: string) {
  const staff = staffSnapshot()
  return enforce(actorInput, 'practitioners.manage', targetId, (resolved) =>
    evaluateStatusChange(resolved, targetId, nextStatus, staff),
  )
}

/** For role pickers: can this actor make this change right now? No side effects. */
export function previewRoleChange(actorInput: ActorInput, targetId: string, newRole: StaffRole): Evaluation {
  return evaluateRoleChange(resolveActor(actorInput), targetId, newRole, staffSnapshot())
}

export function previewRemoval(actorInput: ActorInput, targetId: string): Evaluation {
  return evaluateRemoval(resolveActor(actorInput), targetId, staffSnapshot())
}

export { ForbiddenError }
