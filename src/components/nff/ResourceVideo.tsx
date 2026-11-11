import { useEffect, useState, type ReactNode } from 'react'
import { VideoPlayer } from '@/components/nff/VideoPlayer'
import type { VideoSnapshot } from '@/features/video/useVideoController'
import { useVideoProgress } from '@/features/video/useVideoProgress'
import { useVideoDock } from '@/features/video/VideoProvider'
import { resolveVideoState } from '@/features/video/videoState'
import { formatClock } from '@/lib/format'
import type { VideoMedia } from '@/types'

export interface ResourceVideoProps {
  /**
   * The Resource id (`Resource.id`) for lessons, or a stable config id for
   * standalone videos. Used for saved progress, resume and the mini-player.
   */
  resourceId: string
  title: string
  /** `Resource.video` from src/types/learning.ts. */
  video: VideoMedia | undefined
  /**
   * Where the mini-player's "back to the video" goes: the lesson route, or
   * `/#watch` on the landing page.
   */
  returnTo: string
  /** Element to scroll to when the viewer comes back from the mini-player. */
  scrollToId?: string
  unavailableAction?: ReactNode
  /** Frame styling: public site keeps soft corners, practitioner pages pass e.g. `rounded-md`. */
  className?: string
  /** Called when the viewer finishes the video (for `media-end` lessons). */
  onCompleted?: () => void
}

/**
 * The one component for putting a video anywhere in the app (landing page,
 * lesson, exploration). It wraps VideoPlayer with the shared behaviour:
 * - signed-in viewers resume from saved progress (`recordMedia`), with
 *   "Start over";
 * - leaving the page while it plays hands it to the persistent mini-player,
 *   and coming back takes it back at the same second;
 * - one media at a time with the audio player;
 * - unavailable / processing / error states for any `VideoMedia`.
 */
export function ResourceVideo({
  resourceId,
  title,
  video,
  returnTo,
  scrollToId,
  unavailableAction,
  className,
  onCompleted,
}: ResourceVideoProps) {
  const { peekDock, takeDock, dockVideo } = useVideoDock()
  const { resumeAtSec, onProgress } = useVideoProgress(resourceId)
  const mediaId = resourceId
  const playable = resolveVideoState(video) === 'ready'

  // Coming back from the mini-player wins over saved progress.
  const [docked] = useState(() => peekDock(mediaId))
  const [start, setStart] = useState(() => ({
    key: 0,
    at: docked?.positionSec ?? resumeAtSec,
    autoPlay: !!docked?.resumePlaying,
  }))

  useEffect(() => {
    if (!docked) return
    takeDock(mediaId)
    if (!scrollToId) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document
      .getElementById(scrollToId)
      ?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }, [docked, takeDock, mediaId, scrollToId])

  const handleLeave = (snapshot: VideoSnapshot) => {
    // Only a video that is playing follows the viewer; a paused one is
    // already saved (signed in) and waits on the page.
    if (!video || !snapshot.playing || snapshot.ended || snapshot.inBrowserPip) return
    dockVideo({
      mediaId,
      resourceId,
      title,
      video,
      positionSec: snapshot.positionSec,
      resumePlaying: true,
      returnTo,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <VideoPlayer
        key={start.key}
        mediaId={mediaId}
        title={title}
        video={video}
        startAt={start.at}
        autoPlay={start.autoPlay}
        onProgress={(event) => {
          onProgress(event)
          if (event.completed) onCompleted?.()
        }}
        onLeave={handleLeave}
        unavailableAction={unavailableAction}
        className={className}
      />
      {playable && start.at >= 5 && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 nff-body-md text-nff-text-secondary">
          <span>Picking up from {formatClock(start.at)}.</span>
          <button
            type="button"
            onClick={() =>
              setStart((current) => ({ key: current.key + 1, at: 0, autoPlay: true }))
            }
            className="rounded-sm underline underline-offset-4 hover:text-foreground nff-focus-ring"
          >
            Start over
          </button>
        </p>
      )}
    </div>
  )
}
