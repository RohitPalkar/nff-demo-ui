import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useRevealOnce } from '@/lib/useRevealOnce'
import { ABOUT_IMAGES } from '@/config/aboutImages'
import { cn } from '@/lib/utils'
import { AboutPhoto } from './AboutParts'
import { FRAME, OUTER, delay } from './aboutLayout'

/**
 * Final Call to Action — visually memorable closing section.
 * Large editorial heading, supporting copy, nature photograph, prominent CTA.
 */
export function AboutCta() {
  const [ref, shown] = useRevealOnce<HTMLElement>(0.1)

  return (
    <section
      ref={ref}
      data-reveal={shown ? 'shown' : 'pending'}
      className={OUTER}
    >
      <div className={`${FRAME} py-20 md:py-28 lg:py-32`}>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16 xl:gap-24">
          <div className="flex flex-col items-start gap-6">
            <p className="nff-reveal-fade nff-overline text-nff-text-brand" style={delay(0)}>
              EXPLORE MEADOW
            </p>
            <h2 className="nff-display text-balance text-foreground">
              <span className="nff-reveal-line">
                <span style={delay(100)}>The whole library, at your own pace</span>
              </span>
            </h2>
            <div className="max-w-[38rem]">
              {[
                'Everything on this site is designed to be used. Read an exploration on a difficult afternoon. Listen to a five-minute track before a meeting. Return to the same idea a week later and notice what has changed.',
                'Browse the library, listen to free previews, and start the journey whenever you are ready. No card required. No pressure.',
              ].map((paragraph, index) => (
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
            <Link
              to="/library"
              className="nff-reveal-fade group inline-flex min-h-12 w-fit items-center gap-1.5 rounded-full px-5 py-2 bg-[var(--nff-forest-800)] nff-label-md text-[var(--nff-ivory-50)] transition-[background-color,color] hover:bg-[var(--nff-forest-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nff-forest-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-nff-bg-surface"
              style={delay(300)}
            >
              Begin exploring
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-[var(--nff-duration-fast)] group-hover:translate-x-1"
              />
            </Link>
          </div>

          {/* CTA background image */}
          <figure className="nff-reveal-fade relative" style={delay(160)}>
            <AboutPhoto
              image={ABOUT_IMAGES.path}
              className="aspect-[4/5] sm:aspect-[16/10] md:rounded-[36px] lg:aspect-[12/5]"
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(to_top,rgb(26_34_26/0.82),rgb(26_34_26/0.35)_45%,transparent_75%)]"
              />
            </AboutPhoto>
            <figcaption className="absolute inset-x-0 bottom-0 px-6 pb-8 sm:px-10 sm:pb-12 lg:px-14 lg:pb-16">
              <span className="mx-auto block max-w-[calc(1440px-7rem)]">
                <span className="block max-w-[44rem] nff-heading-h1 text-balance text-[var(--nff-ivory-50)]">
                  <span className="nff-reveal-line">
                    <span style={delay(200)}>A path rather than a ladder</span>
                  </span>
                </span>
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}