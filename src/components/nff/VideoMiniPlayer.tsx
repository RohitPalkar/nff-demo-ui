import {
  Captions,
  CaptionsOff,
  Maximize2,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  X,
} from 'lucide-react'
import { useEffect } from 'react'
import { ControlButton } from '@/components/nff/video/ControlButton'
import { RangeBar } from '@/components/nff/video/RangeBar'
import { VideoBusy, VideoStatusPanel } from '@/components/nff/video/VideoStatusPanel'
import { usePlayer } from '@/features/player/PlayerProvider'
import { useVideoController } from '@/features/video/useVideoController'
import { useVideoProgress } from '@/features/video/useVideoProgress'
import { useVideoDock, type VideoDockSession } from '@/features/video/VideoProvider'
import { spokenTime } from '@/features/video/videoState'
import { formatClock } from '@/lib/format'
import { cn } from '@/lib/utils'

interface VideoMiniPlayerProps {
  /** Go back to the page the video came from. Defaults to a full page load. */
  onExpand?: (returnTo: string) => void
}

/**
 * Persistent video mini-player. Appears when a viewer leaves the page while a
 * video is playing or part-watched, and stays until they close it or expand it
 * back to the page. Sits above the audio mini-player when both are open (only
 * one of them can be playing).
 */
export function VideoMiniPlayer({ onExpand }: VideoMiniPlayerProps) {
  const { dock } = useVideoDock()
  if (!dock) return null
  return <MiniBody key={dock.mediaId} session={dock} onExpand={onExpand} />
}

function MiniBody({
  session,
  onExpand,
}: {
  session: VideoDockSession
  onExpand?: (returnTo: string) => void
}) {
  const { closeDock, reportDockPosition } = useVideoDock()
  const { track } = usePlayer()
  const { onProgress } = useVideoProgress(session.resourceId)
  const { video } = session
  const hasCaptions = !!video.captionsUrl

  const controller = useVideoController({
    mediaId: session.mediaId,
    hasCaptions,
    startAt: session.positionSec,
    autoPlay: session.resumePlaying,
    onProgress,
  })
  const { videoRef, status, playing, ended, time, duration, captionsOn, mediaProps } = controller

  // Keep the provider's copy current, so expanding or coming back by any
  // route resumes from the right place.
  useEffect(() => {
    reportDockPosition(time, playing)
  }, [time, playing, reportDockPosition])

  const PlayIcon = ended ? RotateCcw : playing ? Pause : Play
  const playLabel = ended ? 'Replay' : playing ? 'Pause' : 'Play'

  const expand = () => {
    const snap = controller.getSnapshot()
    reportDockPosition(snap.positionSec, snap.playing)
    if (onExpand) onExpand(session.returnTo)
    else window.location.assign(session.returnTo)
  }

  return (
    <section
      aria-label={`Video mini-player: ${session.title}`}
      className={cn(
        'fixed right-3 z-40 w-[calc(100vw-1.5rem)] max-w-[20rem] overflow-hidden rounded-2xl bg-nff-bg-inverse text-white shadow-nff-player sm:right-4 sm:max-w-[22rem]',
        // Clear the audio mini-player when it is open.
        track ? 'bottom-[5.75rem]' : 'bottom-3 sm:bottom-4',
      )}
    >
      <p className="truncate px-4 pb-2 pt-3 nff-label-md" title={session.title}>
        {session.title}
      </p>
      <div className="relative aspect-video bg-black">
        <video
          key={controller.attempt}
          ref={videoRef}
          src={video.src}
          poster={video.posterUrl}
          preload="metadata"
          playsInline
          aria-label={session.title}
          className="size-full object-contain"
          onClick={controller.toggle}
          {...mediaProps}
        >
          {hasCaptions && (
            <track kind="captions" src={video.captionsUrl} srcLang="en" label="English" />
          )}
        </video>
        {status === 'error' && (
          <div className="absolute inset-0 bg-nff-bg-inverse">
            <VideoStatusPanel kind="error" compact onRetry={controller.retry} />
          </div>
        )}
        {(status === 'loading' || status === 'buffering') && (
          <VideoBusy label={status === 'loading' ? 'Loading video' : 'Buffering'} />
        )}
      </div>
      <div className="px-3.5 pt-1.5">
        <RangeBar
          label="Seek"
          value={time}
          max={duration}
          valueText={`${spokenTime(time)} of ${spokenTime(duration)}`}
          disabled={duration === 0}
          onChange={controller.seekTo}
        />
      </div>
      <div className="flex items-center gap-0.5 px-1.5 pb-1.5">
        <ControlButton aria-label={playLabel} onClick={controller.toggle}>
          <PlayIcon aria-hidden="true" />
        </ControlButton>
        <p className="px-1 text-xs tabular-nums text-white/85" aria-hidden="true">
          {formatClock(time)} / {formatClock(duration)}
        </p>
        <div className="ml-auto flex items-center gap-0.5">
          <ControlButton
            aria-label="Captions"
            aria-pressed={captionsOn}
            disabled={!hasCaptions}
            onClick={controller.toggleCaptions}
            className={cn(captionsOn && 'bg-white/20')}
          >
            {captionsOn ? <Captions aria-hidden="true" /> : <CaptionsOff aria-hidden="true" />}
          </ControlButton>
          {controller.pipSupported && (
            <ControlButton
              aria-label="Picture in picture"
              aria-pressed={controller.pip}
              onClick={controller.togglePip}
              className="hidden sm:inline-flex"
            >
              <PictureInPicture2 aria-hidden="true" />
            </ControlButton>
          )}
          <ControlButton aria-label="Back to the video on the page" onClick={expand}>
            <Maximize2 aria-hidden="true" />
          </ControlButton>
          <ControlButton aria-label="Close video" onClick={closeDock}>
            <X aria-hidden="true" />
          </ControlButton>
        </div>
      </div>
    </section>
  )
}
