import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_PATHS } from '@/config/demoPaths'
import type { AccessContext } from '@/services/learning/access'
import { getAccessContext } from '@/services/learning/accessContext'
import {
  SYSTEM_DEMO,
  demoAssignmentId,
  ensureDemoAssignments,
  listAssignments,
  withdrawAssignment,
} from '@/services/learning/assignments'
import {
  DEMO_PATH_IDS,
  MEADOW_JOURNEY_ID,
  getLessonsOf,
  getModulesOf,
  getPathBySlug,
  lessonIdForItem,
} from '@/services/learning/catalogue'
import { byActivePathFirst, listAssignedPaths, pickUpNext } from '@/services/learning/home'
import { buildPathOverview, lessonOutline } from '@/services/learning/outline'
import { isLessonComplete, pathCompletion } from '@/services/learning/progress'
import { PROGRESS_STORE_VERSION, type LearningProgressStore, type Role } from '@/types'

const NOW = new Date('2026-11-10T09:00:00.000Z')
const learner = { id: 'u-demo', role: 'practitioner' as Role }

const store = (completedItems: string[] = []): LearningProgressStore => ({
  version: PROGRESS_STORE_VERSION,
  userId: learner.id,
  lessons: Object.fromEntries(
    completedItems.map((itemId) => [lessonIdForItem(itemId), { lessonId: lessonIdForItem(itemId), status: 'completed' as const }]),
  ),
  media: {},
  activity: [],
  updatedAt: NOW.toISOString(),
})

const ctxFor = (progress: LearningProgressStore): AccessContext => ({
  ...getAccessContext(learner, { surface: 'learn' }),
  progress,
})

const restAndSleep = () => getPathBySlug('rest-and-sleep')!
const itemsOf = (key: string) => DEMO_PATHS.find((path) => path.key === key)!.modules.flatMap((m) => m.itemIds)

beforeEach(() => {
  window.localStorage.clear()
})

describe('demo paths in the catalogue', () => {
  it('builds every configured path after Meadow Journey, with ordered modules', () => {
    expect(DEMO_PATH_IDS).toHaveLength(DEMO_PATHS.length)
    for (const config of DEMO_PATHS) {
      const path = getPathBySlug(config.slug)!
      expect(path.access).toBe('assigned')
      const modules = getModulesOf(path.id)
      expect(modules.map((module) => module.title)).toEqual(config.modules.map((module) => module.title))
      expect(modules.every((module) => module.unlock === config.unlock && !module.legacyStageId)).toBe(true)
    }
  })

  it('counts lessons per path from its own modules', () => {
    for (const config of DEMO_PATHS) {
      const total = config.modules.reduce((sum, module) => sum + module.itemIds.length, 0)
      expect(pathCompletion(getPathBySlug(config.slug)!.id, store()).requiredTotal).toBe(total)
    }
    expect(pathCompletion(MEADOW_JOURNEY_ID, store()).requiredTotal).toBe(100)
  })
})

describe('shared completion', () => {
  it('a finished item completes the lesson in every path that uses it', () => {
    const progress = store(['exp-14'])
    const lesson = getLessonsOf(getModulesOf(restAndSleep().id)[0]!.id)[0]!
    expect(lesson.id).toBe('lesson-exp-14@rest-and-sleep')
    expect(isLessonComplete(lesson, progress)).toBe(true)
    expect(pathCompletion(restAndSleep().id, progress).requiredCompleted).toBe(1)
  })

  it('a path made only of finished items is complete', () => {
    const progress = store(itemsOf('first-steps'))
    expect(pathCompletion(getPathBySlug('first-steps')!.id, progress).complete).toBe(true)
  })
})

describe('demo assignments', () => {
  it('assigns each demo path once, after Meadow Journey, and never re-creates a withdrawn one', () => {
    const added = ensureDemoAssignments(learner, DEMO_PATH_IDS, NOW)
    expect(added).toHaveLength(DEMO_PATH_IDS.length)
    expect(added.every((entry) => entry.assignedBy === SYSTEM_DEMO && entry.assignedAt > NOW.toISOString())).toBe(true)
    expect(ensureDemoAssignments(learner, DEMO_PATH_IDS, NOW)).toEqual([])

    withdrawAssignment(demoAssignmentId(DEMO_PATH_IDS[0]!, learner.id), NOW)
    expect(ensureDemoAssignments(learner, DEMO_PATH_IDS, NOW)).toEqual([])
    expect(listAssignments().filter((entry) => entry.pathId === DEMO_PATH_IDS[0])).toHaveLength(1)
  })

  it('gives staff and visitors no assignments', () => {
    expect(ensureDemoAssignments({ id: 'u-editor', role: 'editor' }, DEMO_PATH_IDS, NOW)).toEqual([])
    expect(ensureDemoAssignments(null, DEMO_PATH_IDS, NOW)).toEqual([])
  })
})

describe('several paths on Home', () => {
  it('lists Meadow Journey first, then the demo paths in assignment order', () => {
    const progress = store()
    const paths = listAssignedPaths(ctxFor(progress), progress)
    expect(paths.map((entry) => entry.path.id)).toEqual([MEADOW_JOURNEY_ID, ...DEMO_PATH_IDS])
  })

  it('puts active paths first and suggests one lesson from each before a second from any', () => {
    const progress = store([...itemsOf('first-steps'), 'exp-14'])
    const ordered = byActivePathFirst(listAssignedPaths(ctxFor(progress), progress))
    expect(ordered.map((entry) => entry.status)).toEqual(['in-progress', 'in-progress', 'not-started', 'complete'])

    const next = pickUpNext(ctxFor(progress), progress, ordered, new Set())
    expect(next).toHaveLength(3)
    expect(new Set(next.map((entry) => entry.path.id)).size).toBe(3)
    expect(new Set(next.map((entry) => entry.item.id)).size).toBe(3)
  })
})

describe('path overview and lesson outline', () => {
  it('locks the second module of a sequential path until the first is done', () => {
    const before = buildPathOverview(ctxFor(store()), store(), restAndSleep())
    expect(before.unlock).toBe('sequential')
    expect(before.modules[0]!.lockedBy).toBeUndefined()
    expect(before.modules[1]!.lockedBy).toBe('Module 1 · Why rest matters')
    expect(before.modules[1]!.lessons.every((lesson) => !lesson.openable)).toBe(true)

    const done = store(['exp-14', 'exp-15'])
    const after = buildPathOverview(ctxFor(done), done, restAndSleep())
    expect(after.modules[1]!.lockedBy).toBeUndefined()
    expect(after.modules[1]!.lessons.every((lesson) => lesson.openable)).toBe(true)
  })

  it('opens every module of an open path', () => {
    const overview = buildPathOverview(ctxFor(store()), store(), getPathBySlug('first-steps')!)
    expect(overview.modules.every((module) => !module.lockedBy)).toBe(true)
  })

  it('gives a lesson its own path context and neighbours', () => {
    const outline = lessonOutline('lesson-exp-15@rest-and-sleep')!
    expect(outline).toMatchObject({
      pathTitle: 'Rest and sleep',
      overline: 'Rest and sleep · Module 1 · Why rest matters',
      position: 2,
      total: 2,
      backHref: '/learn/paths/rest-and-sleep',
      prev: { href: '/learn/paths/rest-and-sleep/lessons/lesson-exp-14@rest-and-sleep', itemId: 'exp-14' },
      next: { href: '/learn/paths/rest-and-sleep/lessons/lesson-exp-16@rest-and-sleep', itemId: 'exp-16' },
    })
  })
})
