import { beforeEach, describe, expect, it, vi } from 'vitest'
import { content } from '@/mocks/db'
import { canAccessLesson, canAccessResource, isFull, type AccessContext } from '@/services/learning/access'
import { getAccessContext } from '@/services/learning/accessContext'
import {
  MEADOW_JOURNEY_ID,
  getLesson,
  getLessonsOf,
  getModulesOf,
  getPath,
  getPathBySlug,
  getResource,
  lessonIdForItem,
} from '@/services/learning/catalogue'
import { buildMyLearning } from '@/services/learning/myLearning'
import { buildPathPage } from '@/services/learning/pathPage'
import { pathCompletion } from '@/services/learning/progress'
import { PROGRESS_STORE_VERSION, type LearningProgressStore, type Role } from '@/types'

// These tests cover features switched off for SOW v1.3 (config/sowScope.ts).
// Run them with every feature on, so the code stays ready to switch back.
vi.mock('@/config/sowScope', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/sowScope')>()
  return {
    SOW_SCOPE: Object.fromEntries(Object.keys(actual.SOW_SCOPE).map((key) => [key, true])),
  }
})


const learner = { id: 'u-demo', role: 'practitioner' as Role }
const NOW = '2026-11-10T09:00:00.000Z'

const store = (completedItems: string[] = [], extra: Partial<LearningProgressStore> = {}): LearningProgressStore => ({
  version: PROGRESS_STORE_VERSION,
  userId: learner.id,
  lessons: Object.fromEntries(
    completedItems.map((id) => [lessonIdForItem(id), { lessonId: lessonIdForItem(id), status: 'completed' as const }]),
  ),
  media: {},
  activity: [],
  updatedAt: NOW,
  ...extra,
})

const ctxFor = (progress: LearningProgressStore): AccessContext => ({
  ...getAccessContext(learner, { surface: 'learn' }),
  progress,
})

const meadow = () => getPath(MEADOW_JOURNEY_ID)!
const page = (progress: LearningProgressStore, path = meadow(), isPreview = false) =>
  buildPathPage(ctxFor(progress), progress, path, { isPreview })
const meadowItems = () => getModulesOf(MEADOW_JOURNEY_ID).flatMap((m) => getLessonsOf(m.id)).map((l) => l.id.replace('lesson-', ''))

beforeEach(() => {
  window.localStorage.clear()
})

describe('counts come from the catalogue', () => {
  it('derives module and lesson counts and progress from real records', () => {
    const data = page(store(['exp-1', 'exp-2']))
    const modules = getModulesOf(MEADOW_JOURNEY_ID).filter((m) => m.status === 'published')
    expect(data.moduleCount).toBe(modules.length)
    expect(data.lessonCount).toBe(pathCompletion(MEADOW_JOURNEY_ID, store()).requiredTotal)
    expect(data.modules.map((m) => m.title)).toEqual(modules.map((m) => m.title))
    expect(data.modules.reduce((n, m) => n + m.lessons.length, 0)).toBe(data.lessonCount)
    expect(data.completedCount).toBe(2)
    // The brief's documented figures, checked against the derived ones.
    expect([data.moduleCount, data.lessonCount]).toEqual([6, 100])
  })

  it('lists lessons in their catalogue order, numbered within the module', () => {
    const data = page(store())
    for (const module of data.modules) {
      const ids = getLessonsOf(module.id).map((l) => l.id)
      expect(module.lessons.map((l) => l.lessonId)).toEqual(ids)
      expect(module.lessons.map((l) => l.number)).toEqual(ids.map((_, i) => i + 1))
    }
  })

  it('uses the same progress as My Learning', () => {
    const progress = store(['exp-1', 'exp-2', 'med-3'])
    const mine = buildMyLearning(ctxFor(progress), progress, { isPreview: false }).items.find((i) => i.path.id === MEADOW_JOURNEY_ID)!
    const data = page(progress)
    expect([data.completedCount, data.lessonCount, data.percent, data.status]).toEqual([
      mine.completedCount,
      mine.lessonCount,
      mine.percent,
      mine.status,
    ])
    expect(data.action).toEqual(mine.action)
    expect(data.modules.map((m) => m.percent)).toEqual(mine.modules.map((m) => m.percent))
  })
})

