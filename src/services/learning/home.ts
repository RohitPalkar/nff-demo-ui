import { content } from '@/mocks/db'
import type {
  ContentItem,
  LearningPath,
  LearningProgressStore,
  Lesson,
  MediaProgress,
  Module,
  SessionUser,
} from '@/types'
import {
  canAccessLesson,
  canAccessModule,
  canAccessPath,
  canAccessResource,
  isFull,
  type AccessContext,
} from './access'
import {
  getLearningCatalogue,
  getLesson,
  getModule,
  getModulesOf,
  getPath,
  getLessonsOf,
  itemIdForLesson,
  lessonIdForItem,
} from './catalogue'
import { isPreviewRole } from './previewRoles'
import { isLessonComplete, isSupportedAudioProgress, pathCompletion, countsTowardCompletion } from './progress'
import { subDays, format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'
import {
  LEARN_LIBRARY,
  pathLessonHref,
  libraryHref,
  pathHref,
  type LibraryType,
} from './routes'

/**
 * Practitioner Home, as data. Pure: everything comes from the access context
 * (assignments), the progress store and the catalogue. Nothing here invents a
 * date, a count or an event; every section can come back empty, and the page
 * then omits it or shows an empty state.
 */

export interface HomeLesson {
  lessonId: string
  item: ContentItem
  module: Module
  path: LearningPath
  href: string
  /** "Stage 2 · Arriving" */
  moduleLabel: string
}

export type ContinueReason = 'in-progress' | 'recent-media' | 'recent-reading'

export interface ContinueLearning extends HomeLesson {
  reason: ContinueReason
  /** Real position within the item, or null when none is recorded. */
  progress: { percent: number; label: string } | null
}

export type PathStatus = 'not-started' | 'in-progress' | 'complete'

export interface AssignedPath {
  path: LearningPath
  href: string
  moduleCount: number
  lessonCount: number
  completedCount: number
  percent: number
  status: PathStatus
  /** Earliest active assignment to this path. Absent in staff preview. */
  assignedAt?: string
  dueAt?: string
  /** Staff preview: listed because they can inspect it, not assigned. */
  preview: boolean
  /** The next available lesson in this path. */
  nextLesson?: { title: string; href: string }
}

export interface UpNextLesson extends HomeLesson {
  kind: 'reading' | 'audio'
}

export type RecentKind = 'completed' | 'started' | 'opened' | 'listened' | 'read'

export interface RecentLesson extends HomeLesson {
  kind: RecentKind
  at: string
}

export interface ExploreResource {
  item: ContentItem
  type: LibraryType
  href: string
}

export interface HomeAction {
  label: string
  href: string
}

// Learning Analytics Types
// ---------------------------------------------------------------------------

export interface WeeklyActivityDay {
  date: string
  label: string
  lessonsCompleted: number
  minutesListened: number
  isToday: boolean
}

export interface LearningStreak {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string | null
  weeklyActiveDays: boolean[] // 7 days, true = active
}

export interface LearningProgressOverview {
  totalLessons: number
  completedLessons: number
  percentComplete: number
  totalLearningTimeMinutes: number
  activePaths: number
}

export interface LearningTimeSeriesPoint {
  week: string
  minutes: number
  lessons: number
}

export interface LearnerHome {
  firstName: string
  intro: string
  /** Shown in the header only when there is no Continue card. */
  action: HomeAction | null
  isPreview: boolean
  continueLearning: ContinueLearning | null
  assigned: AssignedPath[]
  upNext: UpNextLesson[]
  recent: RecentLesson[]
  explore: ExploreResource[]
  libraryHref: string
  // Analytics
  progressOverview: LearningProgressOverview
  weeklyActivity: WeeklyActivityDay[]
  learningStreak: LearningStreak
  learningTimeSeries: LearningTimeSeriesPoint[]
}

export const UP_NEXT_LIMIT = 3
export const RECENT_LIMIT = 5
export const EXPLORE_LIMIT = 6

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const itemById = (id: string | undefined) =>
  id ? content.find((entry) => entry.id === id) : undefined

/** The meditation behind an audio media record. Other records are ignored. */
function mediaItemId(media: MediaProgress): string | undefined {
  if (!isSupportedAudioProgress(media.resourceId, media)) return undefined
  return itemById(media.resourceId)?.type === 'meditation' ? media.resourceId : undefined
}

/** Audio that cannot be played yet (still processing, or failed). */
const isUnplayable = (item: ContentItem) =>
  item.type === 'meditation' && item.transcode !== 'ready'

/** "Stage 2 · Attention" in Meadow Journey; "Module 1 · Noticing" elsewhere. */
export function moduleLabel(module: Pick<Module, 'order' | 'title' | 'legacyStageId'>) {
  return `${module.legacyStageId ? 'Stage' : 'Module'} ${module.order} · ${module.title}`
}

/** Resolves a lesson id to everything a card needs, or null if any part is missing. */
export function resolveLesson(lessonId: string | undefined): HomeLesson | null {
  if (!lessonId) return null
  const lesson = getLesson(lessonId)
  const module = lesson ? getModule(lesson.moduleId) : undefined
  const path = module ? getPath(module.pathId) : undefined
  const item = itemById(itemIdForLesson(lessonId))
  if (!lesson || !module || !path || !item || !item.published) return null
  return {
    lessonId,
    item,
    module,
    path,
    href: pathLessonHref(path.slug, lessonId),
    moduleLabel: moduleLabel(module),
  }
}

const isCompleted = (store: LearningProgressStore, lessonId: string) => {
  const lesson = getLesson(lessonId)
  return lesson ? isLessonComplete(lesson, store) : false
}

const canOpen = (ctx: AccessContext, lessonId: string) =>
  isFull(canAccessLesson(ctx, getLesson(lessonId)))

// ---------------------------------------------------------------------------
// B. Continue learning
// ---------------------------------------------------------------------------

function itemProgress(
  item: ContentItem,
  store: LearningProgressStore,
  lessonId: string,
): ContinueLearning['progress'] {
  if (item.type === 'meditation') {
    const media = store.media[item.id]
    if (!isSupportedAudioProgress(item.id, media)) return null
    const position = media?.positionSec ?? 0
    if (position <= 0 || item.durationSec <= 0) return null
    const clamped = Math.min(position, item.durationSec)
    const left = Math.max(0, item.durationSec - Math.floor(clamped))
    return {
      percent: Math.round((clamped / item.durationSec) * 100),
      label: `${Math.max(1, Math.ceil(left / 60))} min left`,
    }
  }
  const pct = store.lessons[lessonId]?.reading?.scrollPct
  if (pct === undefined || pct <= 0) return null
  return { percent: pct, label: `${pct}% read` }
}

/**
 * One item, picked deterministically. Order: the in-progress lesson; the
 * audio lesson with the newest saved position; the article read most
 * recently. Completed, missing, unpublished and unopenable lessons are
 * skipped. Returns null rather than falling back to "the next lesson".
 */
export function pickContinueLearning(
  ctx: AccessContext,
  store: LearningProgressStore,
): ContinueLearning | null {
  const eligible = (lessonId: string | undefined) =>
    lessonId && !isCompleted(store, lessonId) && canOpen(ctx, lessonId)
      ? resolveLesson(lessonId)
      : null

  const build = (lesson: HomeLesson | null, reason: ContinueReason) =>
    lesson
      ? { ...lesson, reason, progress: itemProgress(lesson.item, store, lesson.lessonId) }
      : null

  const inProgress = eligible(store.inProgressLessonId)
  if (inProgress) return build(inProgress, 'in-progress')

  const media = Object.values(store.media)
    .filter((entry) => entry.updatedAt && entry.positionSec > 0)
    .filter((entry) => mediaItemId(entry) !== undefined)
    .sort(byNewest((entry) => entry.updatedAt!, (entry) => entry.resourceId))
  for (const entry of media) {
    const lesson = eligible(lessonIdForItem(mediaItemId(entry)!))
    if (lesson) return build(lesson, 'recent-media')
  }

  const reading = Object.values(store.lessons)
    .filter((entry) => entry.reading?.lastReadAt)
    .sort(byNewest((entry) => entry.reading!.lastReadAt, (entry) => entry.lessonId))
  for (const entry of reading) {
    const lesson = eligible(entry.lessonId)
    if (lesson) return build(lesson, 'recent-reading')
  }
  return null
}

/** Newest first; ties broken by id so the order never depends on insertion. */
function byNewest<T>(at: (value: T) => string, id: (value: T) => string) {
  return (a: T, b: T) =>
    at(b).localeCompare(at(a)) || id(a).localeCompare(id(b))
}

// ---------------------------------------------------------------------------
// C. Assigned learning
// ---------------------------------------------------------------------------

/** Position in the catalogue (Meadow Journey first): the last tie-break. */
const catalogueOrder = (path: LearningPath) =>
  getLearningCatalogue().paths.findIndex((entry) => entry.id === path.id)

function pathStatus(completed: number, total: number): PathStatus {
  if (total > 0 && completed === total) return 'complete'
  return completed > 0 ? 'in-progress' : 'not-started'
}

function summarisePath(
  path: LearningPath,
  store: LearningProgressStore,
  extra: Pick<AssignedPath, 'assignedAt' | 'dueAt' | 'preview'>,
): AssignedPath {
  const summary = pathCompletion(path.id, store)
  return {
    path,
    href: pathHref(path.slug),
    moduleCount: getModulesOf(path.id).filter((module) => module.status === 'published')
      .length,
    lessonCount: summary.requiredTotal,
    completedCount: summary.requiredCompleted,
    percent: summary.percent,
    status: pathStatus(summary.requiredCompleted, summary.requiredTotal),
    ...extra,
  }
}

/**
 * Every path assigned to the learner (directly or through a group), once
 * each, that they can open. Staff in preview have no assignments, so they see
 * the published paths, marked as preview.
 */
export function listAssignedPaths(
  ctx: AccessContext,
  store: LearningProgressStore,
): AssignedPath[] {
  const byPath = new Map<string, { assignedAt: string; dueAt?: string }>()
  for (const assignment of ctx.assignments) {
    const seen = byPath.get(assignment.pathId)
    if (!seen || assignment.assignedAt < seen.assignedAt) {
      byPath.set(assignment.pathId, {
        assignedAt: assignment.assignedAt,
        ...(assignment.dueAt ? { dueAt: assignment.dueAt } : {}),
      })
    }
  }

  const assigned = [...byPath.entries()]
    .map(([pathId, meta]) => ({ path: getPath(pathId), meta }))
    .filter(
      (entry): entry is { path: LearningPath; meta: { assignedAt: string; dueAt?: string } } =>
        Boolean(entry.path) && isFull(canAccessPath(ctx, entry.path)),
    )
    .sort((a, b) => a.meta.assignedAt.localeCompare(b.meta.assignedAt) || catalogueOrder(a.path) - catalogueOrder(b.path))
    .map(({ path, meta }) => ({
      ...summarisePath(path, store, { ...meta, preview: false }),
      nextLesson: findNextLesson(path, ctx, store),
    }))

  if (assigned.length > 0 || !isPreviewRole(ctx.user?.role)) return assigned

  return getLearningCatalogue()
    .paths.filter((path) => path.status === 'published' && isFull(canAccessPath(ctx, path)))
    .map((path) => ({
      ...summarisePath(path, store, { preview: true }),
      nextLesson: findNextLesson(path, ctx, store),
    }))
}

/** Find the first incomplete, accessible lesson in a path. */
function findNextLesson(
  path: LearningPath,
  ctx: AccessContext,
  store: LearningProgressStore,
): { title: string; href: string } | undefined {
  const requiredLessons = getLessonsOf(path.id).filter(countsTowardCompletion)
  const nextLesson = requiredLessons.find(
    (lesson) => !isLessonComplete(lesson, store) && isFull(canAccessLesson(ctx, lesson))
  )
  if (!nextLesson) return undefined
  const itemId = itemIdForLesson(nextLesson.id)
  const item = itemId ? content.find((entry) => entry.id === itemId) : undefined
  return item ? { title: item.title, href: pathLessonHref(path.slug, nextLesson.id) } : undefined
}

// ---------------------------------------------------------------------------
// F. Up next (suggestions)
// ---------------------------------------------------------------------------

/**
 * Transparent rule: the next unfinished lesson of each assigned path, one per
 * path in the order given, then more from the same paths in turn until the
 * limit. Within a path, lessons come in path order from modules the learner
 * can open (a locked module is never suggested). Skips the Continue item,
 * audio that is not ready, and an item already suggested from another path.
 */
export function pickUpNext(
  ctx: AccessContext,
  store: LearningProgressStore,
  paths: AssignedPath[],
  excludeLessonIds: ReadonlySet<string>,
  limit = UP_NEXT_LIMIT,
): UpNextLesson[] {
  const excludedItems = new Set(
    [...excludeLessonIds].flatMap((lessonId) => {
      const itemId = itemIdForLesson(lessonId)
      return itemId ? [itemId] : []
    }),
  )
  const queues = paths.map(({ path }) => {
    const queue: UpNextLesson[] = []
    for (const module of getModulesOf(path.id)) {
      if (queue.length >= limit) break
      if (!isFull(canAccessModule(ctx, module))) continue
      for (const lesson of getLessonsOf(module.id)) {
        if (queue.length >= limit) break
        if (excludeLessonIds.has(lesson.id) || isCompleted(store, lesson.id)) continue
        if (!lesson.required || !canOpen(ctx, lesson.id)) continue
        const resolved = resolveLesson(lesson.id)
        if (!resolved || isUnplayable(resolved.item) || excludedItems.has(resolved.item.id)) continue
        queue.push({ ...resolved, kind: lessonKind(lesson) })
      }
    }
    return queue
  })

  const picked: UpNextLesson[] = []
  const seenItems = new Set<string>()
  for (let round = 0; picked.length < limit && queues.some((queue) => queue.length > round); round += 1) {
    for (const queue of queues) {
      if (picked.length >= limit) break
      const candidate = queue[round]
      if (!candidate || seenItems.has(candidate.item.id)) continue
      seenItems.add(candidate.item.id)
      picked.push(candidate)
    }
  }
  return picked
}

/**
 * Order for showing several paths: in progress first, then not started, then
 * complete; within each, the order they were assigned.
 */
export function byActivePathFirst(paths: AssignedPath[]): AssignedPath[] {
  const rank: Record<PathStatus, number> = { 'in-progress': 0, 'not-started': 1, complete: 2 }
  return paths
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => rank[a.entry.status] - rank[b.entry.status] || a.index - b.index)
    .map(({ entry }) => entry)
}

