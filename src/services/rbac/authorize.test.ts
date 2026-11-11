import { describe, expect, it } from 'vitest'
import { ROLE_IDS, ROLE_DEFINITIONS, STAFF_ROLE_IDS } from './roles'
import { ALL_PERMISSIONS, isPermission } from './permissions'
import {
  ForbiddenError,
  can,
  canAll,
  canAny,
  getRoleCapabilities,
  getRolePermissions,
  requirePermission,
  toActor,
  type Actor,
} from './authorize'
import { CMS_ROUTES, canAccessRoute, getAccessibleNavigation } from './navigation'
import { transitionPermissions } from './contentWorkflow'
import type { Role } from '@/types'

const actor = (role: Role): Actor => ({ id: `u-${role}`, role })

const labels = (role: Role) => getAccessibleNavigation(actor(role)).map((entry) => entry.label)

describe('permission registry and role matrix', () => {
  it('defines Admin and Super admin as distinct roles', () => {
    expect(ROLE_IDS).toContain('admin')
    expect(ROLE_IDS).toContain('super_admin')
    expect(ROLE_DEFINITIONS.admin.label).toBe('Admin')
    expect(ROLE_DEFINITIONS.super_admin.label).toBe('Super admin')
    expect(ROLE_DEFINITIONS.admin.permissions).not.toEqual(ROLE_DEFINITIONS.super_admin.permissions)
  })

  it('treats visitor as a context, practitioner as a learner, and only four roles as staff', () => {
    expect(ROLE_DEFINITIONS.visitor.kind).toBe('context')
    expect(ROLE_DEFINITIONS.practitioner.kind).toBe('learner')
    expect([...STAFF_ROLE_IDS]).toEqual(['editor', 'campaign', 'admin', 'super_admin'])
  })

  it('grants every role only registered permissions', () => {
    for (const role of ROLE_IDS) {
      for (const permission of ROLE_DEFINITIONS[role].permissions) {
        expect(isPermission(permission)).toBe(true)
      }
    }
  })

  it('gives Super admin every permission, listed explicitly', () => {
    expect([...ROLE_DEFINITIONS.super_admin.permissions].sort()).toEqual([...ALL_PERMISSIONS].sort())
  })

  it('Visitor and Practitioner hold no Admin/CMS permission', () => {
    for (const role of ['visitor', 'practitioner'] as Role[]) {
      expect(getRolePermissions(role)).toEqual([])
      expect(can(actor(role), 'cms.access')).toBe(false)
    }
  })

  it('Editor can create, edit, submit and preview, and cannot approve or publish', () => {
    const editor = actor('editor')
    for (const permission of ['content.create', 'content.edit', 'content.submit', 'content.preview', 'content.view', 'learning.view'] as const) {
      expect(can(editor, permission)).toBe(true)
    }
    for (const permission of [
      'content.approve', 'content.reject', 'content.publish', 'content.unpublish', 'content.schedule',
      'content.review', 'content.delete', 'learning.manage', 'learning.assign', 'learning.withdraw',
      'learning.groups.manage', 'practitioners.view', 'practitioners.manage', 'team.view', 'team.roles.assign',
      'insights.visitors.view', 'insights.engagement.view', 'insights.scores.configure', 'content.ownership.manage',
      'campaigns.view', 'campaigns.recipients.view', 'roles.view', 'roles.manage', 'settings.manage', 'audit.view',
    ] as const) {
      expect(can(editor, permission), permission).toBe(false)
    }
  })

  it('Campaign manager runs campaigns without content, assignments, roles or recipient detail', () => {
    const campaign = actor('campaign')
    for (const permission of ['campaigns.view', 'campaigns.manage', 'campaigns.send'] as const) {
      expect(can(campaign, permission)).toBe(true)
    }
    for (const permission of [
      'campaigns.recipients.view', 'content.view', 'content.edit', 'content.publish', 'learning.assign',
      'practitioners.view', 'insights.visitors.view', 'insights.engagement.view', 'roles.manage', 'team.roles.assign',
    ] as const) {
      expect(can(campaign, permission), permission).toBe(false)
    }
  })

  it('Admin publishes and manages learning and practitioners, but not roles or system settings', () => {
    const admin = actor('admin')
    for (const permission of [
      'content.approve', 'content.reject', 'content.publish', 'content.schedule', 'content.unpublish',
      'learning.assign', 'learning.withdraw', 'learning.groups.manage', 'practitioners.manage',
      'team.roles.assign', 'insights.visitors.view', 'campaigns.recipients.view', 'audit.view',
      'content.ownership.manage', 'campaigns.view',
    ] as const) {
      expect(can(admin, permission), permission).toBe(true)
    }
    for (const permission of ['roles.manage', 'settings.manage', 'insights.scores.configure', 'campaigns.manage', 'campaigns.send'] as const) {
      expect(can(admin, permission), permission).toBe(false)
    }
  })

  it('Super admin holds the protected permissions, including score configuration and campaign sending', () => {
    const superAdmin = actor('super_admin')
    for (const permission of ['roles.manage', 'settings.manage', 'audit.view', 'content.publish', 'insights.scores.configure', 'campaigns.manage', 'campaigns.send'] as const) {
      expect(can(superAdmin, permission)).toBe(true)
    }
  })

  it('describes each role', () => {
    for (const role of ROLE_IDS) expect(getRoleCapabilities(role).length).toBeGreaterThan(0)
  })
})

