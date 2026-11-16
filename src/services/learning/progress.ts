import { readJson, storageGet, writeJson } from '@/mocks/api'
import { demoProgress, progressByUser } from '@/mocks/db'
import {
  PROGRESS_STORE_VERSION,
  type LearningActivity,
  type LearningActivityType,
  type LearningProgressStore,
  type Lesson,
  type LessonProgress,
  type MediaProgress,
  type Module,
  type Progress,
} from '@/types'
import { isPreviewIdentity } from './previewRoles'
import {
  getLessonsOf,
  getModule,
  getModulesOf,
  getResourceIdsOf,
  itemIdForLesson,
  lessonIdForItem,
} from './catalogue'

/**
 * Progress storage, version 2: `meadow.progress.v2.{userId}`.
 *
 * Migration from the legacy record (`nff.progress.{userId}`, or the seeded
 * mock progress when the user has none stored) runs once per user, on first
 * read. It is idempotent (an existing v2 record is never touched) and
 * recoverable (the legacy key is left in place, and `migratedFrom` says where
 * the data came from). Migration never creates activity events, completion
 * dates, played time or any other history that was not recorded.
 *
 * Existing screens still speak the legacy `Progress` shape. `toLegacyProgress`
 * and `saveLegacyProgress` are the adapters that keep them working unchanged.
 */

export const PROGRESS_V2_PREFIX = 'meadow.progress.v2.'
export const LEGACY_PROGRESS_PREFIX = 'nff.progress.'
export const ACTIVITY_CAP = 200

export const progressKey = (userId: string) => `${PROGRESS_V2_PREFIX}${userId}`
export const legacyProgressKey = (userId: string) =>
  `${LEGACY_PROGRESS_PREFIX}${userId}`

/**
 * Legacy media records used a suffixed id to keep a removed media type apart
 * from audio. Composite ids are no longer supported, so they are discarded
 * during migration and never copied back to the legacy shape.
 */
const isLegacyCompositeMediaId = (resourceId: string) => resourceId.includes('#')

/** Whether a persisted media record is supported audio progress. */
export function isSupportedAudioProgress(
  resourceId: string,
  media: { kind?: unknown; resourceId?: unknown } | undefined,
): boolean {
  if (!media || media.kind !== 'audio') return false
  if (isLegacyCompositeMediaId(resourceId)) return false
  return typeof media.resourceId !== 'string' || !isLegacyCompositeMediaId(media.resourceId)
}

function sanitizeMediaRecords(media: unknown): {
  media: Record<string, MediaProgress>
  changed: boolean
} {
  if (typeof media !== 'object' || media === null || Array.isArray(media)) {
    return { media: {}, changed: true }
  }

  const clean: Record<string, MediaProgress> = {}
  let changed = false
  for (const [resourceId, value] of Object.entries(media)) {
    if (
      isLegacyCompositeMediaId(resourceId) ||
      typeof value !== 'object' ||
      value === null ||
      !isSupportedAudioProgress(resourceId, value as { kind?: unknown; resourceId?: unknown })
    ) {
      changed = true
      continue
    }
    clean[resourceId] = value as MediaProgress
  }
  return { media: clean, changed }
}

function sanitizeStore(store: LearningProgressStore): LearningProgressStore {
  const { media, changed } = sanitizeMediaRecords(store.media)
  return changed ? { ...store, media } : store
}

function seedFor(userId: string): Progress | undefined {
  return (
    progressByUser.find((entry) => entry.userId === userId) ??
    (userId === demoProgress.userId ? demoProgress : undefined)
  )
}

/** A store with nothing recorded. Staff preview uses it so no one's record shows. */
export const emptyStore = (
  userId: string,
  at: string,
): LearningProgressStore => ({
  version: PROGRESS_STORE_VERSION,
  userId,
  lessons: {},
  media: {},
  activity: [],
  updatedAt: at,
})

