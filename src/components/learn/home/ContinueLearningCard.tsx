import { Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { ContinueLearning } from '@/services/learning/home'
import { LearnProgress, Thumb } from './homeParts'
import { HOME_CARD, PRIMARY_ACTION, itemMeta } from './homeStyles'

/**
 * The one item in progress. Resume opens the lesson; if that audio is already
 * in the mini-player, the player keeps its place (PlayerProvider ignores a
 * load of the track it already has).
 */
export function ContinueLearningCard({
  entry,
  nowPlaying = false,
}: {
  entry: ContinueLearning
  nowPlaying?: boolean
}) {
  const { item, path, moduleLabel, progress, href } = entry
  return (
    <article className={cn(HOME_CARD, 'flex flex-col overflow-hidden sm:flex-row')}>
      <Thumb
        item={item}
        className="aspect-[16/9] w-full shrink-0 sm:aspect-auto sm:w-56 md:w-64 lg:w-44 xl:w-64 2xl:w-72"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-1.5">
          <p className="nff-caption text-nff-text-secondary">
            {path.title} · {moduleLabel}
          </p>
          <h3 className="nff-heading-h4 text-foreground">{item.title}</h3>
          <p className="nff-body-sm text-nff-text-secondary">
            {itemMeta(item)}
            {nowPlaying && ' · In the player now'}
          </p>
        </div>
        <div className="mt-auto flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 sm:max-w-sm">
            {progress ? (
              <LearnProgress
                value={progress.percent}
                label={progress.label}
                ariaLabel={`${item.title} progress`}
              />
            ) : (
              <p className="nff-caption text-nff-text-secondary">In progress</p>
            )}
          </div>
          <Link
            to={href}
            className={`${PRIMARY_ACTION} w-full sm:w-auto`}
            aria-label={`Resume ${item.title}`}
          >
            <Play aria-hidden="true" className="size-4" />
            Resume
          </Link>
        </div>
      </div>
    </article>
  )
}
