import { beforeEach, describe, expect, it } from 'vitest'
import { content } from '@/mocks/db'
import type { AccessContext } from '@/services/learning/access'
import { getAccessContext } from '@/services/learning/accessContext'
import {
  assignPath,
  defaultAssignmentId,
  ensureDefaultAssignment,
  withdrawAssignment,
} from '@/services/learning/assignments'
import {
  MEADOW_JOURNEY_ID,
  getLearningCatalogue,
  getLessonsOf,
  getModulesOf,
  itemIdForLesson,
} from '@/services/learning/catalogue'
import {
  buildMyLearning,
  countByTab,
  filterByTab,
  parseSort,
  parseTab,
  sortLearning,
  type MyLearningItem,
} from '@/services/learning/myLearning'
import { PROGRESS_STORE_VERSION, type Assignment, type LearningProgressStore, type Role } from '@/types'

const NOW = new Date('2026-11-10T09:00:00.000Z')
const learner = { id: 'u-demo', role: 'practitioner' as Role }

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

const ctx = (progress: LearningProgressStore, overrides: Partial<AccessContext> = {}): AccessContext => ({
  user: learner,
  surface: 'learn',
  assignments: [assignment],
  groupIds: [],
  progress,
  ...overrides,
})

const build = (progress: LearningProgressStore, overrides: Partial<AccessContext> = {}, isPreview = false) =>
  buildMyLearning(ctx(progress, overrides), progress, { isPreview })

const stage = (index: number) => getLessonsOf(getModulesOf(MEADOW_JOURNEY_ID)[index]!.id)
const completed = (ids: string[]) =>
  Object.fromEntries(ids.map((id) => [id, { lessonId: id, status: 'completed' as const }]))

beforeEach(() => {
  window.localStorage.clear()
})

describe('status and next action', () => {
  it('a new learner has Meadow Journey not started, with Start learning on lesson one', () => {
    const { items } = build(store())
    expect(items).toHaveLength(1)
    const [item] = items
    expect(item!.status).toBe('not-started')
    expect(item!.moduleCount).toBe(6)
    expect(item!.lessonCount).toBe(100)
    expect(item!.completedCount).toBe(0)
    expect(item!.action.label).toBe('Start learning')
    expect(item!.action.href).toBe(`/learn/paths/meadow-journey/lessons/${stage(0)[0]!.id}`)
    expect(item!.currentModule?.label).toMatch(/^Stage 1 · /)
    expect(item!.lastAccessedAt).toBeUndefined()
  })

  it('a completion makes it in progress, with Continue learning on the next lesson', () => {
    const first = stage(0)[0]!.id
    const { items } = build(store({ lessons: completed([first]) }))
    expect(items[0]!.status).toBe('in-progress')
    expect(items[0]!.percent).toBe(1)
    expect(items[0]!.action.label).toBe('Continue learning')
    expect(items[0]!.nextLesson?.lessonId).toBe(stage(0)[1]!.id)
    expect(items[0]!.nextLesson?.resume).toBe(false)
  })

  it('resumes the in-progress lesson when there is one', () => {
    const lesson = stage(0)[3]!
    const progress = store({
      inProgressLessonId: lesson.id,
      lessons: { [lesson.id]: { lessonId: lesson.id, status: 'in_progress' } },
    })
    const [item] = build(progress).items
    expect(item!.status).toBe('in-progress')
    expect(item!.nextLesson).toMatchObject({ lessonId: lesson.id, resume: true })
  })

  it('a dated audio position alone counts as started, and sets last accessed', () => {
    const audio = stage(0).find((lesson) => lesson.kind === 'audio')!
    const itemId = itemIdForLesson(audio.id)!
    const progress = store({
      media: { [itemId]: { resourceId: itemId, kind: 'audio', positionSec: 40, updatedAt: '2026-11-09T08:00:00.000Z' } },
    })
    const [item] = build(progress).items
    expect(item!.status).toBe('in-progress')
    expect(item!.completedCount).toBe(0)
    expect(item!.lastAccessedAt).toBe('2026-11-09T08:00:00.000Z')
  })

  it('an undated migrated position does not count as started', () => {
    const audio = stage(0).find((lesson) => lesson.kind === 'audio')!
    const itemId = itemIdForLesson(audio.id)!
    const progress = store({ media: { [itemId]: { resourceId: itemId, kind: 'audio', positionSec: 40 } } })
    expect(build(progress).items[0]!.status).toBe('not-started')
  })

  it('every lesson complete is Completed, with Review learning and no current module', () => {
    const all = getLearningCatalogue().lessons.map((lesson) => lesson.id)
    const [item] = build(store({ lessons: completed(all) })).items
    expect(item!.status).toBe('completed')
    expect(item!.percent).toBe(100)
    expect(item!.action).toEqual({ label: 'Review learning', href: '/learn/paths/meadow-journey' })
    expect(item!.nextLesson).toBeUndefined()
    expect(item!.currentModule).toBeUndefined()
  })
})

