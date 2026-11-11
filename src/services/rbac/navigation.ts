import { canAny, type Actor } from './authorize'
import type { Permission } from './permissions'

/**
 * One registry for every Admin/CMS route: its permission, its place in the
 * information architecture (sidebar group and label) and its breadcrumb
 * parent. Route guards, the sidebar, the breadcrumbs and the tests all read
 * this, so a route, its link and its trail cannot drift apart. Pure data: no
 * React, no storage.
 *
 * A route is allowed when the actor holds ANY of its permissions.
 *
 * Information architecture (Phase 2). The target IA has more destinations than
 * the app has modules. A destination appears only when its route exists, so
 * nothing in the sidebar is a placeholder. Planned, hidden until built:
 * Media Library, Learning Paths, Modules & Lessons, Assignments, Groups,
 * Scheduled, Publishing History, Audit Log, Platform Settings.
 *
 * Adjustments to the target labels, because of what exists today:
 * - Learning > "Curriculum" is the existing stage editor (`/cms/curriculum`);
 *   it is not renamed "Learning Paths" because it is not that module.
 * - Publishing > "Review Queue" is the existing `/cms/publishing` page, whose
 *   tabs already include scheduled and published items.
 */

export const NAV_GROUPS = [
  { id: 'overview', label: 'Overview' },
  { id: 'content', label: 'Content' },
  { id: 'learning', label: 'Learning' },
  { id: 'publishing', label: 'Publishing' },
  { id: 'people', label: 'People' },
  { id: 'insights', label: 'Insights' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'settings', label: 'Settings' },
] as const

export type NavGroupId = (typeof NAV_GROUPS)[number]['id']

export interface CmsRoute {
  /** The route pattern as registered in the router. */
  path: string
  permissions: readonly Permission[]
  /** Breadcrumb and page-title label. For nav routes it is also the sidebar label. */
  title: string
  /** Present = shown in the sidebar, in this group. */
  nav?: { group: NavGroupId }
  /** Breadcrumb parent. */
  parent?: string
}

export const CMS_ROUTES = [
  { path: '/cms', permissions: ['cms.access'], title: 'Dashboard', nav: { group: 'overview' } },
  { path: '/cms/explorations', permissions: ['content.view'], title: 'Explorations', nav: { group: 'content' } },
  { path: '/cms/explorations/:id', permissions: ['content.view'], title: 'Exploration', parent: '/cms/explorations' },
  { path: '/cms/meditations', permissions: ['content.view'], title: 'Meditations', nav: { group: 'content' } },
  { path: '/cms/meditations/:id', permissions: ['content.view'], title: 'Meditation', parent: '/cms/meditations' },
  { path: '/cms/curriculum', permissions: ['learning.view'], title: 'Curriculum', nav: { group: 'learning' } },
  { path: '/cms/curriculum/stages/:stageId', permissions: ['learning.view'], title: 'Stage', parent: '/cms/curriculum' },
  { path: '/cms/publishing', permissions: ['content.view'], title: 'Review Queue', nav: { group: 'publishing' } },
  { path: '/cms/preview/:type/:id', permissions: ['content.preview'], title: 'Preview', parent: '/cms/publishing' },
  { path: '/cms/users', permissions: ['practitioners.view'], title: 'Practitioners', nav: { group: 'people' } },
  { path: '/cms/users/:id', permissions: ['practitioners.view'], title: 'Practitioner', parent: '/cms/users' },
  { path: '/cms/roles', permissions: ['team.view', 'roles.view'], title: 'Team & Roles', nav: { group: 'people' } },
  { path: '/cms/analytics/visitors', permissions: ['insights.visitors.view'], title: 'Visitors', nav: { group: 'insights' } },
  { path: '/cms/analytics/engagement', permissions: ['insights.engagement.view'], title: 'Engagement', nav: { group: 'insights' } },
  { path: '/cms/campaigns', permissions: ['campaigns.view'], title: 'Campaigns', nav: { group: 'campaigns' } },
  { path: '/cms/campaigns/:id', permissions: ['campaigns.view'], title: 'Campaign', parent: '/cms/campaigns' },
  { path: '/cms/templates', permissions: ['campaigns.view'], title: 'Templates', nav: { group: 'campaigns' } },
  { path: '/cms/templates/:id', permissions: ['campaigns.view'], title: 'Template', parent: '/cms/templates' },
  { path: '/cms/delivery', permissions: ['campaigns.view'], title: 'Delivery', nav: { group: 'campaigns' } },
  { path: '/cms/settings/score', permissions: ['insights.scores.configure'], title: 'Score Settings', nav: { group: 'settings' } },
] as const satisfies readonly CmsRoute[]

