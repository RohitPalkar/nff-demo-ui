import { ChevronsLeft, ChevronsRight, Menu } from 'lucide-react'
import { useLayoutEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { BrandLogo } from '@/components/nff/BrandLogo'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/features/auth/AuthProvider'
import { cn } from '@/lib/utils'
import { toActor } from '@/services/rbac/authorize'
import { getAccessibleNavigationGroups, getBreadcrumbs, matchCmsRoute } from '@/services/rbac/navigation'
import { AdminBreadcrumbs } from './AdminBreadcrumbs'
import { AdminNavigation } from './AdminNav'
import { AdminContentContainer } from './AdminPage'
import { AdminProfileMenu } from './AdminProfileMenu'

/**
 * The Admin application shell: sidebar (from 1024px), top bar, and the main
 * working area. Navigation is generated from the permission registry for the
 * signed-in account; route guards (RequireCmsAccess, RequireRoutePermission)
 * still decide access, the sidebar only reflects it.
 *
 * Below 1024px the sidebar becomes a drawer opened from the top bar.
 *
 * While mounted the shell marks <body> with data-surface="cms", so portalled
 * UI (menus, dialogs, sheets, toasts) takes the Admin scope too.
 */
export function AdminLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const userId = user?.id
  const userRole = user?.role
  const groups = useMemo(
    () => getAccessibleNavigationGroups(toActor(userId && userRole ? { id: userId, role: userRole } : null)),
    [userId, userRole],
  )
  const crumbs = getBreadcrumbs(location.pathname)
  const pageTitle = matchCmsRoute(location.pathname)?.title ?? 'Not found'

  useLayoutEffect(() => {
    const previous = document.body.dataset.surface
    document.body.dataset.surface = 'cms'
    return () => {
      if (previous === undefined) delete document.body.dataset.surface
      else document.body.dataset.surface = previous
    }
  }, [])

  useLayoutEffect(() => {
    const previous = document.title
    document.title = `${pageTitle} · Meadow Admin`
    return () => {
      document.title = previous
    }
  }, [pageTitle])

  const shellStyle = {
    // The editors' fixed action bars read this variable.
    '--nff-layout-admin-sidebar': collapsed ? 'var(--admin-sidebar-width-collapsed)' : 'var(--admin-sidebar-width)',
  } as CSSProperties

  return (
    <div data-surface="cms" data-density="compact" style={shellStyle} className="flex min-h-dvh bg-[var(--admin-canvas)] text-[var(--admin-text)]">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <aside
        aria-label="Admin sidebar"
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-[var(--admin-border)] bg-[var(--nff-sage-50)] lg:flex',
          collapsed ? 'w-[var(--admin-sidebar-width-collapsed)]' : 'w-[var(--admin-sidebar-width)]',
        )}
      >
        <div className={cn('flex h-[var(--admin-topbar-height)] shrink-0 items-center border-b border-[var(--admin-border)] px-3', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && (
            <Link to="/cms" className="rounded-md nff-focus-ring" aria-label="Meadow Admin, dashboard">
              <BrandLogo />
            </Link>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ChevronsRight aria-hidden="true" className="size-4" /> : <ChevronsLeft aria-hidden="true" className="size-4" />}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <AdminNavigation groups={groups} label="Admin" collapsed={collapsed} />
        </div>
        <div className="shrink-0 border-t border-[var(--admin-border)] p-2">
          <AdminProfileMenu variant="sidebar" collapsed={collapsed} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[var(--admin-topbar-height)] shrink-0 items-center gap-3 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 sm:px-6 lg:px-8">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="size-10 shrink-0 lg:hidden" aria-label="Open navigation menu">
                <Menu aria-hidden="true" className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(20rem,calc(100vw-2rem))] gap-0 p-0">
              <div className="flex h-[var(--admin-topbar-height)] items-center border-b border-[var(--admin-border)] px-4">
                <SheetTitle className="nff-label-lg">Meadow Admin</SheetTitle>
                <SheetDescription className="sr-only">Navigation for the sections you can use</SheetDescription>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <AdminNavigation groups={groups} label="Admin (mobile)" touch onNavigate={() => setDrawerOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <AdminBreadcrumbs crumbs={crumbs} />

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden rounded-md border border-nff-border-warning bg-nff-bg-warning-subtle px-2 py-1 nff-label-sm text-nff-text-warning sm:inline-flex">
              Prototype · demo data
            </span>
            <div className="lg:hidden">
              <AdminProfileMenu variant="topbar" />
            </div>
          </div>
        </header>

        <main id="admin-main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          <AdminContentContainer>
            <Outlet />
          </AdminContentContainer>
        </main>
      </div>
      <ScrollRestoration />
    </div>
  )
}
