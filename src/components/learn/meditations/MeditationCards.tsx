import { CheckCircle2, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Thumb } from '@/components/learn/home/homeParts'
import { HOME_CARD, PRIMARY_ACTION } from '@/components/learn/home/homeStyles'
import { cn } from '@/lib/utils'
import { formatClock } from '@/lib/format'
import type { MeditationEntry } from '@/services/learning/meditations'

/** Dedicated meditation cards: artwork first, one honest line about its state. */

function stateLine(entry: MeditationEntry) {
  switch (entry.state) {
    case 'in-progress':
      return `Resume from ${formatClock(entry.savedSec ?? 0)}`
    case 'completed':
      return 'Completed'
    case 'processing':
      return 'Audio is still being prepared'
    case 'unavailable':
      return 'Audio is unavailable'
    default:
      return null
  }
}

export function MeditationCard({ entry }: { entry: MeditationEntry }) {
  const { item } = entry
  const playable = entry.state !== 'processing' && entry.state !== 'unavailable'
  const line = stateLine(entry)
  const body = (
    <>
      <div className="relative">
        <Thumb item={item} className={cn('aspect-[4/3] w-full', !playable && 'opacity-60 grayscale')} />
        {playable && (
          <span
            aria-hidden="true"
            className="absolute bottom-3 right-3 flex size-10 items-center justify-center rounded-full bg-[var(--nff-forest-900)] text-[var(--nff-ivory-50)] shadow-nff-1 transition-transform group-hover:scale-105"
          >
            <Play className="size-4 translate-x-px" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <p className="nff-caption text-nff-text-secondary">{entry.categoryLabel}</p>
        <h3 className="line-clamp-2 nff-heading-h4 text-foreground group-hover:underline group-hover:underline-offset-4">
          {item.title}
        </h3>
        <p className="line-clamp-2 nff-body-sm text-nff-text-secondary">{item.excerpt}</p>
        <p className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 nff-caption text-nff-text-secondary">
          <span>{entry.durationMin} min</span>
          {line && (
            <span className={cn('inline-flex items-center gap-1', entry.state === 'completed' && 'text-nff-text-success')}>
              {entry.state === 'completed' && <CheckCircle2 aria-hidden="true" className="size-3.5" />}
              {line}
            </span>
          )}
        </p>
      </div>
    </>
  )
  const base = cn(HOME_CARD, 'group flex h-full flex-col overflow-hidden')
  return playable ? (
    <Link to={entry.href} className={cn(base, 'transition-colors hover:border-[var(--nff-forest-800)] nff-focus-ring')}>
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  )
}

export function MeditationGrid({ entries }: { entries: MeditationEntry[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 2xl:grid-cols-4">
      {entries.map((entry) => (
        <li key={entry.item.id}>
          <MeditationCard entry={entry} />
        </li>
      ))}
    </ul>
  )
}

/** A meditation the learner has started: artwork, saved place, one action. */
export function MeditationContinueCard({ entry }: { entry: MeditationEntry }) {
  const { item } = entry
  const percent = Math.round(((entry.savedSec ?? 0) / entry.durationSec) * 100)
  return (
    <article className={cn(HOME_CARD, 'flex overflow-hidden')}>
      <Thumb item={item} className="w-24 shrink-0 sm:w-36" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <p className="nff-caption text-nff-text-secondary">{entry.categoryLabel}</p>
        <h3 className="truncate nff-heading-h4 text-foreground">{item.title}</h3>
        <div
          role="progressbar"
          aria-label={`${item.title}: saved place`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`Saved at ${formatClock(entry.savedSec ?? 0)} of ${entry.durationMin} min`}
          className="h-1.5 bg-[var(--nff-sage-100)]"
        >
          <div className="h-full bg-[var(--nff-sage-600)]" style={{ width: `${percent}%` }} />
        </div>
        <p className="nff-caption text-nff-text-secondary">
          Saved at {formatClock(entry.savedSec ?? 0)} of {entry.durationMin} min
        </p>
        <Link to={entry.href} aria-label={`Resume ${item.title}`} className={`${PRIMARY_ACTION} mt-1 h-10 w-fit px-4`}>
          <Play aria-hidden="true" className="size-4" />
          Resume
        </Link>
      </div>
    </article>
  )
}
