import { beforeEach, describe, expect, it } from 'vitest'
import { campaigns } from '@/mocks/db'
import {
  addCampaign,
  discardRevision,
  getCmsItem,
  listAllCmsItems,
  listCmsItems,
  patchCampaign,
  publishRevision,
  rejectRevision,
  saveCmsItem,
  saveScoreWeights,
  setCmsStatus,
  setContentOwnership,
  submitRevision,
  createCmsItem,
  duplicateCmsItem,
  getDelivery,
  type CmsItem,
} from '@/services/cms'
import {
  ENROLMENTS_KEY,
  ensureDefaultAssignment,
  listAssignments,
  startEnrolment,
} from '@/services/learning/assignments'
import { MEADOW_JOURNEY_ID } from '@/services/learning/catalogue'
import { progressKey, recordReading, loadProgress } from '@/services/learning/progress'
import { DEMO_EDITOR_ACCOUNT_ID, DEMO_OWNED_CONTENT } from '@/config/demoOwnership'
import { content, userById } from '@/mocks/db'
import { isRevisionStale } from '@/services/cms'
import { ForbiddenError, type Actor } from './authorize'
import { assignLearning, saveLearningGroup, withdrawLearning } from './assignmentGuards'
import { canAccessContent, ownershipState } from './contentAccess'
import { readAuditTrail } from './guard'
import { changeMemberRole } from './teamManagement'

const editor: Actor = { id: 'u-editor', role: 'editor' }
const campaign: Actor = { id: 'u-campaign', role: 'campaign' }
const practitioner: Actor = { id: 'u-demo', role: 'practitioner' }
const admin: Actor = { id: 'u-ops-admin', role: 'admin' }
const superAdmin: Actor = { id: 'u-admin', role: 'super_admin' }

beforeEach(() => localStorage.clear())

const stored = (id: string): CmsItem => JSON.parse(localStorage.getItem('nff.cms.items') ?? '{}')[id]

/** A live, legacy, unassigned exploration (not one of the demo-seeded ones). */
async function liveItem() {
  const all = await listAllCmsItems(admin)
  return all.find((item) => item.status === 'published' && item.type === 'exploration' && !item.ownerId)!
}

describe('Campaigns: Admin is view-only, Campaign manager and Super admin act', () => {
  const next = { ...campaigns[0]!, id: 'cmp-policy', state: 'running' as const }

  it('Admin cannot create, send, pause or resume, and nothing is written', () => {
    expect(() => addCampaign(next, admin)).toThrow(ForbiddenError)
    expect(() => addCampaign({ ...next, state: 'scheduled' }, admin)).toThrow(ForbiddenError)
    expect(() => patchCampaign(campaigns[0]!.id, { state: 'paused' }, admin)).toThrow(ForbiddenError)
    expect(localStorage.getItem('nff.cms.campaigns')).toBeNull()
    expect(localStorage.getItem('nff.cms.campaigns-new')).toBeNull()
  })

  it('Campaign manager and Super admin can create and send', () => {
    expect(() => addCampaign(next, campaign)).not.toThrow()
    expect(() => addCampaign({ ...next, id: 'cmp-policy-2' }, superAdmin)).not.toThrow()
    expect(() => patchCampaign(campaigns[0]!.id, { state: 'paused' }, campaign)).not.toThrow()
  })

  it('Admin can still see delivery status and recipients', async () => {
    const logs = await getDelivery(admin)
    expect(logs.some((log) => log.userId !== 'redacted')).toBe(true)
  }, 10_000)
})

