import { ArrowRight } from 'lucide-react'
import type { CSSProperties, FocusEvent } from 'react'
import { Link } from 'react-router-dom'
import { FEATURED_IMAGES } from '@/config/featuredImages'
import { FeaturedContentCard } from '@/components/nff/FeaturedContentCard'
import { useRevealOnce } from '@/lib/useRevealOnce'
import { getStageNumber } from '@/services/content'
import type { ContentItem, Exploration } from '@/types'

const delay = (ms: number) => ({ '--nff-delay': `${ms}ms` }) as CSSProperties

/** One row on desktop. */
const MAX_ITEMS = 3

/**
 * In the phone carousel, bring a keyboard-focused card fully into view. The
 * browser leaves a half-visible card where it is, which hides its focus ring.
 */
function revealFocusedCard(event: FocusEvent<HTMLUListElement>) {
  const list = event.currentTarget
  const card = (event.target as HTMLElement).closest('li')
  if (!card || list.scrollWidth <= list.clientWidth) return
  const padding = parseFloat(getComputedStyle(list).paddingLeft) || 0
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // Wait a frame so the browser's own focus scroll does not cancel this one.
  requestAnimationFrame(() => {
    list.scrollTo({ left: card.offsetLeft - padding, behavior: reduce ? 'auto' : 'smooth' })
  })
}

interface HomeFeaturedProps {
  /** Items carrying the CMS "Featured on home" flag, as the home API returns them. */
  items: ContentItem[]
}

/**
 * Home "Featured this week" (S-WEB-01, "#featured"): up to three explorations
 * flagged "Featured on home" in the CMS, in the order the API returns them.
 * Renders nothing when none are flagged.
 */
export function HomeFeatured({ items }: HomeFeaturedProps) {
  const [ref, shown] = useRevealOnce<HTMLElement>(0.15)
  const featured = items
    .filter((item): item is Exploration => item.type === 'exploration')
    .slice(0, MAX_ITEMS)

  if (featured.length === 0) return null

  return (
    <section
      ref={ref}
      id="featured"
      aria-labelledby="featured-heading"
      data-reveal={shown ? 'shown' : 'pending'}
      className="px-2 sm:px-3"
    >
      <div className="mx-auto max-w-[1440px] px-6 py-16 sm:px-10 md:py-24 lg:px-14 lg:py-28">
        {/* Introduction */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
          <div className="flex max-w-[40rem] flex-col items-start gap-4">
            <p
              className="nff-reveal-fade flex items-center gap-3 nff-overline text-nff-text-brand"
              style={delay(0)}
            >
              <span aria-hidden="true" className="h-px w-8 bg-current" />
              Chosen for you
            </p>
            <h2
              id="featured-heading"
              className="nff-reveal-fade nff-heading-h1 text-balance text-foreground"
              style={delay(100)}
            >
              Featured this week
            </h2>
            <p
              className="nff-reveal-fade nff-body-lg text-pretty text-nff-text-secondary"
              style={delay(200)}
            >
              A few pieces worth returning to.
            </p>
          </div>
          <Link
            to="/explorations"
            className="nff-reveal-fade group inline-flex h-12 w-fit shrink-0 items-center gap-2 rounded-full border border-nff-border-strong bg-nff-bg-surface px-6 nff-label-lg text-foreground transition-colors duration-[var(--nff-duration-fast)] hover:bg-nff-bg-tonal nff-focus-ring"
            style={delay(300)}
          >
            See all explorations
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-[var(--nff-duration-fast)] group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        {/* Cards: a snap row below 1024, three columns from there. */}
        <ul
          aria-label="Featured explorations"
          onFocus={revealFocusedCard}
          className="relative -mx-6 mt-10 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 py-1.5 [scrollbar-width:none] sm:-mx-10 sm:scroll-px-10 sm:px-10 md:mt-16 lg:mx-0 lg:grid lg:snap-none lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 lg:py-0 [&::-webkit-scrollbar]:hidden"
        >
          {featured.map((item, index) => (
            <li
              key={item.id}
              className="flex w-[86%] max-w-[22rem] shrink-0 snap-start sm:w-[46%] sm:max-w-none lg:w-auto"
            >
              <FeaturedContentCard
                className="nff-reveal-fade w-full"
                style={delay(380 + index * 90)}
                title={item.title}
                description={item.excerpt}
                href={`/explorations/${item.slug}`}
                image={FEATURED_IMAGES[item.id] ?? item.image}
                stage={getStageNumber(item.stageId)}
                readingTimeMin={item.readingTimeMin}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