describe('assignment state', () => {
  it('shows nothing, and no withdrawn row, when nothing was ever assigned', () => {
    const result = build(store(), { assignments: [] })
    expect(result.items).toEqual([])
    expect(result.withdrawn).toEqual([])
  })

  it('moves a withdrawn assignment out of the list and reports it', () => {
    ensureDefaultAssignment(learner, NOW)
    withdrawAssignment(defaultAssignmentId(learner.id), new Date('2026-11-09T12:00:00.000Z'))
    const live = getAccessContext(learner, { surface: 'learn', withProgress: true })
    const result = buildMyLearning(live, store(), { isPreview: false })
    expect(result.items.map((item) => item.path.id)).not.toContain(MEADOW_JOURNEY_ID)
    expect(result.withdrawn).toEqual([
      { path: expect.objectContaining({ id: MEADOW_JOURNEY_ID }), withdrawnAt: '2026-11-09T12:00:00.000Z' },
    ])
  })

  it('does not report a withdrawal when the path is assigned again another way', () => {
    ensureDefaultAssignment(learner, NOW)
    withdrawAssignment(defaultAssignmentId(learner.id), NOW)
    assignPath({ pathId: MEADOW_JOURNEY_ID, target: { type: 'user', userId: learner.id }, assignedBy: 'u-admin', now: NOW })
    const live = getAccessContext(learner, { surface: 'learn', withProgress: true })
    const result = buildMyLearning(live, store(), { isPreview: false })
    expect(result.items.filter((item) => item.path.id === MEADOW_JOURNEY_ID)).toHaveLength(1)
    expect(result.withdrawn).toEqual([])
  })

  it('staff preview lists the path read-only with View learning path', () => {
    const staff = { id: 'u-editor', role: 'editor' as Role }
    const result = build(store(), { user: staff, assignments: [] }, true)
    expect(result.items[0]).toMatchObject({ preview: true, status: 'not-started' })
    expect(result.items[0]!.action.label).toBe('View learning path')
    expect(window.localStorage.getItem('meadow.progress.v2.u-editor')).toBeNull()
  })
})

describe('tabs and sorting', () => {
  const item = (id: string, overrides: Partial<MyLearningItem>): MyLearningItem => ({
    ...build(store()).items[0]!,
    path: { ...build(store()).items[0]!.path, id, title: id },
    ...overrides,
  })
  const a = item('Alpha', { status: 'completed', percent: 100, assignedAt: '2026-01-01', lastAccessedAt: '2026-03-01' })
  const b = item('Bravo', { status: 'in-progress', percent: 40, assignedAt: '2026-02-01', lastAccessedAt: '2026-04-01' })
  const c = item('Charlie', { status: 'not-started', percent: 0, assignedAt: '2026-03-01', lastAccessedAt: undefined })

  it('derives every tab from the one list', () => {
    const items = [a, b, c]
    expect(filterByTab(items, 'all')).toHaveLength(3)
    expect(filterByTab(items, 'in-progress').map((x) => x.path.id)).toEqual(['Bravo'])
    expect(filterByTab(items, 'not-started').map((x) => x.path.id)).toEqual(['Charlie'])
    expect(filterByTab(items, 'completed').map((x) => x.path.id)).toEqual(['Alpha'])
    expect(countByTab(items)).toEqual({ all: 3, 'in-progress': 1, 'not-started': 1, completed: 1 })
  })

  it('sorts by real fields, putting missing dates last', () => {
    const ids = (sort: Parameters<typeof sortLearning>[1]) => sortLearning([c, a, b], sort).map((x) => x.path.id)
    expect(ids('recent')).toEqual(['Bravo', 'Alpha', 'Charlie'])
    expect(ids('assigned')).toEqual(['Charlie', 'Bravo', 'Alpha'])
    expect(ids('progress')).toEqual(['Alpha', 'Bravo', 'Charlie'])
    expect(ids('title')).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('falls back to safe defaults for unknown URL values', () => {
    expect(parseTab('completed')).toBe('completed')
    expect(parseTab('nonsense')).toBe('all')
    expect(parseTab(null)).toBe('all')
    expect(parseSort('progress')).toBe('progress')
    expect(parseSort('x')).toBe('recent')
  })
})

describe('data accuracy', () => {
  it('counts 100 lessons: one per published item, all in the six stages', () => {
    const [item] = build(store()).items
    expect(item!.lessonCount).toBe(content.filter((entry) => entry.published).length)
  })
})
