import { SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HOME_CARD, SECONDARY_ACTION, itemMeta } from '@/components/learn/home/homeStyles'
import { Thumb } from '@/components/learn/home/homeParts'
import { ResourceCard } from '@/components/learn/home/ResourceCard'
import { cn } from '@/lib/utils'
import type { LibraryResource } from '@/services/learning/library'

/** The Library's cards: the grid, the featured strip and the empty state. */

const PROCESSING_NOTE = 'Audio is still being prepared'

export function ResourceGrid({ resources }: { resources: LibraryResource[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 2xl:grid-cols-4">
      {resources.map((resource) => (
        <li key={resource.item.id}>
          <ResourceCard
            resource={resource}
            note={resource.availability === 'processing' ? PROCESSING_NOTE : undefined}
          />
        </li>
      ))}
    </ul>
  )
}

/** A featured item: wide on large screens, image beside the text. */
export function FeaturedResource({ resource, lead = false }: { resource: LibraryResource; lead?: boolean }) {
  const { item } = resource
  return (
    <Link
      to={resource.href}
      className={cn(
        HOME_CARD,
        'group flex h-full overflow-hidden transition-colors hover:border-[var(--nff-forest-800)] nff-focus-ring',
        lead ? 'flex-col md:flex-row' : 'flex-row',
      )}
    >
      <Thumb
        item={item}
        className={cn(lead ? 'aspect-[16/9] w-full md:aspect-auto md:w-1/2' : 'w-28 shrink-0 sm:w-36')}
      />
      <div className={cn('flex min-w-0 flex-1 flex-col gap-2', lead ? 'p-5 md:p-6' : 'p-4')}>
        <p className="nff-caption text-nff-text-secondary">{resource.categoryLabel}</p>
        <h3
          className={cn(
            'text-foreground group-hover:underline group-hover:underline-offset-4',
            lead ? 'nff-heading-h3' : 'line-clamp-2 nff-heading-h4',
          )}
        >
          {item.title}
        </h3>
        <p className={cn('nff-body-sm text-nff-text-secondary', lead ? 'line-clamp-3' : 'line-clamp-2 max-sm:hidden')}>
          {item.excerpt}
        </p>
        <p className="mt-auto pt-1 nff-caption text-nff-text-secondary">{itemMeta(item)}</p>
      </div>
    </Link>
  )
}

export function LibraryEmptyState({
  title,
  description,
  onClear,
  clearLabel = 'Clear search and filters',
}: {
  title: string
  description: string
  onClear?: () => void
  clearLabel?: string
}) {
  return (
    <div className={cn(HOME_CARD, 'flex flex-col items-center gap-4 px-6 py-12 text-center')}>
      <SearchX aria-hidden="true" className="size-8 text-nff-text-secondary" />
      <div className="flex max-w-md flex-col gap-1">
        <p className="nff-heading-h4 text-foreground">{title}</p>
        <p className="nff-body-sm text-nff-text-secondary">{description}</p>
      </div>
      {onClear && (
        <button type="button" onClick={onClear} className={SECONDARY_ACTION}>
          {clearLabel}
        </button>
      )}
    </div>
  )
}
