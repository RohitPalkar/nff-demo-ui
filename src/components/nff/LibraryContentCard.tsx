import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Headphones,
  Lock,
  Pause,
  Play,
  type LucideIcon,
} from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { formatDuration, formatReadingTime } from '@/lib/format'
import type { ContentImage } from '@/types'

export interface LibraryCardPlayback {
  state: 'idle' | 'playing' | 'paused'
  /** 0-1 through the playable length. */
  progress: number
  /** True when the listener hears a time-limited preview. */
  preview: boolean
  onToggle: () => void
}

export interface LibraryContentCardProps {
  kind: 'exploration' | 'meditation'
  title: string
  description: string
  href: string
  image?: ContentImage
  /** Shown when there is no photograph (e.g. two letters of the title). */
  fallbackLabel?: string
  /** Category label, e.g. "Foundations". */
  category?: string
  stage?: number
  /** Full stage name, e.g. "Stage 1 · Arriving"; read by screen readers. */
  stageLabel?: string
  readingTimeMin?: number
  durationSec?: number
  freePreview?: boolean
  locked?: boolean
  unavailable?: boolean
  /** Present only when this viewer may play the track from the card. */
  playback?: LibraryCardPlayback
  /** Action label in the bar; defaults to "Read exploration" or "Listen". */
  ctaLabel?: string
  className?: string
  style?: CSSProperties
}

function Chip({ icon: Icon, children }: { icon?: LucideIcon; children: string }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[rgb(247_245_239/0.92)] px-3 py-1 nff-label-sm whitespace-nowrap text-foreground shadow-[0_1px_2px_rgb(31_42_32/0.12)] backdrop-blur-sm">
      {Icon && <Icon aria-hidden="true" className="size-3.5 shrink-0 text-nff-icon-brand" />}
      {children}
    </span>
  )
}

/**
 * The one content card, used across the public site. A full-bleed photograph
 * with two quiet chips (what it is, how long it takes) and a frosted panel at
 * the foot holding the title, a short description and a forest action bar.
 * The whole card is one link; a play control, when present, replaces the
 * arrow square and sits above that link as its own button.
 */
