import { BookOpen, Headphones, LogOut } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BrandLogo } from '@/components/nff/BrandLogo'
import { ThemeToggle } from '@/components/nff/ThemeToggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthProvider'

const NAV = [
  { label: 'Journey', href: '/journey' },
  { label: 'My Journey', href: '/my-journey' },
  { label: 'Explore', href: '/explorations' },
]

export function PractitionerLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="nff-content flex h-[var(--nff-layout-header-height)] items-center gap-4">
          <BrandLogo />
          <nav aria-label="Practitioner" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      `inline-flex min-h-11 items-center rounded-md px-3 nff-label-md nff-focus-ring ${
                        isActive
                          ? 'bg-nff-bg-selected text-nff-text-brand'
                          : 'text-muted-foreground hover:bg-nff-bg-hover hover:text-foreground'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="size-11">
              <Link to="/meditations" aria-label="Meditations">
                <Headphones aria-hidden="true" className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="size-11">
              <Link to="/explorations" aria-label="Explorations">
                <BookOpen aria-hidden="true" className="size-5" />
              </Link>
            </Button>
            <ThemeToggle />
            <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
            <Button asChild variant="outline" className="h-11">
              <Link to="/account/profile">{user?.name ?? 'Account'}</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Log out"
              onClick={() => {
                logout()
                navigate('/')
              }}
            >
              <LogOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
    </div>
  )
}
