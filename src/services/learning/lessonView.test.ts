import { beforeEach, describe, expect, it } from 'vitest'
import type { AccessContext } from '@/services/learning/access'
import { getAccessContext } from '@/services/learning/accessContext'
import {
  MEADOW_JOURNEY_ID,
  getLessonsOf,
  getModulesOf,
  getPath,
  getPathBySlug,
  lessonIdForItem,
} from '@/services/learning/catalogue'
import { buildLessonPage } from '@/services/learning/lessonView'
import { PROGRESS_STORE_VERSION, type LearningProgressStore, type Role } from '@/types'

const learner = { id: 'u-demo', role: 'practitioner' as Role }
const store = (done: string[] = []): LearningProgressStore => ({
  version: PROGRESS_STORE_VERSION,
  userId: learner.id,
  lessons: Object.fromEntries(done.map((id) => [lessonIdForItem(id), { lessonId: lessonIdForItem(id), status: 'completed' as const }])),
  media: {},
  activity: [],
  updatedAt: '2026-11-10T09:00:00.000Z',
})
const ctx = (progress: LearningProgressStore): AccessContext => ({ ...getAccessContext(learner, { surface: 'learn' }), progress })
const meadow = () => getPath(MEADOW_JOURNEY_ID)!
const lessons = (pathId: string) => getModulesOf(pathId).map((m) => getLessonsOf(m.id).map((l) => l.id))
const itemOf = (lessonId: string) => lessonId.replace('lesson-', '').split('@')[0]!
const view = (progress: LearningProgressStore, lessonId: string, path = meadow()) =>
  buildLessonPage(ctx(progress), progress, path, lessonId, { isPreview: false })!

beforeEach(() => window.localStorage.clear())

describe('previous and next', () => {
  it('follows path order, with no previous on the first lesson', () => {
    const [first, second] = lessons(MEADOW_JOURNEY_ID)[0]!
    const data = view(store(), first!)
    expect(data.prev).toBeUndefined()
    expect(data.next?.lessonId).toBe(second)
    expect(view(store(), second!).prev?.lessonId).toBe(first)
  })

  it('never offers a locked lesson: the last lesson of an unfinished module has no next', () => {
    const module1 = lessons(MEADOW_JOURNEY_ID)[0]!
    const last = module1.at(-1)!
    const data = view(store(), last)
    expect(data.next).toBeUndefined()
    expect(data.completion.nextModule?.open).toBe(false)
  })

  it('crosses into the next module once it is open', () => {
    const [module1, module2] = lessons(MEADOW_JOURNEY_ID)
    const progress = store(module1!.map(itemOf))
    const data = view(progress, module1!.at(-1)!)
    expect(data.next?.lessonId).toBe(module2![0])
    expect(data.completion.moduleComplete).toBe(true)
    expect(data.completion.nextModule?.open).toBe(true)
    // And back again from the first lesson of module two.
    expect(view(progress, module2![0]!).prev?.lessonId).toBe(module1!.at(-1))
  })

  it('has no next on the last lesson of the path, and reports the path complete', () => {
    const all = lessons(MEADOW_JOURNEY_ID).flat()
    const progress = store(all.map(itemOf))
    const data = view(progress, all.at(-1)!)
    expect(data.next).toBeUndefined()
    expect(data.completion.pathComplete).toBe(true)
    expect(data.completion.nextModule).toBeUndefined()
  })

  it('skips audio that is not ready rather than leading to a dead end', () => {
    const all = lessons(MEADOW_JOURNEY_ID)[0]!
    const processing = all.find((id) => itemOf(id) === 'med-1')!
    const before = all[all.indexOf(processing) - 1]!
    const data = view(store(), before)
    expect(data.next?.lessonId).not.toBe(processing)
    expect(data.next?.lessonId).toBe(all[all.indexOf(processing) + 1])
  })

  it('moves across modules freely in an open path', () => {
    const path = getPathBySlug('first-steps')!
    const modules = lessons(path.id)
    const data = view(store(), modules[0]!.at(-1)!, path)
    expect(data.next?.lessonId).toBe(modules[1]![0])
  })
})

describe('lesson context', () => {
  it('reports place and module progress from the shared calculation', () => {
    const [first, second] = lessons(MEADOW_JOURNEY_ID)[0]!
    const data = view(store([itemOf(first!)]), second!)
    expect(data.position).toBe(2)
    expect(data.total).toBe(lessons(MEADOW_JOURNEY_ID)[0]!.length)
    expect(data.completion.completedInModule).toBe(1)
    expect(data.completion.lessonComplete).toBe(false)
    expect(data.modules).toHaveLength(6)
    expect(view(store([itemOf(second!)]), second!).completion.lessonComplete).toBe(true)
  })

  it('returns null for a lesson that is not in the path', () => {
    const progress = store()
    expect(buildLessonPage(ctx(progress), progress, getPathBySlug('first-steps')!, 'lesson-nope', { isPreview: false })).toBeNull()
  })
})