const lessonKind = (lesson: Lesson): UpNextLesson['kind'] =>
  lesson.kind === 'audio' ? 'audio' : 'reading'

// ---------------------------------------------------------------------------
// E. Recently accessed
// ---------------------------------------------------------------------------

/**
 * Real records only: activity events, audio positions saved with a date,
 * and reading records. Newest first, one row per lesson.
 */
export function listRecentLessons(
  store: LearningProgressStore,
  excludeLessonIds: ReadonlySet<string>,
  limit = RECENT_LIMIT,
): RecentLesson[] {
  const events: Array<{ lessonId: string; kind: RecentKind; at: string }> = []

  for (const entry of store.activity) {
    const lessonId =
      entry.lessonId ?? (entry.resourceId ? lessonIdForItem(entry.resourceId) : undefined)
    if (!lessonId) continue
    if (entry.type === 'completed' || entry.type === 'started' || entry.type === 'opened') {
      events.push({ lessonId, kind: entry.type, at: entry.at })
    }
  }
  for (const media of Object.values(store.media)) {
    const itemId = mediaItemId(media)
    if (!media.updatedAt || !itemId) continue
    events.push({
      lessonId: lessonIdForItem(itemId),
      kind: 'listened',
      at: media.updatedAt,
    })
  }
  for (const lesson of Object.values(store.lessons)) {
    if (lesson.reading?.lastReadAt) {
      events.push({ lessonId: lesson.lessonId, kind: 'read', at: lesson.reading.lastReadAt })
    } else if (lesson.lastOpenedAt) {
      events.push({ lessonId: lesson.lessonId, kind: 'opened', at: lesson.lastOpenedAt })
    }
  }

  // A completion outranks other events at the same moment.
  const rank: Record<RecentKind, number> = { completed: 0, started: 1, listened: 2, read: 3, opened: 4 }
  events.sort(
    (a, b) =>
      b.at.localeCompare(a.at) || rank[a.kind] - rank[b.kind] || a.lessonId.localeCompare(b.lessonId),
  )

  const seen = new Set<string>()
  const rows: RecentLesson[] = []
  for (const event of events) {
    if (rows.length >= limit) break
    if (seen.has(event.lessonId) || excludeLessonIds.has(event.lessonId)) continue
    seen.add(event.lessonId)
    const resolved = resolveLesson(event.lessonId)
    if (resolved) rows.push({ ...resolved, kind: event.kind, at: event.at })
  }
  return rows
}

