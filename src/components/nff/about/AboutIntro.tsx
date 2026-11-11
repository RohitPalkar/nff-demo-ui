import { ArrowDown } from 'lucide-react'
import { DetailBreadcrumb } from '@/components/nff/DetailBreadcrumb'
import { BRAND } from '@/config/brand'
import { ABOUT_IMAGES } from '@/config/aboutImages'
import { formatDate } from '@/lib/format'
import { useRevealOnce } from '@/lib/useRevealOnce'
import type { AboutPage } from '@/types'
import { AboutPhoto, Eyebrow } from './AboutParts'
import { FRAME, OUTER, delay, goToSection } from './aboutLayout'

/** In-page index: the three parts of the story, as quiet numbered rows. */
function SectionIndex({ topics }: { topics: Array<{ slug: string; label: string }> }) {
  return (
    <nav aria-label="On this page" className="nff-reveal-fade" style={delay(380)}>
      <ol className="border-t border-nff-border-default">
        {topics.map((topic, index) => (
          <li key={topic.slug} className="border-b border-nff-border-default">
            <a
              href={`#${topic.slug}`}
              onClick={(event) => goToSection(event, topic.slug)}
              className="group flex min-h-12 items-center gap-4 rounded-sm py-3 transition-colors duration-[var(--nff-duration-fast)] hover:text-nff-text-brand nff-focus-ring"
            >
              <span
                aria-hidden="true"
                className="w-7 font-serif text-[0.9375rem] tabular-nums text-nff-text-tertiary transition-colors group-hover:text-nff-text-brand"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="flex-1 nff-label-lg text-foreground group-hover:text-nff-text-brand">
                {topic.label}
              </span>
              <ArrowDown
                aria-hidden="true"
                className="size-4 text-nff-icon-secondary transition-transform duration-[var(--nff-duration-fast)] group-hover:translate-y-0.5 group-hover:text-nff-icon-brand"
              />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/**
 * About introduction (#who-we-are): breadcrumb, the page title and lead from
 * the Who we are content, an index of the three parts, and a wide photograph
 * carrying the existing Who we are caption.
 */
export function AboutIntro({
  page,
  topics,
  updatedAt,
  forceMissingImage = false,
}: {
  page: AboutPage
  topics: Array<{ slug: string; label: string }>
  updatedAt: string
  forceMissingImage?: boolean
}) {
  const [ref, shown] = useRevealOnce<HTMLElement>(0.05)

  return (
    <section
      ref={ref}
      id={page.slug}
      tabIndex={-1}
      aria-labelledby="about-heading"
      data-reveal={shown ? 'shown' : 'pending'}
      className={`${OUTER} outline-none`}
    >
      <div className={`${FRAME} pt-6 md:pt-8`}>
        <DetailBreadcrumb trail={[{ label: 'Home', to: '/' }]} current="About" />

        {/* Title and lead on the left; the index sits at the foot of the right column. */}
        <div className="grid gap-12 pt-12 md:pt-16 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-end lg:gap-16 lg:pt-20 xl:gap-28">
          <div className="flex flex-col items-start gap-6">
            <Eyebrow>About {BRAND.productName}</Eyebrow>
            <h1 id="about-heading" className="nff-display-xl text-balance text-foreground">
              <span className="nff-reveal-line">
                <span style={delay(100)}>{page.title}</span>
              </span>
            </h1>
            <p
              className="nff-reveal-fade mt-2 max-w-[38rem] nff-reading-lead text-pretty text-nff-text-secondary"
              style={delay(240)}
            >
              {page.lead}
            </p>
            <p className="nff-reveal-fade nff-caption text-nff-text-tertiary" style={delay(300)}>
              Updated {formatDate(updatedAt)}
            </p>
          </div>

          <SectionIndex topics={topics} />
        </div>

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