/** Pure: legacy record in, v2 store out. No dates or events are invented. */
export function migrateLegacyProgress(
  legacy: Progress,
  source: 'legacy' | 'seed',
  now: Date,
): LearningProgressStore {
  const store = emptyStore(legacy.userId, legacy.updatedAt)
  store.migratedFrom = { source, at: now.toISOString() }

  for (const itemId of legacy.completedItemIds) {
    const lessonId = lessonIdForItem(itemId)
    store.lessons[lessonId] = { lessonId, status: 'completed' }
  }

  const inProgressId = legacy.inProgressItemId
  if (inProgressId) {
    const lessonId = lessonIdForItem(inProgressId)
    store.inProgressLessonId = lessonId
    if (store.lessons[lessonId]?.status !== 'completed') {
      store.lessons[lessonId] = { lessonId, status: 'in_progress' }
    }
  }

  for (const [resourceId, positionSec] of Object.entries(legacy.positionsSec)) {
    if (isLegacyCompositeMediaId(resourceId)) continue
    store.media[resourceId] = { resourceId, kind: 'audio', positionSec }
  }
  return store
}

function isStore(value: unknown): value is LearningProgressStore {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as LearningProgressStore).version === PROGRESS_STORE_VERSION
  )
}

function persist(store: LearningProgressStore) {
  // Staff previewing the learner area never write progress or activity.
  if (isPreviewIdentity(store.userId)) return
  writeJson(progressKey(store.userId), store)
}

/** Reads the v2 store, migrating on first use. */
export function loadProgress(
  userId: string,
  now: Date = new Date(),
): LearningProgressStore {
  const existing = readJson<unknown>(progressKey(userId), null)
  if (isStore(existing)) {
    const clean = sanitizeStore(existing)
    if (clean !== existing) persist(clean)
    return clean
  }

  const rawLegacy = storageGet(legacyProgressKey(userId))
  let legacy: Progress | undefined
  let source: 'legacy' | 'seed' | undefined
  if (rawLegacy) {
    try {
      legacy = JSON.parse(rawLegacy) as Progress
      source = 'legacy'
    } catch {
      legacy = undefined
    }
  }
  if (!legacy) {
    legacy = seedFor(userId)
    source = legacy ? 'seed' : undefined
  }

  const store =
    legacy && source
      ? migrateLegacyProgress({ ...legacy, userId }, source, now)
      : {
          ...emptyStore(userId, now.toISOString()),
          migratedFrom: { source: 'empty' as const, at: now.toISOString() },
        }
  persist(store)
  return store
}

// ---------------------------------------------------------------------------
// Legacy adapters (existing screens)
// ---------------------------------------------------------------------------

export function toLegacyProgress(store: LearningProgressStore): Progress {
  const completedItemIds: string[] = []
  for (const lesson of Object.values(store.lessons)) {
    if (lesson.status !== 'completed') continue
    const itemId = itemIdForLesson(lesson.lessonId)
    if (itemId) completedItemIds.push(itemId)
  }
  const positionsSec: Record<string, number> = {}
  for (const media of Object.values(store.media)) {
    if (!isSupportedAudioProgress(media.resourceId, media)) continue
    positionsSec[media.resourceId] = media.positionSec
  }
  const inProgress = store.inProgressLessonId
    ? itemIdForLesson(store.inProgressLessonId)
    : undefined
  return {
    userId: store.userId,
    completedItemIds,
    ...(inProgress ? { inProgressItemId: inProgress } : {}),
    positionsSec,
    updatedAt: store.updatedAt,
  }
}

function pushActivity(
  store: LearningProgressStore,
  type: LearningActivityType,
  at: string,
  ids: { lessonId?: string; resourceId?: string },
) {
  const entry: LearningActivity = {
    id: `act-${at}-${store.activity.length}`,
    type,
    ...ids,
    at,
  }
  store.activity = [...store.activity, entry].slice(-ACTIVITY_CAP)
}

/**
 * Pure merge of a legacy-shaped save into the v2 store. Completions that are
 * new in this save get a real `completedAt` and a `completed` activity event;
 * a changed in-progress item gets a `started` event. Position updates alone
 * record no activity.
 */
