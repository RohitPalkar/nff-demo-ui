import { FLAGS } from '@/config/flags'
import type {
  AccessGrants,
  Assignment,
  LearningPath,
  LearningProgressStore,
  Lesson,
  Module,
  Resource,
  SessionUser,
} from '@/types'
import {
  getLearningCatalogue,
  getPathIdsContainingResource,
  getResourceIdsOf,
} from './catalogue'
import { STAFF_PREVIEW_ROLES } from './previewRoles'
import { moduleCompletion } from './progress'

/**
 * Central access rules for the learning platform.
 *
 * IMPORTANT: this is mock, client-side enforcement. It decides what the UI
 * and routes should allow, but the data lives in the browser (localStorage,
 * bundled mock content and audio files), so anyone with devtools can bypass
 * it. It is NOT production security. Real enforcement needs a server that
 * checks the same rules before it returns content or media. The rules here
 * are written as pure functions so they can move to a backend unchanged.
 *
 * Concepts kept separate:
 * - visibility: published or not (`status`)
 * - assignment: a path given to a person or group
 * - permission: explicit grants on restricted things
 * - unlock: a module's sequential gate
 * - completion: lives in progress, never here
 */

export type AccessSurface = 'public' | 'learn'

/** `full`: the whole thing. `preview`: excerpt or free sample. `none`: closed. */
export type AccessMode = 'full' | 'preview' | 'none'

export type AccessReason =
  | 'public'
  | 'registered'
  | 'assigned'
  | 'granted'
  | 'staff-preview'
  | 'preview-only'
  | 'sign-in-required'
  | 'not-assigned'
  | 'not-permitted'
  | 'locked-module'
  | 'unpublished'
  | 'not-found'

export interface AccessDecision {
  mode: AccessMode
  reason: AccessReason
  /** False for staff previewing: they must not write learner progress. */
  recordProgress: boolean
  /** For `locked-module`: the module that must be completed first. */
  lockedBy?: string
}

export interface AccessContext {
  user: Pick<SessionUser, 'id' | 'role'> | null
  /** `public` is the marketing site; `learn` is the learner area. */
  surface: AccessSurface
  /** Active assignments that apply to the user (direct or via a group). */
  assignments: Assignment[]
  groupIds: string[]
  /** Needed only to evaluate module unlocking. */
  progress?: LearningProgressStore
  flags?: { visitorFullExplorations?: boolean }
}

export { STAFF_PREVIEW_ROLES }

const decide = (
  mode: AccessMode,
  reason: AccessReason,
  recordProgress = false,
  lockedBy?: string,
): AccessDecision => ({
  mode,
  reason,
  recordProgress,
  ...(lockedBy ? { lockedBy } : {}),
})

export const isFull = (decision: AccessDecision) => decision.mode === 'full'

const isLearner = (ctx: AccessContext) => ctx.user?.role === 'practitioner'

const isStaffPreview = (ctx: AccessContext) =>
  ctx.surface === 'learn' &&
  ctx.user !== null &&
  STAFF_PREVIEW_ROLES.includes(ctx.user.role)

/**
 * Does this viewer get the full version of ordinary content? This is the one
 * rule the public pages and card playback used to repeat as
 * `role === 'practitioner'`.
 */
export function hasRegisteredAccess(ctx: AccessContext): boolean {
  return isLearner(ctx)
}

/** Visitors may read whole articles only when the demo flag allows it. */
export function canReadArticleInFull(ctx: AccessContext): boolean {
  return isLearner(ctx) || ctx.flags?.visitorFullExplorations === true
}

/**
 * Context for the public site: no storage reads, no side effects, no
 * assignments. Enough for ordinary (`registered`) content, which is all the
 * public pages show today.
 */
export function publicAccessContext(
  user: Pick<SessionUser, 'id' | 'role'> | null | undefined,
): AccessContext {
  const signedIn = user && user.role !== 'visitor' ? user : null
  return {
    user: signedIn ? { id: signedIn.id, role: signedIn.role } : null,
    surface: 'public',
    assignments: [],
    groupIds: [],
    flags: { visitorFullExplorations: FLAGS.visitorFullExplorations },
  }
}

function granted(grants: AccessGrants | undefined, ctx: AccessContext) {
  if (!grants || !ctx.user) return false
  return (
    grants.userIds?.includes(ctx.user.id) === true ||
    grants.roles?.includes(ctx.user.role) === true ||
    grants.groupIds?.some((id) => ctx.groupIds.includes(id)) === true
  )
}

function assignedToPath(ctx: AccessContext, pathId: string) {
  return ctx.assignments.some(
    (entry) => entry.status === 'active' && entry.pathId === pathId,
  )
}

function closedFor(ctx: AccessContext, notAssigned = false): AccessDecision {
  if (!ctx.user) return decide('none', 'sign-in-required')
  return decide('none', notAssigned ? 'not-assigned' : 'not-permitted')
}

interface ResourceOptions {
  /** The resource is being opened from a lesson in a path the user may open. */
  viaPath?: boolean
}

