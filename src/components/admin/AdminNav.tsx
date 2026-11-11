import {
  BarChart3,
  BookOpen,
  Headphones,
  Layers,
  LayoutDashboard,
  Mail,
  Megaphone,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { CmsRoutePath, NavigationEntry, NavigationGroup } from '@/services/rbac/navigation'

/**
 * Sidebar navigation. What appears, and in which group and order, comes from
 * the permission registry (services/rbac/navigation.ts); this file only draws
 * it. Icons are presentation, so they live here.
 */
const ICONS: Partial<Record<CmsRoutePath, LucideIcon>> = {
  '/cms': LayoutDashboard,
  '/cms/explorations': BookOpen,
  '/cms/meditations': Headphones,
  '/cms/curriculum': Layers,
  '/cms/publishing': Send,
  '/cms/users': Users,
  '/cms/roles': ShieldCheck,
  '/cms/analytics/visitors': TrendingUp,
  '/cms/analytics/engagement': BarChart3,
  '/cms/campaigns': Megaphone,
  '/cms/templates': Mail,
  '/cms/delivery': BarChart3,
  '/cms/settings/score': SlidersHorizontal,
}

export function AdminNavItem({
  entry,
  collapsed = false,
  touch = false,
  onNavigate,
}: {
  entry: NavigationEntry
  collapsed?: boolean
  /** Larger targets, for the mobile drawer. */
  touch?: boolean
  onNavigate?: () => void
}) {
  const Icon = ICONS[entry.href] ?? LayoutDashboard
  return (
    <li>
      <NavLink
        to={entry.href}
        end={entry.href === '/cms'}
        title={collapsed ? entry.label : undefined}
        aria-label={collapsed ? entry.label : undefined}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-md px-3 nff-label-md transition-colors nff-focus-ring',
            touch ? 'min-h-11' : 'min-h-9',
            isActive
              ? 'bg-[var(--admin-nav-active-bg)] font-semibold text-[var(--admin-primary)]'
              : 'text-[var(--admin-text-muted)] hover:bg-nff-bg-hover hover:text-[var(--admin-text)]',
            collapsed && 'justify-center px-0',
          )
        }
      >
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        {!collapsed && <span className="truncate">{entry.label}</span>}
      </NavLink>
    </li>
  )
}

export function AdminNavGroup({
  group,
  collapsed = false,
  touch = false,
  onNavigate,
}: {
  group: NavigationGroup
  collapsed?: boolean
  touch?: boolean
  onNavigate?: () => void
}) {
  const headingId = `admin-nav-${group.id}`
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-1">
      {collapsed ? (
        <span id={headingId} className="sr-only">
          {group.label}
        </span>
      ) : (
        <h2 id={headingId} className="admin-nav-group px-3 pb-1 pt-3 text-[var(--admin-text-muted)]">
          {group.label}
        </h2>
      )}
      <ul className="flex flex-col gap-0.5">
        {group.items.map((entry) => (
          <AdminNavItem key={entry.href} entry={entry} collapsed={collapsed} touch={touch} onNavigate={onNavigate} />
        ))}
      </ul>
    </section>
  )
}

/** The grouped list. `label` names the landmark. */
export function AdminNavigation({
  groups,
  label,
  collapsed,
  touch,
  onNavigate,
}: {
  groups: NavigationGroup[]
  label: string
  collapsed?: boolean
  touch?: boolean
  onNavigate?: () => void
}) {
  return (
    <nav aria-label={label} className="flex flex-col gap-1">
      {groups.map((group) => (
        <AdminNavGroup key={group.id} group={group} collapsed={collapsed} touch={touch} onNavigate={onNavigate} />
      ))}
    </nav>
  )
}