describe('authorisation engine', () => {
  it('denies unknown roles, unknown permissions and malformed actors', () => {
    expect(can({ id: 'x', role: 'god' }, 'cms.access')).toBe(false)
    expect(can(actor('admin'), 'content.teleport')).toBe(false)
    expect(can(null, 'cms.access')).toBe(false)
    expect(can(undefined, 'cms.access')).toBe(false)
    expect(can('admin', 'cms.access')).toBe(false)
    expect(can({ role: 'admin' }, 'cms.access')).toBe(false)
    expect(can({ id: '', role: 'admin' }, 'cms.access')).toBe(false)
    expect(getRolePermissions('god')).toEqual([])
    expect(getRoleCapabilities('god')).toEqual([])
  })

  it('does not trust inherited keys as roles or permissions', () => {
    expect(toActor({ id: 'x', role: 'toString' })).toBeNull()
    expect(can(actor('super_admin'), 'constructor')).toBe(false)
    expect(can(actor('super_admin'), '__proto__')).toBe(false)
  })

  it('combines permissions deterministically', () => {
    const editor = actor('editor')
    expect(canAny(editor, ['content.publish', 'content.edit'])).toBe(true)
    expect(canAll(editor, ['content.publish', 'content.edit'])).toBe(false)
    expect(canAll(editor, [])).toBe(false)
    expect(canAny(editor, [])).toBe(false)
  })

  it('requirePermission throws a ForbiddenError and returns the actor otherwise', () => {
    expect(() => requirePermission(actor('editor'), 'content.publish')).toThrow(ForbiddenError)
    expect(() => requirePermission(null, 'content.view')).toThrow(ForbiddenError)
    expect(requirePermission(actor('admin'), 'content.publish').role).toBe('admin')
  })

  it('accepts a future verified actor and marks everything else as a prototype session', () => {
    expect(toActor({ id: 'a', role: 'admin', assurance: 'verified' })?.assurance).toBe('verified')
    expect(toActor({ id: 'a', role: 'admin' })?.assurance).toBe('prototype-session')
  })
})

describe('route and navigation registry', () => {
  it('every registered permission list is non-empty and valid', () => {
    for (const route of CMS_ROUTES) {
      expect(route.permissions.length).toBeGreaterThan(0)
      route.permissions.forEach((permission) => expect(isPermission(permission)).toBe(true))
    }
  })

  it('Editor sees the content sections only', () => {
    expect(labels('editor')).toEqual(['Dashboard', 'Explorations', 'Meditations', 'Curriculum', 'Review Queue'])
  })

  it('Campaign manager sees the campaign sections only', () => {
    expect(labels('campaign')).toEqual(['Dashboard', 'Campaigns', 'Templates', 'Delivery'])
  })

  it('Admin sees content, campaigns (read), people, insights and roles', () => {
    const admin = labels('admin')
    for (const label of ['Dashboard', 'Explorations', 'Review Queue', 'Campaigns', 'Practitioners', 'Visitors', 'Engagement', 'Team & Roles']) {
      expect(admin).toContain(label)
    }
    expect(admin).not.toContain('Score Settings')
  })

  it('Super admin sees everything', () => {
    expect(labels('super_admin')).toEqual(CMS_ROUTES.flatMap((route) => ('nav' in route ? [route.title] : [])))
  })

  it('shows nothing to visitors, practitioners and unknown actors', () => {
    expect(labels('visitor')).toEqual([])
    expect(labels('practitioner')).toEqual([])
    expect(getAccessibleNavigation(null)).toEqual([])
    expect(getAccessibleNavigation({ id: 'x', role: 'god' as Role })).toEqual([])
  })

  it('route access matches navigation', () => {
    expect(canAccessRoute(actor('editor'), '/cms/users')).toBe(false)
    expect(canAccessRoute(actor('editor'), '/cms/explorations/:id')).toBe(true)
    expect(canAccessRoute(actor('campaign'), '/cms/explorations')).toBe(false)
    expect(canAccessRoute(actor('admin'), '/cms/roles')).toBe(true)
  })
})

describe('content workflow table', () => {
  it('needs approval and publish permissions to publish from review', () => {
    expect(transitionPermissions('in_review', 'published')).toEqual(['content.review', 'content.approve', 'content.publish'])
    expect(transitionPermissions('draft', 'in_review')).toEqual(['content.submit'])
    expect(transitionPermissions('published', 'unpublished')).toEqual(['content.unpublish'])
  })

  it('never moves live content to review or back to draft without unpublish authority', () => {
    expect(transitionPermissions('published', 'in_review')).toBeNull()
    expect(transitionPermissions('scheduled', 'in_review')).toBeNull()
    expect(transitionPermissions('published', 'draft')).toEqual(['content.unpublish'])
    expect(transitionPermissions('unpublished', 'draft')).toEqual(['content.edit'])
  })

  it('refuses transitions that make no sense', () => {
    expect(transitionPermissions('draft', 'rejected')).toBeNull()
    expect(transitionPermissions('draft', 'unpublished')).toBeNull()
  })

  it('needs nothing for no change', () => {
    expect(transitionPermissions('draft', 'draft')).toEqual([])
  })
})
