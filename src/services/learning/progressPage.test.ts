import { describe, expect, it } from 'vitest'
import type { AccessContext } from '@/services/learning/access'
import {
  DEMO_PATH_IDS,
  MEADOW_JOURNEY_ID,
  getLessonsOf,
  getModulesOf,
  itemIdForLesson,
} from '@/services/learning/catalogue'
import { buildMyLearning } from '@/services/learning/myLearning'
import { pathCompletion } from '@/services/learning/progress'
import {
  buildProgressPage,
  learningHistory,
  learningTimeline,
} from '@/services/learning/progressPage'
import { PROGRESS_STORE_VERSION, type Assignment, type LearningProgressStore, type Role } from '@/types'

const NOW = '2026-11-10T09:00:00.000Z'
const learner = { id: 'u-demo', role: 'practitioner' as Role }

const assign = (pathId: string, at = '2026-11-01T09:00:00.000Z'): Assignment => ({
  id: `asg-${pathId}`,
  pathId,
  target: { type: 'user', userId: learner.id },
  assignedBy: 'system:migration',
  assignedAt: at,
  status: 'active',
})

function store(partial: Partial<LearningProgressStore> = {}): LearningProgressStore {
  return {
    version: PROGRESS_STORE_VERSION,
    userId: learner.id,
    lessons: {},
    media: {},
    activity: [],
    updatedAt: NOW,
    ...partial,
  }
}

const ctx = (progress: LearningProgressStore, assignments = [assign(MEADOW_JOURNEY_ID)]): AccessContext => ({
  user: learner,
  surface: 'learn',
  assignments,
  groupIds: [],
  progress,
})

const meadowLessons = () => getModulesOf(MEADOW_JOURNEY_ID).flatMap((module) => getLessonsOf(module.id))

describe('Progress page data', () => {
  it('agrees with My Learning and the path completion counts', () => {
    const [first, second] = meadowLessons()
    const s = store({
      lessons: {
        [first!.id]: { lessonId: first!.id, status: 'completed' },
        [second!.id]: { lessonId: second!.id, status: 'completed', completedAt: NOW },
      },
    })
    const page = buildProgressPage(ctx(s), s, { isPreview: false })
    const mine = buildMyLearning(ctx(s), s, { isPreview: false })
    const meadow = pathCompletion(MEADOW_JOURNEY_ID, s)

    expect(page.paths.map((entry) => entry.item.percent)).toEqual(mine.items.map((item) => item.percent))
    expect(page.paths[0]!.item.completedCount).toBe(meadow.requiredCompleted)
    expect(page.overview).toMatchObject({
      assignedPaths: 1,
      completedPaths: 0,
      lessonsCompleted: 2,
      lessonsRemaining: meadow.requiredTotal - 2,
    })
    // Module rows add up to the path.
    const rows = page.paths[0]!.modules
    expect(rows.reduce((sum, row) => sum + row.completed, 0)).toBe(2)
    expect(rows.reduce((sum, row) => sum + row.total, 0)).toBe(meadow.requiredTotal)
    expect(rows[0]!.label).toMatch(/^Stage 1 · /)
  })

  it('counts a lesson shared by two paths once in the overview', () => {
    const assignments = [assign(MEADOW_JOURNEY_ID), assign(DEMO_PATH_IDS[0]!, '2026-11-02T09:00:00.000Z')]
    const shared = getModulesOf(DEMO_PATH_IDS[0]!).flatMap((module) => getLessonsOf(module.id))[0]!
    const meadowId = `lesson-${itemIdForLesson(shared.id)}`
    const s = store({ lessons: { [meadowId]: { lessonId: meadowId, status: 'completed' } } })
    const page = buildProgressPage(ctx(s, assignments), s, { isPreview: false })

    expect(page.paths).toHaveLength(2)
    expect(page.paths.every((entry) => entry.item.completedCount === 1)).toBe(true)
    expect(page.overview.lessonsCompleted).toBe(1)
  })

  it('lists recorded completion dates first and never invents one', () => {
    const [a, b, c] = meadowLessons()
    const s = store({
      lessons: {
        [a!.id]: { lessonId: a!.id, status: 'completed' },
        [b!.id]: { lessonId: b!.id, status: 'completed', completedAt: '2026-11-08T10:00:00.000Z' },
        [c!.id]: { lessonId: c!.id, status: 'completed', completedAt: '2026-11-09T10:00:00.000Z' },
      },
    })
    const { dated, undated } = learningHistory(s)
    expect(dated.map((entry) => entry.lessonId)).toEqual([c!.id, b!.id])
    expect(undated.map((entry) => entry.lessonId)).toEqual([a!.id])
    expect(undated[0]!.completedAt).toBeUndefined()
  })

  it('keeps only started and completed events in the timeline, newest first', () => {
    const [a, b] = meadowLessons()
    const s = store({
      activity: [
        { id: '1', type: 'started', lessonId: a!.id, at: '2026-11-08T10:00:00.000Z' },
        { id: '2', type: 'played', resourceId: itemIdForLesson(b!.id), at: '2026-11-08T11:00:00.000Z' },
        { id: '3', type: 'paused', resourceId: itemIdForLesson(b!.id), at: '2026-11-08T11:05:00.000Z' },
        { id: '4', type: 'completed', lessonId: a!.id, at: '2026-11-09T10:00:00.000Z' },
      ],
    })
    expect(learningTimeline(s).map((event) => [event.id, event.kind])).toEqual([
      ['4', 'completed'],
      ['1', 'started'],
    ])
  })

  it('shows staff in preview no record and no totals', () => {
    const editor = { id: 'u-editor', role: 'editor' as Role }
    const [a] = meadowLessons()
    const s = store({
      userId: editor.id,
      lessons: { [a!.id]: { lessonId: a!.id, status: 'completed', completedAt: NOW } },
      activity: [{ id: '1', type: 'completed', lessonId: a!.id, at: NOW }],
    })
    const page = buildProgressPage({ ...ctx(s, []), user: editor }, s, { isPreview: true })
    expect(page.isPreview).toBe(true)
    expect(page.overview.lessonsCompleted).toBe(0)
    expect(page.history).toEqual({ dated: [], undated: [] })
    expect(page.timeline).toEqual([])
    expect(page.paths.length).toBeGreaterThan(0)
    expect(page.paths.every((entry) => entry.item.preview)).toBe(true)
  })
})
