import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { CATEGORY_COPY } from '@/services/content'
import type { ExploreResource } from '@/services/learning/home'
import { Thumb } from './homeParts'
import { HOME_CARD, itemMeta } from './homeStyles'

/**
 * A library item inside the Practitioner app. Opens `/learn/library/...`.
 * `note` adds one honest line under the meta, such as audio still processing.
 */
export function ResourceCard({ resource, note }: { resource: ExploreResource; note?: string }) {
  const { item, href } = resource
  const isAudio = item.type === 'meditation'
  const duration = isAudio ? `${Math.round(item.durationSec / 60)} min` : `${item.readingTimeMin} min read`
  return (
    <Link
      to={href}
      className={cn(
        HOME_CARD,
        'group flex h-full flex-col overflow-hidden transition-colors hover:border-[var(--nff-forest-800)] nff-focus-ring',
      )}
    >
      <div className="relative">
        <Thumb item={item} className="aspect-[16/9] w-full" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="nff-caption text-nff-text-secondary">
            {CATEGORY_COPY[item.category].label}
          </p>
          <span className="rounded-sm bg-[var(--nff-sage-100)] px-2 py-0.5 nff-label-sm text-[var(--nff-sage-800)]">
            {isAudio ? 'Audio' : 'Article'}
          </span>
        </div>
        <h3 className="line-clamp-2 nff-heading-h4 text-foreground group-hover:underline group-hover:underline-offset-4">
          {item.title}
        </h3>
        <p className="line-clamp-2 nff-body-sm text-nff-text-secondary">{item.excerpt}</p>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
          <p className="nff-caption text-nff-text-secondary">{itemMeta(item)}</p>
          <span className="nff-caption text-nff-text-secondary flex items-center gap-1">
            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {duration}
          </span>
        </div>
        {note && <p className="nff-caption text-nff-text-warning">{note}</p>}
      </div>
    </Link>
  )
}