export function LibraryContentCard({
  kind,
  title,
  description,
  href,
  image,
  fallbackLabel,
  category,
  stage,
  stageLabel,
  readingTimeMin,
  durationSec,
  freePreview = false,
  locked = false,
  unavailable = false,
  playback,
  ctaLabel,
  className,
  style,
}: LibraryContentCardProps) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const isReading = kind === 'exploration'
  const typeLabel = isReading ? 'Exploration' : 'Meditation'
  const TypeIcon = isReading ? BookOpen : Headphones
  const length =
    isReading && readingTimeMin !== undefined
      ? formatReadingTime(readingTimeMin)
      : !isReading && durationSec !== undefined
        ? formatDuration(durationSec)
        : undefined
  const shortStage = stage !== undefined ? `Stage ${stage}` : stageLabel?.split(' · ')[0]
  const playing = playback?.state === 'playing'
  const action =
    ctaLabel ??
    (locked
      ? 'Sign up to unlock'
      : unavailable
        ? 'View track'
        : isReading
          ? 'Read exploration'
          : 'Listen')

  // One status chip on the left: the most important thing to know first.
  const status: { icon: LucideIcon; label: string } = unavailable
    ? { icon: AlertTriangle, label: 'Unavailable' }
    : locked
      ? { icon: Lock, label: 'Locked' }
      : freePreview
        ? { icon: Play, label: 'Free preview' }
        : { icon: TypeIcon, label: typeLabel }
  const showImage = image && !failed

  return (
    <article
      style={style}
      className={cn(
        'group relative isolate flex aspect-[4/5] w-full min-w-0 flex-col justify-between overflow-hidden rounded-[28px] bg-nff-bg-tonal shadow-nff-1 ring-1 ring-nff-border-default transition-[box-shadow,transform] duration-[var(--nff-duration-base)] hover:-translate-y-0.5 hover:shadow-nff-3 motion-reduce:hover:translate-y-0 has-[a:focus-visible]:shadow-[var(--nff-focus-ring)]',
        className,
      )}
    >
      {/* Photograph: fills the card behind everything. */}
      {showImage ? (
        <img
          src={image.src}
          alt={image.alt}
          width={800}
          height={600}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          ref={(node) => {
            if (node?.complete && node.naturalWidth > 0) setLoaded(true)
          }}
          className={cn(
            'nff-card-image absolute inset-0 -z-10 size-full object-cover',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10 flex h-3/5 items-center justify-center font-serif text-[4rem] text-[var(--nff-forest-700)] opacity-40"
        >
          {fallbackLabel ?? title.slice(0, 2).toUpperCase()}
        </span>
      )}

      {/* Chips: status or type on the left, length on the right. */}
      <div className="flex items-start justify-between gap-2 p-3">
        <span className="flex min-w-0 flex-wrap gap-1.5">
          <Chip icon={status.icon}>{status.label}</Chip>
          {status.label !== typeLabel && <span className="sr-only">{typeLabel}</span>}
        </span>
        {length && <Chip>{length}</Chip>}
      </div>

      {/* Frosted panel: title, description and the action bar. */}
      <div className="m-2 flex flex-col rounded-[22px] bg-[rgb(247_245_239/0.9)] p-4 shadow-[0_8px_24px_-12px_rgb(31_42_32/0.35)] ring-1 ring-[rgb(255_255_255/0.6)] backdrop-blur-md sm:p-5">
        <h3 className="line-clamp-2 min-h-[calc(2*var(--nff-type-heading-h4-line-height))] nff-heading-h4 text-pretty [overflow-wrap:break-word] text-foreground">
          {/* Stretched link: the whole card is the target. */}
          <Link
            to={href}
            className="outline-none focus-visible:shadow-none after:absolute after:inset-0 after:z-0 after:rounded-[28px] after:content-['']"
          >
            {title}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 min-h-[calc(2*var(--nff-type-body-sm-line-height))] nff-body-sm text-nff-text-secondary">{description}</p>

        <div className="mt-4 flex items-stretch gap-1.5">
          <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col justify-center overflow-hidden rounded-[16px] bg-[var(--nff-forest-900)] px-3.5 py-2.5">
            <span className="truncate nff-label-md text-[var(--nff-ivory-50)]">{action}</span>
            {(shortStage || category) && (
              <span className="truncate nff-caption text-[var(--nff-sage-200)]">
                {shortStage && <span aria-hidden="true">{shortStage}</span>}
                {stageLabel && <span className="sr-only">{stageLabel}</span>}
                {shortStage && category && <span aria-hidden="true"> · </span>}
                {category}
              </span>
            )}
            {playback && playback.state !== 'idle' && (
              <div
                role="progressbar"
                aria-label={`${playback.preview ? 'Preview' : 'Playback'} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(playback.progress * 100)}
                className="absolute inset-x-0 bottom-0 h-0.5 bg-[rgb(247_245_239/0.2)]"
              >
                <div
                  className="h-full bg-[var(--nff-sage-200)] transition-[width] duration-200 ease-linear"
                  style={{ width: `${playback.progress * 100}%` }}
                />
              </div>
            )}
          </div>

          {playback ? (
            <button
              type="button"
              onClick={playback.onToggle}
              aria-pressed={playing}
              aria-label={
                playing
                  ? `Pause ${title}`
                  : playback.preview
                    ? `Play free preview of ${title}`
                    : `Play ${title}`
              }
              className="relative z-10 flex w-12 shrink-0 items-center justify-center rounded-[16px] sm:w-14 bg-[var(--nff-forest-900)] text-[var(--nff-ivory-50)] transition-colors duration-[var(--nff-duration-fast)] hover:bg-[var(--nff-forest-700)] nff-focus-ring"
            >
              {playing ? (
                <Pause aria-hidden="true" className="size-4 fill-current" />
              ) : (
                <Play aria-hidden="true" className="ml-0.5 size-4 fill-current" />
              )}
            </button>
          ) : (
            <span
              aria-hidden="true"
              className="flex w-12 shrink-0 items-center justify-center rounded-[16px] sm:w-14 bg-[var(--nff-forest-900)] text-[var(--nff-ivory-50)] transition-colors duration-[var(--nff-duration-fast)] group-hover:bg-[var(--nff-forest-700)]"
            >
              <ArrowUpRight className="size-4 transition-transform duration-[var(--nff-duration-fast)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
