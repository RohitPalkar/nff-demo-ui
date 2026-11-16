import type { ContentStatus, Role } from './index'

/**
 * Learning platform model (Phase 0).
 *
 * Relationships have ONE source of truth: the child holds its parent id and
 * its order. A Path does not list its modules, a Module does not list its
 * lessons, and a Lesson does not copy its Resource's title or body.
 *
 *   LearningPath ← Module (pathId, order) ← Lesson (moduleId, order)
 *   Lesson → LessonBlock → Resource (resourceId)
 *
 * Existing explorations and meditations are the Resource data. A migrated
 * Resource uses the content item's id, so every saved id stays valid.
 */

export type LessonKind = 'reading' | 'audio'

export type ResourceKind = 'article' | 'audio'

/** Who may open something. See services/learning/access.ts for the rules. */
export type AccessLevel = 'public' | 'registered' | 'assigned' | 'restricted'

/** `sequential`: needs the previous module complete. `open`: always available. */
export type ModuleUnlock = 'sequential' | 'open'

/** How a lesson becomes complete. */
export type LessonCompletion = 'manual' | 'media-end' | 'all-blocks'

export interface Resource {
  /** For migrated content this is the existing exploration/meditation id. */
  id: string
  kind: ResourceKind
  /** Existing exploration or meditation that supplies title, body and audio. */
  contentId?: string
  /** Only for resources with no backing content item. */
  title?: string
  access: AccessLevel
  status: ContentStatus
  /** True when signed-out visitors may sample it (excerpt or free preview). */
  previewable: boolean
  /** `restricted` resources: who has been explicitly granted access. */
  grants?: AccessGrants
}

export interface AccessGrants {
  userIds?: string[]
  groupIds?: string[]
  /** Role-based permission, for example staff roles on internal material. */
  roles?: Role[]
}

export interface LearningPath {
  id: string
  slug: string
  title: string
  summary: string
  /** Default is `assigned`: only people given the path may open it. */
  access: AccessLevel
  status: ContentStatus
  grants?: AccessGrants
}

export interface Module {
  id: string
  pathId: string
  order: number
  title: string
  summary: string
  intro?: string
  unlock: ModuleUnlock
  status: ContentStatus
  /** The stage this module was migrated from; kept for the public site. */
  legacyStageId?: string
}

export type LessonBlock =
  | { id: string; type: 'resource'; resourceId: string }
  | { id: string; type: 'text'; body: string[] }

export interface Lesson {
  id: string
  moduleId: string
  order: number
  kind: LessonKind
  blocks: LessonBlock[]
  /** Required lessons count toward module and path completion. */
  required: boolean
  completion: LessonCompletion
}

export interface Group {
  id: string
  name: string
  memberUserIds: string[]
}

export type AssignmentTarget =
  | { type: 'user'; userId: string }
  | { type: 'group'; groupId: string }

export type AssignmentStatus = 'active' | 'withdrawn'

export interface Assignment {
  id: string
  pathId: string
  target: AssignmentTarget
  /** A user id, or `system:migration` for the automatic Meadow Journey grant. */
  assignedBy: string
  /** When the assignment was really made. Never back-dated. */
  assignedAt: string
  /** Set only when someone chooses a deadline. Never invented. */
  dueAt?: string
  status: AssignmentStatus
  withdrawnAt?: string
}

export type EnrolmentStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'withdrawn'

export interface Enrolment {
  userId: string
  pathId: string
  assignmentId: string
  status: EnrolmentStatus
  /** Set when the learner really starts. */
  startedAt?: string
  completedAt?: string
}

export type LessonStatus = 'not_started' | 'in_progress' | 'completed'

export interface LessonProgress {
  lessonId: string
  status: LessonStatus
  /** Known only for completions recorded after migration. */
  completedAt?: string
  lastOpenedAt?: string
  /** Reading activity, recorded by the reader. */
  reading?: { scrollPct: number; lastReadAt: string }
}

export interface MediaProgress {
  /** The Resource id. */
  resourceId: string
  kind: 'audio'
  positionSec: number
  /** Furthest point reached. Unknown for migrated records. */
  furthestSec?: number
  /** Seconds actually played. Unknown for migrated records. */
  playedSec?: number
  completedAt?: string
  updatedAt?: string
}

export type LearningActivityType =
  | 'opened'
  | 'started'
  | 'completed'
  | 'played'
  | 'paused'

export interface LearningActivity {
  id: string
  type: LearningActivityType
  lessonId?: string
  resourceId?: string
  /** Real time of the event. Migration never creates activity. */
  at: string
}

export const PROGRESS_STORE_VERSION = 2

/** Persisted at `meadow.progress.v2.{userId}`. */
export interface LearningProgressStore {
  version: typeof PROGRESS_STORE_VERSION
  userId: string
  lessons: Record<string, LessonProgress>
  media: Record<string, MediaProgress>
  /** Lesson the learner left unfinished, when known. */
  inProgressLessonId?: string
  /** Newest last; capped. Only events that really happened. */
  activity: LearningActivity[]
  /** Where the data came from, so the old record can be recovered. */
  migratedFrom?: { source: 'legacy' | 'seed' | 'empty'; at: string }
  updatedAt: string
}
