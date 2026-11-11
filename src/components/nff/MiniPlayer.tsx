import { Maximize2, Pause, Play, RotateCcw, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { usePlayer } from '@/features/player/PlayerProvider'
import { formatClock } from '@/lib/format'
import { lessonHref } from '@/services/learning/routes'

export function MiniPlayer() {
  const { track, stageId, position, playing, ended, toggle, close } =
    usePlayer()
  const location = useLocation()

  if (!track || !stageId) return null
  const fullPath = lessonHref(track.id)
  // Hide on the track's own page: its Meadow lesson, the same item in another
  // path (`lesson-med-1@key`), or its Library page.
  const ownPage =
    location.pathname === fullPath ||
    location.pathname.endsWith(`/lessons/lesson-${track.id}`) ||
    location.pathname.includes(`/lessons/lesson-${track.id}@`) ||
    location.pathname === `/learn/library/audio/${track.slug}` ||
    location.pathname === `/learn/meditations/${track.slug}`
  if (ownPage) return null

  const percent = Math.min(100, (position / track.durationSec) * 100)

  return (
    <section
      aria-label="Now playing"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card shadow-nff-player"
    >
      <div
        role="progressbar"
        aria-label="Playback progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className="h-1 bg-nff-bg-muted"
      >
        <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <div className="nff-content flex items-center gap-3 py-3">
        <Button
          type="button"
          size="icon"
          className="size-11 shrink-0 rounded-full"
          aria-label={ended ? 'Play again' : playing ? 'Pause' : 'Play'}
          onClick={toggle}
        >
          {ended ? (
            <RotateCcw aria-hidden="true" className="size-5" />
          ) : playing ? (
            <Pause aria-hidden="true" className="size-5" />
          ) : (
            <Play aria-hidden="true" className="size-5" />
          )}
        </Button>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate nff-label-lg text-foreground">
            {track.title}
          </span>
          <span className="nff-caption text-muted-foreground">
            {formatClock(position)} / {formatClock(track.durationSec)}
          </span>
        </div>
        <Button asChild variant="ghost" size="icon" className="size-11">
          <Link to={fullPath} aria-label="Open full player">
            <Maximize2 aria-hidden="true" className="size-5" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="Close player"
          onClick={close}
        >
          <X aria-hidden="true" className="size-5" />
        </Button>
      </div>
    </section>
  )
}
