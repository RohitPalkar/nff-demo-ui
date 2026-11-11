import { useRevealOnce } from '@/lib/useRevealOnce'
import { ABOUT_IMAGES } from '@/config/aboutImages'
import { cn } from '@/lib/utils'
import type { AboutPage, AboutSection } from '@/types'
import { AboutPhoto, Eyebrow, Paragraphs } from './AboutParts'
import { FRAME, OUTER, delay } from './aboutLayout'

function useReveal(threshold = 0.15) {
  const [ref, shown] = useRevealOnce<HTMLElement>(threshold)
  return { ref, 'data-reveal': shown ? 'shown' : 'pending' } as const
}

function headingId(section: AboutSection) {
  return `about-${section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

/** Heading on the left (sticky on wide screens), copy on the right. */
function EditorialSplit({ section, eyebrow }: { section: AboutSection; eyebrow: string }) {
  const reveal = useReveal()
  const id = headingId(section)
  return (
    <section {...reveal} aria-labelledby={id} className={OUTER}>
      <div className={`${FRAME} py-20 md:py-28 lg:py-32`}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16 xl:gap-24">
          <div className="flex flex-col items-start gap-5 lg:sticky lg:top-28 lg:self-start">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 id={id} className="nff-heading-h1 text-balance text-foreground">
              <span className="nff-reveal-line">
                <span style={delay(100)}>{section.heading}</span>
              </span>
            </h2>
          </div>
          <Paragraphs paragraphs={section.paragraphs} leadFirst delayMs={220} className="max-w-[40rem]" />
        </div>
      </div>
    </section>
  )
}

/** Two short sentences from the practice section, set large. Decorative:
 *  the same words are read in full in the section above. */
const PULL_QUOTE = ['Promises create pressure.', 'Practice creates room.'] as const

function Statement({ section }: { section: AboutSection }) {
  const reveal = useReveal(0.3)
  const text = section.paragraphs.join(' ')
  if (!PULL_QUOTE.every((line) => text.includes(line))) return null
  return (
    <aside {...reveal} aria-hidden="true" className={OUTER}>
      <div className={FRAME}>
        <div className="flex flex-col items-center gap-8 border-y border-nff-border-default py-16 text-center md:py-24 lg:py-28">
          <span
            aria-hidden="true"
            className="nff-reveal-pop size-2.5 rounded-full bg-[var(--nff-sage-400)]"
            style={delay(0)}
          />
          <p className="nff-display text-balance text-foreground">
            <span className="nff-reveal-line">
              <span style={delay(100)}>{PULL_QUOTE[0]}</span>
            </span>
            <span className="nff-reveal-line">
              <span style={delay(220)} className="text-nff-text-brand">
                {PULL_QUOTE[1]}
              </span>
            </span>
          </p>
        </div>
      </div>
    </aside>
  )
}

/**
 * The name, with a typographic gloss. The gloss uses the section's own
 * phrase and only appears if it is still in the copy.
 */
const NAME_PARTS: ReadonlyArray<{ term: string; gloss: string }> = [
  { term: 'Meadow', gloss: 'open ground, left to grow at its own pace' },
]

function NameSection({ section, eyebrow }: { section: AboutSection; eyebrow: string }) {
  const reveal = useReveal()
  const id = headingId(section)
  const text = section.paragraphs.join(' ')
  const showGloss = NAME_PARTS.every((part) => text.includes(part.gloss))

  return (
    <section {...reveal} aria-labelledby={id} className={OUTER}>
      <div className={`${FRAME} py-20 md:py-28 lg:py-32`}>
        <div
          className={cn(
            'grid gap-12 lg:gap-16 xl:gap-24',
            showGloss && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center',
          )}
        >
          <div className="flex flex-col items-start gap-5">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 id={id} className="nff-heading-h1 text-balance text-foreground">
              <span className="nff-reveal-line">
                <span style={delay(100)}>{section.heading}</span>
              </span>
            </h2>
            <Paragraphs paragraphs={section.paragraphs} delayMs={220} className="mt-3 max-w-[38rem]" />
          </div>
          {showGloss && (
            <div
              aria-hidden="true"
              className="nff-reveal-fade relative isolate overflow-hidden rounded-[24px] bg-nff-bg-tonal px-6 py-10 sm:px-10 sm:py-12 md:rounded-[28px] lg:px-12 lg:py-14"
              style={delay(160)}
            >
              <svg
                viewBox="0 0 400 400"
                className="pointer-events-none absolute -top-32 -right-32 -z-10 size-[22rem] text-[var(--nff-sage-400)] opacity-25"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="200" cy="200" r="199" strokeWidth="1" />
                <circle cx="200" cy="200" r="130" strokeWidth="1" />
              </svg>
              <div className="flex flex-col gap-8">
                {NAME_PARTS.map((part, index) => (
                  <div key={part.term} className="flex flex-col gap-2">
                    <span className="flex items-baseline gap-3">
                      <span className="nff-display text-[var(--nff-forest-800)] [overflow-wrap:anywhere]">
                        {part.term}
                      </span>
                      {index < NAME_PARTS.length - 1 && (
                        <span className="font-serif text-[2rem] leading-none text-nff-text-tertiary">
                          +
                        </span>
                      )}
                    </span>
                    <span className="nff-body-md text-nff-text-secondary">{part.gloss}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/** Photograph on one side, narrative on the other. */
function PeopleSection({ section, eyebrow }: { section: AboutSection; eyebrow: string }) {
  const reveal = useReveal()
  const id = headingId(section)
  return (
    <section {...reveal} aria-labelledby={id} className={OUTER}>
      <div className={`${FRAME} pb-20 md:pb-28 lg:pb-32`}>
        <div className="grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] md:items-center md:gap-12 lg:gap-20">
          <AboutPhoto
            image={ABOUT_IMAGES.people}
            sizes="(min-width: 768px) 45vw, 100vw"
            className="nff-reveal-fade aspect-[4/3] md:aspect-[4/5]"
          />
          <div className="flex flex-col items-start gap-5">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 id={id} className="nff-heading-h1 text-balance text-foreground">
              <span className="nff-reveal-line">
                <span style={delay(100)}>{section.heading}</span>
              </span>
            </h2>
            <Paragraphs paragraphs={section.paragraphs} delayMs={220} className="mt-3 max-w-[36rem]" />
          </div>
        </div>
      </div>
    </section>
  )
}

/** Generic layout for any further Who we are sections added in the CMS. */
function ExtraSections({ sections, eyebrow }: { sections: AboutSection[]; eyebrow: string }) {
  return sections.map((section) => (
    <EditorialSplit key={section.heading} section={section} eyebrow={eyebrow} />
  ))
}

/**
 * The rest of Who we are, after the introduction: the practice (editorial
 * split, then its two key sentences set large), the name, and the people.
 * Sections are laid out by position; any extra ones use the editorial split.
 */
export function AboutStory({ page }: { page: AboutPage }) {
  const [practice, name, people, ...rest] = page.sections
  return (
    <>
      {practice && <EditorialSplit section={practice} eyebrow={page.title} />}
      {practice && <Statement section={practice} />}
      {name && <NameSection section={name} eyebrow={page.title} />}
      {people && <PeopleSection section={people} eyebrow={page.title} />}
      <ExtraSections sections={rest} eyebrow={page.title} />
    </>
  )
}
