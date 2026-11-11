import { readJson, writeJson } from '@/mocks/api'
import type {
  Assignment,
  Enrolment,
  EnrolmentStatus,
  Group,
  SessionUser,
} from '@/types'
import { MEADOW_JOURNEY_ID } from './catalogue'
import { isPreviewIdentity } from './previewRoles'

/**
 * Assignments and enrolment (mock, localStorage).
 *
 * - An Assignment says a path was given to a person or a group.
 * - An Enrolment says the person has actually started it.
 * Neither stores completion: that is derived from progress.
 */

export const ASSIGNMENTS_KEY = 'meadow.assignments.v1'
export const GROUPS_KEY = 'meadow.groups.v1'
export const ENROLMENTS_KEY = 'meadow.enrolments.v1'
export const SYSTEM_MIGRATION = 'system:migration'

export const defaultAssignmentId = (userId: string) =>
  `asg-${MEADOW_JOURNEY_ID}-${userId}`

export function listAssignments(): Assignment[] {
  return readJson<Assignment[]>(ASSIGNMENTS_KEY, [])
}

function saveAssignments(assignments: Assignment[]) {
  writeJson(ASSIGNMENTS_KEY, assignments)
}

export function listGroups(): Group[] {
  return readJson<Group[]>(GROUPS_KEY, [])
}

export function saveGroup(group: Group) {
  const rest = listGroups().filter((entry) => entry.id !== group.id)
  writeJson(GROUPS_KEY, [...rest, group])
}

export function groupsOfUser(userId: string): Group[] {
  return listGroups().filter((group) => group.memberUserIds.includes(userId))
}

/** Adds or replaces an assignment. `assignedAt` defaults to now, never earlier. */
export function assignPath(input: {
  id?: string
  pathId: string
  target: Assignment['target']
  assignedBy: string
  dueAt?: string
  now?: Date
}): Assignment {
  const targetKey =
    input.target.type === 'user' ? input.target.userId : input.target.groupId
  const assignment: Assignment = {
    id: input.id ?? `asg-${input.pathId}-${input.target.type}-${targetKey}`,
    pathId: input.pathId,
    target: input.target,
    assignedBy: input.assignedBy,
    assignedAt: (input.now ?? new Date()).toISOString(),
    ...(input.dueAt ? { dueAt: input.dueAt } : {}),
    status: 'active',
  }
  const rest = listAssignments().filter((entry) => entry.id !== assignment.id)
  saveAssignments([...rest, assignment])
  return assignment
}

export function withdrawAssignment(id: string, now = new Date()) {
  saveAssignments(
    listAssignments().map((entry) =>
      entry.id === id
        ? { ...entry, status: 'withdrawn', withdrawnAt: now.toISOString() }
        : entry,
    ),
  )
}

/** Active assignments that apply to a user, directly or through a group. */
export function assignmentsForUser(userId: string): Assignment[] {
  const groupIds = new Set(groupsOfUser(userId).map((group) => group.id))
  return listAssignments().filter(
    (entry) =>
      entry.status === 'active' &&
      ((entry.target.type === 'user' && entry.target.userId === userId) ||
        (entry.target.type === 'group' && groupIds.has(entry.target.groupId))),
  )
}

/**
 * Gives a practitioner the migrated Meadow Journey, once. Idempotent: if the
 * default assignment exists in ANY status (including withdrawn) nothing is
 * added, so an admin's withdrawal is never undone. The assignment time is the
 * real time of this call, recorded as a system action; it is not back-dated
 * to the person's join date.
 */
export function ensureDefaultAssignment(
  user: Pick<SessionUser, 'id' | 'role'> | null | undefined,
  now = new Date(),
): Assignment | null {
  if (!user || user.role !== 'practitioner') return null
  const id = defaultAssignmentId(user.id)
  const existing = listAssignments().find((entry) => entry.id === id)
  if (existing) return existing
  return assignPath({
    id,
    pathId: MEADOW_JOURNEY_ID,
    target: { type: 'user', userId: user.id },
    assignedBy: SYSTEM_MIGRATION,
    now,
  })
}