describe('Scores and audit trail', () => {
  const weights = { loginRecency: 20, minutesListened: 25, completion: 25, progression: 20, email: 10 }

  it('Admin cannot configure scores; Super admin can', () => {
    expect(() => saveScoreWeights(weights, admin)).toThrow(ForbiddenError)
    expect(localStorage.getItem('nff.cms.score-weights')).toBeNull()
    expect(() => saveScoreWeights(weights, superAdmin)).not.toThrow()
  })

  it('Admin and Super admin can read the audit trail; nobody else can', () => {
    createCmsItem('exploration', editor)
    expect(readAuditTrail(admin).length).toBeGreaterThan(0)
    expect(readAuditTrail(superAdmin).length).toBeGreaterThan(0)
    for (const who of [editor, campaign, practitioner, null, { id: 'g', role: 'god' } as unknown as Actor]) {
      expect(() => readAuditTrail(who)).toThrow(ForbiddenError)
    }
  })
})

describe('Role grants', () => {
  it('only a Super admin can grant or change Admin and Super admin', () => {
    expect(() => changeMemberRole('u-editor', 'admin', admin)).toThrow(ForbiddenError)
    expect(() => changeMemberRole('u-editor', 'super_admin', admin)).toThrow(ForbiddenError)
    expect(() => changeMemberRole('u-ops-admin', 'editor', admin)).toThrow(ForbiddenError)
    expect(localStorage.getItem('nff.rbac.role-assignments.v1')).toBeNull()
    expect(changeMemberRole('u-editor', 'admin', superAdmin)).toBe('admin')
  })
})

describe('content ownership', () => {
  it('canAccessContent: reviewers see all, Editors only their own and shared, legacy is unassigned', () => {
    const legacy = {}
    const owned = { ownerId: 'e1', collaboratorIds: ['e2'] }
    expect(ownershipState(legacy)).toBe('unassigned')
    expect(ownershipState(owned)).toBe('owned')
    expect(canAccessContent(admin, legacy)).toBe(true)
    expect(canAccessContent(superAdmin, legacy)).toBe(true)
    expect(canAccessContent({ id: 'e1', role: 'editor' }, owned)).toBe(true)
    expect(canAccessContent({ id: 'e2', role: 'editor' }, owned)).toBe(true)
    expect(canAccessContent({ id: 'e3', role: 'editor' }, owned)).toBe(false)
    expect(canAccessContent({ id: 'e1', role: 'editor' }, legacy)).toBe(false)
    expect(canAccessContent(campaign, owned)).toBe(false)
    expect(canAccessContent(null, owned)).toBe(false)
  })

  it('does not infer ownership from a display name', async () => {
    const item = await liveItem()
    expect(item.owner).toBeTruthy() // a legacy display label exists...
    expect(item.ownerId).toBeUndefined() // ...but is not an owner
    expect(await getCmsItem(item.id, editor)).toBeNull()
    expect(() => saveCmsItem({ ...item, title: 'x' }, editor)).toThrow(ForbiddenError)
  })

  it('lists only an Editor’s own and shared items', async () => {
    const own = createCmsItem('exploration', editor)
    const shared = await liveItem()
    const seeded = Object.keys(DEMO_OWNED_CONTENT).filter((id) => id.startsWith('exp-'))
    expect((await listCmsItems('exploration', editor)).map((item) => item.id).sort()).toEqual([own.id, ...seeded].sort())
    setContentOwnership(shared.id, { collaboratorIds: ['u-editor'] }, admin)
    expect((await listCmsItems('exploration', editor)).map((item) => item.id).sort()).toEqual([own.id, shared.id, ...seeded].sort())
  }, 10_000)

  it('records real account ids on creation and never lets a save change them', () => {
    const item = createCmsItem('exploration', editor)
    expect(item).toMatchObject({ createdBy: 'u-editor', ownerId: 'u-editor', collaboratorIds: [] })
    const saved = saveCmsItem({ ...item, title: 'Mine', createdBy: 'someone-else', ownerId: 'someone-else', collaboratorIds: ['x'] }, editor)
    expect(saved).toMatchObject({ createdBy: 'u-editor', ownerId: 'u-editor', collaboratorIds: [] })
    expect(duplicateCmsItem(saved, editor)).toMatchObject({ createdBy: 'u-editor', ownerId: 'u-editor' })
  })

  it('only Admin and Super admin assign owners, and only to active content-capable staff', async () => {
    const item = await liveItem()
    expect(() => setContentOwnership(item.id, { ownerId: 'u-editor' }, editor)).toThrow(ForbiddenError)
    expect(() => setContentOwnership(item.id, { ownerId: 'u-editor' }, campaign)).toThrow(ForbiddenError)
    for (const bad of ['u-campaign', 'u-demo', 'nobody']) {
      expect(() => setContentOwnership(item.id, { ownerId: bad }, admin), bad).toThrow(ForbiddenError)
    }
    const updated = setContentOwnership(item.id, { ownerId: 'u-editor' }, superAdmin)
    expect(updated.ownerId).toBe('u-editor')
    expect(updated.createdBy).toBeUndefined() // a legacy record never gains a creator
    expect(setContentOwnership(item.id, { ownerId: null }, admin).ownerId).toBeUndefined()
  })

  it('a deactivated Editor cannot be given content', async () => {
    const item = await liveItem()
    localStorage.setItem('nff.cms.user-status', JSON.stringify({ 'u-editor': 'deactivated' }))
    expect(() => setContentOwnership(item.id, { ownerId: 'u-editor' }, admin)).toThrow(ForbiddenError)
  })
})

