import { ABOUT_IMAGES } from '@/config/aboutImages'
import { useRevealOnce } from '@/lib/useRevealOnce'
import type { AboutSection } from '@/types'
import { AboutPhoto, Paragraphs } from './AboutParts'
import { FRAME, OUTER, delay } from './aboutLayout'

/**
 * The People Behind It — photo on one side, narrative on the other.
 */
export function AboutPeople({
  section,
  eyebrow,
}: {
  section: AboutSection
  eyebrow: string
}) {
  const [ref, shown] = useRevealOnce<HTMLElement>(0.1)
  const id = `about-${section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
  return (
    <section
      ref={ref}
      aria-labelledby={id}
      data-reveal={shown ? 'shown' : 'pending'}
      className={OUTER}
    >
      <div className={`${FRAME} pb-20 md:pb-28 lg:pb-32`}>
        <div className="grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] md:items-center md:gap-12 lg:gap-20">
          <AboutPhoto
            image={ABOUT_IMAGES.people}
            sizes="(min-width: 768px) 45vw, 100vw"
            className="nff-reveal-fade aspect-[4/3] md:aspect-[4/5]"
          />
          <div className="flex flex-col items-start gap-5">
            <p className="nff-reveal-fade nff-overline text-nff-text-brand" style={delay(0)}>
              {eyebrow.toUpperCase()}
            </p>
            <h2
              id={id}
              className="nff-heading-h1 text-balance text-foreground"
            >
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