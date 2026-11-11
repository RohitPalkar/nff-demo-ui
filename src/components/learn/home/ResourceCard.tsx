import { Video } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { CATEGORY_COPY } from '@/services/content'
import type { ExploreResource } from '@/services/learning/home'
import { Thumb } from './homeParts'
import { HOME_CARD, hasPlayableVideo, itemMeta } from './homeStyles'

/**
 * A library item inside the Practitioner app. Opens `/learn/library/...`.
 * `note` adds one honest line under the meta, such as audio still processing.
 */
export function ResourceCard({ resource, note }: { resource: ExploreResource; note?: string }) {
  const { item, href } = resource
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
        {hasPlayableVideo(item.id) && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-sm bg-[var(--nff-forest-900)]/90 px-2 py-1 nff-label-sm text-[var(--nff-ivory-50)]">
            <Video aria-hidden="true" className="size-3.5" />
            Video
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <p className="nff-caption text-nff-text-secondary">
          {CATEGORY_COPY[item.category].label}
        </p>
        <h3 className="line-clamp-2 nff-heading-h4 text-foreground group-hover:underline group-hover:underline-offset-4">
          {item.title}
        </h3>
        <p className="line-clamp-2 nff-body-sm text-nff-text-secondary">{item.excerpt}</p>
        <p className="mt-auto pt-2 nff-caption text-nff-text-secondary">{itemMeta(item)}</p>
        {note && <p className="nff-caption text-nff-text-warning">{note}</p>}
      </div>
    </Link>
  )
}
