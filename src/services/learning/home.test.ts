import { beforeEach, describe, expect, it } from 'vitest'
import { content } from '@/mocks/db'
import type { AccessContext } from '@/services/learning/access'
import { assignPath, saveGroup } from '@/services/learning/assignments'
import {
  MEADOW_JOURNEY_ID,
  getLearningCatalogue,
  getLessonsOf,
  getModulesOf,
  itemIdForLesson,
  lessonIdForItem,
} from '@/services/learning/catalogue'
import {
  buildLearnerHome,
  firstNameOf,
  listAssignedPaths,
  listRecentLessons,
  pickContinueLearning,
  pickExploreResources,
  pickUpNext,
} from '@/services/learning/home'
import {
  applyLegacyProgress,
  countsTowardCompletion,
  pathCompletion,
} from '@/services/learning/progress'
import { getAccessContext } from '@/services/learning/accessContext'
import {
  PROGRESS_STORE_VERSION,
  type Assignment,
  type LearningProgressStore,
  type Lesson,
  type Role,
} from '@/types'

const NOW = new Date('2026-11-10T09:00:00.000Z')
const learner = { id: 'u-demo', role: 'practitioner' as Role, name: 'Maya Patel' }

const assignment: Assignment = {
  id: 'asg-test',
  pathId: MEADOW_JOURNEY_ID,
  target: { type: 'user', userId: learner.id },
  assignedBy: 'system:migration',
  assignedAt: '2026-11-01T09:00:00.000Z',
  status: 'active',
}

function store(partial: Partial<LearningProgressStore> = {}): LearningProgressStore {
  return {
    version: PROGRESS_STORE_VERSION,
    userId: learner.id,
    lessons: {},
    media: {},
    activity: [],
    updatedAt: NOW.toISOString(),
    ...partial,
  }
}

function ctx(progress: LearningProgressStore, overrides: Partial<AccessContext> = {}): AccessContext {
  return {
    user: { id: learner.id, role: learner.role },
    surface: 'learn',
    assignments: [assignment],
    groupIds: [],
    progress,
    ...overrides,
  }
}

const modules = () => getModulesOf(MEADOW_JOURNEY_ID)
const lessonsOfStage = (index: number) => getLessonsOf(modules()[index]!.id)
const itemOf = (lesson: Lesson) => content.find((entry) => entry.id === itemIdForLesson(lesson.id))!

