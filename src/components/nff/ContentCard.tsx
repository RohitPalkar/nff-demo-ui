import { LibraryContentCard } from '@/components/nff/LibraryContentCard'
import { getStageNumber } from '@/services/content'
import { getContentVideo } from '@/services/learning/video'
import type { ContentItem } from '@/types'

interface ContentCardProps {
  item: ContentItem
  stageLabel: string
  locked?: boolean
  lockedLabel?: string
  unavailable?: boolean
  className?: string
}

/**
 * Catalogue and related-content card: a content item rendered through the
 * shared LibraryContentCard, with its lock and availability states.
 */
export function ContentCard({
  item,
  stageLabel,
  locked = false,
  lockedLabel = 'Sign up to unlock',
  unavailable = false,
  className,
}: ContentCardProps) {
  const isExploration = item.type === 'exploration'
  return (
    <LibraryContentCard
      className={className}
      kind={item.type}
      title={item.title}
      description={item.excerpt}
      href={isExploration ? `/explorations/${item.slug}` : `/meditations/${item.slug}`}
      image={item.image}
      fallbackLabel={item.artwork.label}
      stage={getStageNumber(item.stageId)}
      stageLabel={stageLabel}
      readingTimeMin={isExploration ? item.readingTimeMin : undefined}
      durationSec={isExploration ? undefined : item.durationSec}
      freePreview={!isExploration && item.preview && !unavailable}
      locked={locked}
      unavailable={unavailable}
      video={getContentVideo(item.id)}
      ctaLabel={locked ? lockedLabel : undefined}
    />
  )
}