export function applyLegacyProgress(
  current: LearningProgressStore,
  legacy: Progress,
  now: Date,
): LearningProgressStore {
  const at = now.toISOString()
  const cleanCurrent = sanitizeStore(current)
  const store: LearningProgressStore = {
    ...cleanCurrent,
    lessons: { ...cleanCurrent.lessons },
    media: { ...cleanCurrent.media },
    activity: [...cleanCurrent.activity],
    updatedAt: at,
  }

  const completed = new Set(legacy.completedItemIds.map((itemId) => lessonIdForItem(itemId)))

  for (const lessonId of completed) {
    const before = store.lessons[lessonId]
    if (before?.status === 'completed') continue
    store.lessons[lessonId] = {
      ...before,
      lessonId,
      status: 'completed',
      completedAt: at,
    }
    pushActivity(store, 'completed', at, {
      lessonId,
      resourceId: itemIdForLesson(lessonId),
    })
  }
  // Mirror removals so the legacy contract (the array is the truth) holds.
  for (const lesson of Object.values(store.lessons)) {
    if (lesson.status === 'completed' && !completed.has(lesson.lessonId)) {
      store.lessons[lesson.lessonId] = {
        lessonId: lesson.lessonId,
        status: 'not_started',
      }
    }
  }

  const nextInProgress = legacy.inProgressItemId
    ? lessonIdForItem(legacy.inProgressItemId)
    : undefined
  if (nextInProgress !== store.inProgressLessonId) {
    const previous = store.inProgressLessonId
    if (previous && store.lessons[previous]?.status === 'in_progress') {
      store.lessons[previous] = { lessonId: previous, status: 'not_started' }
    }
    if (nextInProgress && store.lessons[nextInProgress]?.status !== 'completed') {
      store.lessons[nextInProgress] = {
        ...store.lessons[nextInProgress],
        lessonId: nextInProgress,
        status: 'in_progress',
      }
      pushActivity(store, 'started', at, {
        lessonId: nextInProgress,
        resourceId: itemIdForLesson(nextInProgress),
      })
    }
    if (nextInProgress) store.inProgressLessonId = nextInProgress
    else delete store.inProgressLessonId
  }

  for (const [resourceId, positionSec] of Object.entries(legacy.positionsSec)) {
    if (isLegacyCompositeMediaId(resourceId)) continue
    const before = store.media[resourceId]
    if (before && before.positionSec === positionSec) continue
    store.media[resourceId] = {
      ...before,
      resourceId,
      kind: 'audio',
      positionSec,
      updatedAt: at,
    }
  }
  return store
}

export function saveLegacyProgress(progress: Progress, now = new Date()) {
  const next = applyLegacyProgress(loadProgress(progress.userId, now), progress, now)
  persist(next)
  return next
}

// ---------------------------------------------------------------------------
// New records (used by later phases)
// ---------------------------------------------------------------------------

function update(
  userId: string,
  now: Date,
  change: (store: LearningProgressStore) => void,
) {
  const store = loadProgress(userId, now)
  const next: LearningProgressStore = {
    ...store,
    lessons: { ...store.lessons },
    media: { ...store.media },
    activity: [...store.activity],
    updatedAt: now.toISOString(),
  }
  change(next)
  persist(next)
  return next
}

export function recordActivity(
  userId: string,
  type: LearningActivityType,
  ids: { lessonId?: string; resourceId?: string } = {},
  now = new Date(),
) {
  return update(userId, now, (store) =>
    pushActivity(store, type, now.toISOString(), ids),
  )
}

/** Reading activity: where the learner got to in an article. */
export function recordReading(
  userId: string,
  lessonId: string,
  scrollPct: number,
  now = new Date(),
) {
  return update(userId, now, (store) => {
    const at = now.toISOString()
    const before: LessonProgress = store.lessons[lessonId] ?? {
      lessonId,
      status: 'not_started',
    }
    store.lessons[lessonId] = {
      ...before,
      lessonId,
      lastOpenedAt: at,
      reading: {
        scrollPct: Math.min(100, Math.max(0, Math.round(scrollPct))),
        lastReadAt: at,
      },
    }
  })
}

