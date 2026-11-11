import type { LearningProgressStore } from '@/types/learning'
import type { AccessContext } from './access'
import {
  getLessonsOf,
  getModule,
  getModulesOf,
  getResourceIdsOf,
  lessonIdForItem,
} from './catalogue'
import { resolveLesson, type HomeLesson } from './home'
import { buildMyLearning, type MyLearningItem } from './myLearning'
import { countsTowardCompletion, isLessonComplete, pathCompletion } from './progress'

/**
 * `/learn/progress`, as data. Pure, and built from the same services as Home
 * and My Learning (`buildMyLearning`, `pathCompletion`), so every number on
 * the page agrees with them. Nothing here is estimated: no time spent, no
 * streaks, no dates that were not recorded.
 */

export interface ProgressOverview {
  assignedPaths: number
  completedPaths: number
  /** Each lesson counted once, even when it appears in more than one path. */
  lessonsCompleted: number
  lessonsRemaining: number
}

export interface ModuleProgressRow {
  id: string
  label: string
  completed: number
  total: number
  percent: number
  complete: boolean
}

export interface PathProgress {
  item: MyLearningItem
  modules: ModuleProgressRow[]
}

export interface HistoryEntry extends HomeLesson {
  /** Recorded completion time. Absent for completions carried over from the old record. */
  completedAt?: string
}

export type TimelineKind = 'completed' | 'started'

export interface TimelineEvent extends HomeLesson {
  id: string
  kind: TimelineKind
  at: string
}

export interface ProgressPageData {
  isPreview: boolean
  overview: ProgressOverview
  paths: PathProgress[]
  history: { dated: HistoryEntry[]; undated: HistoryEntry[] }
  timeline: TimelineEvent[]
}

export const TIMELINE_LIMIT = 12

/** Lessons of a path that count toward completion, keyed by the items they use. */
function countedLessonKeys(pathId: string, store: LearningProgressStore) {
  const keys = new Map<string, boolean>()
  for (const module of getModulesOf(pathId)) {
    if (module.status !== 'published') continue
    for (const lesson of getLessonsOf(module.id)) {
      if (!countsTowardCompletion(lesson)) continue
      const key = getResourceIdsOf(lesson).sort().join('+') || lesson.id
      keys.set(key, (keys.get(key) ?? false) || isLessonComplete(lesson, store))
    }
  }
  return keys
}

export function progressOverview(
  items: MyLearningItem[],
  store: LearningProgressStore,
): ProgressOverview {
  const all = new Map<string, boolean>()
  for (const item of items) {
    for (const [key, done] of countedLessonKeys(item.path.id, store)) {
      all.set(key, (all.get(key) ?? false) || done)
    }
  }
  const lessonsCompleted = [...all.values()].filter(Boolean).length
  return {
    assignedPaths: items.length,
    completedPaths: items.filter((item) => item.status === 'completed').length,
    lessonsCompleted,
    lessonsRemaining: all.size - lessonsCompleted,
  }
}

function moduleRows(item: MyLearningItem, store: LearningProgressStore): ModuleProgressRow[] {
  const counts = new Map(pathCompletion(item.path.id, store).modules.map((entry) => [entry.moduleId, entry]))
  return item.modules.map((entry) => {
    const module = getModule(entry.id)
    const summary = counts.get(entry.id)
    const prefix = module?.legacyStageId ? 'Stage' : 'Module'
    return {
      id: entry.id,
      label: `${prefix} ${entry.order} · ${entry.title}`,
      completed: summary?.requiredCompleted ?? 0,
      total: summary?.requiredTotal ?? 0,
      percent: entry.percent,
      complete: entry.complete,
    }
  })
}

/**
 * Completed lessons, from the record. Those with a recorded time come first,
 * newest first; completions carried over from the old record have no time and
 * are listed after, in the order they were completed.
 */
export function learningHistory(store: LearningProgressStore) {
  const dated: HistoryEntry[] = []
  const undated: HistoryEntry[] = []
  for (const record of Object.values(store.lessons)) {
    if (record.status !== 'completed') continue
    const lesson = resolveLesson(record.lessonId)
    if (!lesson) continue
    if (record.completedAt) dated.push({ ...lesson, completedAt: record.completedAt })
    else undated.push(lesson)
  }
  dated.sort(
    (a, b) => b.completedAt!.localeCompare(a.completedAt!) || a.lessonId.localeCompare(b.lessonId),
  )
  return { dated, undated }
}

/**
 * Real learning events only: lessons started and completed. Playback events
 * (the demo audio is simulated), autosaves and position updates are left
 * out. Newest first.
 */
export function learningTimeline(store: LearningProgressStore, limit = TIMELINE_LIMIT): TimelineEvent[] {
  const events: TimelineEvent[] = []
  for (let index = store.activity.length - 1; index >= 0 && events.length < limit; index--) {
    const entry = store.activity[index]!
    if (entry.type !== 'completed' && entry.type !== 'started') continue
    const lesson = resolveLesson(
      entry.lessonId ?? (entry.resourceId ? lessonIdForItem(entry.resourceId) : undefined),
    )
    if (!lesson) continue
    events.push({ ...lesson, id: entry.id, kind: entry.type, at: entry.at })
  }
  return events
}

export function buildProgressPage(
  ctx: AccessContext,
  store: LearningProgressStore,
  options: { isPreview: boolean },
): ProgressPageData {
  const { items } = buildMyLearning(ctx, store, options)
  if (options.isPreview) {
    // Staff see the structure a learner would, never anyone's record.
    return {
      isPreview: true,
      overview: { assignedPaths: 0, completedPaths: 0, lessonsCompleted: 0, lessonsRemaining: 0 },
      paths: items.map((item) => ({ item, modules: moduleRows(item, store) })),
      history: { dated: [], undated: [] },
      timeline: [],
    }
  }
  return {
    isPreview: false,
    overview: progressOverview(items, store),
    paths: items.map((item) => ({ item, modules: moduleRows(item, store) })),
    history: learningHistory(store),
    timeline: learningTimeline(store),
  }
}
