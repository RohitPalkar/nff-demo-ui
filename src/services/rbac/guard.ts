import { ForbiddenError, can, toActor, type Actor } from './authorize'
import { emitAuditEvent, listAuditEvents, type AuditEvent, type AuditResourceType } from './audit'
import type { Permission } from './permissions'
import { sessionActor } from './sessionActor'

/**
 * The enforcement point for service operations. Every CMS mutation runs
 * through `authorizeAction`: it checks the permissions, records the outcome,
 * and only then lets the operation run. A refused call throws before any
 * data is touched.
 *
 * `actor` is optional on the operations so existing call sites keep working:
 * when it is omitted the current browser session is used. Pass `null` to act
 * as nobody (always refused). A server must always pass a verified actor.
 */

export type ActorInput = Actor | null | undefined

export function resolveActor(actor: ActorInput): Actor | null {
  return toActor(actor === undefined ? sessionActor() : actor)
}

export interface GuardEvent {
  action: string
  resourceType: AuditResourceType
  resourceId: string
  metadata?: Record<string, string | number | boolean | null>
  /** Set false for operations too frequent to audit (draft saves). */
  audit?: boolean
}

export function authorizeAction<T>(
  actorInput: ActorInput,
  permissions: Permission | readonly Permission[],
  event: GuardEvent,
  run: (actor: Actor) => T,
): T {
  const actor = resolveActor(actorInput)
  const required = typeof permissions === 'string' ? [permissions] : permissions
  const audit = event.audit !== false
  const record = (outcome: 'success' | 'denied' | 'failure') => {
    if (!audit) return
    emitAuditEvent({
      actorId: actor?.id ?? 'anonymous',
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      outcome,
      ...(event.metadata ? { metadata: event.metadata } : {}),
    })
  }

  if (!actor) {
    emitAuditEvent({
      actorId: 'anonymous',
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      outcome: 'denied',
    })
    throw new ForbiddenError('You need to be signed in to do that.', required[0])
  }
  const missing = required.find((permission) => !can(actor, permission))
  if (missing) {
    // Denials are always recorded, even for operations that skip success events.
    emitAuditEvent({
      actorId: actor.id,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      outcome: 'denied',
    })
    throw new ForbiddenError(undefined, missing)
  }
  try {
    const result = run(actor)
    record('success')
    return result
  } catch (error) {
    if (!(error instanceof ForbiddenError)) record('failure')
    throw error
  }
}

/**
 * The audit trail, for someone with `audit.view` (Admin and Super admin).
 * Reading it is not itself audited. There is no screen yet.
 */
export function readAuditTrail(actor?: ActorInput): AuditEvent[] {
  const resolved = resolveActor(actor)
  if (!resolved || !can(resolved, 'audit.view')) throw new ForbiddenError(undefined, 'audit.view')
  return listAuditEvents()
}
