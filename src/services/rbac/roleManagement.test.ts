import { describe, expect, it } from 'vitest'
import type { Actor } from './authorize'
import {
  assignableRolesFor,
  evaluateRemoval,
  evaluateRoleChange,
  evaluateStatusChange,
  type StaffSnapshot,
} from './roleManagement'

const sa = (id: string, active = true): StaffSnapshot => ({ id, role: 'super_admin', active })
const admin = (id: string): StaffSnapshot => ({ id, role: 'admin', active: true })
const editor = (id: string): StaffSnapshot => ({ id, role: 'editor', active: true })
const act = (member: StaffSnapshot): Actor => ({ id: member.id, role: member.role })

const denied = (result: ReturnType<typeof evaluateRoleChange>) => (result.ok ? 'ok' : result.reason)

describe('role changes', () => {
  const staff = [sa('sa1'), admin('ad1'), admin('ad2'), editor('ed1')]

  it('lets an Admin assign Editor and Campaign manager only', () => {
    expect(evaluateRoleChange(act(admin('ad1')), 'ed1', 'campaign', staff).ok).toBe(true)
    expect(denied(evaluateRoleChange(act(admin('ad1')), 'ed1', 'admin', staff))).toBe('role_not_assignable')
  })

  it('stops an Admin granting Super admin', () => {
    expect(denied(evaluateRoleChange(act(admin('ad1')), 'ed1', 'super_admin', staff))).toBe('role_not_assignable')
  })

  it('stops an Admin changing an Admin or a Super admin', () => {
    expect(denied(evaluateRoleChange(act(admin('ad1')), 'ad2', 'editor', staff))).toBe('target_protected')
    expect(denied(evaluateRoleChange(act(admin('ad1')), 'sa1', 'editor', staff))).toBe('target_protected')
  })

  it('lets a Super admin assign any staff role', () => {
    for (const role of ['editor', 'campaign', 'admin', 'super_admin']) {
      expect(evaluateRoleChange(act(sa('sa1')), 'ed1', role, staff).ok).toBe(true)
    }
  })

  it('refuses unknown roles and non-staff targets', () => {
    expect(denied(evaluateRoleChange(act(sa('sa1')), 'ed1', 'practitioner', staff))).toBe('unknown_role')
    expect(denied(evaluateRoleChange(act(sa('sa1')), 'ed1', 'god', staff))).toBe('unknown_role')
    expect(denied(evaluateRoleChange(act(sa('sa1')), 'nobody', 'editor', staff))).toBe('target_not_staff')
  })

  it('refuses actors without the permission, and malformed actors', () => {
    expect(denied(evaluateRoleChange(act(editor('ed1')), 'ed1', 'admin', staff))).toBe('not_permitted')
    expect(denied(evaluateRoleChange(null, 'ed1', 'editor', staff))).toBe('not_permitted')
    expect(denied(evaluateRoleChange({ id: 'x', role: 'god' }, 'ed1', 'editor', staff))).toBe('not_permitted')
  })

  it('stops anyone raising their own role, even with a stale actor', () => {
    // The actor claims Super admin but the directory has them as an Editor.
    const mixed: StaffSnapshot[] = [sa('sa1'), editor('x')]
    expect(denied(evaluateRoleChange({ id: 'x', role: 'super_admin' }, 'x', 'super_admin', mixed))).toBe('self_promotion')
  })

  it('protects the last active Super admin from demotion', () => {
    expect(denied(evaluateRoleChange(act(sa('sa1')), 'sa1', 'admin', [sa('sa1'), admin('ad1')]))).toBe('last_super_admin')
  })

  it('allows demoting a Super admin when another active one remains', () => {
    expect(evaluateRoleChange(act(sa('sa1')), 'sa1', 'admin', [sa('sa1'), sa('sa2')]).ok).toBe(true)
  })

  it('does not count an inactive Super admin as a safeguard', () => {
    expect(denied(evaluateRoleChange(act(sa('sa2', false)), 'sa1', 'admin', [sa('sa1'), sa('sa2', false)]))).toBe('last_super_admin')
  })

  it('offers each role only the roles it may assign', () => {
    expect(assignableRolesFor({ id: 'a', role: 'admin' })).toEqual(['editor', 'campaign'])
    expect(assignableRolesFor({ id: 'a', role: 'super_admin' })).toEqual(['editor', 'campaign', 'admin', 'super_admin'])
    expect(assignableRolesFor({ id: 'a', role: 'editor' })).toEqual([])
    expect(assignableRolesFor(null)).toEqual([])
  })
})

describe('removal and status', () => {
  it('protects the last active Super admin from removal', () => {
    expect(evaluateRemoval(act(sa('sa2', false)), 'sa1', [sa('sa1'), sa('sa2', false)])).toMatchObject({ ok: false, reason: 'last_super_admin' })
  })

  it('never lets anyone remove their own access', () => {
    expect(evaluateRemoval(act(sa('sa1')), 'sa1', [sa('sa1'), sa('sa2')])).toMatchObject({ ok: false, reason: 'self_removal' })
  })

  it('lets a Super admin remove an Admin, and an Admin remove an Editor, but not an Admin', () => {
    const staff = [sa('sa1'), admin('ad1'), admin('ad2'), editor('ed1')]
    expect(evaluateRemoval(act(sa('sa1')), 'ad1', staff).ok).toBe(true)
    expect(evaluateRemoval(act(admin('ad1')), 'ed1', staff).ok).toBe(true)
    expect(evaluateRemoval(act(admin('ad1')), 'ad2', staff)).toMatchObject({ ok: false, reason: 'target_protected' })
    expect(evaluateRemoval(act(admin('ad1')), 'sa1', staff)).toMatchObject({ ok: false, reason: 'target_protected' })
  })

  it('treats deactivating a staff account like removal, and a practitioner as practitioners.manage', () => {
    const staff = [sa('sa1'), sa('sa2'), editor('ed1')]
    expect(evaluateStatusChange(act(admin('ad1')), 'p1', 'deactivated', staff).ok).toBe(true)
    expect(evaluateStatusChange(act(editor('ed1')), 'p1', 'deactivated', staff)).toMatchObject({ ok: false })
    expect(evaluateStatusChange(act(sa('sa1')), 'sa2', 'deactivated', [sa('sa1'), sa('sa2')]).ok).toBe(true)
    expect(evaluateStatusChange(act(sa('sa2', false)), 'sa1', 'deactivated', [sa('sa1'), sa('sa2', false)])).toMatchObject({ ok: false, reason: 'last_super_admin' })
  })
})
