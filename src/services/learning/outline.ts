import { content } from '@/mocks/db'
import type { ContentItem, LearningPath, LearningProgressStore, Module } from '@/types'
import { canAccessLesson, canAccessModule, isFull, type AccessContext } from './access'
import { getLesson, getLessonsOf, getModule, getModulesOf, getPath, itemIdForLesson } from './catalogue'
import {
  isLessonComplete,
  moduleCompletion,
  pathCompletion,
  type CompletionSummary,
} from './progress'
import { moduleLabel } from './home'
import { pathHref, pathLessonHref } from './routes'

/**
 * Where a lesson sits in its own path: what the reader and player show as the
 * back link, "Lesson 2 of 5" and previous/next. Meadow Journey lessons keep
 * using the stage screens' own navigation; this is for every other path.
 */
export interface LessonOutline {
  pathTitle: string
  /** "Module 1 · Getting oriented" */
  overline: string
  /** Left out when the item is opened on its own, e.g. from the Library. */
  position?: number
  total?: number
  backHref: string
  backLabel: string
  prev?: { href: string; itemId: string }
  next?: { href: string; itemId: string }
}

export function lessonOutline(lessonId: string): LessonOutline | undefined {
  const lesson = getLesson(lessonId)
  const module = lesson ? getModule(lesson.moduleId) : undefined
  const path = module ? getPath(module.pathId) : undefined
  if (!lesson || !module || !path) return undefined

  const ordered = getModulesOf(path.id).flatMap((entry) => getLessonsOf(entry.id))
  const inModule = getLessonsOf(module.id)
  const index = ordered.findIndex((entry) => entry.id === lesson.id)
  const link = (target: (typeof ordered)[number] | undefined) => {
    const itemId = target ? itemIdForLesson(target.id) : undefined
    return target && itemId ? { href: pathLessonHref(path.slug, target.id), itemId } : undefined
  }
  const prev = link(ordered[index - 1])
  const next = link(ordered[index + 1])

  return {
    pathTitle: path.title,
    overline: `${path.title} · ${moduleLabel(module)}`,
    position: inModule.findIndex((entry) => entry.id === lesson.id) + 1,
    total: inModule.length,
    backHref: pathHref(path.slug),
    backLabel: path.title,
    ...(prev ? { prev } : {}),
    ...(next ? { next } : {}),
  }
}

// ---------------------------------------------------------------------------
// Path overview (paths that are not built from the six stages)
// ---------------------------------------------------------------------------

export interface PathOverviewLesson {
  lessonId: string
  item: ContentItem
  href: string
  complete: boolean
  /** False when the module is locked or the lesson cannot be opened. */
  openable: boolean
}

export interface PathOverviewModule {
  module: Module
  label: string
  /** Set when locked: the module that must be finished first. */
  lockedBy?: string
  completion: CompletionSummary
  lessons: PathOverviewLesson[]
}

export interface PathOverview {
  path: LearningPath
  completion: CompletionSummary
  unlock: 'sequential' | 'open' | 'mixed'
  modules: PathOverviewModule[]
}

export function buildPathOverview(
  ctx: AccessContext,
  store: LearningProgressStore,
  path: LearningPath,
): PathOverview {
  const summary = pathCompletion(path.id, store)
  const modules = getModulesOf(path.id).filter((module) => module.status === 'published')
  const unlocks = new Set(modules.map((module) => module.unlock))
  return {
    path,
    completion: summary,
    unlock: unlocks.size > 1 ? 'mixed' : modules[0]?.unlock ?? 'open',
    modules: modules.map((module) => {
      const decision = canAccessModule(ctx, module)
      const locked = decision.reason === 'locked-module'
      const lockedByModule = decision.lockedBy ? getModule(decision.lockedBy) : undefined
      return {
        module,
        label: moduleLabel(module),
        ...(locked && lockedByModule ? { lockedBy: moduleLabel(lockedByModule) } : {}),
        completion: summary.modules.find((entry) => entry.moduleId === module.id) ?? moduleCompletion(module, store),
        lessons: getLessonsOf(module.id).flatMap((lesson) => {
          const itemId = itemIdForLesson(lesson.id)
          const item = content.find((entry) => entry.id === itemId)
          if (!item || !item.published) return []
          return [
            {
              lessonId: lesson.id,
              item,
              href: pathLessonHref(path.slug, lesson.id),
              complete: isLessonComplete(lesson, store),
              openable: isFull(canAccessLesson(ctx, lesson)),
            },
          ]
        }),
      }
    }),
  }
}
