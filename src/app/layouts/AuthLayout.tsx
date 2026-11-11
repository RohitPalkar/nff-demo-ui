import { Link, Outlet } from 'react-router-dom'
import { BrandLogo } from '@/components/nff/BrandLogo'

export function AuthLayout() {
  return (
    <div
      data-surface="public"
      className="flex min-h-dvh flex-col bg-nff-bg-surface-sunken"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <header className="flex justify-center py-8">
        <BrandLogo />
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 outline-none sm:items-center sm:pb-24"
      >
        <Outlet />
      </main>
      <footer className="flex justify-center gap-4 border-t py-4">
        <Link
          to="/"
          className="nff-body-sm text-muted-foreground hover:text-foreground nff-focus-ring"
        >
          Back to home
        </Link>
        <Link
          to="/privacy"
          className="nff-body-sm text-muted-foreground hover:text-foreground nff-focus-ring"
        >
          Privacy
        </Link>
        <Link
          to="/terms"
          className="nff-body-sm text-muted-foreground hover:text-foreground nff-focus-ring"
        >
          Terms
        </Link>
      </footer>
    </div>
  )
}
