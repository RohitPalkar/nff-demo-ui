import type { LearningPath, LearningProgressStore } from '@/types'
import type { AccessContext } from './access'
import { buildPathPage, type PathLesson, type PathModule } from './pathPage'

/**
 * What the lesson screen needs beyond the lesson itself: where it sits in its
 * path, the curriculum for the sidebar and drawer, previous and next lessons,
 * and what finishing it means for the module and path. Built on
 * `buildPathPage`, so lesson states, locks and progress are the same numbers
 * the path page, My Learning and Home show. Nothing is stored here.
 */

export interface LessonPageData {
  path: LearningPath
  modules: PathModule[]
  module: PathModule
  lesson: PathLesson
  /** 1-based place within the module, and the module's lesson count. */
  position: number
  total: number
  /** Nearest lesson before or after that can be opened now. Never a locked one. */
  prev?: PathLesson
  next?: PathLesson
  completion: {
    lessonComplete: boolean
    moduleComplete: boolean
    pathComplete: boolean
    completedInModule: number
    totalInModule: number
    /** The module after this one, and whether it is open yet. */
    nextModule?: { id: string; label: string; open: boolean; lockedBy?: string }
  }
}

/** A lesson that leads somewhere: not locked, and not audio that is not ready. */
const reachable = (lesson: PathLesson) => lesson.state !== 'locked' && lesson.state !== 'unavailable'

export function buildLessonPage(
  ctx: AccessContext,
  store: LearningProgressStore,
  path: LearningPath,
  lessonId: string,
  options: { isPreview: boolean },
): LessonPageData | null {
  const { modules } = buildPathPage(ctx, store, path, options)
  const module = modules.find((entry) => entry.lessons.some((lesson) => lesson.lessonId === lessonId))
  const lesson = module?.lessons.find((entry) => entry.lessonId === lessonId)
  if (!module || !lesson) return null

  const ordered = modules.flatMap((entry) => entry.lessons)
  const index = ordered.findIndex((entry) => entry.lessonId === lessonId)
  const prev = [...ordered.slice(0, index)].reverse().find(reachable)
  const next = ordered.slice(index + 1).find(reachable)

  const moduleIndex = modules.indexOf(module)
  const following = modules[moduleIndex + 1]
  return {
    path,
    modules,
    module,
    lesson,
    position: lesson.number,
    total: module.lessons.length,
    ...(prev ? { prev } : {}),
    ...(next ? { next } : {}),
    completion: {
      lessonComplete: lesson.state === 'complete',
      moduleComplete: module.complete,
      pathComplete: modules.length > 0 && modules.every((entry) => entry.complete),
      completedInModule: module.completedCount,
      totalInModule: module.total,
      ...(following
        ? {
            nextModule: {
              id: following.id,
              label: following.label,
              open: !following.lockedBy,
              ...(following.lockedBy ? { lockedBy: following.lockedBy } : {}),
            },
          }
        : {}),
    },
  }
}
