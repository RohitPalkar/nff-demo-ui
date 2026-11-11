import { beforeEach, describe, expect, it } from 'vitest'
import { content } from '@/mocks/db'
import type {
  AccessContext,
} from '@/services/learning/access'
import {
  canAccess,
  canAccessLesson,
  canAccessResource,
  getModuleUnlockState,
  isFull,
  publicAccessContext,
} from '@/services/learning/access'
import {
  assignPath,
  assignmentsForUser,
  defaultAssignmentId,
  ensureDefaultAssignment,
  ensureDefaultAssignments,
  listAssignments,
  saveGroup,
  withdrawAssignment,
} from '@/services/learning/assignments'
import { getAccessContext } from '@/services/learning/accessContext'
import {
  MEADOW_JOURNEY_ID,
  buildResource,
  getLearningCatalogue,
  getLessonsOf,
  getModulesOf,
  getResource,
  itemIdForLesson,
} from '@/services/learning/catalogue'
import { applyLegacyProgress, loadProgress } from '@/services/learning/progress'
import type { Progress, Resource, Role } from '@/types'

const NOW = new Date('2026-11-10T09:00:00.000Z')

const practitioner = { id: 'u-demo', role: 'practitioner' as Role }

function ctx(overrides: Partial<AccessContext> = {}): AccessContext {
  return {
    user: practitioner,
    surface: 'learn',
    assignments: [],
    groupIds: [],
    ...overrides,
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('catalogue shape', () => {
  it('migrates the six stages into one path of six ordered modules', () => {
    const { paths } = getLearningCatalogue()
    // Meadow Journey first, then the labelled demo paths (config/demoPaths.ts).
    expect(paths[0]?.title).toBe('Meadow Journey')
    expect(paths.filter((path) => path.id === MEADOW_JOURNEY_ID)).toHaveLength(1)
    const modules = getModulesOf(MEADOW_JOURNEY_ID)
    expect(modules).toHaveLength(6)
    expect(modules.map((module) => module.order)).toEqual([1, 2, 3, 4, 5, 6])
    expect(modules.every((module) => module.unlock === 'sequential')).toBe(true)
  })

  it('keeps every item as exactly one Meadow Journey lesson, in stage order', () => {
    const { lessons } = getLearningCatalogue()
    const meadow = getModulesOf(MEADOW_JOURNEY_ID).flatMap((module) => getLessonsOf(module.id))
    const inStages = content.filter((item) => item.stageId)
    expect(meadow.length).toBeGreaterThan(0)
    expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(lessons.length)
    expect(meadow.length).toBeLessThanOrEqual(inStages.length)
    expect(new Set(meadow.map((lesson) => lesson.blocks[0]?.type === 'resource' && lesson.blocks[0].resourceId)).size).toBe(meadow.length)
  })

  it('gives lessons of other paths their own ids that still map back to the item', () => {
    const others = getLearningCatalogue().lessons.filter((lesson) => lesson.id.includes('@'))
    expect(others.length).toBeGreaterThan(0)
    for (const lesson of others) {
      const itemId = itemIdForLesson(lesson.id)
      expect(lesson.blocks).toEqual([expect.objectContaining({ resourceId: itemId })])
    }
    expect(itemIdForLesson('lesson-exp-1@first-steps')).toBe('exp-1')
    expect(itemIdForLesson('lesson-exp-1')).toBe('exp-1')
  })
})

describe('public preview access (parity with the old role check)', () => {
  const visitor = publicAccessContext(null)
  const editor = publicAccessContext({ id: 'u-editor', role: 'editor' })
  const admin = publicAccessContext({ id: 'u-admin', role: 'admin' })
  const learner = publicAccessContext(practitioner)

  it('gives practitioners the full version of every published item', () => {
    for (const item of content.filter((entry) => entry.published)) {
      const decision = canAccessResource(learner, getResource(item.id))
      expect(decision.mode).toBe('full')
    }
  })

  it('gives visitors and staff on the public site the same as before: a preview or nothing', () => {
    for (const item of content.filter((entry) => entry.published)) {
      const legacyPreview =
        item.type === 'exploration' ||
        (item.type === 'meditation' && item.preview && item.transcode === 'ready')
      for (const viewer of [visitor, editor, admin]) {
        const decision = canAccessResource(viewer, getResource(item.id))
        expect(decision.mode).toBe(legacyPreview ? 'preview' : 'none')
      }
    }
  })

  it('treats a visitor-role session as signed out', () => {
    const visitorRole = getAccessContext({ id: 'x', role: 'visitor' })
    expect(visitorRole.user).toBeNull()
  })

  it('never lets staff have full access on the public surface', () => {
    const decision = canAccessResource(editor, getResource(content[0]!.id))
    expect(decision.mode).not.toBe('full')
  })

  it('does not open unpublished content to the public', () => {
    const draft = content.find((item) => !item.published)
    expect(draft).toBeDefined()
    expect(canAccessResource(learner, getResource(draft!.id)).reason).toBe(
      'unpublished',
    )
  })
})

describe('access levels', () => {
  const resource = (patch: Partial<Resource>): Resource => ({
    ...buildResource(content.find((item) => item.published)!),
    ...patch,
  })

  it('public: everyone, even signed out', () => {
    const open = resource({ access: 'public' })
    expect(isFull(canAccessResource(ctx({ user: null }), open))).toBe(true)
  })

  it('registered: practitioners fully; signed-out only a preview', () => {
    const item = resource({ access: 'registered', previewable: true })
    expect(canAccessResource(ctx(), item).mode).toBe('full')
    expect(canAccessResource(ctx({ user: null }), item).mode).toBe('preview')
    expect(
      canAccessResource(ctx({ user: null }), { ...item, previewable: false }),
    ).toMatchObject({ mode: 'none', reason: 'sign-in-required' })
  })

  it('assigned: needs an active assignment to a path containing it', () => {
    const lesson = getLessonsOf(getModulesOf(MEADOW_JOURNEY_ID)[0]!.id)[0]!
    const resourceId =
      lesson.blocks[0]?.type === 'resource' ? lesson.blocks[0].resourceId : ''
    const item = resource({ id: resourceId, access: 'assigned', previewable: false })

    expect(canAccessResource(ctx(), item)).toMatchObject({
      mode: 'none',
      reason: 'not-assigned',
    })

    const assignment = assignPath({
      pathId: MEADOW_JOURNEY_ID,
      target: { type: 'user', userId: practitioner.id },
      assignedBy: 'u-admin',
      now: NOW,
    })
    expect(
      canAccessResource(ctx({ assignments: [assignment] }), item).reason,
    ).toBe('assigned')
  })

  it('restricted: only an explicit grant; assignment and role are not enough', () => {
    const item = resource({
      access: 'restricted',
      previewable: true,
      grants: { userIds: ['someone-else'], roles: ['admin'] },
    })
    expect(canAccessResource(ctx(), item)).toMatchObject({
      mode: 'none',
      reason: 'not-permitted',
    })
    const viaUser = { ...item, grants: { userIds: [practitioner.id] } }
    expect(canAccessResource(ctx(), viaUser).reason).toBe('granted')
    const viaGroup = { ...item, grants: { groupIds: ['g1'] } }
    expect(canAccessResource(ctx({ groupIds: ['g1'] }), viaGroup).mode).toBe('full')
    const viaRole = { ...item, grants: { roles: ['admin' as Role] } }
    expect(
      canAccessResource(ctx({ user: { id: 'a', role: 'admin' }, surface: 'public' }), viaRole)
        .mode,
    ).toBe('full')
  })

  it('restricted never previews', () => {
    const item = resource({ access: 'restricted', previewable: true })
    expect(canAccessResource(ctx({ user: null }), item).mode).toBe('none')
  })
})

describe('staff preview of the learner area', () => {
  const lesson = () => getLessonsOf(getModulesOf(MEADOW_JOURNEY_ID)[2]!.id)[0]!

  it('lets editors and admins in, read-only, even to locked modules', () => {
    for (const role of ['editor', 'admin'] as Role[]) {
      const decision = canAccessLesson(
        ctx({ user: { id: 's', role }, surface: 'learn' }),
        lesson(),
      )
      expect(decision).toMatchObject({
        mode: 'full',
        reason: 'staff-preview',
        recordProgress: false,
      })
    }
  })

  it('does not make them practitioners, and excludes other staff roles', () => {
    const campaign = canAccessLesson(
      ctx({ user: { id: 'c', role: 'campaign' } }),
      lesson(),
    )
    expect(campaign.mode).toBe('none')
    const publicSurface = canAccessResource(
      ctx({ user: { id: 'e', role: 'editor' }, surface: 'public' }),
      getResource(content[0]!.id),
    )
    expect(publicSurface.mode).not.toBe('full')
  })
})

describe('assignments', () => {
  const user = { id: 'u-test', role: 'practitioner' as Role }

  it('supports individual assignments with assigner, time and optional due date', () => {
    const assignment = assignPath({
      pathId: MEADOW_JOURNEY_ID,
      target: { type: 'user', userId: user.id },
      assignedBy: 'u-admin',
      dueAt: '2026-12-01T00:00:00.000Z',
      now: NOW,
    })
    expect(assignment).toMatchObject({
      assignedBy: 'u-admin',
      assignedAt: NOW.toISOString(),
      dueAt: '2026-12-01T00:00:00.000Z',
      status: 'active',
    })
    expect(assignmentsForUser(user.id)).toHaveLength(1)
    expect(assignmentsForUser('someone-else')).toHaveLength(0)
  })

  it('supports group assignments through membership', () => {
    saveGroup({ id: 'g-a', name: 'Cohort A', memberUserIds: [user.id] })
    saveGroup({ id: 'g-b', name: 'Cohort B', memberUserIds: ['other'] })
    assignPath({
      pathId: MEADOW_JOURNEY_ID,
      target: { type: 'group', groupId: 'g-a' },
      assignedBy: 'u-admin',
      now: NOW,
    })
    expect(assignmentsForUser(user.id)).toHaveLength(1)
    expect(assignmentsForUser('other')).toHaveLength(0)

    const access = getAccessContext(user, { surface: 'learn' })
    expect(access.groupIds).toEqual(['g-a'])
    expect(
      canAccess(access, {
        type: 'path',
        path: getLearningCatalogue().paths[0],
      }).reason,
    ).toBe('assigned')
  })

  it('withdrawn assignments stop granting access', () => {
    const assignment = assignPath({
      pathId: MEADOW_JOURNEY_ID,
      target: { type: 'user', userId: user.id },
      assignedBy: 'u-admin',
      now: NOW,
    })
    withdrawAssignment(assignment.id, NOW)
    expect(assignmentsForUser(user.id)).toHaveLength(0)
    expect(listAssignments()[0]).toMatchObject({
      status: 'withdrawn',
      withdrawnAt: NOW.toISOString(),
    })
  })

  it('gives each practitioner Meadow Journey once, never inventing dates', () => {
    const people = [
      user,
      { id: 'u-editor', role: 'editor' as Role },
      { id: 'u-other', role: 'practitioner' as Role },
    ]
    expect(ensureDefaultAssignments(people, NOW)).toBe(2)
    expect(ensureDefaultAssignments(people, new Date('2030-01-01'))).toBe(0)

    const stored = listAssignments()
    expect(stored.map((entry) => entry.id).sort()).toEqual(
      [defaultAssignmentId(user.id), defaultAssignmentId('u-other')].sort(),
    )
    for (const entry of stored) {
      expect(entry.assignedAt).toBe(NOW.toISOString())
      expect(entry.assignedBy).toBe('system:migration')
      expect(entry.dueAt).toBeUndefined()
    }
  })

  it('does not re-create a default assignment an admin withdrew', () => {
    const first = ensureDefaultAssignment(user, NOW)!
    withdrawAssignment(first.id, NOW)
    ensureDefaultAssignment(user, new Date('2031-01-01'))
    expect(assignmentsForUser(user.id)).toHaveLength(0)
    expect(listAssignments()).toHaveLength(1)
  })

  it('never assigns non-practitioners', () => {
    expect(ensureDefaultAssignment({ id: 'a', role: 'admin' })).toBeNull()
    expect(ensureDefaultAssignment(null)).toBeNull()
  })
})

describe('module unlocking', () => {
  const modules = () => getModulesOf(MEADOW_JOURNEY_ID)

  function progressWith(completedModules: number) {
    const completedItemIds = modules()
      .slice(0, completedModules)
      .flatMap((module) =>
        getLessonsOf(module.id).flatMap((lesson) =>
          lesson.blocks.flatMap((block) =>
            block.type === 'resource' ? [block.resourceId] : [],
          ),
        ),
      )
    const legacy: Progress = {
      userId: 'u-test',
      completedItemIds,
      positionsSec: {},
      updatedAt: NOW.toISOString(),
    }
    return applyLegacyProgress(loadProgress('u-test', NOW), legacy, NOW)
  }

  it('first module is always unlocked', () => {
    expect(getModuleUnlockState(modules()[0]!, modules(), undefined).unlocked).toBe(
      true,
    )
  })

  it('sequential: a module opens only after the previous one is complete', () => {
    const [one, two, three] = modules()
    const none = progressWith(0)
    expect(getModuleUnlockState(two!, modules(), none)).toEqual({
      unlocked: false,
      lockedBy: one!.id,
    })
    const afterOne = progressWith(1)
    expect(getModuleUnlockState(two!, modules(), afterOne).unlocked).toBe(true)
    expect(getModuleUnlockState(three!, modules(), afterOne)).toEqual({
      unlocked: false,
      lockedBy: two!.id,
    })
  })

  it('open: always unlocked, whatever the progress', () => {
    const open = { ...modules()[3]!, unlock: 'open' as const }
    expect(getModuleUnlockState(open, modules(), progressWith(0)).unlocked).toBe(
      true,
    )
  })

  it('closes lessons of a locked module at the route level, with the blocker named', () => {
    const assignment = ensureDefaultAssignment(practitioner, NOW)!
    const [one, two] = modules()
    const lessonInTwo = getLessonsOf(two!.id)[0]!
    const access = ctx({
      assignments: [assignment],
      progress: progressWith(0),
    })
    expect(canAccessLesson(access, lessonInTwo)).toMatchObject({
      mode: 'none',
      reason: 'locked-module',
      lockedBy: one!.id,
    })
    const unlocked = ctx({ assignments: [assignment], progress: progressWith(1) })
    expect(canAccessLesson(unlocked, lessonInTwo).reason).toBe('assigned')
  })

  it('a previous module with nothing required does not trap the learner', () => {
    const empty = { ...modules()[0]!, id: 'module-empty' }
    const next = { ...modules()[1]!, order: 2 }
    const state = getModuleUnlockState(
      next,
      [{ ...empty, order: 1 }, next],
      progressWith(0),
    )
    expect(state.unlocked).toBe(true)
  })

  it('closes a lesson to someone not assigned the path', () => {
    const lesson = getLessonsOf(modules()[0]!.id)[0]!
    expect(canAccessLesson(ctx({ progress: progressWith(0) }), lesson)).toMatchObject({
      mode: 'none',
      reason: 'not-assigned',
    })
  })
})
