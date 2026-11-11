import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'

/** Stagger delay for each revealed element (ms). */
const delay = (ms: number) => ({ '--nff-delay': `${ms}ms` }) as CSSProperties

/**
 * Reveals once, the first time the section is a quarter of the way into view.
 * Starts revealed when IntersectionObserver is unavailable or the visitor
 * prefers reduced motion, so the content can never stay hidden.
 */
function useRevealOnce<T extends Element>() {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(
    () =>
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const node = ref.current
    if (shown || !node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [shown])

  return [ref, shown] as const
}

/**
 * Home mission introduction (S-WEB-01 §3: short paragraph + link to About).
 * Copy is the approved home mission text, arranged as an editorial statement.
 * Shares the hero card's inset so its text lines up with the hero above.
 */
export function HomeIntro() {
  const [ref, shown] = useRevealOnce<HTMLElement>()

  return (
    <section
      ref={ref}
      aria-labelledby="mission-heading"
      data-reveal={shown ? 'shown' : 'pending'}
      className="px-2 sm:px-3"
    >
      <div className="mx-auto max-w-[1440px] px-6 py-16 sm:px-10 md:py-28 lg:px-14 lg:py-36">
        <div className="grid gap-6 md:gap-8 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-16">
          <p
            className="nff-reveal-fade inline-flex w-fit items-center gap-2 self-start rounded-full border border-nff-border-default bg-nff-bg-surface px-3.5 py-1.5 nff-overline text-nff-text-secondary lg:col-span-3 lg:mt-3"
            style={delay(0)}
          >
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--nff-sage-500)]" />
            Our philosophy
          </p>

          <h2
            id="mission-heading"
            className="nff-display text-[2.125rem] leading-[2.5rem] text-balance text-foreground md:text-[length:var(--nff-type-display-size)] md:leading-[var(--nff-type-display-line-height)] lg:col-span-9"
          >
            <span className="nff-reveal-line">
              <span style={delay(120)}>Not another productivity habit.</span>
            </span>{' '}
            <span className="nff-reveal-line">
              <span className="text-nff-text-tertiary" style={delay(240)}>
                A curriculum, not a feed —
              </span>
            </span>{' '}
            <span className="nff-reveal-line">
              <span style={delay(360)}>
                <em className="font-normal not-italic text-nff-text-brand">
                  a steadier way of meeting each day.
                </em>
              </span>
            </span>
          </h2>

          <div className="flex flex-col gap-6 border-t border-nff-border-default pt-6 md:flex-row md:pt-8 md:items-end md:justify-between md:gap-12 lg:col-span-9 lg:col-start-4">
            <p
              className="nff-reveal-fade max-w-[30rem] nff-body-lg text-pretty text-nff-text-secondary"
              style={delay(520)}
            >
              Each stage builds on the last, mixing something to read with
              something to practise. There is no streak to protect and nothing
              to win.
            </p>
            <Link
              to="/about/who-we-are"
              className="nff-reveal-fade group inline-flex h-12 w-fit shrink-0 items-center gap-2 rounded-full border border-nff-border-strong bg-nff-bg-surface px-6 nff-label-lg text-foreground transition-colors duration-[var(--nff-duration-fast)] hover:bg-nff-bg-tonal nff-focus-ring"
              style={delay(640)}
            >
              More about us
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-[var(--nff-duration-fast)] group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
