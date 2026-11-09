import { Outlet } from 'react-router-dom'
import { PrivacyNotice } from '@/components/nff/PrivacyNotice'
import { Footer } from '@/components/nff/Footer'
import { Header } from '@/components/nff/Header'
import { MiniPlayer } from '@/components/nff/MiniPlayer'
import { usePlayer } from '@/features/player/PlayerProvider'

export function PublicLayout() {
  const { track } = usePlayer()
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
      <MiniPlayer />
      {track && <div aria-hidden="true" className="h-20" />}
      <PrivacyNotice />
    </div>
  )
}
