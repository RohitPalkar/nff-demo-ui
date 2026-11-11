import { beforeEach, describe, expect, it } from 'vitest'
import { campaigns } from '@/mocks/db'
import { getStoredSession, login } from '@/services/auth'
import {
  addCampaign,
  addStage,
  createCmsItem,
  duplicateCmsItem,
  getCmsItem,
  getDelivery,
  getUsers,
  listAllCmsItems,
  patchCampaign,
  saveCmsItem,
  saveScoreWeights,
  saveStageOrder,
  setCmsStatus,
  setUserStatus,
  loadScoreWeights,
  type CmsItem,
} from '@/services/cms'
import { progressKey } from '@/services/learning/progress'
import { ForbiddenError, can, type Actor } from './authorize'
import { listAuditEvents } from './audit'
import { assignLearning, saveLearningGroup, withdrawLearning } from './assignmentGuards'
import { RoleChangeError } from './roleManagement'
import { effectiveRole, listStaffMembers, staffSnapshot } from './roleResolution'
import { sessionActor } from './sessionActor'
import { changeMemberRole, removeMember } from './teamManagement'

const editor: Actor = { id: 'u-editor', role: 'editor' }
const campaign: Actor = { id: 'u-campaign', role: 'campaign' }
const practitioner: Actor = { id: 'u-demo', role: 'practitioner' }
const admin: Actor = { id: 'u-ops-admin', role: 'admin' }
const superAdmin: Actor = { id: 'u-admin', role: 'super_admin' }

const ITEMS_KEY = 'nff.cms.items'
const snapshot = () => ({
  items: localStorage.getItem(ITEMS_KEY),
  stages: [localStorage.getItem('nff.cms.stage-order'), localStorage.getItem('nff.cms.new-stages')],
  campaigns: [localStorage.getItem('nff.cms.campaigns'), localStorage.getItem('nff.cms.campaigns-new')],
  users: localStorage.getItem('nff.cms.user-status'),
  score: localStorage.getItem('nff.cms.score-weights'),
  roles: localStorage.getItem('nff.rbac.role-assignments.v1'),
  removed: localStorage.getItem('nff.rbac.removed-staff.v1'),
})

const draftBy = (actor: Actor) => createCmsItem('exploration', actor)

