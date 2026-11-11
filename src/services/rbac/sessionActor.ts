import { getStoredSession } from '@/services/auth'
import { toActor, type Actor } from './authorize'

/**
 * The acting identity for the current browser session, or null. The role is
 * re-resolved from the user record on every call (see `getStoredSession`),
 * so a role change takes effect on the next operation.
 */
export function sessionActor(): Actor | null {
  const session = getStoredSession()
  return session ? toActor({ id: session.user.id, role: session.user.role }) : null
}
