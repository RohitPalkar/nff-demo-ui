import { useRevealOnce } from '@/lib/useRevealOnce'
import type { AboutSection } from '@/types'
import { FRAME, OUTER, delay } from './aboutLayout'

const PULL_QUOTE = ['Promises create pressure.', 'Practice creates room.'] as const

/**
 * Brand statement / pull quote — large centered typography.
 * Visual pause in the page.
 */
export function AboutBrandStatement({
  section,
}: {
  section: AboutSection
}) {
  const [ref, shown] = useRevealOnce<HTMLElement>(0.3)
  const text = section.paragraphs.join(' ')
  if (!PULL_QUOTE.every((line) => text.includes(line))) return null

  return (
    <aside
      ref={ref}
      aria-hidden="true"
      data-reveal={shown ? 'shown' : 'pending'}
      className={OUTER}
    >
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