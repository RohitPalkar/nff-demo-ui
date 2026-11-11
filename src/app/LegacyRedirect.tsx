import { Navigate, useLocation } from 'react-router-dom'
import { mapLegacyRoute } from '@/services/learning/legacyRoutes'
import { NotFoundPage } from '@/pages/system/NotFoundPage'

/**
 * Redirects an old `/journey*` or `/my-journey` URL to its `/learn` home.
 * Query parameters and the hash survive, and progress is untouched because it
 * lives in the learner's own record, not in the URL. The redirect itself needs
 * no sign-in: the destination's own protection sends visitors to log in and
 * then back to the new URL.
 */
export function LegacyRedirect() {
  const { pathname, search, hash } = useLocation()
  const target = mapLegacyRoute(pathname)
  if (!target) return <NotFoundPage />

  const [targetPath = '', targetQuery = ''] = target.split('?')
  const merged = new URLSearchParams(targetQuery)
  for (const [key, value] of new URLSearchParams(search)) {
    if (!merged.has(key)) merged.append(key, value)
  }
  const query = merged.toString()
  return (
    <Navigate
      to={{ pathname: targetPath, search: query ? `?${query}` : '', hash }}
      replace
    />
  )
}