// ---------------------------------------------------------------------------
// D. Explore the library
// ---------------------------------------------------------------------------

/**
 * Featured, published library items the learner can open in full, with audio
 * ready to play. Newest first, then by id.
 */
export function pickExploreResources(
  ctx: AccessContext,
  excludeItemIds: ReadonlySet<string>,
  limit = EXPLORE_LIMIT,
): ExploreResource[] {
  const { resources } = getLearningCatalogue()
  return content
    .filter((item) => item.published && item.featured && !isUnplayable(item))
    .filter((item) => !excludeItemIds.has(item.id))
    .filter((item) => {
      const resource = resources.find((entry) => entry.id === item.id)
      return resource?.status === 'published' && isFull(canAccessResource(ctx, resource))
    })
    .sort(byNewest((item) => item.updatedAt, (item) => item.id))
    .slice(0, limit)
    .map((item) => {
      const type: LibraryType = item.type === 'meditation' ? 'audio' : 'article'
      return { item, type, href: libraryHref(type, item.slug) }
    })
}

// ---------------------------------------------------------------------------
// A. Welcome, and the whole page
// ---------------------------------------------------------------------------

export function firstNameOf(name: string | undefined) {
  return name?.trim().split(/\s+/)[0] ?? ''
}

export function buildLearnerHome(
  user: Pick<SessionUser, 'id' | 'role' | 'name'>,
  ctx: AccessContext,
  store: LearningProgressStore,
): LearnerHome {
  const isPreview = isPreviewRole(user.role)
  const continueLearning = isPreview ? null : pickContinueLearning(ctx, store)
  const assigned = byActivePathFirst(listAssignedPaths(ctx, store))

  const continueIds = new Set(continueLearning ? [continueLearning.lessonId] : [])
  const upNext = pickUpNext(ctx, store, assigned, continueIds)
  const recent = isPreview ? [] : listRecentLessons(store, continueIds)

  const shownItemIds = new Set(
    [continueLearning, ...upNext].flatMap((entry) => (entry ? [entry.item.id] : [])),
  )
  const explore = pickExploreResources(ctx, shownItemIds)

  const { intro, action } = welcomeCopy({ continueLearning, assigned, upNext, isPreview })

  // Compute analytics
  const progressOverview = computeProgressOverview(ctx, store, assigned)
  const weeklyActivity = computeWeeklyActivity(store)
  const learningStreak = computeLearningStreak(store)
  const learningTimeSeries = computeLearningTimeSeries(store)

  return {
    firstName: firstNameOf(user.name),
    intro,
    action,
    isPreview,
    continueLearning,
    assigned,
    upNext,
    recent,
    explore,
    libraryHref: LEARN_LIBRARY,
    progressOverview,
    weeklyActivity,
    learningStreak,
    learningTimeSeries,
  }
}

