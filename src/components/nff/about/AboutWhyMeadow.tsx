import { useRevealOnce } from '@/lib/useRevealOnce'
import { cn } from '@/lib/utils'
import type { AboutSection } from '@/types'
import { FRAME, OUTER, delay } from './aboutLayout'

const NAME_PARTS: ReadonlyArray<{ term: string; gloss: string }> = [
  { term: 'Meadow', gloss: 'open ground, left to grow at its own pace' },
]

/**
 * Why Meadow — refined two-column layout with brand illustration on the right.
 * Left: heading and copy. Right: Meadow wordmark with gloss and organic visual.
 */
export function AboutWhyMeadow({
  section,
  eyebrow,
}: {
  section: AboutSection
  eyebrow: string
}) {
  const [ref, shown] = useRevealOnce<HTMLElement>(0.1)
  const id = `about-${section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
  const text = section.paragraphs.join(' ')
  const showGloss = NAME_PARTS.every((part) => text.includes(part.gloss))

  return (
    <section
      ref={ref}
      aria-labelledby={id}
      data-reveal={shown ? 'shown' : 'pending'}
      className={OUTER}
    >
      <div className={`${FRAME} py-20 md:py-28 lg:py-32`}>
        <div
          className={cn(
            'grid gap-12 lg:gap-16 xl:gap-24',
            showGloss && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center',
          )}
        >
          {/* Left: text content */}
          <div className="flex flex-col items-start gap-5">
            <p className="nff-reveal-fade nff-overline text-nff-text-brand" style={delay(0)}>
              {eyebrow}
            </p>
            <h2
              id={id}
              className="nff-heading-h1 text-balance text-foreground"
            >
              <span className="nff-reveal-line">
                <span style={delay(100)}>{section.heading}</span>
              </span>
            </h2>
            <div className="mt-3 max-w-[38rem]">
              {section.paragraphs.map((paragraph, index) => (
                <p
                  key={paragraph}
                  className={cn(
                    'nff-reveal-fade text-pretty',
                    index === 0
                      ? 'nff-reading-lead text-foreground'
                      : 'nff-reading-body text-nff-text-secondary'
                  )}
                  style={delay(220 + index * 80)}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Right: brand illustration */}
          {showGloss && (
            <div
              aria-hidden="true"
              className="nff-reveal-fade relative isolate overflow-hidden rounded-[24px] bg-[var(--nff-bg-brand-subtle)] px-6 py-10 sm:px-10 sm:py-12 md:rounded-[28px] lg:px-12 lg:py-14"
              style={delay(160)}
            >
              {/* Subtle concentric circles background */}
              <svg
                viewBox="0 0 400 400"
                className="pointer-events-none absolute -top-32 -right-32 -z-10 size-[22rem] text-[var(--nff-sage-400)] opacity-25"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="200" cy="200" r="199" strokeWidth="1" />
                <circle cx="200" cy="200" r="130" strokeWidth="1" />
                <circle cx="200" cy="200" r="65" strokeWidth="1" />
              </svg>

              {/* Organic layered hill shapes */}
              <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
                <div
                  className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-[var(--nff-sage-200)] to-transparent opacity-40"
                />
                <div
                  className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-[var(--nff-sage-300)] to-transparent opacity-30"
                />
                <div
                  className="absolute bottom-0 left-0 right-0 h-[25%] bg-gradient-to-t from-[var(--nff-forest-200)] to-transparent opacity-20"
                />
              </div>

              {/* Delicate botanical illustrations */}
              <svg
                viewBox="0 0 400 500"
                className="pointer-events-none absolute inset-0 -z-10 opacity-15 text-[var(--nff-sage-500)]"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.75"
              >
                {/* Fern-like elements */}
                <g>
                  <path d="M80 380 Q70 340 80 300 Q90 260 80 220" strokeWidth="1.5" />
                  <path d="M75 360 Q65 330 75 300" strokeWidth="0.75" />
                  <path d="M85 360 Q95 330 85 300" strokeWidth="0.75" />
                  <path d="M75 340 Q65 310 75 280" strokeWidth="0.75" />
                  <path d="M85 340 Q95 310 85 280" strokeWidth="0.75" />
                </g>
                <g transform="translate(280, 120) scale(0.8) rotate(-15)">
                  <path d="M80 380 Q70 340 80 300 Q90 260 80 220" strokeWidth="1.5" />
                  <path d="M75 360 Q65 330 75 300" strokeWidth="0.75" />
                  <path d="M85 360 Q95 330 85 300" strokeWidth="0.75" />
                </g>
                <g transform="translate(60, 200) scale(0.6) rotate(10)">
                  <path d="M80 380 Q70 340 80 300 Q90 260 80 220" strokeWidth="1" />
                  <path d="M75 360 Q65 330 75 300" strokeWidth="0.5" />
                  <path d="M85 360 Q95 330 85 300" strokeWidth="0.5" />
                </g>
                {/* Small leaf elements */}
                <ellipse cx="120" cy="420" rx="8" ry="3" transform="rotate(-30 120 420)" />
                <ellipse cx="320" cy="380" rx="6" ry="2.5" transform="rotate(20 320 380)" />
                <ellipse cx="180" cy="450" rx="7" ry="3" transform="rotate(-15 180 450)" />
                <ellipse cx="350" cy="200" rx="5" ry="2" transform="rotate(45 350 200)" />
              </svg>

              {/* Meadow wordmark and gloss */}
              <div className="flex flex-col gap-8 relative z-10">
                {NAME_PARTS.map((part, index) => (
                  <div key={part.term} className="flex flex-col gap-2">
                    <span className="flex items-baseline gap-3">
                      <span className="nff-display text-[var(--nff-forest-900)] [overflow-wrap:anywhere]">
                        {part.term}
                      </span>
                      {index < NAME_PARTS.length - 1 && (
                        <span className="font-serif text-[2rem] leading-none text-[var(--nff-sage-400)]">
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