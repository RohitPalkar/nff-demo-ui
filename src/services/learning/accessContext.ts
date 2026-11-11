import { DEMO_PATH_IDS } from './catalogue'
import { FLAGS } from '@/config/flags'
import type { SessionUser } from '@/types'
import {
  assignmentsForUser,
  ensureDefaultAssignment,
  ensureDemoAssignments,
  groupsOfUser,
} from './assignments'
import type { AccessContext, AccessSurface } from './access'
import { loadProgress } from './progress'

interface ContextOptions {
  surface?: AccessSurface
  /** Load progress too. Needed only to evaluate module unlocking. */
  withProgress?: boolean
}

/**
 * Builds the access context from the signed-in user and stored assignments.
 * A practitioner without the default Meadow Journey assignment is given it
 * here (once), so people who signed up after the migration are covered too.
 *
 * Reads are synchronous (localStorage). A backend would make this async.
 */
export function getAccessContext(
  user: Pick<SessionUser, 'id' | 'role'> | null | undefined,
  options: ContextOptions = {},
): AccessContext {
  const surface = options.surface ?? 'public'
  // A visitor-role session is the same as signed out.
  if (!user || user.role === 'visitor') {
    return { user: null, surface, assignments: [], groupIds: [] }
  }
  ensureDefaultAssignment(user)
  ensureDemoAssignments(user, DEMO_PATH_IDS)
  return {
    user: { id: user.id, role: user.role },
    surface,
    assignments: assignmentsForUser(user.id),
    groupIds: groupsOfUser(user.id).map((group) => group.id),
    ...(options.withProgress ? { progress: loadProgress(user.id) } : {}),
    flags: { visitorFullExplorations: FLAGS.visitorFullExplorations },
  }
}