/** Migrates every given practitioner. Safe to run repeatedly. */
export function ensureDefaultAssignments(
  users: ReadonlyArray<Pick<SessionUser, 'id' | 'role'>>,
  now = new Date(),
): number {
  const before = listAssignments().length
  // One read, one write: avoids rewriting the list per user.
  const existingIds = new Set(listAssignments().map((entry) => entry.id))
  const added: Assignment[] = []
  for (const user of users) {
    if (user.role !== 'practitioner') continue
    const id = defaultAssignmentId(user.id)
    if (existingIds.has(id)) continue
    added.push({
      id,
      pathId: MEADOW_JOURNEY_ID,
      target: { type: 'user', userId: user.id },
      assignedBy: SYSTEM_MIGRATION,
      assignedAt: now.toISOString(),
      status: 'active',
    })
  }
  if (added.length > 0) saveAssignments([...listAssignments(), ...added])
  return listAssignments().length - before
}

// ---------------------------------------------------------------------------
// Enrolment
// ---------------------------------------------------------------------------

type EnrolmentStore = Record<string, Enrolment>

const enrolmentKey = (userId: string, pathId: string) => `${userId}::${pathId}`

export function getEnrolment(
  userId: string,
  pathId: string,
): Enrolment | undefined {
  return readJson<EnrolmentStore>(ENROLMENTS_KEY, {})[enrolmentKey(userId, pathId)]
}

/** Records the learner starting a path. Never rewrites an earlier start. */
export function startEnrolment(
  userId: string,
  pathId: string,
  now = new Date(),
): Enrolment | null {
  if (isPreviewIdentity(userId)) return null
  const assignment = assignmentsForUser(userId).find(
    (entry) => entry.pathId === pathId,
  )
  if (!assignment) return null
  const store = readJson<EnrolmentStore>(ENROLMENTS_KEY, {})
  const key = enrolmentKey(userId, pathId)
  const existing = store[key]
  if (existing && existing.status !== 'withdrawn') return existing
  const next: Enrolment = {
    userId,
    pathId,
    assignmentId: assignment.id,
    status: 'in_progress',
    startedAt: now.toISOString(),
  }
  store[key] = next
  writeJson(ENROLMENTS_KEY, store)
  return next
}

export function setEnrolmentStatus(
  userId: string,
  pathId: string,
  status: EnrolmentStatus,
  now = new Date(),
) {
  if (isPreviewIdentity(userId)) return
  const store = readJson<EnrolmentStore>(ENROLMENTS_KEY, {})
  const key = enrolmentKey(userId, pathId)
  const existing = store[key]
  if (!existing) return
  store[key] = {
    ...existing,
    status,
    ...(status === 'completed' ? { completedAt: now.toISOString() } : {}),
  }
  writeJson(ENROLMENTS_KEY, store)
}

// ---------------------------------------------------------------------------
// Demo paths (config/demoPaths.ts)
// ---------------------------------------------------------------------------

export const SYSTEM_DEMO = 'system:demo'

export const demoAssignmentId = (pathId: string, userId: string) => `asg-${pathId}-${userId}`

/**
 * Gives a practitioner the demo paths, once each, after Meadow Journey.
 * Same rules as the default assignment: idempotent, real time, and a
 * withdrawn one is never re-created. Remove with the demo paths.
 */
export function ensureDemoAssignments(
  user: Pick<SessionUser, 'id' | 'role'> | null | undefined,
  pathIds: readonly string[],
  now = new Date(),
): Assignment[] {
  if (!user || user.role !== 'practitioner' || pathIds.length === 0) return []
  const existing = new Set(listAssignments().map((entry) => entry.id))
  const added: Assignment[] = []
  pathIds.forEach((pathId, index) => {
    const id = demoAssignmentId(pathId, user.id)
    if (existing.has(id)) return
    added.push({
      id,
      pathId,
      target: { type: 'user', userId: user.id },
      assignedBy: SYSTEM_DEMO,
      // One millisecond apart so "recently assigned" has a stable order.
      assignedAt: new Date(now.getTime() + index + 1).toISOString(),
      status: 'active',
    })
  })
  if (added.length > 0) saveAssignments([...listAssignments(), ...added])
  return added
}
