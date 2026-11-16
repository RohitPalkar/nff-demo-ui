import { useRevealOnce } from '@/lib/useRevealOnce'
import type { AboutSection } from '@/types'
import { Paragraphs } from './AboutParts'
import { FRAME, OUTER, delay } from './aboutLayout'

/**
 * "A practice, not a promise" section — editorial split layout.
 * Left: heading and intro. Right: supporting paragraphs.
 */
export function AboutPractice({
  section,
}: {
  section: AboutSection
}) {
  const [ref, shown] = useRevealOnce<HTMLElement>(0.1)
  return (
    <section
      ref={ref}
      aria-labelledby="practice-heading"
      data-reveal={shown ? 'shown' : 'pending'}
      className={OUTER}
    >
      <div className={`${FRAME} py-20 md:py-28 lg:py-32`}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16 xl:gap-24">
          <div className="flex flex-col items-start gap-5">
            <p className="nff-reveal-fade nff-overline text-nff-text-brand" style={delay(0)}>
              A PRACTICE, NOT A PROMISE
            </p>
            <h2
              id="practice-heading"
              className="nff-heading-h1 text-balance text-foreground"
            >
              <span className="nff-reveal-line">
                <span style={delay(100)}>{section.heading}</span>
              </span>
            </h2>
          </div>
          <Paragraphs paragraphs={section.paragraphs} delayMs={220} className="max-w-[40rem]" />
        </div>
      </div>
    </section>
  )
}