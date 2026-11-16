import { ABOUT_IMAGES } from '@/config/aboutImages'
import { DetailBreadcrumb } from '@/components/nff/DetailBreadcrumb'
import { formatDate } from '@/lib/format'
import type { AboutPage } from '@/types'
import { AboutPhoto, Eyebrow } from './AboutParts'
import { FRAME, OUTER, delay } from './aboutLayout'

/**
 * Hero section: editorial layout with title, lead, and atmospheric landscape photo.
 * Uses the existing intro image.
 */
export function AboutHero({
  page,
  forceMissingImage = false,
}: {
  page: AboutPage
  forceMissingImage?: boolean
}) {
  return (
    <section
      id={page.slug}
      tabIndex={-1}
      aria-labelledby="about-heading"
      className={`${OUTER} outline-none`}
    >
      <div className={`${FRAME} pt-6 md:pt-8`}>
        <DetailBreadcrumb trail={[{ label: 'Home', to: '/' }]} current="About" />
        <div className="grid gap-12 pt-12 md:pt-16 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-end lg:gap-16 lg:pt-20 xl:gap-28">
          <div className="flex flex-col items-start gap-6">
            <Eyebrow>WHO WE ARE</Eyebrow>
            <h1
              id="about-heading"
              className="nff-display-xl text-balance text-foreground"
            >
              <span className="nff-reveal-line">
                <span style={delay(100)}>{page.title}</span>
              </span>
            </h1>
            <p
              className="nff-reveal-fade max-w-[38rem] nff-reading-lead text-pretty text-nff-text-secondary"
              style={delay(240)}
            >
              {page.lead}
            </p>
            <p className="nff-reveal-fade nff-caption text-nff-text-tertiary" style={delay(300)}>
              Updated {formatDate(page.updatedAt)}
            </p>
          </div>

          {/* In-page index */}
          <nav aria-label="On this page" className="nff-reveal-fade" style={delay(380)}>
            <ol className="border-t border-nff-border-default">
              <li className="border-b border-nff-border-default">
                <a
                  href="#what-we-do"
                  className="group flex min-h-12 items-center gap-4 rounded-sm py-3 transition-colors duration-[var(--nff-duration-fast)] hover:text-nff-text-brand nff-focus-ring"
                >
                  <span
                    aria-hidden="true"
                    className="w-7 font-serif text-[0.9375rem] tabular-nums text-nff-text-tertiary transition-colors group-hover:text-nff-text-brand"
                  >
                    02
                  </span>
                  <span className="flex-1 nff-label-lg text-foreground group-hover:text-nff-text-brand">
                    What we do
                  </span>
                </a>
              </li>
              <li className="border-b border-nff-border-default">
                <a
                  href="#how-we-do-it"
                  className="group flex min-h-12 items-center gap-4 rounded-sm py-3 transition-colors duration-[var(--nff-duration-fast)] hover:text-nff-text-brand nff-focus-ring"
                >
                  <span
                    aria-hidden="true"
                    className="w-7 font-serif text-[0.9375rem] tabular-nums text-nff-text-tertiary transition-colors group-hover:text-nff-text-brand"
                  >
                    03
                  </span>
                  <span className="flex-1 nff-label-lg text-foreground group-hover:text-nff-text-brand">
                    How we do it
                  </span>
                </a>
              </li>
            </ol>
          </nav>
        </div>

        {/* Hero image */}
        <figure className="nff-reveal-fade mt-12 md:mt-16 lg:mt-20" style={delay(300)}>
          <AboutPhoto
            image={ABOUT_IMAGES.intro}
            sizes="(min-width: 1464px) 1328px, 100vw"
            eager
            missing={forceMissingImage}
            className="aspect-[4/3] sm:aspect-[16/9] lg:aspect-[12/5]"
          />
          <figcaption className="mt-4 max-w-[40rem] nff-body-sm text-pretty text-nff-text-tertiary">
            {page.image.caption}
          </figcaption>
        </figure>
      </div>
    </section>
  )
}