import type { Assignment, LearningPath, LearningProgressStore, Module } from '@/types'
import { canAccessPath, isFull, type AccessContext } from './access'
import { listAssignments } from './assignments'
import { getLesson, getModule, getModulesOf, getPath } from './catalogue'
import {
  listAssignedPaths,
  listRecentLessons,
  moduleLabel,
  pickContinueLearning,
  pickUpNext,
  type AssignedPath,
  type HomeLesson,
} from './home'
import { pathCompletion } from './progress'

/**
 * My Learning, as data. Every view (All, In progress, Not started, Completed)
 * is a filter over one list built from real assignments and progress; nothing
 * is stored per tab. Reuses the Home rules for "what to resume" and "what is
 * next" so the two pages can never disagree.
 *
 * The architecture has learning paths only. There are no courses, and nothing
 * records enrolment yet (`startEnrolment` is never called), so "started" means
 * the learner has a real record against a lesson in the path: a completion, the
 * in-progress lesson, or a dated audio, video or reading position.
 */

export type LearningStatus = 'in-progress' | 'not-started' | 'completed'

export const MY_LEARNING_TABS = ['all', 'in-progress', 'not-started', 'completed'] as const
export type MyLearningTab = (typeof MY_LEARNING_TABS)[number]

export const MY_LEARNING_SORTS = ['recent', 'assigned', 'progress', 'title'] as const
export type MyLearningSort = (typeof MY_LEARNING_SORTS)[number]

export const SORT_LABEL: Record<MyLearningSort, string> = {
  recent: 'Recently accessed',
  assigned: 'Recently assigned',
  progress: 'Progress',
  title: 'Title A–Z',
}

export interface LearningAction {
  label: 'Start learning' | 'Continue learning' | 'Review learning' | 'View learning path'
  href: string
}

export interface MyLearningItem {
  /** Only paths exist in the current architecture. */
  type: 'path'
  path: LearningPath
  href: string
  status: LearningStatus
  moduleCount: number
  lessonCount: number
  completedCount: number
  percent: number
  assignedAt?: string
  dueAt?: string
  /** Newest real record against any lesson of this path. */
  lastAccessedAt?: string
  /** The module the learner is in (or will start), when there is one. */
  currentModule?: { module: Module; label: string }
  /** The lesson to resume or start. Absent when complete or nothing is openable. */
  nextLesson?: HomeLesson & { resume: boolean }
  action: LearningAction
  /** Each published module in order, with its real completion. */
  modules: Array<{ id: string; order: number; title: string; percent: number; complete: boolean }>
  /** Staff preview: listed for inspection, not assigned. */
  preview: boolean
}

export interface WithdrawnLearning {
  path: LearningPath
  withdrawnAt?: string
}

export interface MyLearning {
  items: MyLearningItem[]
  /** Paths whose assignment was withdrawn and that are not assigned again. */
  withdrawn: WithdrawnLearning[]
  isPreview: boolean
}

/** The path a lesson belongs to. */
function pathOfLesson(lessonId: string | undefined): string | undefined {
  const lesson = lessonId ? getLesson(lessonId) : undefined
  return lesson ? getModule(lesson.moduleId)?.pathId : undefined
}

function statusOf(
  summary: AssignedPath,
  started: boolean,
): LearningStatus {
  if (summary.status === 'complete') return 'completed'
  return started || summary.completedCount > 0 ? 'in-progress' : 'not-started'
}

export function buildMyLearning(
  ctx: AccessContext,
  store: LearningProgressStore,
  options: { isPreview: boolean },
): MyLearning {
  const assigned = listAssignedPaths(ctx, store)
  const continueLearning = options.isPreview ? null : pickContinueLearning(ctx, store)
  // Every recent record, so "last accessed" covers all lessons of a path.
  const recent = options.isPreview ? [] : listRecentLessons(store, new Set(), Number.MAX_SAFE_INTEGER)

  const items = assigned.map((summary): MyLearningItem => {
    const pathId = summary.path.id
    const inPath = (lesson: HomeLesson | null | undefined) => lesson?.path.id === pathId
    const resumeHere = inPath(continueLearning) ? continueLearning! : null
    // Started: a completion (counted in statusOf), the in-progress lesson, or
    // any dated record against one of this path's lessons.
    const startedByProgress =
      !options.isPreview &&
      (Boolean(resumeHere) ||
        pathOfLesson(store.inProgressLessonId) === pathId ||
        recent.some((entry) => entry.path.id === pathId))
    const status = statusOf(summary, startedByProgress)

    const [upNext] = pickUpNext(ctx, store, [summary], new Set(), 1)
    const next =
      status === 'completed'
        ? undefined
        : resumeHere
          ? { ...resumeHere, resume: true }
          : upNext
            ? { ...upNext, resume: false }
            : undefined

    const lastAccessedAt = recent.find((entry) => entry.path.id === pathId)?.at

    const module = next?.module ?? firstIncompleteModule(pathId, store)
    const action: LearningAction = options.isPreview
      ? { label: 'View learning path', href: summary.href }
      : status === 'completed'
        ? { label: 'Review learning', href: summary.href }
        : next
          ? {
              label: status === 'not-started' ? 'Start learning' : 'Continue learning',
              href: next.href,
            }
          : { label: 'View learning path', href: summary.href }

    return {
      type: 'path',
      path: summary.path,
      href: summary.href,
      status,
      moduleCount: summary.moduleCount,
      lessonCount: summary.lessonCount,
      completedCount: summary.completedCount,
      percent: summary.percent,
      ...(summary.assignedAt ? { assignedAt: summary.assignedAt } : {}),
      ...(summary.dueAt ? { dueAt: summary.dueAt } : {}),
      ...(lastAccessedAt ? { lastAccessedAt } : {}),
      ...(module && status !== 'completed'
        ? { currentModule: { module, label: moduleLabel(module) } }
        : {}),
      ...(next ? { nextLesson: next } : {}),
      action,
      modules: moduleProgress(pathId, store),
      preview: summary.preview,
    }
  })

  return {
    items,
    withdrawn: options.isPreview ? [] : listWithdrawn(ctx, items),
    isPreview: options.isPreview,
  }
}