describe('revisions of live content', () => {
  async function shared() {
    const item = await liveItem()
    setContentOwnership(item.id, { ownerId: 'u-editor' }, admin)
    return item
  }

  it('an Editor edits a revision; the live version is untouched', async () => {
    const item = await shared()
    const working = await getCmsItem(item.id, editor)
    const saved = saveCmsItem({ ...working!, title: 'A better title', body: 'New body.' }, editor)
    expect(saved.title).toBe('A better title') // the author sees their working copy
    expect(saved.status).toBe('published')

    const live = await getCmsItem(item.id, admin)
    expect(live!.title).toBe(item.title)
    expect(live!.body).toBe(item.body)
    expect(stored(item.id).title).toBe(item.title)
    expect(stored(item.id).revision).toMatchObject({ status: 'draft', authorId: 'u-editor', fields: { title: 'A better title', body: 'New body.' } })
  })

  it('an Editor cannot modify, unpublish, revert or re-review the live version directly', async () => {
    const item = await shared()
    const working = (await getCmsItem(item.id, editor))!
    for (const status of ['draft', 'in_review', 'unpublished', 'scheduled', 'rejected'] as const) {
      expect(() => setCmsStatus(item.id, status, {}, editor), status).toThrow(ForbiddenError)
      expect(() => saveCmsItem({ ...working, status }, editor), `save ${status}`).toThrow(ForbiddenError)
    }
    expect((await getCmsItem(item.id, admin))!.status).toBe('published')
  })

  it('submitting sends the revision, not the live item, to review; an Editor cannot publish it', async () => {
    const item = await shared()
    saveCmsItem({ ...(await getCmsItem(item.id, editor))!, title: 'Draft revision' }, editor)
    submitRevision(item.id, editor)
    expect(stored(item.id).revision!.status).toBe('in_review')
    expect(stored(item.id).status).toBe('published')
    expect(() => publishRevision(item.id, editor)).toThrow(ForbiddenError)
    expect(() => rejectRevision(item.id, 'x', editor)).toThrow(ForbiddenError)
    expect((await getCmsItem(item.id, admin))!.title).toBe(item.title)
  })

  it('a rejected revision does not replace live content, and the author sees why', async () => {
    const item = await shared()
    saveCmsItem({ ...(await getCmsItem(item.id, editor))!, title: 'Rejected title' }, editor)
    submitRevision(item.id, editor)
    rejectRevision(item.id, 'Please keep the original opening.', admin)

    const live = await getCmsItem(item.id, admin)
    expect(live!.title).toBe(item.title)
    expect(live!.status).toBe('published')
    expect(live!.revision).toMatchObject({ status: 'rejected', rejectionNote: 'Please keep the original opening.' })
    const authors = await getCmsItem(item.id, editor)
    expect(authors!.title).toBe('Rejected title')
    expect(authors!.revision!.rejectionNote).toBe('Please keep the original opening.')
  })

  it('editing after rejection reopens a draft, and an approved revision becomes the live version', async () => {
    const item = await shared()
    saveCmsItem({ ...(await getCmsItem(item.id, editor))!, title: 'First try' }, editor)
    submitRevision(item.id, editor)
    rejectRevision(item.id, 'No.', admin)
    saveCmsItem({ ...(await getCmsItem(item.id, editor))!, title: 'Second try' }, editor)
    expect(stored(item.id).revision!.status).toBe('draft')
    submitRevision(item.id, editor)
    const published = publishRevision(item.id, admin)
    expect(published).toMatchObject({ title: 'Second try', status: 'published' })
    expect(published.revision).toBeUndefined()
    expect(stored(item.id).title).toBe('Second try')
  })

  it('only a reviewer can publish a revision that is in review', async () => {
    const item = await shared()
    saveCmsItem({ ...(await getCmsItem(item.id, editor))!, title: 'x' }, editor)
    expect(() => publishRevision(item.id, admin)).toThrow(ForbiddenError) // still a draft
    submitRevision(item.id, editor)
    expect(() => publishRevision(item.id, campaign)).toThrow(ForbiddenError)
    expect(() => publishRevision(item.id, practitioner)).toThrow(ForbiddenError)
    expect(() => publishRevision(item.id, null)).toThrow(ForbiddenError)
    expect(publishRevision(item.id, admin).title).toBe('x')
  })

  it('reverting every change drops the revision, and an author can discard one', async () => {
    const item = await shared()
    const working = (await getCmsItem(item.id, editor))!
    saveCmsItem({ ...working, title: 'Temp' }, editor)
    saveCmsItem({ ...working, title: item.title }, editor)
    expect(stored(item.id).revision).toBeUndefined()
    saveCmsItem({ ...working, title: 'Temp again' }, editor)
    discardRevision(item.id, editor)
    expect(stored(item.id).revision).toBeUndefined()
    expect((await getCmsItem(item.id, editor))!.title).toBe(item.title)
  })

  it('Admin and Super admin may still edit live content directly', async () => {
    const item = await liveItem()
    const edited = saveCmsItem({ ...item, title: 'Direct edit' }, admin)
    expect(edited.title).toBe('Direct edit')
    expect(stored(item.id).revision).toBeUndefined()
  })

  it('does not touch other records, or the live updatedAt, when a revision is saved', async () => {
    const item = await shared()
    const before = (await listAllCmsItems(admin)).filter((entry) => entry.id !== item.id)
    const liveStamp = (await getCmsItem(item.id, admin))!.updatedAt
    saveCmsItem({ ...(await getCmsItem(item.id, editor))!, title: 'Only a revision' }, editor)
    const after = (await listAllCmsItems(admin)).filter((entry) => entry.id !== item.id)
    expect(after).toEqual(before)
    expect((await getCmsItem(item.id, admin))!.updatedAt).toBe(liveStamp)
  }, 10_000)

  it('a revision is only an edit to live content: drafts are edited directly', () => {
    const draft = createCmsItem('exploration', editor)
    const saved = saveCmsItem({ ...draft, title: 'Plain draft' }, editor)
    expect(saved.revision).toBeUndefined()
    expect(stored(draft.id).title).toBe('Plain draft')
  })
})

