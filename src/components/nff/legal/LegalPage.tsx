import { FileText, Printer } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DetailBreadcrumb } from '@/components/nff/DetailBreadcrumb'

export interface LegalSection {
  id: string
  title: string
  body: ReactNode
}

/** Policy pages linked from every footer. */
const LEGAL_PAGES = [
  { to: '/privacy', label: 'Privacy policy' },
  { to: '/terms', label: 'Terms of use' },
  { to: '/cookies', label: 'Cookie policy' },
  { to: '/cookie-preferences', label: 'Your privacy choices' },
] as const

/**
 * A detail the client still has to supply (legal entity, address, dates,
 * governing law). Shown highlighted so nobody mistakes it for final text.
 */
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded-sm bg-[var(--nff-clay-50)] px-1 text-nff-text-accent ring-1 ring-[var(--nff-clay-200)]">
      [{children}]
    </mark>
  )
}

/**
 * Shared frame for the privacy policy, terms of use and cookie policy:
 * breadcrumb, title, dates, a sample-text notice, an "On this page" list
 * (sticky beside the text on wide screens) and numbered sections at a
 * readable measure. Printable, as the CCPA regulations ask of a privacy
 * policy.
 */
export function LegalPage({
  title,
  summary,
  updated,
  sections,
}: {
  title: string
  summary: ReactNode
  updated: string
  sections: LegalSection[]
}) {
  const others = LEGAL_PAGES.filter((page) => page.label !== title)
  return (
    <div className="w-full flex flex-col gap-8 py-8 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="print:hidden max-w-[1440px] mx-auto">
        <DetailBreadcrumb trail={[{ label: 'Home', to: '/' }]} current={title} />
      </div>

      <header className="flex flex-col gap-4 border-b pb-8 max-w-[1440px] mx-auto">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-nff-bg-tonal text-nff-text-brand print:hidden"
        >
          <FileText className="size-6" />
        </span>
        <h1 className="nff-heading-h1 text-foreground">{title}</h1>
        <div className="nff-body-lg text-nff-text-secondary">{summary}</div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <p className="nff-body-sm text-nff-text-secondary">
            Last updated <time dateTime={updated}>{formatDate(updated)}</time>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="print:hidden"
            onClick={() => window.print()}
          >
            <Printer aria-hidden="true" />
            Print or save as PDF
          </Button>
        </div>
        <p
          role="note"
          className="rounded-lg border border-[var(--nff-clay-200)] bg-[var(--nff-clay-50)] px-4 py-3 nff-body-sm text-foreground"
        >
          <strong className="font-medium">Sample text for the demo.</strong> The structure follows
          US requirements (including the CCPA/CPRA). The final wording comes from NFF's legal
          counsel, and items in <Placeholder>brackets</Placeholder> are still to be supplied.
          This page is not legal advice.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16 max-w-[1440px] mx-auto">
        <nav aria-labelledby="legal-toc" className="print:hidden lg:sticky lg:top-24 lg:self-start">
          <h2 id="legal-toc" className="mb-3 nff-label-md text-foreground">
            On this page
          </h2>
          <ol className="flex flex-col gap-1 border-l">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="-ml-px flex gap-2 border-l-2 border-transparent py-1.5 pl-3 nff-body-sm text-nff-text-secondary hover:border-[var(--nff-sage-400)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span aria-hidden="true" className="tabular-nums">
                    {index + 1}.
                  </span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-10 w-full">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className="scroll-mt-28 flex flex-col gap-3"
            >
              <h2 id={`${section.id}-title`} className="nff-heading-h3 text-foreground">
                <span className="tabular-nums">{index + 1}.</span> {section.title}
              </h2>
              <div className="legal-prose flex flex-col gap-3 nff-body-md text-foreground [&_a]:font-medium [&_a]:text-nff-text-link [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5">
                {section.body}
              </div>
            </section>
          ))}

          <aside
            aria-labelledby="legal-related"
            className="flex flex-col gap-3 rounded-xl border bg-nff-bg-surface-sunken p-5 print:hidden"
          >
            <h2 id="legal-related" className="nff-label-lg text-foreground">
              Related
            </h2>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {others.map((page) => (
                <li key={page.to}>
                  <Link
                    to={page.to}
                    className="rounded-sm nff-body-md font-medium text-nff-text-link underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
