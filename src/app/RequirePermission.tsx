import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { AccessDeniedState } from '@/components/admin'
import { useAuth } from '@/features/auth/AuthProvider'
import { canAny } from '@/services/rbac/authorize'
import { routePermissions, type CmsRoutePath } from '@/services/rbac/navigation'
import { getRoleLabel } from '@/services/rbac/roles'
import { toActor } from '@/services/rbac/authorize'

/**
 * Permission-based route protection for the Admin/CMS. Each route is looked
 * up in the registry (`services/rbac/navigation.ts`), the same one the sidebar
 * uses.
 *
 * - Signed out: `RequireAuth` (outside this) sends them to sign in.
 * - Signed in but not staff (no `cms.access`), or an unknown role: the
 *   existing `/403` page.
 * - Staff without access to this section: the access-denied state below,
 *   in place, so the URL and the explanation stay together.
 *
 * Client-side only: this protects the demo's screens, not data. See
 * docs/admin-rbac-foundation.md.
 */

/** Wraps the whole `/cms` tree: anyone without `cms.access` goes to `/403`. */
export function RequireCmsAccess({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const actor = toActor(user && { id: user.id, role: user.role })
  if (!canAny(actor, routePermissions('/cms'))) return <Navigate to="/403" replace />
  return <>{children}</>
}

/** Wraps one route's page. */
export function RequireRoutePermission({ route, children }: { route: CmsRoutePath; children: ReactNode }) {
  const { user } = useAuth()
  const actor = toActor(user && { id: user.id, role: user.role })
  if (!canAny(actor, routePermissions(route))) {
    return <CmsAccessDenied roleLabel={getRoleLabel(user?.role)} />
  }
  return <>{children}</>
}

/** Kept for existing imports; the state itself is the Admin design-system one. */
export function CmsAccessDenied({ roleLabel }: { roleLabel: string }) {
  return <AccessDeniedState roleLabel={roleLabel} />
}