export function canAccessResource(
  ctx: AccessContext,
  resource: Resource | undefined,
  options: ResourceOptions = {},
): AccessDecision {
  if (!resource) return decide('none', 'not-found')

  if (resource.status !== 'published') {
    return isStaffPreview(ctx)
      ? decide('full', 'staff-preview')
      : decide('none', 'unpublished')
  }

  if (resource.access === 'public') {
    return decide('full', 'public', isLearner(ctx))
  }

  if (isStaffPreview(ctx)) return decide('full', 'staff-preview')

  const preview = (reason: AccessReason = 'preview-only') =>
    resource.previewable ? decide('preview', reason) : closedFor(ctx)

  switch (resource.access) {
    case 'registered': {
      if (isLearner(ctx)) return decide('full', 'registered', true)
      if (resource.kind === 'article' && canReadArticleInFull(ctx)) {
        return decide('full', 'public')
      }
      return preview()
    }
    case 'assigned': {
      if (isLearner(ctx)) {
        const inAssignedPath =
          options.viaPath ||
          getPathIdsContainingResource(resource.id).some((pathId) =>
            assignedToPath(ctx, pathId),
          )
        if (inAssignedPath) return decide('full', 'assigned', true)
        return resource.previewable ? preview() : closedFor(ctx, true)
      }
      return preview()
    }
    case 'restricted': {
      // Restricted content never offers a preview, and being a practitioner
      // or being assigned a path does not open it: only an explicit grant.
      return granted(resource.grants, ctx)
        ? decide('full', 'granted', isLearner(ctx))
        : closedFor(ctx)
    }
    default:
      return closedFor(ctx)
  }
}

export function canAccessPath(
  ctx: AccessContext,
  path: LearningPath | undefined,
): AccessDecision {
  if (!path) return decide('none', 'not-found')
  if (path.status !== 'published') {
    return isStaffPreview(ctx)
      ? decide('full', 'staff-preview')
      : decide('none', 'unpublished')
  }
  if (isStaffPreview(ctx)) return decide('full', 'staff-preview')

  switch (path.access) {
    case 'public':
      return decide('full', 'public', isLearner(ctx))
    case 'registered':
      return isLearner(ctx)
        ? decide('full', 'registered', true)
        : closedFor(ctx)
    case 'assigned':
      return isLearner(ctx) && assignedToPath(ctx, path.id)
        ? decide('full', 'assigned', true)
        : closedFor(ctx, isLearner(ctx))
    case 'restricted':
      return granted(path.grants, ctx)
        ? decide('full', 'granted', isLearner(ctx))
        : closedFor(ctx)
    default:
      return closedFor(ctx)
  }
}

// ---------------------------------------------------------------------------
// Module unlocking
// ---------------------------------------------------------------------------

export interface UnlockState {
  unlocked: boolean
  /** Module that must be completed first, when locked. */
  lockedBy?: string
}

/**
 * `open` modules are always unlocked. A `sequential` module needs the module
 * before it (by order) complete. The first module is always unlocked. A
 * previous module with no required lessons does not block, so an empty module
 * cannot trap a learner.
 */
export function getModuleUnlockState(
  module: Module,
  pathModules: Module[],
  progress: LearningProgressStore | undefined,
): UnlockState {
  if (module.unlock === 'open') return { unlocked: true }
  const ordered = [...pathModules].sort((a, b) => a.order - b.order)
  const index = ordered.findIndex((entry) => entry.id === module.id)
  if (index <= 0) return { unlocked: true }
  const previous = ordered[index - 1]!
  if (!progress) return { unlocked: false, lockedBy: previous.id }
  const summary = moduleCompletion(previous, progress)
  if (summary.complete || summary.requiredTotal === 0) return { unlocked: true }
  return { unlocked: false, lockedBy: previous.id }
}

export function canAccessModule(
  ctx: AccessContext,
  module: Module | undefined,
): AccessDecision {
  if (!module) return decide('none', 'not-found')
  const { paths, modules } = getLearningCatalogue()
  const path = paths.find((entry) => entry.id === module.pathId)
  const pathDecision = canAccessPath(ctx, path)
  if (!isFull(pathDecision)) return pathDecision

  if (module.status !== 'published') {
    return isStaffPreview(ctx)
      ? decide('full', 'staff-preview')
      : decide('none', 'unpublished')
  }
  // Staff preview inspects everything, locked or not, and records nothing.
  if (pathDecision.reason === 'staff-preview') return pathDecision

  const unlock = getModuleUnlockState(
    module,
    modules.filter((entry) => entry.pathId === module.pathId),
    ctx.progress,
  )
  if (!unlock.unlocked) {
    return decide('none', 'locked-module', false, unlock.lockedBy)
  }
  return pathDecision
}

export function canAccessLesson(
  ctx: AccessContext,
  lesson: Lesson | undefined,
): AccessDecision {
  if (!lesson) return decide('none', 'not-found')
  const { modules, resources } = getLearningCatalogue()
  const module = modules.find((entry) => entry.id === lesson.moduleId)
  const moduleDecision = canAccessModule(ctx, module)
  if (!isFull(moduleDecision)) return moduleDecision

  // Being assigned the path opens ordinary resources inside it, but never a
  // restricted one: that still needs its own explicit grant.
  for (const resourceId of getResourceIdsOf(lesson)) {
    const resource = resources.find((entry) => entry.id === resourceId)
    const resourceDecision = canAccessResource(ctx, resource, { viaPath: true })
    if (!isFull(resourceDecision)) return resourceDecision
  }
  return moduleDecision
}

/** Single entry point. Dispatches on what is being opened. */
export type AccessTarget =
  | { type: 'resource'; resource: Resource | undefined }
  | { type: 'path'; path: LearningPath | undefined }
  | { type: 'module'; module: Module | undefined }
  | { type: 'lesson'; lesson: Lesson | undefined }

export function canAccess(
  ctx: AccessContext,
  target: AccessTarget,
): AccessDecision {
  switch (target.type) {
    case 'resource':
      return canAccessResource(ctx, target.resource)
    case 'path':
      return canAccessPath(ctx, target.path)
    case 'module':
      return canAccessModule(ctx, target.module)
    case 'lesson':
      return canAccessLesson(ctx, target.lesson)
  }
}
