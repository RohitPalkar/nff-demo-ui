import { ArrowRight, BookOpen, Headphones, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LIBRARY_ITEMS } from '@/components/nff/header/navConfig'
import { useRevealOnce } from '@/lib/useRevealOnce'
import { CATEGORY_COPY } from '@/services/content'
import type { AboutPage, AboutSection } from '@/types'
import { ChapterHeader, SubSection } from './AboutParts'
import { FRAME, OUTER, delay, sentences, slugId } from './aboutLayout'

/** The four library categories, each linking to its category page. */
function CategoryGrid() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 md:gap-4">
      {LIBRARY_ITEMS.map((entry, index) => (
        <li
          key={entry.key}
          className="nff-reveal-fade group relative flex flex-col gap-3 rounded-[20px] border border-nff-border-default bg-nff-bg-surface p-6 shadow-nff-1 transition-[box-shadow,transform] duration-[var(--nff-duration-base)] hover:-translate-y-0.5 hover:shadow-nff-2 focus-within:shadow-nff-2 motion-reduce:hover:translate-y-0"
          style={delay(200 + index * 80)}
        >
          <span
            aria-hidden="true"
            className="font-serif text-[1.125rem] tabular-nums text-nff-text-tertiary transition-colors group-hover:text-nff-text-brand"
          >
            {entry.index}
          </span>
          <h4 className="nff-title-section text-foreground">
            <Link
              to={entry.href}
              className="outline-none after:absolute after:inset-0 after:rounded-[20px] focus-visible:shadow-none focus-visible:after:shadow-[var(--nff-focus-ring)]"
            >
              {CATEGORY_COPY[entry.key].label}
            </Link>
          </h4>
          <p className="nff-body-sm text-pretty text-nff-text-secondary">{entry.description}</p>
          <ArrowRight
            aria-hidden="true"
            className="absolute top-6 right-6 size-4 text-nff-icon-secondary transition-[transform,color] duration-[var(--nff-duration-fast)] group-hover:translate-x-0.5 group-hover:text-nff-icon-brand"
          />
        </li>
      ))}
    </ul>
  )
}

interface Format {
  icon: LucideIcon
  title: string
  text: string
  to: string
  linkLabel: string
}

function FormatCard({ format, index }: { format: Format; index: number }) {
  const Icon = format.icon
  return (
    <li
      className="nff-reveal-fade flex flex-col gap-5 rounded-[20px] bg-[var(--nff-forest-800)] p-6 text-[var(--nff-ivory-50)] sm:p-8"
      data-surface="inverse"
      style={delay(200 + index * 100)}
    >
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-full bg-[rgb(215_221_206/0.14)] text-[var(--nff-sage-100)]"
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <div className="flex flex-col gap-2">
        <h4 className="nff-title-section text-[var(--nff-ivory-50)]">{format.title}</h4>
        <p className="nff-body-md text-pretty text-[var(--nff-ivory-50)]">{format.text}</p>
      </div>
      <Link
        to={format.to}
        className="group mt-auto inline-flex min-h-11 w-fit items-center gap-1.5 rounded-sm nff-label-md text-[var(--nff-ivory-50)] underline decoration-[rgb(247_245_239/0.35)] underline-offset-4 transition-colors hover:decoration-current nff-focus-ring"
      >
        {format.linkLabel}
        <ArrowRight
          aria-hidden="true"
          className="size-4 transition-transform duration-[var(--nff-duration-fast)] group-hover:translate-x-1"
        />
      </Link>
    </li>
  )
}

/**
 * Reading and listening: the section's first paragraph is two sentences, one
 * about explorations and one about meditations. Each becomes a card with a
 * link to its catalogue; the remaining paragraph follows. If the copy changes
 * shape, the paragraphs are shown as written instead.
 */
function ReadingAndListening({ section }: { section: AboutSection }) {
  const [first, ...more] = section.paragraphs
  const parts = first ? sentences(first) : []
  const split =
    parts.length === 2 && /explorations/i.test(parts[0]!) && /meditations/i.test(parts[1]!)
  const formats: Format[] = split
    ? [
        {
          icon: BookOpen,
          title: 'Explorations',
          text: parts[0]!,
          to: '/explorations',
          linkLabel: 'Browse explorations',
        },
        {
          icon: Headphones,
          title: 'Meditations',
          text: parts[1]!,
          to: '/meditations',
          linkLabel: 'Browse meditations',
        },
      ]
    : []

  return (
    <SubSection
      id={slugId('about', section.heading)}
      heading={section.heading}
      paragraphs={split ? more : section.paragraphs}
    >
      {split && (
        <ul className="order-first grid gap-3 sm:grid-cols-2 md:gap-4">
          {formats.map((format, index) => (
            <FormatCard key={format.title} format={format} index={index} />
          ))}
        </ul>
      )}
    </SubSection>
  )
}

/**
 * What We Do — editorial section with four offerings.
 * Uses varied surface treatments rather than identical cards.
 */
export function AboutWhatWeDo({ page }: { page: AboutPage }) {
  const [ref, shown] = useRevealOnce<HTMLElement>(0.08)
  const [curriculum, formats, begin, ...rest] = page.sections
  const headingId = `${page.slug}-heading`

  return (
    <section
      ref={ref}
      id={page.slug}
      tabIndex={-1}
      aria-labelledby={headingId}
      data-reveal={shown ? 'shown' : 'pending'}
      className={`${OUTER} outline-none`}
    >
      <div className="rounded-[28px] bg-nff-bg-surface-sunken md:rounded-[36px]">
        <div className={`${FRAME} flex flex-col gap-16 py-16 md:gap-20 md:py-24 lg:py-28`}>
          <ChapterHeader number={2} title={page.title} lead={page.lead} headingId={headingId} />

          <div className="flex flex-col gap-16 md:gap-20">
            {curriculum && (
              <SubSection
                id={slugId('about', curriculum.heading)}
                heading={curriculum.heading}
                paragraphs={curriculum.paragraphs}
              />
            )}

            <SubSection id="about-the-library" heading="The library">
              <CategoryGrid />
            </SubSection>

            {formats && <ReadingAndListening section={formats} />}

            {[begin, ...rest]
              .filter((section): section is AboutSection => Boolean(section))
              .map((section) => (
                <SubSection
                  key={section.heading}
                  id={slugId('about', section.heading)}
                  heading={section.heading}
                  paragraphs={section.paragraphs}
                />
              ))}
          </div>
        </div>
      </div>
    </section>
  )
}