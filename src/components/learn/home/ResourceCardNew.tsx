'use client'

import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { CATEGORY_COPY } from '@/services/content'
import type { ExploreResource } from '@/services/learning/home'
import { Thumb } from './homeParts'
import { HOME_CARD, itemMeta } from './homeStyles'

/**
 * Compact library resource card for the Explore section.
 * Balanced card grid with consistent image ratios.
 * Shows category, type, title, duration.
 */
export function ResourceCardNew({ resource }: { resource: ExploreResource }) {
  const { item, href } = resource
  const isAudio = item.type === 'meditation'
  const duration = isAudio ? `${Math.round(item.durationSec / 60)} min` : `${item.readingTimeMin} min read`

  return (
    <Link
      to={href}
      className={cn(
        HOME_CARD,
        'group flex h-full flex-col overflow-hidden transition-all duration-300',
        'hover:border-[var(--nff-forest-300)] hover:shadow-soft hover:-translate-y-0.5 nff-focus-ring'
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Thumb item={item} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-medium text-[var(--nff-forest-800)]">
            {CATEGORY_COPY[item.category].label}
          </span>
        </div>
        {/* Type & duration badge */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-medium text-[var(--nff-forest-800)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3" aria-hidden="true">
            {item.type === 'meditation' ? (
              <>
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </>
            ) : (
              <>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </>
            )}
          </svg>
          <span>{duration}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <h3 className="line-clamp-2 nff-heading-h5 text-foreground group-hover:text-[var(--nff-forest-900)] transition-colors">
          {item.title}
        </h3>
        <p className="line-clamp-2 nff-body-sm text-[var(--nff-text-secondary)]">{item.excerpt}</p>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
          <p className="nff-caption text-[var(--nff-text-secondary)]">{itemMeta(item)}</p>
          <span className="nff-caption text-[var(--nff-text-secondary)] flex items-center gap-1">
            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {item.type === 'meditation' ? `${Math.round(item.durationSec / 60)} min` : `${item.readingTimeMin} min read`}
          </span>
        </div>
      </div>
    </Link>
  )
}