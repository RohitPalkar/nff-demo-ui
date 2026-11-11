import { useMemo } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/AuthProvider'
import { can, isForbiddenError, toActor, type Actor } from '@/services/rbac/authorize'
import type { Permission } from '@/services/rbac/permissions'

/**
 * Permission checks for components. The answer is for the signed-in user as
 * of the last render; the service layer re-checks every operation, so this
 * only decides what to show and enable.
 */
export function usePermissions() {
  const { user } = useAuth()
  return useMemo(() => {
    const actor: Actor | null = toActor(user && { id: user.id, role: user.role })
    return {
      actor,
      can: (permission: Permission) => can(actor, permission),
    }
  }, [user])
}

/**
 * Runs a guarded operation from an event handler. A refusal becomes a toast
 * and `false`; anything else is thrown. Returns true when it ran.
 */
export function attempt(run: () => void): boolean {
  try {
    run()
    return true
  } catch (error) {
    if (isForbiddenError(error)) {
      toast.error(error.message)
      return false
    }
    throw error
  }
}
