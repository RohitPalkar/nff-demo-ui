import { lessonIdForItem, moduleIdForStage } from './catalogue'

/**
 * Canonical URLs of the Practitioner application. Everything inside `/learn`
 * stays inside the shell; nothing here points at the public website.
 */

export const LEARN_HOME = '/learn'
export const LEARN_MY_LEARNING = '/learn/my-learning'
export const LEARN_LIBRARY = '/learn/library'
export const LEARN_MEDITATIONS = '/learn/meditations'
export const LEARN_PROGRESS = '/learn/progress'
export const LEARN_ACCESS_DENIED = '/learn/access-denied'

export const MEADOW_JOURNEY_SLUG = 'meadow-journey'

export const pathHref = (slug = MEADOW_JOURNEY_SLUG) => `/learn/paths/${slug}`

/** A stage of the migrated path (a module), shown inside the path page. */
export const moduleHref = (stageId: string) =>
  `${pathHref()}?module=${moduleIdForStage(stageId)}`

/** A Meadow Journey lesson, by the id of the content item it was migrated from. */
export const lessonHref = (itemId: string) =>
  `${pathHref()}/lessons/${lessonIdForItem(itemId)}`

/** Any lesson of any path, by lesson id. */
export const pathLessonHref = (pathSlug: string, lessonId: string) =>
  `${pathHref(pathSlug)}/lessons/${lessonId}`

export type LibraryType = 'article' | 'audio' | 'video' | 'mixed'

export const libraryHref = (type: LibraryType, slug: string) =>
  `${LEARN_LIBRARY}/${type}/${slug}`

/** A meditation, opened inside Meditations (same player and access as the Library). */
export const meditationHref = (slug: string) => `${LEARN_MEDITATIONS}/${slug}`
