import { ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import { ResourceVideo } from '@/components/nff/ResourceVideo'
import { LANDING_VIDEO, type LandingVideo } from '@/config/landingVideo'
import { SOW_SCOPE } from '@/config/sowScope'
import { useRevealOnce } from '@/lib/useRevealOnce'

const delay = (ms: number) => ({ '--nff-delay': `${ms}ms` }) as CSSProperties

/** Section anchor. The mini-player's "back to the video" returns here. */
export const HOME_VIDEO_ID = 'watch'

interface HomeVideoProps {
  /** Defaults to the configured landing video (src/config/landingVideo.ts). */
  entry?: LandingVideo | null
}

/**
 * Home "Watch" section (#watch). Shows the configured video in the site's
 * inset panel. While no real video has been supplied it shows a calm
 * unavailable state in the same frame, so the layout never shifts when the
 * asset arrives. Copy comes from the config entry; nothing is invented here.
 *
 * Playing it pauses audio, leaving the page while it plays hands it to the
 * mini-player, and signed-in viewers resume where they stopped.
 */
export function HomeVideo({
  // Video is out of scope in SOW v1.3 (see config/sowScope.ts).
  entry = SOW_SCOPE.video ? LANDING_VIDEO : null,
}: HomeVideoProps) {
  if (!entry) return null
  return <HomeVideoSection entry={entry} />
}

function HomeVideoSection({ entry }: { entry: LandingVideo }) {
  const [ref, shown] = useRevealOnce<HTMLElement>(0.15)

  return (
    <section
      ref={ref}
      id={HOME_VIDEO_ID}
      aria-labelledby="watch-heading"
      data-reveal={shown ? 'shown' : 'pending'}
      className="scroll-mt-24 px-2 sm:px-3"
    >
      <div className="rounded-[28px] bg-nff-bg-surface-sunken md:rounded-[36px]">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-6 py-16 sm:px-10 md:py-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] lg:items-center lg:gap-14 lg:px-14 lg:py-28">
          <div className="flex flex-col items-start gap-4">
            <p
              className="nff-reveal-fade flex items-center gap-3 nff-overline text-nff-text-brand"
              style={delay(0)}
            >
              <span aria-hidden="true" className="h-px w-8 bg-current" />
              Watch
            </p>
            <h2
              id="watch-heading"
              className="nff-reveal-fade nff-heading-h1 text-balance text-foreground"
              style={delay(100)}
            >
              {entry.title}
            </h2>
            <p
              className="nff-reveal-fade max-w-[28rem] nff-body-lg text-pretty text-nff-text-secondary"
              style={delay(200)}
            >
              {entry.description}
            </p>
          </div>

          <div className="nff-reveal-fade min-w-0" style={delay(300)}>
            <ResourceVideo
              resourceId={entry.resourceId}
              title={entry.title}
              video={entry.video}
              returnTo={`/#${HOME_VIDEO_ID}`}
              scrollToId={HOME_VIDEO_ID}
              unavailableAction={
                <a
                  href="#how-it-works"
                  className="group mt-1 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--nff-ivory-50)] px-6 nff-label-lg text-[var(--nff-forest-900)] transition-colors duration-[var(--nff-duration-fast)] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  See how it works
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-[var(--nff-duration-fast)] group-hover:translate-x-0.5"
                  />
                </a>
              }
              className="shadow-[0_24px_60px_-28px_rgb(15_40_30/0.55)]"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
