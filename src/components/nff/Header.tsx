import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '@/components/nff/BrandLogo'
import { AccountMenu } from '@/components/nff/header/AccountMenu'
import { DesktopNav } from '@/components/nff/header/DesktopNav'
import { MobileNav } from '@/components/nff/header/MobileNav'
import { usePrimaryCta } from '@/components/nff/header/navConfig'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthProvider'
import { cn } from '@/lib/utils'

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [threshold])
  return scrolled
}

/** Public header: logo · centred navigation · account actions. */
export function Header() {
  const { user } = useAuth()
  const scrolled = useScrolled()
  const cta = usePrimaryCta()

  return (
    <header
      data-scrolled={scrolled}
      className={cn(
        'sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-[var(--nff-duration-slow)] ease-[var(--nff-easing-standard)]',
        scrolled
          ? 'border-nff-border-default bg-nff-bg-surface/90 shadow-nff-1 backdrop-blur-md supports-[backdrop-filter]:bg-nff-bg-surface/80'
          : 'border-transparent bg-nff-bg-public',
      )}
    >
      {/* Same horizontal rhythm as the inset page panels below it (hero,
          sections, footer): px-2/3 outer inset, then px-6/10/14 inside a
          1440px frame, so the logo lines up with each panel's content. */}
      <div
        className={cn(
          'mx-auto flex max-w-[calc(1440px+1.5rem)] items-center gap-4 px-6 sm:px-[3.25rem] lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-[4.25rem]',
          'transition-[height] duration-[var(--nff-duration-slow)] ease-[var(--nff-easing-standard)]',
          scrolled
            ? 'h-[var(--nff-layout-header-height)] lg:h-[calc(var(--nff-layout-header-height)-8px)]'
            : 'h-[var(--nff-layout-header-height)] lg:h-20',
        )}
      >
        <BrandLogo className="justify-self-start" />

        <DesktopNav />

        <div className="ml-auto flex items-center gap-1 justify-self-end sm:gap-2">
          {user ? (
            <div className="hidden sm:block">
              <AccountMenu />
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden h-10 items-center whitespace-nowrap rounded-full px-3.5 nff-nav text-[var(--nff-nav-fg)] transition-colors hover:bg-[var(--nff-nav-bg-hover)] hover:text-foreground nff-focus-ring sm:inline-flex"
            >
              Log in
            </Link>
          )}
          <Button
            asChild
            className={cn('h-10 rounded-full px-4 sm:px-5', user && 'hidden sm:inline-flex')}
          >
            <Link to={cta.to} aria-label={cta.label}>
              <span className="sm:hidden">{cta.short}</span>
              <span className="hidden sm:inline">{cta.label}</span>
              <ArrowRight aria-hidden="true" className="hidden size-4 sm:block" />
            </Link>
          </Button>
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