// Learning Analytics Computation
// ---------------------------------------------------------------------------

function computeProgressOverview(
  _ctx: AccessContext,
  store: LearningProgressStore,
  assignedPaths: AssignedPath[],
): LearningProgressOverview {
  // Total lessons across all accessible paths
  const allLessons = assignedPaths.flatMap((entry) =>
    getLessonsOf(entry.path.id).filter(countsTowardCompletion)
  )
  const totalLessons = allLessons.length
  const completedLessons = allLessons.filter((lesson) => isLessonComplete(lesson, store)).length
  const percentComplete = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  // Total learning time from media progress
  let totalLearningTimeMinutes = 0
  for (const media of Object.values(store.media)) {
    if (isSupportedAudioProgress(media.resourceId, media)) {
      totalLearningTimeMinutes += Math.floor((media.playedSec ?? 0) / 60)
    }
  }

  // Active paths (in-progress or not-started with assigned lessons)
  const activePaths = assignedPaths.filter((entry) => entry.status !== 'complete').length

  return {
    totalLessons,
    completedLessons,
    percentComplete,
    totalLearningTimeMinutes,
    activePaths,
  }
}

function computeWeeklyActivity(
  store: LearningProgressStore,
): WeeklyActivityDay[] {
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday start
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  return days.map((day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const dayLabel = format(day, 'EEE')
    const isToday = isSameDay(day, today)

    // Count lessons completed on this day
    let lessonsCompleted = 0
    let minutesListened = 0

    for (const activity of store.activity) {
      if (activity.at.startsWith(dayStr)) {
        if (activity.type === 'completed') lessonsCompleted++
      }
    }

    // Audio minutes listened on this day (approximate from playedSec)
    for (const media of Object.values(store.media)) {
      if (media.updatedAt?.startsWith(dayStr) && isSupportedAudioProgress(media.resourceId, media)) {
        minutesListened += Math.floor((media.playedSec ?? 0) / 60)
      }
    }

    // Also check lesson reading activity
    for (const lesson of Object.values(store.lessons)) {
      if (lesson.reading?.lastReadAt?.startsWith(dayStr)) {
        // Count as activity even if not completed
        if (lessonsCompleted === 0) lessonsCompleted = 1
      }
    }

    return {
      date: dayStr,
      label: dayLabel,
      lessonsCompleted,
      minutesListened,
      isToday,
    }
  })
}

