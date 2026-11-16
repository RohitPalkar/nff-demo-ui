import { beforeEach, describe, expect, it } from 'vitest'
import { listAuditEvents } from './audit'
import { can, getRolePermissions } from './authorize'
import { prerequisitesOf } from './permissions'
import {
  canEditRole,
  evaluatePermissionEdit,
  isRoleCustomised,
  resetRolePermissions,
  setRolePermissions,
  togglePermission,
} from './rolePermissions'
import { ROLE_DEFINITIONS } from './roles'

const SUPER = { id: 'u-admin', role: 'super_admin' } as const
const ADMIN = { id: 'u-ops', role: 'admin' } as const
const EDITOR = { id: 'u-editor', role: 'editor' } as const

const editorDefaults = [...ROLE_DEFINITIONS.editor.permissions]

beforeEach(() => localStorage.clear())

describe('who may edit role permissions', () => {
  it('only a Super admin, and never the Super admin role itself', () => {
    expect(canEditRole(SUPER, 'editor').ok).toBe(true)
    expect(canEditRole(SUPER, 'campaign').ok).toBe(true)
    expect(canEditRole(SUPER, 'admin').ok).toBe(true)
    expect(canEditRole(SUPER, 'super_admin')).toMatchObject({ ok: false, reason: 'role_locked' })
    expect(canEditRole(ADMIN, 'editor')).toMatchObject({ ok: false, reason: 'not_permitted' })
    expect(canEditRole(EDITOR, 'editor')).toMatchObject({ ok: false, reason: 'not_permitted' })
    expect(canEditRole(SUPER, 'practitioner')).toMatchObject({ ok: false, reason: 'role_locked' })
  })

  it('keeps Admin access and the right to edit roles fixed', () => {
    const withoutAccess = editorDefaults.filter((permission) => permission !== 'cms.access')
    expect(evaluatePermissionEdit(SUPER, 'editor', withoutAccess)).toMatchObject({ ok: false, reason: 'locked_permission' })
    expect(evaluatePermissionEdit(SUPER, 'admin', [...ROLE_DEFINITIONS.admin.permissions, 'roles.view', 'roles.manage'])).toMatchObject({
      ok: false,
      reason: 'locked_permission',
      permission: 'roles.manage',
    })
  })

  it('refuses a list that is missing a prerequisite', () => {
    const result = evaluatePermissionEdit(SUPER, 'editor', [...editorDefaults, 'content.approve'])
    expect(result).toMatchObject({ ok: false, reason: 'missing_prerequisite', permission: 'content.approve' })
  })
})

describe('editing', () => {
  it('turning one on brings its prerequisites; turning one off takes its dependants', () => {
    const on = togglePermission(editorDefaults, 'content.approve', true)
    expect(on).toEqual(expect.arrayContaining(['content.approve', 'content.review', 'content.view']))
    const off = togglePermission(on, 'content.review', false)
    expect(off).not.toContain('content.review')
    expect(off).not.toContain('content.approve')
    expect(off).toContain('content.view')
    // Locked permissions never move.
    expect(togglePermission(editorDefaults, 'cms.access', false)).toContain('cms.access')
    expect(prerequisitesOf('content.approve')).toEqual(expect.arrayContaining(['content.review', 'content.view', 'cms.access']))
  })

  it('a saved change is what every permission check sees, and is audited', () => {
    expect(can(EDITOR, 'content.approve')).toBe(false)
    setRolePermissions('editor', togglePermission(editorDefaults, 'content.approve', true), SUPER)
    expect(can(EDITOR, 'content.approve')).toBe(true)
    expect(can(EDITOR, 'content.review')).toBe(true)
    expect(isRoleCustomised('editor')).toBe(true)
    const event = listAuditEvents().find((entry) => entry.action === 'roles.manage' && entry.outcome === 'success')
    expect(event?.metadata?.granted).toContain('content.approve')

    resetRolePermissions('editor', SUPER)
    expect(can(EDITOR, 'content.approve')).toBe(false)
    expect(isRoleCustomised('editor')).toBe(false)
    expect(getRolePermissions('editor')).toEqual(editorDefaults)
  })

  it('removing a permission takes it away, and refused edits change nothing', () => {
    setRolePermissions('campaign', togglePermission(ROLE_DEFINITIONS.campaign.permissions, 'campaigns.send', false), SUPER)
    expect(can({ id: 'u-campaign', role: 'campaign' }, 'campaigns.send')).toBe(false)

    expect(() => setRolePermissions('editor', [...editorDefaults, 'team.view'], ADMIN)).toThrow(/Super admin/)
    expect(getRolePermissions('editor')).toEqual(editorDefaults)
    expect(listAuditEvents().some((entry) => entry.action === 'roles.manage' && entry.outcome === 'denied')).toBe(true)
  })

  it('ignores stored data it does not recognise', () => {
    localStorage.setItem('nff.rbac.role-permissions.v1', JSON.stringify({ super_admin: [], editor: ['nope', 'cms.access'] }))
    expect(getRolePermissions('super_admin')).toEqual(ROLE_DEFINITIONS.super_admin.permissions)
    expect(getRolePermissions('editor')).toEqual(['cms.access'])
    localStorage.setItem('nff.rbac.role-permissions.v1', '{broken')
    expect(getRolePermissions('editor')).toEqual(editorDefaults)
  })
})
