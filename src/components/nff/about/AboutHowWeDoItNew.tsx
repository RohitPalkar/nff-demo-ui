import { ABOUT_IMAGES } from '@/config/aboutImages'
import { useRevealOnce } from '@/lib/useRevealOnce'
import type { AboutContent } from '@/services/about'
import type { AboutPage, AboutSection } from '@/types'
import { AboutPhoto, ChapterHeader, Paragraphs } from './AboutParts'
import { FRAME, OUTER, delay, slugId } from './aboutLayout'

/** The six journey stages as they exist in the product, in order. */
function StageList({ stages }: { stages: AboutContent['stages'] }) {
  return (
    <ol className="flex flex-col rounded-[24px] border border-nff-border-default bg-nff-bg-surface p-2 shadow-nff-1 md:rounded-[28px]">
      {stages.map((stage, index) => (
        <li
          key={stage.id}
          className="nff-reveal-fade flex items-start gap-4 rounded-[18px] px-4 py-4 not-last:border-b not-last:border-nff-border-subtle sm:px-5"
          style={delay(200 + index * 70)}
        >
          <span
            aria-hidden="true"
            className="nff-reveal-pop flex size-9 shrink-0 items-center justify-center rounded-full bg-nff-bg-tonal font-serif text-[0.9375rem] tabular-nums text-[var(--nff-forest-700)]"
            style={delay(260 + index * 70)}
          >
            {stage.number}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5 pt-1">
            <span className="nff-label-lg text-foreground">
              <span className="sr-only">Stage {stage.number}: </span>
              {stage.title}
            </span>
            <span className="nff-body-sm text-pretty text-nff-text-secondary">{stage.description}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

function StagesBlock({ section, stages }: { section: AboutSection; stages: AboutContent['stages'] }) {
  const [ref, shown] = useRevealOnce<HTMLElement>(0.12)
  const id = slugId('about', section.heading)
  return (
    <section
      ref={ref}
      aria-labelledby={id}
      data-reveal={shown ? 'shown' : 'pending'}
      className="grid gap-10 border-t border-nff-border-default pt-10 md:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 xl:gap-24"
    >
      <div className="flex flex-col gap-6">
        <h3 id={id} className="nff-reveal-fade nff-heading-h2 text-balance text-foreground">
          {section.heading}
        </h3>
        <Paragraphs paragraphs={section.paragraphs} delayMs={120} className="max-w-[38rem]" />
      </div>
      {stages.length > 0 && <StageList stages={stages} />}
    </section>
  )
}

/** Full-width photograph carrying the section's existing caption. */
function PathBand({ caption, missing }: { caption: string; missing: boolean }) {
  const [ref, shown] = useRevealOnce<HTMLDivElement>(0.2)
  return (
    <div ref={ref} data-reveal={shown ? 'shown' : 'pending'} className={OUTER}>
      <figure className="nff-reveal-fade relative">
        <AboutPhoto
          image={ABOUT_IMAGES.path}
          missing={missing}
          className="aspect-[4/5] sm:aspect-[16/10] md:rounded-[36px] lg:aspect-[12/5]"
        >
          {!missing && (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(to_top,rgb(26_34_26/0.82),rgb(26_34_26/0.35)_45%,transparent_75%)]"
            />
          )}
        </AboutPhoto>
        {missing ? (
          <figcaption className="mt-4 nff-body-sm text-nff-text-tertiary">{caption}</figcaption>
        ) : (
          <figcaption className="absolute inset-x-0 bottom-0 px-6 pb-8 sm:px-10 sm:pb-12 lg:px-14 lg:pb-16">
            <span className="mx-auto block max-w-[calc(1440px-7rem)]">
              <span className="block max-w-[44rem] nff-heading-h1 text-balance text-[var(--nff-ivory-50)]">
                <span className="nff-reveal-line">
                  <span style={delay(200)}>{caption}</span>
                </span>
              </span>
            </span>
          </figcaption>
        )}
      </figure>
    </div>
  )
}

/** The principles: large numerals, title, then the copy. */
function Principles({ sections }: { sections: AboutSection[] }) {
  return (
    <ol className="flex flex-col">
      {sections.map((section, index) => (
        <Principle key={section.heading} section={section} number={index + 1} />
      ))}
    </ol>
  )
}

function Principle({ section, number }: { section: AboutSection; number: number }) {
  const [ref, shown] = useRevealOnce<HTMLLIElement>(0.15)
  const id = slugId('about', section.heading)
  return (
    <li
      ref={ref}
      data-reveal={shown ? 'shown' : 'pending'}
      className="grid gap-4 border-t border-nff-border-default py-10 md:grid-cols-[6rem_minmax(0,1fr)] md:gap-x-8 md:py-12 lg:grid-cols-[8rem_minmax(0,0.9fr)_minmax(0,1.2fr)] lg:gap-x-12 last:border-b"
    >
      <span
        aria-hidden="true"
        className="nff-reveal-fade font-serif text-[3rem] leading-none font-light tabular-nums text-[var(--nff-sage-400)] md:text-[3.5rem] lg:text-[4rem]"
      >
        {String(number).padStart(2, '0')}
      </span>
      <h3
        id={id}
        className="nff-reveal-fade nff-heading-h2 text-balance text-foreground md:col-start-2 lg:col-start-auto"
        style={delay(80)}
      >
        {section.heading}
      </h3>
      <Paragraphs
        paragraphs={section.paragraphs}
        delayMs={160}
        className="md:col-start-2 lg:col-start-auto"
      />
    </li>
  )
}

/**
 * How We Do It — six stages beside the product's real
 * stage list, a full-width photograph with the section caption, then the
 * principles as numbered rows.
 */
export function AboutHowWeDoIt({
  page,
  stages,
  forceMissingImage = false,
}: {
  page: AboutPage
  stages: AboutContent['stages']
  forceMissingImage?: boolean
}) {
  const [ref, shown] = useRevealOnce<HTMLElement>(0.08)
  const [stagesSection, ...principles] = page.sections
  const headingId = `${page.slug}-heading`

  return (
    <section
      ref={ref}
      id={page.slug}
      tabIndex={-1}
      aria-labelledby={headingId}
      data-reveal={shown ? 'shown' : 'pending'}
      className="outline-none"
    >
      <div className={OUTER}>
        <div className={`${FRAME} flex flex-col gap-16 py-20 md:gap-20 md:py-28 lg:py-32`}>
          <ChapterHeader number={3} title={page.title} lead={page.lead} headingId={headingId} />
          {stagesSection && <StagesBlock section={stagesSection} stages={stages} />}
        </div>
      </div>

      <PathBand caption={page.image.caption} missing={forceMissingImage} />

      {principles.length > 0 && (
        <div className={OUTER}>
          <div className={`${FRAME} pt-16 md:pt-24 lg:pt-28`}>
            <Principles sections={principles} />
          </div>
        </div>
      )}
    </section>
  )
}