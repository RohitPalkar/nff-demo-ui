import {
  Captions,
  CaptionsOff,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { ControlButton } from '@/components/nff/video/ControlButton'
import { RangeBar } from '@/components/nff/video/RangeBar'
import {
  VideoBusy,
  VideoStatusPanel,
} from '@/components/nff/video/VideoStatusPanel'
import {
  useVideoController,
  type VideoProgressEvent,
  type VideoSnapshot,
} from '@/features/video/useVideoController'
import { resolveVideoState, spokenTime } from '@/features/video/videoState'
import { formatClock } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { VideoMedia } from '@/types'

export interface VideoPlayerProps {
  /** Unique per video. Used for the one-media-at-a-time slot. */
  mediaId: string
  title: string
  video: VideoMedia | undefined
  /** Start (or resume) here, in seconds. */
  startAt?: number
  /** Start playing as soon as it loads (only after a viewer action). */
  autoPlay?: boolean
  /** Saved every ~10 s of playback, on pause, on end and when leaving. */
  onProgress?: (event: VideoProgressEvent) => void
  /** Called when the player unmounts, e.g. to hand the video to the mini-player. */
  onLeave?: (snapshot: VideoSnapshot) => void
  /** Extra content inside the unavailable / processing panel. */
  unavailableAction?: ReactNode
  /** Corner radius etc. for the frame. Default is the public site's soft corners. */
  className?: string
}

const SEEK_STEP_SEC = 5

/**
 * Video player on the native <video> element with our own accessible
 * controls: play/pause, seek, volume and mute, speed, captions, fullscreen and
 * browser picture-in-picture.
 *
 * A video that is not 'ready' (or has no source or captions) shows a calm
 * in-frame state instead of a player. Stays out of the way of the audio
 * player: starting this pauses audio, and starting audio pauses this.
 */
export function VideoPlayer(props: VideoPlayerProps) {
  const { video, className, unavailableAction } = props
  const state = resolveVideoState(video)

  if (state !== 'ready' || !video) {
    return (
      <div
        className={cn(
          // 16:9, but never too short for the message on a phone.
          'relative aspect-video min-h-[17rem] w-full overflow-hidden rounded-2xl bg-nff-bg-inverse',
          className,
        )}
      >
        <VideoStatusPanel kind={state === 'processing' ? 'processing' : 'unavailable'}>
          {unavailableAction}
        </VideoStatusPanel>
      </div>
    )
  }
  return <PlayableVideo {...props} video={video} />
}

function PlayableVideo({
  mediaId,
  title,
  video,
  startAt = 0,
  autoPlay,
  onProgress,
  onLeave,
  className,
}: VideoPlayerProps & { video: VideoMedia }) {
  const hasCaptions = !!video.captionsUrl
  const controller = useVideoController({
    mediaId,
    hasCaptions,
    startAt,
    autoPlay,
    onProgress,
  })
  const {
    videoRef,
    status,
    playing,
    ended,
    time,
    duration,
    volume,
    muted,
    rate,
    captionsOn,
    mediaProps,
  } = controller

  const containerRef = useRef<HTMLDivElement>(null)
  const helpId = useId()
  const [fullscreen, setFullscreen] = useState(false)

  const onLeaveRef = useRef(onLeave)
  useLayoutEffect(() => {
    onLeaveRef.current = onLeave
  })
  const getSnapshot = controller.getSnapshot
  useEffect(() => {
    return () => onLeaveRef.current?.(getSnapshot())
  }, [getSnapshot])

  useEffect(() => {
    const onChange = () =>
      setFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const canFullscreen =
    typeof document !== 'undefined' &&
    (document.fullscreenEnabled === true ||
      'webkitEnterFullscreen' in HTMLVideoElement.prototype)

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined)
    } else if (container.requestFullscreen) {
      void container.requestFullscreen().catch(() => undefined)
    } else {
      // iPhone Safari only fullscreens the video element itself.
      ;(videoRef.current as { webkitEnterFullscreen?: () => void } | null)
        ?.webkitEnterFullscreen?.()
    }
  }, [videoRef])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Let buttons and sliders keep their own keys.
    const target = event.target as HTMLElement
    if (target !== event.currentTarget && target.tagName !== 'VIDEO') return
    if (event.metaKey || event.ctrlKey || event.altKey) return
    switch (event.key) {
      case ' ':
      case 'k':
        controller.toggle()
        break
      case 'ArrowLeft':
        controller.seekBy(-SEEK_STEP_SEC)
        break
      case 'ArrowRight':
        controller.seekBy(SEEK_STEP_SEC)
        break
      case 'ArrowUp':
        controller.setVolume(volume + 0.1)
        break
      case 'ArrowDown':
        controller.setVolume(volume - 0.1)
        break
      case 'm':
        controller.toggleMute()
        break
      case 'c':
        controller.toggleCaptions()
        break
      case 'f':
        toggleFullscreen()
        break
      default:
        return
    }
    event.preventDefault()
  }

  const showBusy = status === 'loading' || status === 'buffering'
  const showPlayOverlay = status === 'ready' && !playing
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const playLabel = ended ? 'Replay' : playing ? 'Pause' : 'Play'
  const PlayIcon = ended ? RotateCcw : playing ? Pause : Play

  return (
    <div
      ref={containerRef}
      role="group"
      aria-roledescription="video player"
      aria-label={`Video player: ${title}`}
      aria-describedby={helpId}
      tabIndex={0}
      onKeyDown={onKeyDown}
      data-fullscreen={fullscreen || undefined}
      className={cn(
        'group/video relative flex w-full flex-col overflow-hidden rounded-2xl bg-nff-bg-inverse text-white outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        fullscreen && 'h-full rounded-none',
        className,
      )}
    >
      <p id={helpId} className="sr-only">
        Keyboard shortcuts: space to play or pause, left and right arrows to
        skip 5 seconds, up and down arrows for volume, M to mute, C for
        captions, F for fullscreen.
      </p>

      <div
        className={cn(
          'relative bg-black',
          fullscreen ? 'min-h-0 flex-1' : 'aspect-video',
          // Room for the error message and Try again on a phone.
          status === 'error' && !fullscreen && 'min-h-[17rem]',
        )}
      >
        <video
          key={controller.attempt}
          ref={videoRef}
          src={video.src}
          poster={video.posterUrl}
          preload="metadata"
          playsInline
          aria-label={title}
          className="size-full object-contain"
          onClick={controller.toggle}
          {...mediaProps}
        >
          {hasCaptions && (
            <track
              kind="captions"
              src={video.captionsUrl}
              srcLang="en"
              label="English"
            />
          )}
        </video>

        {status === 'error' && (
          <div className="absolute inset-0 bg-nff-bg-inverse">
            <VideoStatusPanel kind="error" onRetry={controller.retry} />
          </div>
        )}
        {showBusy && (
          <VideoBusy label={status === 'loading' ? 'Loading video' : 'Buffering'} />
        )}
        {showPlayOverlay && (
          <button
            type="button"
            onClick={controller.toggle}
            aria-label={ended ? 'Replay video' : 'Play video'}
            className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-[var(--nff-duration-fast)] hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none sm:size-20"
          >
            {ended ? (
              <RotateCcw aria-hidden="true" className="size-7" />
            ) : (
              <Play aria-hidden="true" className="ml-0.5 size-7 fill-current" />
            )}
          </button>
        )}
      </div>

      {status !== 'error' && (
        <div className="flex flex-col gap-0.5 px-2 pb-1.5 pt-1 sm:px-3">
          <div className="px-1.5">
            <RangeBar
              label="Seek"
              value={time}
              max={duration}
              valueText={`${spokenTime(time)} of ${spokenTime(duration)}`}
              disabled={duration === 0}
              onChange={controller.seekTo}
            />
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <ControlButton aria-label={playLabel} onClick={controller.toggle}>
              <PlayIcon aria-hidden="true" />
            </ControlButton>
            <p
              className="min-w-[5.5rem] px-1 text-sm tabular-nums text-white/90"
              aria-hidden="true"
            >
              {formatClock(time)} / {formatClock(duration)}
            </p>

            <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
              <div className="group/vol flex items-center">
                <ControlButton
                  aria-label={muted ? 'Unmute' : 'Mute'}
                  aria-pressed={muted}
                  onClick={controller.toggleMute}
                >
                  <VolumeIcon aria-hidden="true" />
                </ControlButton>
                <RangeBar
                  label="Volume"
                  value={muted ? 0 : volume}
                  max={1}
                  step={0.05}
                  valueText={`${Math.round((muted ? 0 : volume) * 100)} percent`}
                  onChange={controller.setVolume}
                  className="hidden w-20 sm:block"
                />
              </div>
              <ControlButton
                aria-label={`Playback speed ${rate}×. Press to change.`}
                onClick={controller.cycleRate}
                className="w-auto min-w-11 px-2 text-sm font-medium tabular-nums"
              >
                {rate}×
              </ControlButton>
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
              {canFullscreen && (
                <ControlButton
                  aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  aria-pressed={fullscreen}
                  onClick={toggleFullscreen}
                >
                  {fullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
                </ControlButton>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
