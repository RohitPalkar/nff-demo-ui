import { userById } from '@/mocks/db'
import {
  assignPath,
  listAssignments,
  listGroups,
  saveGroup,
  withdrawAssignment,
} from '@/services/learning/assignments'
import { getPath } from '@/services/learning/catalogue'
import type { Assignment, Group } from '@/types'
import { ForbiddenError } from './authorize'
import { authorizeAction, type ActorInput } from './guard'

/**
 * The only supported way for Admin code to change learning assignments.
 *
 * Call-site audit (Phase 1.1) of `services/learning/assignments.ts`:
 *
 * | Export | Production callers | Kind |
 * |---|---|---|
 * | `ensureDefaultAssignment(s)`, `ensureDemoAssignments` | `accessContext` (Practitioner) | system bootstrap for a practitioner; ignores other roles |
 * | `startEnrolment`, `setEnrolmentStatus` | none yet | Practitioner self-service (own record; ignored for staff preview) |
 * | `assignPath`, `withdrawAssignment`, `saveGroup` | the bootstrap above and this file only | **administrative** primitives |
 *
 * The administrative primitives stay exported because Practitioner code and
 * six existing test files use them as store primitives without an actor, and
 * changing their signatures would be a broad Practitioner refactor. They are
 * therefore guarded by structure instead: `assignmentBoundary.test.ts` fails
 * if any CMS or Admin code (or anything else outside the allow-list) imports
 * them. Admin code must use the functions below, which authorise first,
 * validate the target against real records, and audit.
 *
 * Policy: Admin and Super admin only. Editors, Campaign managers and
 * Practitioners are refused. No screen uses these yet.
 */

type AssignInput = Omit<Parameters<typeof assignPath>[0], 'assignedBy'>

export function assignLearning(input: AssignInput, actor?: ActorInput): Assignment {
  const group = input.target.type === 'group'
  return authorizeAction(
    actor,
    group ? ['learning.assign', 'learning.groups.manage'] : 'learning.assign',
    {
      action: 'learning.assign',
      resourceType: 'assignment',
      resourceId: input.id ?? input.pathId,
      metadata: { pathId: input.pathId, target: input.target.type },
    },
    (resolved) => {
      // Real records only: no assignment to an unknown person, group or path.
      if (!getPath(input.pathId)) throw new ForbiddenError('That learning path does not exist.')
      if (input.target.type === 'user') {
        if (!userById.has(input.target.userId)) throw new ForbiddenError('That person does not exist.')
      } else {
        const groupId = input.target.groupId
        if (!listGroups().some((entry) => entry.id === groupId)) {
          throw new ForbiddenError('That group does not exist.')
        }
      }
      return assignPath({ ...input, assignedBy: resolved.id })
    },
  )
}

export function withdrawLearning(assignmentId: string, actor?: ActorInput) {
  authorizeAction(
    actor,
    'learning.withdraw',
    { action: 'learning.withdraw', resourceType: 'assignment', resourceId: assignmentId },
    () => {
      if (!listAssignments().some((entry) => entry.id === assignmentId)) {
        throw new ForbiddenError('That assignment does not exist.')
      }
      withdrawAssignment(assignmentId)
    },
  )
}

export function saveLearningGroup(group: Group, actor?: ActorInput) {
  authorizeAction(
    actor,
    'learning.groups.manage',
    { action: 'learning.groups.manage', resourceType: 'group', resourceId: group.id },
    () => saveGroup(group),
  )
}
