import { lessonIdForItem, moduleIdForStage } from './catalogue'
import { pathHref } from './routes'

/**
 * Route migration plan: `/journey*` becomes `/learn*`.
 *
 * This is the verified mapping, covered by tests that scan the codebase for
 * every link to an old route. `app/LegacyRedirect.tsx` applies it, so old
 * links and bookmarks keep working.
 */

export const LEARN_PATH_BASE = pathHref()

interface LegacyRoute {
  /** The pattern registered in app/router.tsx. */
  legacy: string
  /** Matches a concrete URL and returns the target. */
  resolve: (pathname: string) => string | null
}

const routes: LegacyRoute[] = [
  {
    legacy: '/journey',
    resolve: (p) => (p === '/journey' ? '/learn' : null),
  },
  {
    legacy: '/my-journey',
    resolve: (p) => (p === '/my-journey' ? '/learn/progress' : null),
  },
  {
    legacy: '/journey/stages/:stageId',
    resolve: (p) => {
      const match = /^\/journey\/stages\/([^/]+)$/.exec(p)
      return match
        ? `${LEARN_PATH_BASE}?module=${moduleIdForStage(match[1]!)}`
        : null
    },
  },
  {
    legacy: '/journey/stages/:stageId/read/:contentId',
    resolve: (p) => {
      const match = /^\/journey\/stages\/([^/]+)\/read\/([^/]+)$/.exec(p)
      return match
        ? `${LEARN_PATH_BASE}/lessons/${lessonIdForItem(match[2]!)}`
        : null
    },
  },
  {
    legacy: '/journey/stages/:stageId/listen/:contentId',
    resolve: (p) => {
      const match = /^\/journey\/stages\/([^/]+)\/listen\/([^/]+)$/.exec(p)
      return match
        ? `${LEARN_PATH_BASE}/lessons/${lessonIdForItem(match[2]!)}`
        : null
    },
  },
]

/** Every legacy pattern, for tests and documentation. */
export const LEGACY_ROUTE_PATTERNS = routes.map((route) => route.legacy)

/** The `/learn` URL for an old URL, or null when it is not a legacy route. */
export function mapLegacyRoute(pathname: string): string | null {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  for (const route of routes) {
    const target = route.resolve(clean)
    if (target) return target
  }
  return null
}

/**
 * Routes that stay exactly as they are. The account area is not moving, and
 * the profile menu maps onto it.
 */
export const UNCHANGED_ROUTES = [
  '/account/profile',
  '/account/email',
  '/account/privacy',
] as const