function moduleProgress(pathId: string, store: LearningProgressStore): MyLearningItem['modules'] {
  return pathCompletion(pathId, store).modules.flatMap((entry) => {
    const module = getModule(entry.moduleId)
    if (!module || module.status !== 'published') return []
    return [{ id: module.id, order: module.order, title: module.title, percent: entry.percent, complete: entry.complete }]
  })
}

function firstIncompleteModule(pathId: string, store: LearningProgressStore): Module | undefined {
  const summary = pathCompletion(pathId, store)
  const entry = summary.modules.find((module) => !module.complete && module.requiredTotal > 0)
  return entry ? getModule(entry.moduleId) : getModulesOf(pathId)[0]
}

/**
 * Withdrawn assignments of this user (direct only: group withdrawals are not
 * visible per person) for paths that are not assigned to them again.
 */
function listWithdrawn(ctx: AccessContext, items: MyLearningItem[]): WithdrawnLearning[] {
  const userId = ctx.user?.id
  if (!userId) return []
  const active = new Set(items.map((item) => item.path.id))
  const seen = new Set<string>()
  const rows: WithdrawnLearning[] = []
  const withdrawn = listAssignments()
    .filter(
      (entry: Assignment) =>
        entry.status === 'withdrawn' &&
        entry.target.type === 'user' &&
        entry.target.userId === userId,
    )
    .sort((a, b) => (b.withdrawnAt ?? '').localeCompare(a.withdrawnAt ?? ''))
  for (const entry of withdrawn) {
    if (active.has(entry.pathId) || seen.has(entry.pathId)) continue
    const path = getPath(entry.pathId)
    // Still openable another way (e.g. a public path): it is not "lost".
    if (!path || isFull(canAccessPath(ctx, path))) continue
    seen.add(entry.pathId)
    rows.push({ path, ...(entry.withdrawnAt ? { withdrawnAt: entry.withdrawnAt } : {}) })
  }
  return rows
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

export function filterByTab(items: MyLearningItem[], tab: MyLearningTab): MyLearningItem[] {
  return tab === 'all' ? items : items.filter((item) => item.status === tab)
}

export function countByTab(items: MyLearningItem[]): Record<MyLearningTab, number> {
  return {
    all: items.length,
    'in-progress': filterByTab(items, 'in-progress').length,
    'not-started': filterByTab(items, 'not-started').length,
    completed: filterByTab(items, 'completed').length,
  }
}

/** Stable sorts; ties (and missing dates, which go last) fall back to title. */
export function sortLearning(items: MyLearningItem[], sort: MyLearningSort): MyLearningItem[] {
  const byTitle = (a: MyLearningItem, b: MyLearningItem) =>
    a.path.title.localeCompare(b.path.title) || a.path.id.localeCompare(b.path.id)
  const byDateDesc = (pick: (item: MyLearningItem) => string | undefined) =>
    (a: MyLearningItem, b: MyLearningItem) => {
      const x = pick(a)
      const y = pick(b)
      if (x && y && x !== y) return y.localeCompare(x)
      if (x && !y) return -1
      if (!x && y) return 1
      return byTitle(a, b)
    }
  const compare = {
    recent: byDateDesc((item) => item.lastAccessedAt),
    assigned: byDateDesc((item) => item.assignedAt),
    progress: (a: MyLearningItem, b: MyLearningItem) => b.percent - a.percent || byTitle(a, b),
    title: byTitle,
  }[sort]
  return [...items].sort(compare)
}

export function parseTab(value: string | null): MyLearningTab {
  return MY_LEARNING_TABS.includes(value as MyLearningTab) ? (value as MyLearningTab) : 'all'
}

export function parseSort(value: string | null): MyLearningSort {
  return MY_LEARNING_SORTS.includes(value as MyLearningSort) ? (value as MyLearningSort) : 'recent'
}

