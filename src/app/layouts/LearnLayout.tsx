import { Outlet, ScrollRestoration } from 'react-router-dom'
import { LearnMobileNav } from '@/components/learn/LearnMobileNav'
import { LearnNav } from '@/components/learn/LearnNav'
import { PreviewIndicator } from '@/components/learn/PreviewIndicator'
import { ProfileMenu } from '@/components/learn/ProfileMenu'
import { BrandLogo } from '@/components/nff/BrandLogo'
import { MiniPlayer } from '@/components/nff/MiniPlayer'
import { usePlayer } from '@/features/player/PlayerProvider'
import { LEARN_HOME } from '@/services/learning/routes'

/**
 * The Practitioner application shell: wordmark, five-item horizontal
 * navigation, profile menu, and one content area. Self-contained: nothing in
 * it links to the public website, and the persistent audio mini-player lives
 * at the bottom.
 */
export function LearnLayout() {
  const { track } = usePlayer()

  return (
    <div data-surface="practitioner" className="flex min-h-dvh flex-col bg-nff-bg-public">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-nff-border-default bg-nff-bg-surface">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6 md:gap-6 lg:px-10">
          <BrandLogo to={LEARN_HOME} className="shrink-0" />
          <LearnNav className="hidden h-full md:block" />
          <div className="ml-auto flex items-center gap-1">
            <ProfileMenu />
            <LearnMobileNav />
          </div>
        </div>
      </header>
      <PreviewIndicator />
      <main id="main" tabIndex={-1} className={`flex-1 outline-none ${track ? 'pb-24' : ''}`}>
        <Outlet />
      </main>
      <MiniPlayer />
      <ScrollRestoration />
    </div>
  )
}
