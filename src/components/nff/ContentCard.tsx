import {
  ArrowRight,
  BookOpen,
  Headphones,
  Lock,
  Play,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusChip } from '@/components/nff/StatusChip'
import { cn } from '@/lib/utils'
import { formatDuration, formatReadingTime } from '@/lib/format'
import type { ContentItem } from '@/types'

const TONE_BG: Record<ContentItem['artwork']['tone'], string> = {
  brand: 'bg-nff-bg-brand-subtle text-nff-text-brand',
  accent: 'bg-nff-bg-accent-subtle text-nff-text-accent',
  info: 'bg-nff-bg-info-subtle text-nff-text-info',
  warning: 'bg-nff-bg-warning-subtle text-nff-text-warning',
  success: 'bg-nff-bg-success-subtle text-nff-text-success',
  neutral: 'bg-nff-bg-muted text-nff-text-secondary',
}

interface ContentCardProps {
  item: ContentItem
  stageLabel: string
  locked?: boolean
  className?: string
}

export function ContentCard({
  item,
  stageLabel,
  locked = false,
  className,
}: ContentCardProps) {
  const isExploration = item.type === 'exploration'
  const href = isExploration
    ? `/explorations/${item.slug}`
    : `/meditations/${item.slug}`
  const Icon = isExploration ? BookOpen : Headphones
  const shortStage = stageLabel.split(' · ')[0] ?? stageLabel

  return (
    <article className={cn('h-full', className)}>
      <Link
        to={href}
        className="group flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-nff-1 transition-shadow duration-150 hover:shadow-nff-2 nff-focus-ring"
      >
        <div
          className={cn(
            'relative flex items-center justify-center border-b',
            isExploration ? 'aspect-[4/3]' : 'aspect-square',
            TONE_BG[item.artwork.tone],
          )}
        >
          <span
            aria-hidden="true"
            className="nff-display text-4xl font-semibold opacity-60"
          >
            {item.artwork.label}
          </span>
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {item.type === 'meditation' && item.preview && (
              <StatusChip tone="success" icon={Play}>
                Free preview
              </StatusChip>
            )}
            {locked && (
              <StatusChip tone="neutral" icon={Lock}>
                Locked
              </StatusChip>
            )}
          </div>
          {!isExploration && !locked && (
            <span
              aria-hidden="true"
              className="absolute bottom-3 right-3 flex size-10 items-center justify-center rounded-full bg-nff-bg-surface/90 text-nff-icon-brand shadow-nff-1"
            >
              <Play className="size-4" />
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-6">
          <div className="flex items-center gap-2 nff-label-sm text-muted-foreground">
            <Icon aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="sr-only">
              {isExploration ? 'Exploration' : 'Meditation'}, {stageLabel},{' '}
            </span>
            <span aria-hidden="true" className="whitespace-nowrap">
              {shortStage}
            </span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap">
              {isExploration
                ? formatReadingTime(item.readingTimeMin)
                : formatDuration(item.durationSec)}
            </span>
          </div>

          <h3 className="nff-title-card text-foreground">{item.title}</h3>
          <p className="nff-body-sm line-clamp-2 text-muted-foreground">
            {item.excerpt}
          </p>

          <span className="mt-auto inline-flex items-center gap-1.5 nff-label-md text-nff-text-link-default">
            {locked
              ? 'Sign up to unlock'
              : isExploration
                ? 'Read exploration'
                : 'Listen'}
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-150 group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </Link>
    </article>
  )
}
