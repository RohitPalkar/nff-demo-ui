import { Link, Outlet, ScrollRestoration } from 'react-router-dom'
import { BrandLogo } from '@/components/nff/BrandLogo'

/**
 * Sign-in and sign-up frame: logo top-left, a soft dawn meadow behind one
 * centred card. The backdrop is a light version of the home hero landscape
 * (original SVG in the brand colours, no images or network requests).
 */
export function AuthLayout() {
  return (
    <div
      data-surface="public"
      className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-[var(--nff-ivory-50)]"
    >
      <AuthBackdrop />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <header className="flex h-16 items-center px-6 sm:h-20 sm:px-10">
        <BrandLogo />
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="flex flex-1 items-start justify-center px-4 pb-10 pt-2 outline-none sm:items-center sm:px-6 sm:pb-16"
      >
        <Outlet />
      </main>
      <footer className="flex flex-wrap justify-center gap-x-6 gap-y-2 px-4 pb-6 nff-body-sm">
        {[
          ['/', 'Back to home'],
          ['/privacy', 'Privacy'],
          ['/terms', 'Terms'],
        ].map(([to, label]) => (
          <Link
            key={to}
            to={to}
            className="rounded-sm font-medium text-[var(--nff-forest-950)] underline-offset-4 hover:text-[var(--nff-forest-950)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {label}
          </Link>
        ))}
      </footer>
      <ScrollRestoration />
    </div>
  )
}

function AuthBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <svg
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="auth-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F7F5EF" />
            <stop offset="0.55" stopColor="#F3EADF" />
            <stop offset="1" stopColor="#EAEDE4" />
          </linearGradient>
          <radialGradient id="auth-glow" cx="1180" cy="610" r="560" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#F1DFD5" stopOpacity="0.95" />
            <stop offset="0.45" stopColor="#F1DFD5" stopOpacity="0.35" />
            <stop offset="1" stopColor="#F1DFD5" stopOpacity="0" />
          </radialGradient>
          <filter id="auth-blur" x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
        </defs>
        <rect width="1600" height="1000" fill="url(#auth-sky)" />
        <rect width="1600" height="1000" fill="url(#auth-glow)" className="nff-hero-sun" />
        <circle cx="1180" cy="640" r="54" fill="#F8EEE8" />
        <path d="M0 700 C 260 640 460 660 700 690 S 1180 640 1600 672 V1000 H0Z" fill="#D7DDCE" />
        <ellipse className="nff-hero-mist" cx="420" cy="700" rx="420" ry="22" fill="#F7F5EF" opacity="0.7" filter="url(#auth-blur)" />
        <path d="M0 780 C 320 730 560 770 860 790 S 1340 740 1600 770 V1000 H0Z" fill="#BCC5B2" />
        <ellipse className="nff-hero-mist" style={{ animationDelay: '-9s' }} cx="1200" cy="782" rx="380" ry="20" fill="#F7F5EF" opacity="0.55" filter="url(#auth-blur)" />
        <path d="M0 870 C 360 830 640 860 960 880 S 1400 846 1600 862 V1000 H0Z" fill="#9EAA94" />
      </svg>
    </div>
  )
}