export type CmsRoutePath = (typeof CMS_ROUTES)[number]['path']

const routeOf = (path: string): CmsRoute | undefined => CMS_ROUTES.find((route) => route.path === path)

export function routePermissions(path: CmsRoutePath): readonly Permission[] {
  return routeOf(path)!.permissions
}

export function canAccessRoute(actor: unknown, path: CmsRoutePath) {
  return canAny(actor, routePermissions(path))
}

export interface NavigationEntry {
  href: CmsRoutePath
  label: string
  group: NavGroupId
}

export interface NavigationGroup {
  id: NavGroupId
  label: string
  items: NavigationEntry[]
}

/** The sidebar entries for this actor, in registry order. Empty for unknown actors. */
export function getAccessibleNavigation(actor: Actor | null | undefined): NavigationEntry[] {
  return CMS_ROUTES.flatMap((route): NavigationEntry[] =>
    'nav' in route && canAny(actor, route.permissions)
      ? [{ href: route.path, label: route.title, group: route.nav.group }]
      : [],
  )
}

/** The same, grouped in IA order. A group with no authorised entry is omitted. */
export function getAccessibleNavigationGroups(actor: Actor | null | undefined): NavigationGroup[] {
  const entries = getAccessibleNavigation(actor)
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: entries.filter((entry) => entry.group === group.id),
  })).filter((group) => group.items.length > 0)
}

// Matching and breadcrumbs ---------------------------------------------------

const segments = (path: string) => path.split('/').filter(Boolean)

/** The registered route a URL belongs to, preferring static segments over parameters. */
export function matchCmsRoute(pathname: string): CmsRoute | null {
  const parts = segments(pathname)
  const candidates = CMS_ROUTES.filter((route) => {
    const pattern = segments(route.path)
    return (
      pattern.length === parts.length &&
      pattern.every((segment, index) => segment.startsWith(':') || segment === parts[index])
    )
  })
  candidates.sort(
    (a, b) =>
      segments(a.path).filter((segment) => segment.startsWith(':')).length -
      segments(b.path).filter((segment) => segment.startsWith(':')).length,
  )
  return candidates[0] ?? null
}

export interface Crumb {
  label: string
  /** Absent for the group label (not a page) and for the current page. */
  href?: string
}

/**
 * The trail for a URL, from the registry: group, ancestors, current page. The
 * current page is last and has no link. Detail routes use their generic title
 * ("Exploration"), since the registry knows no record names.
 */
export function getBreadcrumbs(pathname: string): Crumb[] {
  const route = matchCmsRoute(pathname)
  if (!route) return [{ label: 'Admin', href: '/cms' }, { label: 'Not found' }]
  const chain: CmsRoute[] = []
  for (let current: CmsRoute | undefined = route; current; current = current.parent ? routeOf(current.parent) : undefined) {
    chain.unshift(current)
  }
  const root = chain[0]!
  const group = NAV_GROUPS.find((entry) => entry.id === root.nav?.group)
  const trail: Crumb[] = []
  // The dashboard is its own group; every other page is shown under its group.
  if (group && root.path !== '/cms') trail.push({ label: group.label })
  chain.forEach((entry, index) => {
    trail.push(index === chain.length - 1 ? { label: entry.title } : { label: entry.title, href: entry.path })
  })
  return trail
}