describe('learning assignments', () => {
  const input = { pathId: MEADOW_JOURNEY_ID, target: { type: 'user' as const, userId: 'u-demo' } }

  it('rejects every unauthorised actor and changes nothing', () => {
    ensureDefaultAssignment(practitioner)
    const before = JSON.stringify(listAssignments())
    for (const who of [editor, campaign, practitioner, null, { id: 'g', role: 'god' } as unknown as Actor]) {
      expect(() => assignLearning(input, who)).toThrow(ForbiddenError)
      expect(() => withdrawLearning(listAssignments()[0]!.id, who)).toThrow(ForbiddenError)
      expect(() => saveLearningGroup({ id: 'g1', name: 'G', memberIds: [] } as never, who)).toThrow(ForbiddenError)
    }
    expect(JSON.stringify(listAssignments())).toBe(before)
  })

  it('lets Admin and Super admin act, on real records only', () => {
    expect(assignLearning(input, admin).assignedBy).toBe('u-ops-admin')
    expect(assignLearning({ ...input, id: 'asg-2' }, superAdmin).assignedBy).toBe('u-admin')
    expect(() => assignLearning({ ...input, pathId: 'path-nope' }, admin)).toThrow(/does not exist/)
    expect(() => assignLearning({ ...input, target: { type: 'user', userId: 'ghost' } }, admin)).toThrow(/does not exist/)
    expect(() => assignLearning({ ...input, target: { type: 'group', groupId: 'ghost' } }, admin)).toThrow(/does not exist/)
    expect(() => withdrawLearning('asg-ghost', admin)).toThrow(/does not exist/)
    const id = listAssignments()[0]!.id
    withdrawLearning(id, admin)
    expect(listAssignments().find((entry) => entry.id === id)?.status).toBe('withdrawn')
  })

  it('practitioner self-service still works and existing assignment data is intact', () => {
    const asg = ensureDefaultAssignment(practitioner)
    expect(asg).toMatchObject({ assignedBy: 'system:migration', status: 'active' })
    // Denied admin attempts first, then self-service.
    expect(() => withdrawLearning(asg!.id, editor)).toThrow(ForbiddenError)
    expect(listAssignments().find((entry) => entry.id === asg!.id)?.status).toBe('active')

    expect(startEnrolment('u-demo', MEADOW_JOURNEY_ID)).toMatchObject({ userId: 'u-demo', status: 'in_progress' })
    expect(localStorage.getItem(ENROLMENTS_KEY)).toContain('u-demo')
    recordReading('u-demo', 'lesson-exp-1', 40)
    expect(loadProgress('u-demo').lessons['lesson-exp-1']?.reading?.scrollPct).toBe(40)
    expect(localStorage.getItem(progressKey('u-demo'))).toBeTruthy()
  })
})