describe('lesson states', () => {
  it('marks completed, in-progress, available and locked lessons', () => {
    const first = getModulesOf(MEADOW_JOURNEY_ID)[0]!
    const items = getLessonsOf(first.id).map((l) => l.id.replace('lesson-', ''))
    const progress = store([items[0]!], { inProgressLessonId: lessonIdForItem(items[1]!) })
    const data = page(progress)
    const states = data.modules[0]!.lessons.map((l) => l.state)
    expect(states[0]).toBe('complete')
    expect(states[1]).toBe('in-progress')
    expect(states.slice(2).every((s) => s === 'available' || s === 'unavailable')).toBe(true)
    // Module two is locked until module one is done: every lesson in it locks.
    expect(data.modules[1]!.lockedBy).toBe(data.modules[0]!.label)
    expect(data.modules[1]!.lessons.every((l) => l.state === 'locked')).toBe(true)
  })

  it('treats a saved audio, video or reading position as in progress', () => {
    const first = getModulesOf(MEADOW_JOURNEY_ID)[0]!
    const items = getLessonsOf(first.id).map((l) => content.find((i) => i.id === l.id.replace('lesson-', ''))!)
    const audio = items.find((i) => i.type === 'meditation' && i.transcode === 'ready')!
    const article = items.find((i) => i.type === 'exploration')!
    const progress = store([], {
      media: { [audio.id]: { resourceId: audio.id, kind: 'audio', positionSec: 40, updatedAt: NOW } },
      lessons: { [lessonIdForItem(article.id)]: { lessonId: lessonIdForItem(article.id), status: 'in_progress', reading: { scrollPct: 35, lastReadAt: NOW } } },
    })
    const rows = page(progress).modules[0]!.lessons
    expect(rows.find((l) => l.item.id === audio.id)!.state).toBe('in-progress')
    expect(rows.find((l) => l.item.id === article.id)!.state).toBe('in-progress')
  })

  it('shows audio that is still processing as not ready, not as available', () => {
    const data = page(store())
    const processing = data.modules.flatMap((m) => m.lessons).find((l) => l.item.id === 'med-20')
    if (processing && processing.state !== 'locked') expect(processing.state).toBe('unavailable')
    const allStates = data.modules.flatMap((m) => m.lessons).filter((l) => l.item.type === 'meditation' && l.item.transcode !== 'ready')
    expect(allStates.every((l) => l.state !== 'available')).toBe(true)
  })

  it('shows a video only when it can play', () => {
    const lessons = page(store(meadowItems())).modules.flatMap((m) => m.lessons)
    const withVideo = lessons.filter((l) => l.hasVideo).map((l) => l.item.id).sort()
    expect(withVideo).toEqual(['exp-1', 'exp-20', 'exp-7', 'med-56'])
    expect(lessons.find((l) => l.item.id === 'med-5')!.hasVideo).toBe(false)
  })
})

describe('unlock rules', () => {
  it('opens the next module of a sequential path when the previous is complete', () => {
    const first = getModulesOf(MEADOW_JOURNEY_ID)[0]!
    const done = getLessonsOf(first.id).map((l) => l.id.replace('lesson-', ''))
    const data = page(store(done))
    expect(data.modules[0]!.complete).toBe(true)
    expect(data.modules[1]!.lockedBy).toBeUndefined()
    expect(data.modules[2]!.lockedBy).toBe(data.modules[1]!.label)
    expect(data.unlock).toBe('sequential')
  })

  it('leaves every module of an open path unlocked', () => {
    const data = page(store(), getPathBySlug('first-steps')!)
    expect(data.unlock).toBe('open')
    expect(data.modules.every((m) => !m.lockedBy)).toBe(true)
  })

  it('opens on the current module, and on none once the path is complete', () => {
    const first = getModulesOf(MEADOW_JOURNEY_ID)[0]!
    expect(page(store()).defaultOpen).toEqual([first.id])
    const done = page(store(meadowItems()))
    expect(done.status).toBe('completed')
    expect(done.defaultOpen).toEqual([])
    expect(done.action?.label).toBe('Review learning')
  })
})

describe('primary action', () => {
  it('starts a new learner on the first available lesson', () => {
    const data = page(store())
    expect(data.status).toBe('not-started')
    expect(data.action?.label).toBe('Start learning')
    expect(data.action?.href).toBe(data.modules[0]!.lessons[0]!.href)
  })

  it('continues the in-progress lesson', () => {
    const first = getModulesOf(MEADOW_JOURNEY_ID)[0]!
    const items = getLessonsOf(first.id).map((l) => l.id.replace('lesson-', ''))
    const target = items[3]!
    const progress = store([items[0]!], { inProgressLessonId: lessonIdForItem(target) })
    const data = page(progress)
    expect(data.status).toBe('in-progress')
    expect(data.action?.label).toBe('Continue learning')
    expect(data.action?.href).toContain(lessonIdForItem(target))
  })
})

describe('staff preview', () => {
  it('is read-only: no action, no personal progress, nothing assigned', () => {
    const progress = store()
    const data = buildPathPage(
      { ...getAccessContext({ id: 'u-editor', role: 'editor' as Role }, { surface: 'learn' }), progress },
      progress,
      meadow(),
      { isPreview: true },
    )
    expect(data.preview).toBe(true)
    expect(data.action).toBeUndefined()
    expect(data.assignedAt).toBeUndefined()
    expect(data.defaultOpen).toEqual([])
    expect(data.modules.every((m) => !m.lockedBy)).toBe(true)
  })
})

describe('library, path and direct-URL access differ', () => {
  it('a resource in a locked module opens from the Library but not through its path', () => {
    const progress = store()
    const ctx = ctxFor(progress)
    const data = page(progress)
    const locked = data.modules[1]!.lessons[0]!
    // Resource-level access (what the Library and /learn/library/... use).
    expect(isFull(canAccessResource(ctx, getResource(locked.item.id)))).toBe(true)
    // Lesson-level access (what the path and a direct lesson URL use).
    const decision = canAccessLesson(ctx, getLesson(locked.lessonId))
    expect(decision.mode).toBe('none')
    expect(decision.reason).toBe('locked-module')
    expect(locked.state).toBe('locked')
  })
})
