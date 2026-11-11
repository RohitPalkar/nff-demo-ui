import { ArrowRight, ArrowUp } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import {
  ABOUT_ITEMS,
  PRACTICE_ITEMS,
  STAFF_ROLES,
} from '@/components/nff/header/navConfig'
import { Button } from '@/components/ui/button'
import { BRAND } from '@/config/brand'
import { useAuth } from '@/features/auth/AuthProvider'
import { cn } from '@/lib/utils'

const CURRENT_YEAR = new Date().getFullYear()

interface FooterLink {
  label: string
  href: string
}

const EXPLORE_LINKS: FooterLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Explorations', href: '/explorations' },
  { label: 'Meditations', href: '/meditations' },
]

/** The three practice areas the footer lists; Explore stays in the navbar menu. */
const FOOTER_PRACTICE_KEYS = ['foundations', 'understand', 'contemplate']
const PRACTICE_LINKS: FooterLink[] = PRACTICE_ITEMS.filter(({ key }) =>
  FOOTER_PRACTICE_KEYS.includes(key),
).map(({ label, href }) => ({ label, href }))

/*
 * About topics are separate routes today (/about/:slug), each shown as a tab
 * of the About page. If the About page becomes one page with section anchors,
 * update ABOUT_ITEMS in navConfig and these links follow.
 */
const ABOUT_LINKS: FooterLink[] = ABOUT_ITEMS

const LEGAL_LINKS: FooterLink[] = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Accessibility', href: '/accessibility' },
  { label: 'Cookie preferences', href: '/cookie-preferences' },
]

function useAccountLinks(): FooterLink[] {
  const { user } = useAuth()
  if (!user) {
    return [
      { label: 'Log in', href: '/login' },
      { label: 'Begin your journey', href: '/signup' },
    ]
  }
  const own: FooterLink[] = STAFF_ROLES.includes(user.role)
    ? [{ label: 'CMS', href: '/cms' }]
    : [
        { label: 'Journey', href: '/journey' },
        { label: 'My Journey', href: '/my-journey' },
      ]
  return [
    ...own,
    { label: 'Profile', href: '/account/profile' },
    { label: 'Email preferences', href: '/account/email' },
    { label: 'Privacy settings', href: '/account/privacy' },
  ]
}

/** Exact match on path and query, so category links only light up on their tab. */
function useIsCurrent() {
  const { pathname, search } = useLocation()
  return (href: string) => href === pathname + search
}

const linkClass =
  'inline-flex min-h-9 items-center rounded-sm text-nff-text-secondary underline-offset-4 transition-colors duration-[var(--nff-duration-fast)] hover:text-nff-text-primary hover:underline nff-focus-ring aria-[current=page]:text-nff-text-primary'

function Column({ title, links }: { title: string; links: FooterLink[] }) {
  const isCurrent = useIsCurrent()
  return (
    <nav aria-label={title} className="flex flex-col gap-2.5">
      <h2 className="nff-overline text-nff-text-tertiary">{title}</h2>
      <ul className="flex flex-col">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              to={link.href}
              aria-current={isCurrent(link.href) ? 'page' : undefined}
              className={cn(linkClass, 'nff-body-md')}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Section 1. There is no public newsletter service, so instead of an email
 * field this points to the real email settings: account sign-up for visitors,
 * Email preferences for signed-in people. Copy comes from those settings.
 */
function EmailNote() {
  const { user } = useAuth()
  const action = user
    ? { to: '/account/email', label: 'Manage email preferences' }
    : { to: '/signup', label: 'Create an account' }

  return (
    <section
      aria-labelledby="footer-email"
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16"
    >
      <div className="flex max-w-2xl flex-col gap-3">
        <h2 id="footer-email" className="nff-heading-h2 text-balance text-foreground">
          One short note,{' '}
          <em className="font-normal not-italic text-[var(--nff-sage-200)]">
            each morning.
          </em>
        </h2>
        <p className="max-w-xl nff-body-md text-nff-text-secondary">
          Today’s practice in a single email, and occasional news when new
          explorations and meditations arrive.
        </p>
      </div>
      <div className="flex flex-col items-start gap-3 lg:items-end">
        <Button asChild className="h-11 rounded-full px-6">
          <Link to={action.to}>
            {action.label}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
        <p className="nff-caption text-nff-text-secondary">
          {user
            ? 'Change or stop emails at any time.'
            : 'Email settings live in your account.'}
        </p>
      </div>
    </section>
  )
}

export function Footer() {
  const accountLinks = useAccountLinks()

  return (
    <footer className="mt-auto bg-nff-bg-public p-2 sm:p-3">
      <div
        data-surface="inverse"
        className="overflow-hidden rounded-[28px] bg-nff-bg-inverse text-foreground md:rounded-[36px]"
      >
        <div className="mx-auto flex max-w-[1440px] flex-col px-6 pt-10 pb-6 sm:px-10 md:pt-14 lg:px-14">
          <EmailNote />

          <hr className="my-8 border-nff-border-default md:my-10" />

          {/* Section 2: brand and navigation columns. */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 md:gap-x-8 xl:grid-cols-[minmax(0,1.8fr)_repeat(4,minmax(0,1fr))]">
            <div className="col-span-2 flex max-w-sm flex-col gap-3 md:col-span-4 xl:col-span-1">
              <p className="nff-body-md text-pretty text-nff-text-secondary">{BRAND.tagline}</p>
              <a
                href={`mailto:${BRAND.supportEmail}`}
                className="w-fit rounded-sm font-serif text-[1.125rem] leading-snug tracking-[-0.01em] text-nff-text-primary [overflow-wrap:anywhere] underline-offset-4 transition-colors hover:underline nff-focus-ring sm:text-[1.375rem] xl:text-[1.125rem]"
              >
                {BRAND.supportEmail}
              </a>
            </div>
            <Column title="Explore" links={EXPLORE_LINKS} />
            <Column title="The practice" links={PRACTICE_LINKS} />
            <Column title="About" links={ABOUT_LINKS} />
            <Column title="Account" links={accountLinks} />
          </div>

          {/* Section 3: wordmark, sized to the container so it always spans it. */}
          <div
            aria-hidden="true"
            className="mt-10 select-none [container-type:inline-size] md:mt-14"
          >
            {/* Faded: ivory at the top dissolving into the card, so it reads as texture. */}
            <p className="bg-gradient-to-b from-nff-text-primary/35 to-nff-text-primary/0 bg-clip-text -mb-[0.12em] pb-[0.24em] font-serif text-[26cqw] leading-[0.85] font-normal tracking-[-0.035em] whitespace-nowrap text-transparent md:text-[26.6cqw]">
              {BRAND.productName}
            </p>
          </div>

          {/* Section 4: legal. */}
          <div className="mt-6 flex flex-col gap-3 border-t border-nff-border-default pt-5 md:mt-8 md:flex-row md:items-center md:justify-between">
            <p className="nff-caption text-nff-text-secondary">
              © {CURRENT_YEAR} {BRAND.productName}. Prototype with demo data.
            </p>
            <nav aria-label="Legal">
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
                {LEGAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href} className={cn(linkClass, 'min-h-8 nff-caption')}>
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <a href="#main" className={cn(linkClass, 'min-h-8 gap-1 nff-caption')}>
                    Back to top
                    <ArrowUp aria-hidden="true" className="size-3.5" />
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  )
}
