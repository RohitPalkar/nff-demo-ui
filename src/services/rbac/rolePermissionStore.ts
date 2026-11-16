import { storageGet } from '@/mocks/api'
import type { Role } from '@/types'
import { ALL_PERMISSIONS, type Permission } from './permissions'
import { ROLE_DEFINITIONS, type StaffRole } from './roles'

/**
 * Where edited role permissions are read from (see rolePermissions.ts for the
 * rules and the writes). Kept apart so the permission engine can read it
 * without depending on the editing rules.
 */

export const ROLE_PERMISSIONS_KEY = 'nff.rbac.role-permissions.v1'

/** Roles whose permissions can be edited at all. */
export const EDITABLE_ROLES = ['editor', 'campaign', 'admin'] as const satisfies readonly StaffRole[]
export type EditableRole = (typeof EDITABLE_ROLES)[number]

export const isEditableRole = (role: unknown): role is EditableRole =>
  typeof role === 'string' && (EDITABLE_ROLES as readonly string[]).includes(role)

let cache: { raw: string | null; value: Partial<Record<EditableRole, Permission[]>> } = { raw: null, value: {} }

/** The stored overrides, validated. Parsed only when the stored text changes. */
export function readRolePermissionOverrides(): Partial<Record<EditableRole, Permission[]>> {
  const raw = storageGet(ROLE_PERMISSIONS_KEY)
  if (raw === cache.raw) return cache.value
  let value: Partial<Record<EditableRole, Permission[]>> = {}
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object') {
        for (const [role, list] of Object.entries(parsed)) {
          if (isEditableRole(role) && Array.isArray(list)) {
            value[role] = ALL_PERMISSIONS.filter((permission) => list.includes(permission))
          }
        }
      }
    } catch {
      value = {}
    }
  }
  cache = { raw, value }
  return value
}

export const defaultRolePermissions = (role: Role): readonly Permission[] => ROLE_DEFINITIONS[role].permissions

/** The permissions a role holds now: the stored list for an edited role, else the default. */
export function effectiveRolePermissions(role: Role): readonly Permission[] {
  if (!isEditableRole(role)) return ROLE_DEFINITIONS[role].permissions
  return readRolePermissionOverrides()[role] ?? ROLE_DEFINITIONS[role].permissions
}

export const isRoleCustomised = (role: Role) => isEditableRole(role) && Boolean(readRolePermissionOverrides()[role])