/**
 * Audio media progress. `playedDeltaSec` is time actually played since the
 * last call, so `playedSec` is never a wall-clock guess.
 */
export function recordMedia(
  userId: string,
  resourceId: string,
  update_: {
    kind: MediaProgress['kind']
    positionSec: number
    playedDeltaSec?: number
    completed?: boolean
  },
  now = new Date(),
) {
  if (!isSupportedAudioProgress(resourceId, update_)) return loadProgress(userId, now)
  return update(userId, now, (store) => {
    const before = store.media[resourceId]
    const at = now.toISOString()
    store.media[resourceId] = {
      resourceId,
      kind: update_.kind,
      positionSec: update_.completed ? 0 : update_.positionSec,
      furthestSec: Math.max(before?.furthestSec ?? 0, update_.positionSec),
      playedSec: (before?.playedSec ?? 0) + (update_.playedDeltaSec ?? 0),
      ...(update_.completed
        ? { completedAt: at }
        : before?.completedAt
          ? { completedAt: before.completedAt }
          : {}),
      updatedAt: at,
    }
  })
}

// ---------------------------------------------------------------------------
// Derived completion (never stored, so it cannot drift)
// ---------------------------------------------------------------------------

export interface CompletionSummary {
  requiredTotal: number
  requiredCompleted: number
  /** 0-100, from counts only. 0 when there is nothing required. */
  percent: number
  /** True only when there is something required and all of it is done. */
  complete: boolean
}

function summarise(total: number, done: number): CompletionSummary {
  return {
    requiredTotal: total,
    requiredCompleted: done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    complete: total > 0 && done === total,
  }
}

/**
 * Whether a lesson belongs in completion counts: required, in a published
 * module, and every resource it uses is published. Keeps drafts out of the
 * "X of Y lessons" denominator.
 */
export function countsTowardCompletion(lesson: Lesson): boolean {
  if (!lesson.required) return false
  if (getModule(lesson.moduleId)?.status !== 'published') return false
  return getResourceIdsOf(lesson).every(
    (resourceId) => getResource(resourceId)?.status === 'published',
  )
}

/**
 * Whether a lesson is complete. Completion is recorded per item (the reader
 * and player save against the item's Meadow Journey lesson), so a lesson in
 * another path that uses the same item counts as complete too.
 */
export function isLessonComplete(
  lesson: Pick<Lesson, 'id' | 'blocks'>,
  store: LearningProgressStore,
): boolean {
  if (store.lessons[lesson.id]?.status === 'completed') return true
  const resourceIds = getResourceIdsOf(lesson as Lesson)
  return (
    resourceIds.length > 0 &&
    resourceIds.every(
      (resourceId) => store.lessons[lessonIdForItem(resourceId)]?.status === 'completed',
    )
  )
}

export function moduleCompletion(
  module: Pick<Module, 'id'>,
  store: LearningProgressStore,
): CompletionSummary {
  const required = getLessonsOf(module.id).filter(countsTowardCompletion)
  const done = required.filter((lesson) => isLessonComplete(lesson, store)).length
  return summarise(required.length, done)
}

export function pathCompletion(
  pathId: string,
  store: LearningProgressStore,
): CompletionSummary & { modules: Array<{ moduleId: string } & CompletionSummary> } {
  const modules = getModulesOf(pathId).map((module) => ({
    moduleId: module.id,
    ...moduleCompletion(module, store),
  }))
  const total = modules.reduce((sum, entry) => sum + entry.requiredTotal, 0)
  const done = modules.reduce((sum, entry) => sum + entry.requiredCompleted, 0)
  return { ...summarise(total, done), modules }
}

/** The newest events first, from real records only. Empty when there are none. */
export function recentActivity(
  store: LearningProgressStore,
  limit = 10,
): LearningActivity[] {
  return [...store.activity].reverse().slice(0, limit)
}
