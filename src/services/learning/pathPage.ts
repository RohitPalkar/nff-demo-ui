import { formatDuration, formatReadingTime } from '@/lib/format'
import { resolveVideoState } from '@/features/video/videoState'
import type { ContentItem, LearningPath, LearningProgressStore } from '@/types'
import type { AccessContext } from './access'
import { lessonIdForItem } from './catalogue'
import { buildMyLearning, type MyLearningItem } from './myLearning'
import { buildPathOverview, type PathOverview, type PathOverviewLesson } from './outline'
import { getContentVideo, videoProgressId } from './video'

/**
 * Everything the learning-path page shows, from the shared services:
 * progress and the next lesson from `buildMyLearning` (so Home, My Learning
 * and this page cannot disagree), module locks from `canAccessModule`, and
 * lesson access from `canAccessLesson`. Nothing here is stored or invented.
 */

export type LessonState = 'complete' | 'in-progress' | 'available' | 'locked' | 'unavailable'
export type LessonFormat = 'article' | 'audio'

export interface PathLesson extends PathOverviewLesson {
  /** 1-based position within the module. */
  number: number
  state: LessonState
  format: LessonFormat
  hasVideo: boolean
  /** "6 min read" or "12 min". */
  duration: string
  /** Why it cannot be opened, in words. */
  note?: string
}

export interface PathModule {
  id: string
  order: number
  title: string
  summary: string
  intro?: string
  label: string
  /** Set when locked: what must be finished first. */
  lockedBy?: string
  complete: boolean
  completedCount: number
  total: number
  percent: number
  /** The module the learner is working in (or will start with). */
  current: boolean
  lessons: PathLesson[]
}

export interface PathPageData {
  path: LearningPath
  status: MyLearningItem['status']
  unlock: PathOverview['unlock']
  moduleCount: number
  lessonCount: number
  completedCount: number
  percent: number
  assignedAt?: string
  dueAt?: string
  preview: boolean
  action?: MyLearningItem['action']
  nextLesson?: MyLearningItem['nextLesson']
  modules: PathModule[]
  /** Modules to open by default: the current one, or none when the path is complete. */
  defaultOpen: string[]
}

function lessonProgressed(store: LearningProgressStore, lessonId: string, item: ContentItem): boolean {
  if (store.inProgressLessonId === lessonId) return true
  // Reading position is saved against the item's Meadow lesson id (completion
  // is shared by item), so a lesson in another path reads it from there too.
  if ((store.lessons[lessonId]?.reading?.scrollPct ?? 0) > 0) return true
  if ((store.lessons[lessonIdForItem(item.id)]?.reading?.scrollPct ?? 0) > 0) return true
  if ((store.media[item.id]?.positionSec ?? 0) > 0) return true
  return (store.media[videoProgressId(item.id)]?.positionSec ?? 0) > 0
}

function stateOf(
  lesson: PathOverviewLesson,
  moduleLocked: boolean,
  store: LearningProgressStore,
  unplayable: boolean,
): { state: LessonState; note?: string } {
  if (lesson.complete) return { state: 'complete' }
  if (!lesson.openable) {
    return {
      state: 'locked',
      note: moduleLocked ? undefined : 'You do not have access to this lesson',
    }
  }
  if (unplayable) return { state: 'unavailable', note: 'Audio is still being prepared' }
  return { state: lessonProgressed(store, lesson.lessonId, lesson.item) ? 'in-progress' : 'available' }
}

export function buildPathPage(
  ctx: AccessContext,
  store: LearningProgressStore,
  path: LearningPath,
  options: { isPreview: boolean },
): PathPageData {
  const overview = buildPathOverview(ctx, store, path)
  const mine = buildMyLearning(ctx, store, options).items.find((entry) => entry.path.id === path.id)
  const currentModuleId = options.isPreview ? undefined : mine?.currentModule?.module.id

  const modules = overview.modules.map((entry): PathModule => {
    const locked = Boolean(entry.lockedBy)
    const lessons = entry.lessons.map((lesson, index): PathLesson => {
      const unplayable = lesson.item.type === 'meditation' && lesson.item.transcode !== 'ready'
      const { state, note } = stateOf(lesson, locked, store, unplayable)
      return {
        ...lesson,
        number: index + 1,
        state,
        format: lesson.item.type === 'meditation' ? 'audio' : 'article',
        hasVideo: resolveVideoState(getContentVideo(lesson.item.id)) === 'ready',
        duration:
          lesson.item.type === 'meditation'
            ? formatDuration(lesson.item.durationSec)
            : formatReadingTime(lesson.item.readingTimeMin),
        ...(note ? { note } : {}),
      }
    })
    return {
      id: entry.module.id,
      order: entry.module.order,
      title: entry.module.title,
      summary: entry.module.summary,
      ...(entry.module.intro ? { intro: entry.module.intro } : {}),
      label: entry.label,
      ...(entry.lockedBy ? { lockedBy: entry.lockedBy } : {}),
      complete: entry.completion.complete,
      completedCount: entry.completion.requiredCompleted,
      total: entry.completion.requiredTotal,
      percent: entry.completion.percent,
      current: entry.module.id === currentModuleId,
      lessons,
    }
  })

  const status = options.isPreview ? 'not-started' : (mine?.status ?? (overview.completion.complete ? 'completed' : overview.completion.requiredCompleted > 0 ? 'in-progress' : 'not-started'))
  return {
    path,
    status,
    unlock: overview.unlock,
    moduleCount: modules.length,
    lessonCount: modules.reduce((sum, module) => sum + module.lessons.length, 0),
    completedCount: overview.completion.requiredCompleted,
    percent: overview.completion.percent,
    ...(mine?.assignedAt ? { assignedAt: mine.assignedAt } : {}),
    ...(mine?.dueAt ? { dueAt: mine.dueAt } : {}),
    preview: options.isPreview,
    ...(mine && !options.isPreview ? { action: mine.action } : {}),
    ...(mine?.nextLesson && !options.isPreview ? { nextLesson: mine.nextLesson } : {}),
    modules,
    defaultOpen: currentModuleId ? [currentModuleId] : [],
  }
}