describe('assignment write boundary', () => {
  const files = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  const production = Object.entries(files).filter(([path]) => !/\.test\.tsx?$/.test(path))

  it('only the store and the guarded wrappers reference the administrative assignment primitives', () => {
    const offenders = production
      .filter(([, source]) => /\b(assignPath|withdrawAssignment|saveGroup)\b/.test(source))
      .map(([path]) => path)
      .filter(
        (path) =>
          path !== '/src/services/learning/assignments.ts' && path !== '/src/services/rbac/assignmentGuards.ts',
      )
    expect(offenders).toEqual([])
  })

  it('no CMS or Admin code touches the assignment store or enrolment writes', () => {
    const adminFiles = production.filter(
      ([path]) =>
        path.startsWith('/src/pages/cms/') ||
        path.startsWith('/src/components/cms/') ||
        path === '/src/services/cms.ts' ||
        path === '/src/app/cmsRoutes.tsx',
    )
    expect(adminFiles.length).toBeGreaterThan(10)
    for (const [path, source] of adminFiles) {
      expect(source, path).not.toMatch(/learning\/assignments/)
      expect(source, path).not.toMatch(/\b(startEnrolment|setEnrolmentStatus)\b/)
    }
  })
})

describe('demo ownership seed', () => {
  const ids = Object.keys(DEMO_OWNED_CONTENT)

  it('uses a real seeded account and existing content ids', () => {
    expect(userById.get(DEMO_EDITOR_ACCOUNT_ID)?.role).toBe('editor')
    for (const id of ids) expect(content.some((item) => item.id === id), id).toBe(true)
  })

  it('assigns a small selection by ownerId only, and leaves everything else unassigned', async () => {
    const all = await listAllCmsItems(admin)
    const owned = all.filter((item) => item.ownerId)
    expect(owned.map((item) => item.id).sort()).toEqual([...ids].sort())
    expect(owned.length).toBeLessThan(all.length / 10)
    expect(owned.some((item) => item.type === 'exploration')).toBe(true)
    expect(owned.some((item) => item.type === 'meditation')).toBe(true)
    for (const item of owned) {
      expect(item.ownerId).toBe('u-editor')
      expect(item.createdBy).toBeUndefined() // never invented
      expect(item.collaboratorIds).toEqual([])
    }
    expect(all.filter((item) => !item.ownerId).length).toBe(all.length - ids.length)
  }, 10_000)

  it('is deterministic and idempotent, and writes nothing', async () => {
    const one = await listAllCmsItems(admin)
    const two = await listAllCmsItems(admin)
    expect(two.map((item) => [item.id, item.ownerId])).toEqual(one.map((item) => [item.id, item.ownerId]))
    expect(localStorage.getItem('nff.cms.items')).toBeNull()
  }, 10_000)

  it('lets the demo Editor open assigned records and not unassigned ones', async () => {
    expect((await getCmsItem('exp-1', editor))?.id).toBe('exp-1')
    expect((await getCmsItem('med-2', editor))?.id).toBe('med-2')
    expect(await getCmsItem('exp-3', editor)).toBeNull()
  }, 10_000)

  it('never overwrites a change an Admin made: unassigned and reassigned stay that way', async () => {
    setContentOwnership('exp-1', { ownerId: null }, admin)
    expect(await getCmsItem('exp-1', editor)).toBeNull()
    expect((await getCmsItem('exp-1', admin))?.ownerId).toBeUndefined()
    setContentOwnership('exp-2', { ownerId: 'u-ops-admin' }, superAdmin)
    expect((await getCmsItem('exp-2', admin))?.ownerId).toBe('u-ops-admin')
    expect(await getCmsItem('exp-2', editor)).toBeNull()
  }, 10_000)

  it('does not touch Practitioner content', () => {
    expect(content.find((item) => item.id === 'exp-1')).not.toHaveProperty('ownerId')
  })
})

