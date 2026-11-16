import type { Role } from '@/types'
import { isPermission, type Permission } from './permissions'
import { ROLE_DEFINITIONS, isRoleId, isStaffRole } from './roles'
import { effectiveRolePermissions } from './rolePermissionStore'

/**
 * The authorisation engine. Pure and deterministic: given an actor and a
 * permission it answers yes or no, and denies anything it does not recognise.
 *
 * SECURITY BOUNDARY (read this): in this prototype the actor is built from a
 * browser-held session that nothing verifies. These checks therefore protect
 * the demo's behaviour, not its data. The same `Actor` shape is the contract
 * for a future server, which must build it from a verified identity and run
 * the same checks. See docs/admin-rbac-foundation.md.
 */

export interface Actor {
  id: string
  role: Role
  /**
   * Where the identity came from. `prototype-session` is an unverified
   * browser session; a server would supply `verified`.
   */
  assurance?: 'prototype-session' | 'verified'
}

/** Optional facts about the thing being acted on. Unused keys are ignored. */
export interface ResourceContext {
  /** The user id that owns the resource, for ownership-scoped rules. */
  ownerId?: string
  /** Content lifecycle status, for transition rules. */
  status?: string
}

export class ForbiddenError extends Error {
  readonly code = 'forbidden'
  readonly status = 403
  readonly permission: Permission | undefined
  constructor(message = 'You do not have permission to do that.', permission?: Permission) {
    super(message)
    this.name = 'ForbiddenError'
    this.permission = permission
  }
}

export const isForbiddenError = (error: unknown): error is ForbiddenError =>
  error instanceof ForbiddenError

/**
 * Narrows anything (a UI value, parsed JSON, a session) to an Actor, or null.
 * Arbitrary role strings never pass: the role must be one we define.
 */
export function toActor(value: unknown): Actor | null {
  if (typeof value !== 'object' || value === null) return null
  const { id, role, assurance } = value as Record<string, unknown>
  if (typeof id !== 'string' || id.length === 0) return null
  if (!isRoleId(role)) return null
  return {
    id,
    role,
    assurance: assurance === 'verified' ? 'verified' : 'prototype-session',
  }
}

/** What the role holds now: a Super admin's edits (rolePermissions.ts) or the defaults in roles.ts. */
export function getRolePermissions(role: unknown): readonly Permission[] {
  return isRoleId(role) ? effectiveRolePermissions(role) : []
}

export function getRoleCapabilities(role: unknown): readonly string[] {
  return isRoleId(role) ? ROLE_DEFINITIONS[role].capabilities : []
}

/**
 * Whether the actor holds the permission. Denies unknown roles, unknown
 * permissions, malformed actors and the visitor context.
 *
 * `context` is accepted so scope rules (ownership, status) can be added
 * without changing callers. No default rule reads it yet: ownership data in
 * the prototype is not reliable enough to enforce (see the docs).
 */
export function can(actor: unknown, permission: unknown, _context?: ResourceContext): boolean {
  const resolved = toActor(actor)
  if (!resolved || !isPermission(permission)) return false
  return getRolePermissions(resolved.role).includes(permission)
}

/** True when the actor holds at least one of the permissions. */
export function canAny(actor: unknown, permissions: readonly unknown[], context?: ResourceContext) {
  return permissions.some((permission) => can(actor, permission, context))
}

/** True when the actor holds every permission. An empty list is denied. */
export function canAll(actor: unknown, permissions: readonly unknown[], context?: ResourceContext) {
  return permissions.length > 0 && permissions.every((permission) => can(actor, permission, context))
}

/** Throws `ForbiddenError` unless the actor holds the permission. */
export function requirePermission(actor: unknown, permission: Permission, context?: ResourceContext): Actor {
  const resolved = toActor(actor)
  if (!resolved || !can(resolved, permission, context)) {
    throw new ForbiddenError(undefined, permission)
  }
  return resolved
}

/** Throws unless the actor holds every permission. */
export function requireAll(actor: unknown, permissions: readonly Permission[], context?: ResourceContext): Actor {
  const resolved = toActor(actor)
  if (!resolved) throw new ForbiddenError(undefined, permissions[0])
  for (const permission of permissions) requirePermission(resolved, permission, context)
  return resolved
}

/** Staff roles are the only ones that can open the Admin/CMS. */
export const isStaffActor = (actor: unknown) => {
  const resolved = toActor(actor)
  return Boolean(resolved && isStaffRole(resolved.role))
}