/** Every required lesson of the first stage marked complete. */
function stageOneComplete(): LearningProgressStore['lessons'] {
  return Object.fromEntries(
    lessonsOfStage(0).map((lesson) => [lesson.id, { lessonId: lesson.id, status: 'completed' as const }]),
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('lesson count (the "X of 100" denominator)', () => {
  it('counts every published lesson in published modules exactly once', () => {
    const published = content.filter((item) => item.published)
    const summary = pathCompletion(MEADOW_JOURNEY_ID, store())
    expect(summary.requiredTotal).toBe(100)
    expect(summary.requiredTotal).toBe(published.length)
    const lessonIds = getLearningCatalogue().lessons.map((lesson) => lesson.id)
    expect(new Set(lessonIds).size).toBe(lessonIds.length)
  })

  it('leaves out optional lessons, unknown modules and draft resources', () => {
    const real = lessonsOfStage(0)[0]!
    expect(countsTowardCompletion(real)).toBe(true)
    expect(countsTowardCompletion({ ...real, required: false })).toBe(false)
    expect(countsTowardCompletion({ ...real, moduleId: 'module-missing' })).toBe(false)
    const draft = content.find((item) => !item.published)!
    expect(
      countsTowardCompletion({
        ...real,
        blocks: [{ id: 'b', type: 'resource', resourceId: draft.id }],
      }),
    ).toBe(false)
  })
})

describe('continue learning', () => {
  it('shows nothing when nothing is in progress (no "next lesson" fallback)', () => {
    const empty = store()
    expect(pickContinueLearning(ctx(empty), empty)).toBeNull()
  })

  it('picks the in-progress lesson first, with its real audio position', () => {
    const lesson = lessonsOfStage(0).find((entry) => entry.kind === 'audio')!
    const item = itemOf(lesson)
    const progress = store({
      inProgressLessonId: lesson.id,
      lessons: { [lesson.id]: { lessonId: lesson.id, status: 'in_progress' } },
      media: { [item.id]: { resourceId: item.id, kind: 'audio', positionSec: 60 } },
    })
    const picked = pickContinueLearning(ctx(progress), progress)
    expect(picked?.lessonId).toBe(lesson.id)
    expect(picked?.reason).toBe('in-progress')
    expect(picked?.moduleLabel).toMatch(/^Stage 1 · /)
    expect(picked?.href).toBe(`/learn/paths/meadow-journey/lessons/${lesson.id}`)
    if (item.type !== 'meditation') throw new Error('expected audio')
    expect(picked?.progress?.percent).toBe(Math.round((60 / item.durationSec) * 100))
    expect(picked?.progress?.label).toBe(`${Math.ceil((item.durationSec - 60) / 60)} min left`)
  })

  it('skips an in-progress lesson that is already complete', () => {
    const lesson = lessonsOfStage(0)[0]!
    const progress = store({
      inProgressLessonId: lesson.id,
      lessons: { [lesson.id]: { lessonId: lesson.id, status: 'completed' } },
    })
    expect(pickContinueLearning(ctx(progress), progress)).toBeNull()
  })

  it('skips a lesson in a stage that is still locked', () => {
    const locked = lessonsOfStage(1)[0]!
    const progress = store({
      inProgressLessonId: locked.id,
      lessons: { [locked.id]: { lessonId: locked.id, status: 'in_progress' } },
    })
    expect(pickContinueLearning(ctx(progress), progress)).toBeNull()
  })

  it('falls back to the newest dated audio position, deterministically', () => {
    const audio = lessonsOfStage(0).filter((entry) => entry.kind === 'audio')
    const [older, newer] = [itemOf(audio[0]!), itemOf(audio[1]!)]
    const progress = store({
      media: {
        [older.id]: { resourceId: older.id, kind: 'audio', positionSec: 30, updatedAt: '2026-11-08T10:00:00.000Z' },
        [newer.id]: { resourceId: newer.id, kind: 'audio', positionSec: 30, updatedAt: '2026-11-09T10:00:00.000Z' },
      },
    })
    const picked = pickContinueLearning(ctx(progress), progress)
    expect(picked?.item.id).toBe(newer.id)
    expect(picked?.reason).toBe('recent-media')
  })

  it('ignores positions without a recorded date (migrated, not real activity)', () => {
    const item = itemOf(lessonsOfStage(0).find((entry) => entry.kind === 'audio')!)
    const progress = store({
      media: { [item.id]: { resourceId: item.id, kind: 'audio', positionSec: 30 } },
    })
    expect(pickContinueLearning(ctx(progress), progress)).toBeNull()
  })
})

describe('video lessons', () => {
  it('resumes a lesson video from its own saved position and lists it as watched', () => {
    // exp-7 is a stage-one article with a demo video (config/contentVideos.ts).
    const lessonId = lessonIdForItem('exp-7')
    const progress = store({
      media: {
        'exp-7#video': { resourceId: 'exp-7#video', kind: 'video', positionSec: 12, updatedAt: '2026-11-09T10:00:00.000Z' },
      },
    })
    const picked = pickContinueLearning(ctx(progress), progress)
    expect(picked?.lessonId).toBe(lessonId)
    expect(picked?.reason).toBe('recent-media')
    expect(picked?.progress).toEqual({ percent: 40, label: 'Video · 1 min left' })

    const [row] = listRecentLessons(progress, new Set())
    expect(row?.kind).toBe('watched')
    expect(row?.lessonId).toBe(lessonId)
  })
})

describe('assigned learning', () => {
  it('summarises the assigned path from real counts', () => {
    const progress = store({ lessons: stageOneComplete() })
    const [path] = listAssignedPaths(ctx(progress), progress)
    expect(path?.path.title).toBe('Meadow Journey')
    expect(path?.moduleCount).toBe(6)
    expect(path?.lessonCount).toBe(100)
    expect(path?.completedCount).toBe(lessonsOfStage(0).length)
    expect(path?.status).toBe('in-progress')
    expect(path?.assignedAt).toBe(assignment.assignedAt)
    expect(path?.href).toBe('/learn/paths/meadow-journey')
  })

  it('lists a path once when assigned directly and through a group', () => {
    saveGroup({ id: 'grp-1', name: 'Cohort', memberUserIds: [learner.id] })
    assignPath({ pathId: MEADOW_JOURNEY_ID, target: { type: 'group', groupId: 'grp-1' }, assignedBy: 'u-admin', now: NOW })
    const live = getAccessContext(learner, { surface: 'learn', withProgress: true })
    expect(live.assignments.length).toBeGreaterThanOrEqual(2)
    const paths = listAssignedPaths(live, store())
    expect(paths.filter((entry) => entry.path.id === MEADOW_JOURNEY_ID)).toHaveLength(1)
    expect(new Set(paths.map((entry) => entry.path.id)).size).toBe(paths.length)
  })

  it('lists nothing without an assignment', () => {
    expect(listAssignedPaths(ctx(store(), { assignments: [] }), store())).toEqual([])
  })

  it('shows staff the published paths as preview', () => {
    const staff = ctx(store(), { user: { id: 'u-editor', role: 'editor' }, assignments: [] })
    const [path] = listAssignedPaths(staff, store())
    expect(path?.preview).toBe(true)
    expect(path?.assignedAt).toBeUndefined()
  })
})

describe('up next', () => {
  it('suggests the first unfinished lessons in path order, never from a locked stage', () => {
    const progress = store()
    const paths = listAssignedPaths(ctx(progress), progress)
    const next = pickUpNext(ctx(progress), progress, paths, new Set())
    const firstStage = new Set(lessonsOfStage(0).map((lesson) => lesson.id))
    expect(next).toHaveLength(3)
    expect(next.every((entry) => firstStage.has(entry.lessonId))).toBe(true)
    const order = lessonsOfStage(0).map((lesson) => lesson.id)
    expect(next.map((entry) => order.indexOf(entry.lessonId))).toEqual(
      [...next.map((entry) => order.indexOf(entry.lessonId))].sort((a, b) => a - b),
    )
  })

  it('skips completed lessons, the Continue item and audio that is not ready', () => {
    const stage = lessonsOfStage(0)
    const progress = store({ lessons: { [stage[0]!.id]: { lessonId: stage[0]!.id, status: 'completed' } } })
    const paths = listAssignedPaths(ctx(progress), progress)
    const next = pickUpNext(ctx(progress), progress, paths, new Set([stage[1]!.id]))
    const ids = next.map((entry) => entry.lessonId)
    expect(ids).not.toContain(stage[0]!.id)
    expect(ids).not.toContain(stage[1]!.id)
    for (const entry of next) {
      if (entry.item.type === 'meditation') expect(entry.item.transcode).toBe('ready')
    }
  })

  it('moves to the next stage once the first is complete', () => {
    const progress = store({ lessons: stageOneComplete() })
    const paths = listAssignedPaths(ctx(progress), progress)
    const [first] = pickUpNext(ctx(progress), progress, paths, new Set())
    expect(first?.module.id).toBe(modules()[1]!.id)
  })
})

describe('recently accessed', () => {
  it('is empty for a migrated record with no activity', () => {
    const migrated = store({ lessons: stageOneComplete(), inProgressLessonId: lessonsOfStage(0)[0]!.id })
    expect(listRecentLessons(migrated, new Set())).toEqual([])
  })

  it('lists real events newest first, once per lesson, without the Continue item', () => {
    const [a, b, c] = lessonsOfStage(0).map(itemOf)
    let progress = store()
    progress = applyLegacyProgress(progress, { userId: learner.id, completedItemIds: [a!.id], positionsSec: {}, updatedAt: '' }, new Date('2026-11-08T09:00:00.000Z'))
    progress = applyLegacyProgress(progress, { userId: learner.id, completedItemIds: [a!.id], inProgressItemId: b!.id, positionsSec: {}, updatedAt: '' }, new Date('2026-11-09T09:00:00.000Z'))
    progress = applyLegacyProgress(progress, { userId: learner.id, completedItemIds: [a!.id, b!.id], inProgressItemId: c!.id, positionsSec: {}, updatedAt: '' }, new Date('2026-11-10T09:00:00.000Z'))

    const rows = listRecentLessons(progress, new Set([lessonIdForItem(c!.id)]))
    expect(rows.map((row) => [row.item.id, row.kind])).toEqual([
      [b!.id, 'completed'],
      [a!.id, 'completed'],
    ])
  })
})

describe('explore the library', () => {
  it('lists featured, published, playable items the learner can open, newest first', () => {
    const progress = store()
    const items = pickExploreResources(ctx(progress), new Set())
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThanOrEqual(6)
    for (const { item, href } of items) {
      expect(item.featured && item.published).toBe(true)
      if (item.type === 'meditation') expect(item.transcode).toBe('ready')
      expect(href.startsWith('/learn/library/')).toBe(true)
    }
    const dates = items.map(({ item }) => item.updatedAt)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it('shows signed-out visitors nothing (no full access)', () => {
    const visitor: AccessContext = { user: null, surface: 'learn', assignments: [], groupIds: [] }
    expect(pickExploreResources(visitor, new Set())).toEqual([])
  })

  it('leaves out items already shown above', () => {
    const progress = store()
    const [first] = pickExploreResources(ctx(progress), new Set())
    const without = pickExploreResources(ctx(progress), new Set([first!.item.id]))
    expect(without.map(({ item }) => item.id)).not.toContain(first!.item.id)
  })
})

describe('the whole Home', () => {
  it('greets by first name without claiming a return visit', () => {
    const home = buildLearnerHome(learner, ctx(store()), store())
    expect(home.firstName).toBe('Maya')
    expect(home.intro).not.toMatch(/back/i)
    expect(firstNameOf('  Rowan   Ellis ')).toBe('Rowan')
  })

  it('offers to start the path for a new learner', () => {
    const home = buildLearnerHome(learner, ctx(store()), store())
    expect(home.continueLearning).toBeNull()
    expect(home.action?.label).toBe('Start Meadow Journey')
    expect(home.action?.href).toBe(home.upNext[0]?.href)
  })

  it('leaves the header without a button when there is something to resume', () => {
    const lesson = lessonsOfStage(0)[2]!
    const progress = store({
      inProgressLessonId: lesson.id,
      lessons: { [lesson.id]: { lessonId: lesson.id, status: 'in_progress' } },
    })
    const home = buildLearnerHome(learner, ctx(progress), progress)
    expect(home.continueLearning?.lessonId).toBe(lesson.id)
    expect(home.action).toBeNull()
    expect(home.upNext.map((entry) => entry.lessonId)).not.toContain(lesson.id)
  })

  it('points to the library when nothing is assigned', () => {
    const home = buildLearnerHome(learner, ctx(store(), { assignments: [] }), store())
    expect(home.assigned).toEqual([])
    expect(home.upNext).toEqual([])
    expect(home.action?.href).toBe('/learn/library')
  })

  it('gives staff a read-only preview with no personal sections', () => {
    const staff = { id: 'u-editor', role: 'editor' as Role, name: 'Rowan Ellis' }
    const home = buildLearnerHome(staff, ctx(store(), { user: staff, assignments: [] }), store())
    expect(home.isPreview).toBe(true)
    expect(home.continueLearning).toBeNull()
    expect(home.recent).toEqual([])
    expect(home.assigned[0]?.preview).toBe(true)
  })
})
