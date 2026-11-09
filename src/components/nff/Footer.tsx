import { Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '@/components/nff/BrandLogo'
import { ThemeToggle } from '@/components/nff/ThemeToggle'
import { BRAND } from '@/config/brand'

const CURRENT_YEAR = new Date().getFullYear()

const LINK_GROUPS = [
  {
    title: 'Learn',
    links: [
      { label: 'Foundations', href: '/?tab=foundations' },
      { label: 'Understand', href: '/?tab=understand' },
      { label: 'Contemplate', href: '/?tab=contemplate' },
      { label: 'Explorations', href: '/explorations' },
      { label: 'Meditations', href: '/meditations' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Who we are', href: '/about/who-we-are' },
      { label: 'What we do', href: '/about/what-we-do' },
      { label: 'How we do it', href: '/about/how-we-do-it' },
      { label: 'Contact', href: `mailto:${BRAND.supportEmail}` },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Cookie preferences', href: '/cookie-preferences' },
      { label: 'Accessibility', href: '/accessibility' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-nff-bg-surface-sunken">
      <div className="nff-content flex flex-col gap-10 py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
          <div className="flex max-w-sm flex-col gap-4">
            <BrandLogo />
            <p className="nff-body-sm text-muted-foreground">
              {BRAND.tagline}
            </p>
            <a
              href={`mailto:${BRAND.supportEmail}`}
              className="inline-flex w-fit items-center gap-2 nff-body-sm text-nff-text-link-default hover:text-nff-text-link-hover nff-focus-ring"
            >
              <Mail aria-hidden="true" className="size-4" />
              {BRAND.supportEmail}
            </a>
          </div>

          {LINK_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="nff-overline text-muted-foreground">
                {group.title}
              </h2>
              <ul className="mt-3 flex flex-col gap-1">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="inline-flex min-h-9 items-center nff-body-sm text-foreground hover:text-nff-text-link-default nff-focus-ring"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="nff-caption text-muted-foreground">
            © {CURRENT_YEAR} {BRAND.productName}. Prototype with demo data.
          </p>
          <div className="flex items-center gap-2">
            <span className="nff-caption text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  )
}