function computeLearningStreak(
  store: LearningProgressStore,
): LearningStreak {
  // Get all unique dates with learning activity
  const activeDates = new Set<string>()

  // From activity events
  for (const activity of store.activity) {
    if (['completed', 'started', 'opened'].includes(activity.type)) {
      activeDates.add(activity.at.split('T')[0])
    }
  }

  // From media progress
  for (const media of Object.values(store.media)) {
    if (media.updatedAt && isSupportedAudioProgress(media.resourceId, media)) {
      activeDates.add(media.updatedAt.split('T')[0])
    }
  }

  // From reading progress
  for (const lesson of Object.values(store.lessons)) {
    if (lesson.reading?.lastReadAt) {
      activeDates.add(lesson.reading.lastReadAt.split('T')[0])
    }
  }

  const sortedDates = [...activeDates].sort().reverse()
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  // Calculate current streak
  let currentStreak = 0
  let checkDate = today

  // If no activity today, check from yesterday
  if (!activeDates.has(today)) {
    checkDate = yesterday
  }

  while (activeDates.has(checkDate)) {
    currentStreak++
    checkDate = format(subDays(new Date(checkDate), 1), 'yyyy-MM-dd')
  }

  // Calculate longest streak
  let longestStreak = 0
  let tempStreak = 0
  let prevDate: Date | null = null

  for (const dateStr of [...activeDates].sort()) {
    const date = new Date(dateStr)
    if (prevDate && Math.floor((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)) === 1) {
      tempStreak++
    } else {
      tempStreak = 1
    }
    longestStreak = Math.max(longestStreak, tempStreak)
    prevDate = date
  }

  // Weekly active days (last 7 days including today)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weeklyActiveDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  }).map((day: Date) => activeDates.has(format(day, 'yyyy-MM-dd')))

  return {
    currentStreak,
    longestStreak,
    lastActiveDate: sortedDates[0] ?? null,
    weeklyActiveDays,
  }
}