function signIn(email: string) {
  const [local] = email.split('@')
  localStorage.setItem(
    'nff.session',
    JSON.stringify({ token: 't', user: { id: `x-${local}`, name: local, email, role: 'visitor', verified: true } }),
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('content mutations', () => {
  it('lets an Editor create, edit and save drafts, and submit for review', () => {
    const item = draftBy(editor)
    const saved = saveCmsItem({ ...item, title: 'A draft title', slug: 'a-draft-title' }, editor)
    expect(saved.title).toBe('A draft title')
    const submitted = setCmsStatus(item.id, 'in_review', {}, editor)
    expect(submitted?.status).toBe('in_review')
  })

  it('stops an Editor publishing, approving, scheduling or rejecting through setCmsStatus', () => {
    const item = draftBy(editor)
    setCmsStatus(item.id, 'in_review', {}, editor)
    const before = snapshot()
    for (const status of ['published', 'scheduled', 'rejected', 'unpublished'] as const) {
      expect(() => setCmsStatus(item.id, status, {}, editor), status).toThrow(ForbiddenError)
    }
    expect(snapshot()).toEqual(before)
  })

  it('stops an Editor publishing by smuggling a status through saveCmsItem', () => {
    const item = draftBy(editor)
    const before = snapshot()
    expect(() => saveCmsItem({ ...item, status: 'published' }, editor)).toThrow(ForbiddenError)
    expect(() => saveCmsItem({ ...item, scheduledFor: '2030-01-01T00:00:00.000Z' }, editor)).toThrow(ForbiddenError)
    expect(() => saveCmsItem({ ...item, rejectionNote: 'self-approved' }, editor)).toThrow(ForbiddenError)
    expect(snapshot()).toEqual(before)
    expect(setCmsStatus(item.id, 'draft', {}, editor)?.status).toBe('draft')
  })

  it('ignores fields other than the schedule and feedback passed as extra', () => {
    const item = draftBy(admin)
    setCmsStatus(item.id, 'in_review', {}, admin)
    const done = setCmsStatus(item.id, 'published', { title: 'hijacked' } as never, admin)
    expect(done?.status).toBe('published')
    expect(done?.title).not.toBe('hijacked')
  })

  it('lets an Admin approve, reject, schedule, publish and unpublish', () => {
    const item = draftBy(admin)
    setCmsStatus(item.id, 'in_review', {}, admin)
    expect(setCmsStatus(item.id, 'rejected', { rejectionNote: 'Needs a clearer opening.' }, admin)?.rejectionNote).toBe('Needs a clearer opening.')
    setCmsStatus(item.id, 'in_review', {}, admin)
    expect(setCmsStatus(item.id, 'published', {}, admin)?.status).toBe('published')
    expect(setCmsStatus(item.id, 'unpublished', {}, admin)?.status).toBe('unpublished')
    const other = draftBy(admin)
    setCmsStatus(other.id, 'in_review', {}, admin)
    expect(setCmsStatus(other.id, 'scheduled', { scheduledFor: '2030-01-01T00:00:00.000Z' }, admin)?.status).toBe('scheduled')
  })

  it('refuses transitions the workflow does not allow, even for an Admin', () => {
    const item = draftBy(admin)
    expect(() => setCmsStatus(item.id, 'rejected', {}, admin)).toThrow(ForbiddenError)
    expect(() => setCmsStatus(item.id, 'unpublished', {}, admin)).toThrow(ForbiddenError)
  })

  it('lets a Super admin do everything an Admin can', () => {
    const item = draftBy(superAdmin)
    expect(setCmsStatus(item.id, 'published', {}, superAdmin)?.status).toBe('published')
  })

  it('stops a Campaign manager changing learning content', () => {
    const real = draftBy(editor)
    const before = snapshot()
    expect(() => createCmsItem('exploration', campaign)).toThrow(ForbiddenError)
    expect(() => duplicateCmsItem(real, campaign)).toThrow(ForbiddenError)
    expect(() => saveCmsItem({ ...real, title: 'No' }, campaign)).toThrow(ForbiddenError)
    expect(() => setCmsStatus(real.id, 'in_review', {}, campaign)).toThrow(ForbiddenError)
    expect(() => saveStageOrder(['stage-2', 'stage-1'], campaign)).toThrow(ForbiddenError)
    expect(snapshot()).toEqual(before)
  })

  it('stops a Practitioner, a visitor, an unknown role and no actor changing anything', () => {
    const real = draftBy(editor)
    const before = snapshot()
    const ghost = { id: 'g', role: 'god' } as unknown as Actor
    for (const who of [practitioner, null, ghost, { id: 'v', role: 'visitor' } as Actor]) {
      expect(() => createCmsItem('exploration', who)).toThrow(ForbiddenError)
      expect(() => saveCmsItem({ ...real, title: 'No' }, who)).toThrow(ForbiddenError)
      expect(() => setCmsStatus(real.id, 'published', {}, who)).toThrow(ForbiddenError)
      expect(() => addStage('Nope', who)).toThrow(ForbiddenError)
      expect(() => setUserStatus('u-demo', 'deactivated', who)).toThrow(ForbiddenError)
      expect(() => saveScoreWeights({ loginRecency: 20, minutesListened: 25, completion: 25, progression: 20, email: 10 }, who)).toThrow(ForbiddenError)
    }
    expect(snapshot()).toEqual(before)
  })

  it('falls back to the signed-in session when no actor is passed, and denies when signed out', () => {
    expect(() => createCmsItem('exploration')).toThrow(ForbiddenError)
    signIn('editor@nff.demo')
    expect(createCmsItem('exploration').type).toBe('exploration')
    signIn('practitioner@nff.demo')
    expect(() => createCmsItem('exploration')).toThrow(ForbiddenError)
  })
})

describe('reads', () => {
  it('rejects reads the actor has no permission for, without returning data', async () => {
    await expect(listAllCmsItems(campaign)).rejects.toBeInstanceOf(ForbiddenError)
    await expect(getCmsItem('exp-1', practitioner)).rejects.toBeInstanceOf(ForbiddenError)
    await expect(getUsers(editor)).rejects.toBeInstanceOf(ForbiddenError)
    expect((await listAllCmsItems(admin)).length).toBeGreaterThan(0)
  })

  it('redacts delivery recipients unless the actor may see them', async () => {
    const asCampaign = await getDelivery(campaign)
    const asAdmin = await getDelivery(admin)
    expect(asCampaign.length).toBeGreaterThan(0)
    expect(asCampaign.every((log) => log.userId === 'redacted')).toBe(true)
    expect(asAdmin.some((log) => log.userId !== 'redacted')).toBe(true)
    await expect(getDelivery(editor)).rejects.toBeInstanceOf(ForbiddenError)
  }, 10_000)
})

describe('learning, people, campaigns and settings', () => {
  it('limits curriculum changes to Admin and Super admin', () => {
    expect(() => addStage('Nope', editor)).toThrow(ForbiddenError)
    expect(addStage('A new stage', admin).title).toBe('A new stage')
  })

  it('limits campaign changes to the Campaign manager, and sending to campaigns.send', () => {
    const id = campaigns[0]!.id
    expect(() => patchCampaign(id, { state: 'paused' }, editor)).toThrow(ForbiddenError)
    expect(() => patchCampaign(id, { state: 'paused' }, admin)).toThrow(ForbiddenError)
    expect(() => patchCampaign(id, { state: 'paused' }, campaign)).not.toThrow()
    const next = { ...campaigns[0]!, id: 'cmp-new', state: 'running' as const }
    expect(() => addCampaign(next, admin)).toThrow(ForbiddenError)
    expect(() => addCampaign(next, campaign)).not.toThrow()
  })

  it('limits score configuration to Super admin, and records who saved', () => {
    const weights = { loginRecency: 20, minutesListened: 25, completion: 25, progression: 20, email: 10 }
    expect(() => saveScoreWeights(weights, editor)).toThrow(ForbiddenError)
    expect(() => saveScoreWeights(weights, campaign)).toThrow(ForbiddenError)
    expect(() => saveScoreWeights(weights, admin)).toThrow(ForbiddenError)
    expect(localStorage.getItem('nff.cms.score-weights')).toBeNull()
    saveScoreWeights({ ...weights, email: 10 }, superAdmin)
    expect(loadScoreWeights()).toEqual(weights)
    expect(JSON.parse(localStorage.getItem('nff.cms.score-weights.log')!)[0].by).toBe('u-admin')
  })

  it('limits practitioner status changes to Admin and Super admin, and denial leaves records intact', () => {
    const before = snapshot()
    expect(() => setUserStatus('u-demo', 'deactivated', editor)).toThrow(ForbiddenError)
    expect(snapshot()).toEqual(before)
    setUserStatus('u-demo', 'deactivated', admin)
    expect(JSON.parse(localStorage.getItem('nff.cms.user-status')!)['u-demo']).toBe('deactivated')
  })

  it('a deactivated account cannot sign in, and loses its session', async () => {
    setUserStatus('u-demo', 'deactivated', admin)
    await expect(login('practitioner@nff.demo', 'practice123')).rejects.toMatchObject({ code: 'account_unavailable' })
    signIn('practitioner@nff.demo')
    expect(getStoredSession()).toBeNull()
  }, 10_000)

  it('keeps assignment management to Admin and Super admin', () => {
    const input = { pathId: 'path-meadow-journey', target: { type: 'user' as const, userId: 'u-demo' } }
    const before = localStorage.getItem('meadow.assignments.v1')
    expect(() => assignLearning(input, editor)).toThrow(ForbiddenError)
    expect(() => assignLearning(input, campaign)).toThrow(ForbiddenError)
    expect(() => assignLearning(input, practitioner)).toThrow(ForbiddenError)
    expect(() => withdrawLearning('asg-x', editor)).toThrow(ForbiddenError)
    expect(() => saveLearningGroup({ id: 'g1', name: 'G', memberIds: [] } as never, editor)).toThrow(ForbiddenError)
    expect(localStorage.getItem('meadow.assignments.v1')).toBe(before)
    expect(assignLearning(input, admin).assignedBy).toBe('u-ops-admin')
  })
})

describe('Admin and Super admin separation', () => {
  it('reads the existing demo Admin account as the designated Super admin, and any other legacy admin as Admin', () => {
    const roles = Object.fromEntries(listStaffMembers().map((member) => [member.email, member.role]))
    expect(roles['admin@nff.demo']).toBe('super_admin')
    expect(roles['ops.admin@nff.demo']).toBe('admin')
    expect(roles['editor@nff.demo']).toBe('editor')
    expect(roles['campaign@nff.demo']).toBe('campaign')
  })

  it('puts the resolved role in the session', () => {
    signIn('admin@nff.demo')
    expect(getStoredSession()?.user.role).toBe('super_admin')
    signIn('ops.admin@nff.demo')
    expect(getStoredSession()?.user.role).toBe('admin')
  })

  it('does not honour a role written into the stored session', () => {
    localStorage.setItem(
      'nff.session',
      JSON.stringify({ token: 't', user: { id: 'u-editor', name: 'x', email: 'editor@nff.demo', role: 'super_admin', verified: true } }),
    )
    expect(getStoredSession()?.user.role).toBe('editor')
  })

  it('ignores the legacy role-override key that never took effect', () => {
    localStorage.setItem('nff.cms.member-roles', JSON.stringify({ 'u-editor': 'admin' }))
    expect(effectiveRole({ id: 'u-editor', role: 'editor' })).toBe('editor')
  })

  it('ignores a tampered assignment that is not a valid staff role', () => {
    localStorage.setItem('nff.rbac.role-assignments.v1', JSON.stringify({ 'u-editor': { role: 'root', by: 'x', at: '' } }))
    expect(effectiveRole({ id: 'u-editor', role: 'editor' })).toBe('editor')
    localStorage.setItem('nff.rbac.role-assignments.v1', JSON.stringify({ 'u-demo': { role: 'super_admin', by: 'x', at: '' } }))
    expect(effectiveRole({ id: 'u-demo', role: 'practitioner' })).toBe('practitioner')
  })

  it('stops an Admin granting Super admin or admin, and leaves roles untouched', () => {
    const before = snapshot()
    expect(() => changeMemberRole('u-editor', 'super_admin', admin)).toThrow(RoleChangeError)
    expect(() => changeMemberRole('u-editor', 'admin', admin)).toThrow(RoleChangeError)
    expect(() => changeMemberRole('u-admin', 'editor', admin)).toThrow(RoleChangeError)
    expect(snapshot()).toEqual(before)
  })

  it('stops an Editor or Campaign manager changing roles', () => {
    expect(() => changeMemberRole('u-campaign', 'admin', editor)).toThrow(ForbiddenError)
    expect(() => changeMemberRole('u-editor', 'admin', campaign)).toThrow(ForbiddenError)
  })

  it('lets a Super admin promote an Admin to Super admin, and the change affects permissions', () => {
    changeMemberRole('u-ops-admin', 'super_admin', superAdmin)
    signIn('ops.admin@nff.demo')
    expect(sessionActor()?.role).toBe('super_admin')
    expect(can(sessionActor(), 'roles.manage')).toBe(true)
  })

  it('applies a role change to the next permission check', () => {
    signIn('editor@nff.demo')
    expect(can(sessionActor(), 'content.edit')).toBe(true)
    changeMemberRole('u-editor', 'campaign', admin)
    expect(sessionActor()?.role).toBe('campaign')
    expect(can(sessionActor(), 'content.edit')).toBe(false)
    expect(can(sessionActor(), 'campaigns.manage')).toBe(true)
    expect(() => createCmsItem('exploration')).toThrow(ForbiddenError)
  })

  it('refuses to demote or remove the last active Super admin', () => {
    expect(() => changeMemberRole('u-admin', 'admin', superAdmin)).toThrow(/at least one active Super admin/)
    expect(() => removeMember('u-admin', superAdmin)).toThrow(RoleChangeError)
    expect(effectiveRole({ id: 'u-admin', role: 'admin' })).toBe('super_admin')
  })

  it('lets a Super admin demote another once a second exists, but not the last one standing', () => {
    changeMemberRole('u-ops-admin', 'super_admin', superAdmin)
    changeMemberRole('u-admin', 'admin', { id: 'u-ops-admin', role: 'super_admin' })
    expect(staffSnapshot().filter((member) => member.role === 'super_admin')).toHaveLength(1)
    expect(() => changeMemberRole('u-ops-admin', 'editor', { id: 'u-ops-admin', role: 'super_admin' })).toThrow(RoleChangeError)
  })

  it('refuses to deactivate the last active Super admin through user status', () => {
    expect(() => setUserStatus('u-admin', 'deactivated', superAdmin)).toThrow(ForbiddenError)
    expect(localStorage.getItem('nff.cms.user-status')).toBeNull()
  })

  it('removing staff deactivates the account: the role is kept and the account cannot sign in', async () => {
    removeMember('u-editor', admin)
    expect(effectiveRole({ id: 'u-editor', role: 'editor' })).toBe('editor')
    expect(listStaffMembers().find((member) => member.id === 'u-editor')).toMatchObject({ role: 'editor', active: false })
    await expect(login('editor@nff.demo', 'practice123')).rejects.toMatchObject({ code: 'account_unavailable' })
    signIn('editor@nff.demo')
    expect(getStoredSession()).toBeNull()
    expect(() => removeMember('u-campaign', editor)).toThrow(ForbiddenError)
    // Reactivation reverses it.
    setUserStatus('u-editor', 'active', admin)
    await expect(login('editor@nff.demo', 'practice123')).resolves.toBeTruthy()
  }, 10_000)

  it('reads the Phase 1 removed-staff key as deactivated', () => {
    localStorage.setItem('nff.rbac.removed-staff.v1', JSON.stringify(['u-campaign']))
    expect(listStaffMembers().find((member) => member.id === 'u-campaign')?.active).toBe(false)
  })
})

describe('data integrity', () => {
  it('leaves Practitioner progress and assignments alone, whatever happens in the CMS', () => {
    const progress = JSON.stringify({ version: 2, userId: 'u-demo', lessons: {}, media: {}, activity: [], updatedAt: 'x' })
    localStorage.setItem(progressKey('u-demo'), progress)
    localStorage.setItem('meadow.assignments.v1', '[]')
    const item = draftBy(editor)
    setCmsStatus(item.id, 'in_review', {}, editor)
    expect(() => setCmsStatus(item.id, 'published', {}, editor)).toThrow(ForbiddenError)
    setCmsStatus(item.id, 'published', {}, admin)
    changeMemberRole('u-editor', 'campaign', admin)
    expect(localStorage.getItem(progressKey('u-demo'))).toBe(progress)
    expect(localStorage.getItem('meadow.assignments.v1')).toBe('[]')
  })

  it('keeps existing CMS records intact when a write is denied', async () => {
    const [first] = await listAllCmsItems(admin)
    const original: CmsItem = { ...first! }
    expect(() => setCmsStatus(original.id, 'unpublished', {}, editor)).toThrow(ForbiddenError)
    expect(() => saveCmsItem({ ...original, title: 'Changed' }, practitioner)).toThrow(ForbiddenError)
    const [again] = (await listAllCmsItems(admin)).filter((item) => item.id === original.id)
    expect(again).toEqual(original)
  })

  it('does not change seeded dates between reads', async () => {
    const one = await listAllCmsItems(admin)
    const two = await listAllCmsItems(admin)
    expect(two.map((item) => item.scheduledFor)).toEqual(one.map((item) => item.scheduledFor))
  })
})

describe('audit events', () => {
  it('starts empty: no history is invented', () => {
    expect(listAuditEvents()).toEqual([])
  })

  it('records a success with the actor, action, resource and outcome', () => {
    const item = draftBy(admin)
    setCmsStatus(item.id, 'published', {}, admin)
    const event = listAuditEvents().find((entry) => entry.action === 'content.publish')!
    expect(event).toMatchObject({ actorId: 'u-ops-admin', resourceType: 'content', resourceId: item.id, outcome: 'success' })
    expect(event.id).toMatch(/^evt-/)
    expect(Number.isNaN(Date.parse(event.at))).toBe(false)
  })

  it('records a denial without changing data', () => {
    const item = draftBy(editor)
    expect(() => setCmsStatus(item.id, 'published', {}, editor)).toThrow(ForbiddenError)
    const denied = listAuditEvents().filter((entry) => entry.outcome === 'denied')
    expect(denied).toHaveLength(1)
    expect(denied[0]).toMatchObject({ actorId: 'u-editor', action: 'content.publish', resourceId: item.id })
  })

  it('records role changes with roles but no personal details', () => {
    changeMemberRole('u-editor', 'campaign', admin)
    const event = listAuditEvents().find((entry) => entry.action === 'team.roles.assign')!
    expect(event.metadata).toEqual({ fromRole: 'editor', toRole: 'campaign' })
    expect(JSON.stringify(listAuditEvents())).not.toContain('@nff.demo')
  })

  it('does not audit draft saves', () => {
    const item = draftBy(editor)
    const count = listAuditEvents().length
    saveCmsItem({ ...item, title: 'Edited' }, editor)
    expect(listAuditEvents()).toHaveLength(count)
  })
})
