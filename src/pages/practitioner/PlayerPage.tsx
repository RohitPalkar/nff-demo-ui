import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  FileQuestion,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { UnavailableState } from '@/components/nff/UnavailableState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { SPEEDS, usePlayer } from '@/features/player/PlayerProvider'
import { formatClock, formatDuration } from '@/lib/format'
import { getItemById, getProgress, getStage } from '@/services/content'
import { itemHref } from './JourneyPage'

export function PlayerPage() {
  const { stageId = '', contentId = '' } = useParams()
  const { user } = useAuth()
  const player = usePlayer()
  const [choiceMade, setChoiceMade] = useState(false)

  const progressQuery = useQuery({
    queryKey: ['progress', user?.id],
    queryFn: () => getProgress(user!.id),
    enabled: Boolean(user),
  })

  const item = getItemById(contentId)
  const stage = getStage(stageId)
  const meditation = item?.type === 'meditation' ? item : null

  const alreadyLoaded = player.track?.id === contentId
  const saved = progressQuery.data?.positionsSec[contentId] ?? 0
  const completed =
    progressQuery.data?.completedItemIds.includes(contentId) ?? false
  const needsPrompt =
    !alreadyLoaded && !choiceMade && saved > 30 && !completed

  // Load without a prompt when there is nothing to resume.
  useEffect(() => {
    if (!meditation || !progressQuery.data || alreadyLoaded) return
    if (saved > 30 && !completed) return
    player.load(meditation, stageId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meditation, progressQuery.data, alreadyLoaded])

  if (!meditation || !stage) {
    return (
      <UnavailableState
        icon={FileQuestion}
        title="We could not find that meditation"
        description="Head back to your stage to pick something to play."
        trail={[{ label: 'Journey', to: '/journey' }]}
        backTo="/journey"
        backLabel="Back to journey"
      />
    )
  }

  if (progressQuery.isPending) {
    return (
      <div aria-busy="true" className="nff-content py-10">
        <Skeleton className="mx-auto aspect-square w-72 rounded-xl" />
      </div>
    )
  }

  const position = stage.itemIds.indexOf(contentId)
  const next = getItemById(stage.itemIds[position + 1] ?? '')
  const current = alreadyLoaded ? player.position : 0

  return (
    <div className="nff-content flex flex-col gap-8 py-8 md:py-12">
      <Link
        to={`/journey/stages/${stage.id}`}
        className="inline-flex w-fit items-center gap-1.5 nff-label-md text-muted-foreground hover:text-foreground nff-focus-ring"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Stage {stage.number} · {stage.title}
      </Link>

      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div
          aria-hidden="true"
          className="mx-auto flex aspect-square w-full max-w-sm items-center justify-center rounded-2xl border bg-nff-bg-brand-subtle text-nff-text-brand shadow-nff-2"
        >
          <span className="nff-display text-7xl font-semibold opacity-40">
            {meditation.artwork.label}
          </span>
        </div>

        <header className="flex flex-col gap-1 text-center">
          <h1 className="nff-heading-h2">{meditation.title}</h1>
          <p className="nff-body-sm text-muted-foreground">
            Stage {stage.number} · {formatDuration(meditation.durationSec)}
          </p>
        </header>

        {needsPrompt ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center">
            <p className="nff-label-lg">Resume from {formatClock(saved)}?</p>
            <div className="flex gap-3">
              <Button
                className="h-11"
                onClick={() => {
                  player.load(meditation, stageId, saved)
                  setChoiceMade(true)
                }}
              >
                Resume
              </Button>
              <Button
                variant="outline"
                className="h-11"
                onClick={() => {
                  player.load(meditation, stageId, 0)
                  setChoiceMade(true)
                }}
              >
                Start over
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-nff-1">
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min={0}
                max={meditation.durationSec}
                step={1}
                value={Math.min(current, meditation.durationSec)}
                onChange={(event) => player.seek(Number(event.target.value))}
                aria-label="Seek"
                className="nff-range"
              />
              <div className="flex justify-between nff-caption text-muted-foreground">
                <span>{formatClock(current)}</span>
                <span>
                  -{formatClock(Math.max(0, meditation.durationSec - current))}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-12"
                aria-label="Back 15 seconds"
                onClick={() => player.skip(-15)}
              >
                <RotateCcw aria-hidden="true" className="size-6" />
              </Button>
              <Button
                type="button"
                size="icon"
                className="size-16 rounded-full"
                aria-label={
                  player.ended
                    ? 'Play again'
                    : alreadyLoaded && player.playing
                      ? 'Pause'
                      : 'Play'
                }
                onClick={player.toggle}
              >
                {alreadyLoaded && player.playing ? (
                  <Pause aria-hidden="true" className="size-7" />
                ) : (
                  <Play aria-hidden="true" className="size-7" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-12"
                aria-label="Forward 15 seconds"
                onClick={() => player.skip(15)}
              >
                <RotateCw aria-hidden="true" className="size-6" />
              </Button>
            </div>

            <div
              role="group"
              aria-label="Playback speed"
              className="flex justify-center gap-2"
            >
              {SPEEDS.map((speed) => (
                <Button
                  key={speed}
                  type="button"
                  size="sm"
                  variant={player.speed === speed ? 'default' : 'outline'}
                  aria-pressed={player.speed === speed}
                  onClick={() => player.setSpeed(speed)}
                >
                  {speed}×
                </Button>
              ))}
            </div>

            {alreadyLoaded && player.ended && (
              <div className="flex flex-col items-center gap-3 border-t pt-4 text-center">
                <p className="inline-flex items-center gap-2 nff-label-lg text-nff-text-success">
                  <CheckCircle2 aria-hidden="true" className="size-5" />
                  Complete. Well done.
                </p>
                <Button asChild className="h-11">
                  <Link
                    to={
                      next
                        ? itemHref(stage.id, next)
                        : `/journey/stages/${stage.id}`
                    }
                  >
                    {next ? 'Next up' : 'Back to stage'}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {next && (
          <aside className="rounded-xl border bg-nff-bg-surface-sunken p-4">
            <p className="nff-overline text-muted-foreground">Up next</p>
            <Link
              to={itemHref(stage.id, next)}
              className="nff-label-lg text-nff-text-link underline"
            >
              {next.title}
            </Link>
          </aside>
        )}
      </div>
    </div>
  )
}