function computeLearningTimeSeries(
  store: LearningProgressStore,
  weeks = 6,
): LearningTimeSeriesPoint[] {
  const result: LearningTimeSeriesPoint[] = []
  const today = new Date()

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subDays(today, i * 7), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(subDays(today, i * 7), { weekStartsOn: 1 })
    const weekLabel = format(weekStart, 'MMM d')

    let minutes = 0
    let lessons = 0

    for (const activity of store.activity) {
      const activityDate = new Date(activity.at)
      if (activityDate >= weekStart && activityDate <= weekEnd) {
        if (activity.type === 'completed') lessons++
      }
    }

    for (const media of Object.values(store.media)) {
      if (media.updatedAt && isSupportedAudioProgress(media.resourceId, media)) {
        const mediaDate = new Date(media.updatedAt)
        if (mediaDate >= weekStart && mediaDate <= weekEnd) {
          minutes += Math.floor((media.playedSec ?? 0) / 60)
        }
      }
    }

    result.push({ week: weekLabel, minutes, lessons })
  }

  return result
}

function welcomeCopy({
  continueLearning,
  assigned,
  upNext,
  isPreview,
}: Pick<LearnerHome, 'continueLearning' | 'assigned' | 'upNext' | 'isPreview'>): {
  intro: string
  action: HomeAction | null
} {
  if (isPreview) {
    return {
      intro: 'You are previewing the learner Home. Nothing you open here is recorded.',
      action: assigned[0] ? { label: `Open ${assigned[0].path.title}`, href: assigned[0].href } : null,
    }
  }
  if (continueLearning) {
    return { intro: 'Pick up where you left off, whenever you are ready.', action: null }
  }
  const next = upNext[0]
  const firstPath = assigned[0]
  if (next && firstPath?.status === 'not-started') {
    return {
      intro: `${firstPath.path.title} is ready for you. Begin with the first lesson.`,
      action: { label: `Start ${firstPath.path.title}`, href: next.href },
    }
  }
  if (next) {
    return {
      intro: 'Your next lesson is ready when you are.',
      action: { label: 'Start next lesson', href: next.href },
    }
  }
  if (assigned.length > 0 && assigned.every((entry) => entry.status === 'complete')) {
    return {
      intro: 'You have completed your assigned learning. The library stays open to you.',
      action: { label: 'Browse the library', href: LEARN_LIBRARY },
    }
  }
  if (assigned.length === 0) {
    return {
      intro: 'Nothing has been assigned to you yet. The library is open to you.',
      action: { label: 'Browse the library', href: LEARN_LIBRARY },
    }
  }
  return {
    intro: 'Your learning path is below.',
    action: { label: `Open ${firstPath!.path.title}`, href: firstPath!.href },
  }
}
