import type { Role } from '@/types'
import { ALL_PERMISSIONS, type Permission } from './permissions'

/**
 * Role definitions and the default role to permission matrix. This is the
 * only place that matrix lives; every screen and check reads it from here.
 *
 * - `visitor` is an access context (no session), never stored on a user.
 * - `practitioner` is an authenticated learner. Learner content visibility
 *   stays with `services/learning/access.ts`; this file grants no learner
 *   permissions because the Admin/CMS has none to grant.
 * - `editor`, `campaign`, `admin`, `super_admin` are staff roles.
 *
 * Pure data: no React, no storage.
 */

export const ROLE_IDS = ['visitor', 'practitioner', 'editor', 'campaign', 'admin', 'super_admin'] as const satisfies readonly Role[]

export type RoleKind = 'context' | 'learner' | 'staff'
export const STAFF_ROLE_IDS = ['editor', 'campaign', 'admin', 'super_admin'] as const
export type StaffRole = (typeof STAFF_ROLE_IDS)[number]

export interface RoleDefinition {
  id: Role
  label: string
  kind: RoleKind
  description: string
  /** Higher outranks lower. Used only to stop self-promotion. */
  rank: number
  /** Human-readable summary for the role screens. Not used for decisions. */
  capabilities: string[]
  /** Staff roles this role may assign to, or take from, a team member. */
  assignableRoles: readonly StaffRole[]
  permissions: readonly Permission[]
}

const EDITOR: Permission[] = [
  'cms.access',
  'content.view',
  'content.create',
  'content.edit',
  'content.submit',
  'content.preview',
  'learning.view',
]

const CAMPAIGN: Permission[] = [
  'cms.access',
  'campaigns.view',
  'campaigns.manage',
  'campaigns.send',
]

const ADMIN: Permission[] = [
  'cms.access',
  'content.view',
  'content.create',
  'content.edit',
  'content.delete',
  'content.submit',
  'content.review',
  'content.approve',
  'content.reject',
  'content.publish',
  'content.unpublish',
  'content.schedule',
  'content.preview',
  'content.ownership.manage',
  'learning.view',
  'learning.manage',
  'learning.assign',
  'learning.withdraw',
  'learning.groups.manage',
  'practitioners.view',
  'practitioners.manage',
  'practitioners.progress.view',
  'team.view',
  'team.invite',
  'team.roles.assign',
  'team.remove',
  'insights.visitors.view',
  'insights.engagement.view',
  'campaigns.view',
  'campaigns.recipients.view',
  'settings.view',
  'roles.view',
  'audit.view',
]

export const ROLE_DEFINITIONS: Readonly<Record<Role, RoleDefinition>> = {
  visitor: {
    id: 'visitor',
    label: 'Visitor',
    kind: 'context',
    description: 'Not signed in. Public pages and free previews only.',
    rank: 0,
    capabilities: ['View public pages', 'Preview playback', 'Manage consent'],
    assignableRoles: [],
    permissions: [],
  },
  practitioner: {
    id: 'practitioner',
    label: 'Practitioner',
    kind: 'learner',
    description: 'A signed-in learner with their assigned learning and own progress.',
    rank: 1,
    capabilities: ['Assigned and permitted learning', 'Own progress', 'Account and preferences', 'Export own data'],
    assignableRoles: [],
    permissions: [],
  },
  editor: {
    id: 'editor',
    label: 'Editor',
    kind: 'staff',
    description: 'Creates and edits content and submits it for review. Cannot approve or publish.',
    rank: 2,
    capabilities: ['Create and edit content', 'Save drafts', 'Submit for review', 'See review feedback', 'Preview', 'View curriculum'],
    assignableRoles: [],
    permissions: EDITOR,
  },
  campaign: {
    id: 'campaign',
    label: 'Campaign manager',
    kind: 'staff',
    description: 'Runs the daily email programme. No content publishing, no recipient detail.',
    rank: 2,
    capabilities: ['Campaigns and templates', 'Delivery reports (aggregate)', 'Trigger sends'],
    assignableRoles: [],
    permissions: CAMPAIGN,
  },
  admin: {
    id: 'admin',
    label: 'Admin',
    kind: 'staff',
    description: 'Reviews and publishes content, manages learning, practitioners and ordinary team membership.',
    rank: 3,
    capabilities: ['Review, approve, reject, publish, schedule', 'Assign content owners', 'Manage curriculum and assignments', 'Manage practitioners', 'View insights, campaigns (read-only), recipients and the audit trail', 'Assign Editor and Campaign manager roles'],
    assignableRoles: ['editor', 'campaign'],
    permissions: ADMIN,
  },
  super_admin: {
    id: 'super_admin',
    label: 'Super admin',
    kind: 'staff',
    description: 'Everything an Admin can do, plus score configuration, roles and system settings. Protected from lockout.',
    rank: 4,
    capabilities: ['Everything an Admin can do', 'Configure score weights', 'Manage and send campaigns', 'Assign any staff role, including Admin and Super admin', 'Role and system settings'],
    assignableRoles: ['editor', 'campaign', 'admin', 'super_admin'],
    // An explicit list, not a wildcard: new permissions must be granted on purpose.
    permissions: [...ALL_PERMISSIONS],
  },
}

export const isRoleId = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLE_IDS as readonly string[]).includes(value)

export const isStaffRole = (value: unknown): value is StaffRole =>
  typeof value === 'string' && (STAFF_ROLE_IDS as readonly string[]).includes(value)

export const getRoleLabel = (role: unknown): string =>
  isRoleId(role) ? ROLE_DEFINITIONS[role].label : 'Unknown role'
