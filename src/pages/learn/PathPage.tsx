import { useParams, useSearchParams } from 'react-router-dom'
import { AccessDeniedState } from '@/components/learn/AccessDeniedState'
import { PathOverviewPage } from '@/pages/learn/PathOverviewPage'
import { useAuth } from '@/features/auth/AuthProvider'
import { canAccessPath, isFull } from '@/services/learning/access'
import { getAccessContext } from '@/services/learning/accessContext'
import { getLearningCatalogue } from '@/services/learning/catalogue'

/**
 * `/learn/paths/:pathSlug`. One page for every path, Meadow Journey included.
 * `?module=<id>` (the old stage links) opens the page with that module expanded.
 * Access is checked here, so a path that is not yours never renders.
 */
export function PathPage() {
  const { pathSlug = '' } = useParams()
  const { user } = useAuth()
  const [params] = useSearchParams()

  const path = getLearningCatalogue().paths.find((entry) => entry.slug === pathSlug)
  if (!path) return <AccessDeniedState reason="not-found" />

  const decision = canAccessPath(getAccessContext(user, { surface: 'learn' }), path)
  if (!isFull(decision)) return <AccessDeniedState reason={decision.reason} />

  return <PathOverviewPage path={path} key={`${path.id}:${params.get('module') ?? ''}`} />
}