describe('pending revision safeguards for Admin', () => {
  it('an Admin saving live content keeps the pending revision and marks it stale', async () => {
    const live = (await getCmsItem('exp-1', admin))!
    saveCmsItem({ ...(await getCmsItem('exp-1', editor))!, title: 'Editor revision' }, editor)
    const withRevision = (await getCmsItem('exp-1', admin))!
    expect(withRevision.revision?.fields.title).toBe('Editor revision')
    expect(withRevision.revision?.basedOn).toBe(live.updatedAt)
    expect(isRevisionStale(withRevision)).toBe(false)

    const edited = saveCmsItem({ ...withRevision, excerpt: 'Admin changed the excerpt directly.' }, admin)
    expect(edited.revision?.fields.title).toBe('Editor revision') // not discarded or overwritten
    expect(isRevisionStale(edited)).toBe(true)
    const authors = (await getCmsItem('exp-1', editor))!
    expect(authors.title).toBe('Editor revision')
    expect(authors.excerpt).toBe('Admin changed the excerpt directly.')
  }, 10_000)

  it('approval, rejection and publishing behave as before', async () => {
    saveCmsItem({ ...(await getCmsItem('exp-1', editor))!, title: 'Approved title' }, editor)
    submitRevision('exp-1', editor)
    expect(publishRevision('exp-1', admin)).toMatchObject({ title: 'Approved title', status: 'published' })
    saveCmsItem({ ...(await getCmsItem('exp-1', editor))!, title: 'Another' }, editor)
    submitRevision('exp-1', editor)
    rejectRevision('exp-1', 'No.', admin)
    expect((await getCmsItem('exp-1', admin))!.title).toBe('Approved title')
  }, 10_000)
})
