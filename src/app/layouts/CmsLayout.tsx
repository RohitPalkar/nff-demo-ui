import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Headphones,
  Layers,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  Monitor,
  Moon,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useState, type ComponentType } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BrandLogo } from '@/components/nff/BrandLogo'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useAuth } from '@/features/auth/AuthProvider'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
}

const EDITOR_NAV: NavItem[] = [
  { label: 'Overview', href: '/cms', icon: LayoutDashboard },
  { label: 'Explorations', href: '/cms/explorations', icon: BookOpen },
  { label: 'Meditations', href: '/cms/meditations', icon: Headphones },
  { label: 'Curriculum', href: '/cms/curriculum', icon: Layers },
  { label: 'Publishing', href: '/cms/publishing', icon: Send },
]

const CAMPAIGN_NAV: NavItem[] = [
  { label: 'Overview', href: '/cms', icon: LayoutDashboard },
  { label: 'Campaigns', href: '/cms/campaigns', icon: Megaphone },
  { label: 'Templates', href: '/cms/templates', icon: Mail },
  { label: 'Delivery reports', href: '/cms/delivery', icon: BarChart3 },
]

const ADMIN_EXTRA: NavItem[] = [
  { label: 'Users', href: '/cms/users', icon: Users },
  { label: 'Visitors', href: '/cms/analytics/visitors', icon: TrendingUp },
  { label: 'Engagement', href: '/cms/analytics/engagement', icon: BarChart3 },
  { label: 'Score settings', href: '/cms/settings/score', icon: SlidersHorizontal },
  { label: 'Roles', href: '/cms/roles', icon: ShieldCheck },
]

function navForRole(role: Role | undefined): NavItem[] {
  if (role === 'campaign') return CAMPAIGN_NAV
  if (role === 'admin') return [...EDITOR_NAV, ...ADMIN_EXTRA]
  return EDITOR_NAV
}

function titleCase(segment: string) {
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function NavList({ items, collapsed = false }: { items: NavItem[]; collapsed?: boolean }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.href}>
          <NavLink
            to={item.href}
            end={item.href === '/cms'}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 nff-label-md transition-colors nff-focus-ring',
                'min-h-[var(--nff-nav-item-height)]',
                isActive
                  ? 'bg-nff-bg-selected text-nff-text-brand'
                  : 'text-muted-foreground hover:bg-nff-bg-hover hover:text-foreground',
                collapsed && 'justify-center px-0',
              )
            }
          >
            <item.icon className="size-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

export function CmsLayout() {
  const { user, logout } = useAuth()
  const { setTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const items = navForRole(user?.role)
  const segments = location.pathname.split('/').filter(Boolean)
  const crumbs = segments.map((segment, index) => ({
    label: titleCase(segment),
    href: `/${segments.slice(0, index + 1).join('/')}`,
  }))

  return (
    <div
      data-density="compact"
      className="flex min-h-dvh bg-nff-bg-surface-sunken"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex',
          'w-[var(--nff-layout-admin-sidebar)]',
          collapsed && 'w-18',
        )}
      >
        <div className="flex h-[var(--nff-layout-header-height)] items-center justify-between border-b px-3">
          <BrandLogo compact={collapsed} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? (
              <ChevronsRight className="size-4" />
            ) : (
              <ChevronsLeft className="size-4" />
            )}
          </Button>
        </div>
        <nav aria-label="CMS" className="flex-1 overflow-y-auto p-3">
          <NavList items={items} collapsed={collapsed} />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[var(--nff-layout-header-height)] items-center gap-3 border-b bg-background px-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 lg:hidden"
                aria-label="Open CMS menu"
              >
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>CMS</SheetTitle>
              </SheetHeader>
              <nav aria-label="CMS mobile" className="mt-4 px-4">
                {items.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      to={item.href}
                      className="flex min-h-[var(--nff-nav-item-height)] items-center gap-3 rounded-md px-3 nff-label-md text-foreground hover:bg-nff-bg-hover nff-focus-ring"
                    >
                      <item.icon className="size-4" />
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex items-center gap-1 overflow-hidden">
              {crumbs.map((crumb, index) => (
                <li key={crumb.href} className="flex items-center gap-1">
                  {index > 0 && (
                    <ChevronRight
                      aria-hidden="true"
                      className="size-3.5 text-muted-foreground"
                    />
                  )}
                  <Link
                    to={crumb.href}
                    className={cn(
                      'truncate nff-label-md nff-focus-ring',
                      index === crumbs.length - 1
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {crumb.label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>

          <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-nff-bg-warning-subtle px-2.5 py-1 nff-label-sm text-nff-text-warning sm:inline-flex">
            Demo data
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-9 gap-2 px-2"
                aria-label="CMS user menu"
              >
                <span
                  aria-hidden="true"
                  className="flex size-7 items-center justify-center rounded-full bg-nff-bg-brand-subtle nff-label-sm text-nff-text-brand"
                >
                  {user?.name?.[0] ?? 'A'}
                </span>
                <span className="hidden nff-label-md md:inline">
                  {user?.name ?? 'Account'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="nff-label-md">{user?.name}</span>
                <span className="nff-caption capitalize text-muted-foreground">
                  {user?.role ?? 'visitor'}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun aria-hidden="true" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon aria-hidden="true" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Monitor aria-hidden="true" />
                System
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
              >
                <LogOut aria-hidden="true" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main
          id="main"
          tabIndex={-1}
          className="flex-1 overflow-x-hidden p-6 outline-none"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
