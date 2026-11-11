import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react'
import { claimMedia, releaseMedia } from '@/features/media/mediaExclusive'
import { VIDEO_SPEEDS, clamp } from './videoState'

export type VideoStatus = 'loading' | 'ready' | 'buffering' | 'error'

export interface VideoProgressEvent {
  positionSec: number
  /** Media seconds actually played since the previous event. */
  playedDeltaSec: number
  durationSec?: number
  completed: boolean
}

export interface VideoSnapshot {
  positionSec: number
  durationSec: number
  playing: boolean
  ended: boolean
  /** The browser's own picture-in-picture window is showing this video. */
  inBrowserPip: boolean
}

export interface UseVideoControllerOptions {
  /** Unique per video; the one-media-at-a-time slot is `video:{mediaId}`. */
  mediaId: string
  hasCaptions: boolean
  startAt?: number
  autoPlay?: boolean
  onProgress?: (event: VideoProgressEvent) => void
}

/** Flush saved progress after this much media has played. */
const FLUSH_EVERY_SEC = 10
/** A timeupdate gap above this is a seek, not playback. */
const MAX_PLAY_GAP_SEC = 2.5

/**
 * State and actions for one native <video>. Shared by the page player and the
 * mini-player so both behave the same: they spread `mediaProps` on the
 * element, render from the returned state, and call the actions.
 */
export function useVideoController({
  mediaId,
  hasCaptions,
  startAt = 0,
  autoPlay = false,
  onProgress,
}: UseVideoControllerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<VideoStatus>('loading')
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const [time, setTime] = useState(startAt)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState<number>(1)
  const [captionsOn, setCaptionsOn] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const onProgressRef = useRef(onProgress)
  useLayoutEffect(() => {
    onProgressRef.current = onProgress
  })
  const positionRef = useRef(startAt)
  const resumeAtRef = useRef(startAt)
  const lastTimeRef = useRef<number | null>(null)
  const playedRef = useRef(0)
  const flushedPosRef = useRef(startAt)
  // Mirrors of state for the unmount path: React detaches `videoRef` before
  // passive cleanups run, so the element cannot be asked then.
  const playingRef = useRef(false)
  const endedRef = useRef(false)
  const durationRef = useRef<number | undefined>(undefined)
  const pipRef = useRef(false)
  const [pip, setPip] = useState(false)
  const claimId = `video:${mediaId}`

  const flush = useCallback((completed = false) => {
    const position = positionRef.current
    const played = playedRef.current
    if (!completed && played === 0 && Math.abs(position - flushedPosRef.current) < 1) return
    playedRef.current = 0
    flushedPosRef.current = position
    onProgressRef.current?.({
      positionSec: position,
      playedDeltaSec: played,
      durationSec: durationRef.current,
      completed,
    })
  }, [])

  // Release the one-media slot and save progress when the element goes away.
  useEffect(() => {
    return () => {
      releaseMedia(claimId)
      flush()
    }
  }, [claimId, flush])

  const applyCaptions = useCallback((on: boolean) => {
    const tracks = videoRef.current?.textTracks
    if (!tracks) return
    for (let i = 0; i < tracks.length; i += 1) {
      tracks[i].mode = on ? 'showing' : 'hidden'
    }
  }, [])

  useEffect(() => {
    applyCaptions(captionsOn)
  }, [captionsOn, applyCaptions])

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate
  }, [rate])

  const play = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.ended) video.currentTime = 0
    void Promise.resolve(video.play()).catch(() => {
      setPlaying(false)
    })
  }, [])

  const pause = useCallback(() => {
    videoRef.current?.pause()
  }, [])

  const toggle = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused || video.ended) play()
    else pause()
  }, [play, pause])

  const seekTo = useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video) return
    const max = Number.isFinite(video.duration) ? video.duration : seconds
    const next = clamp(seconds, 0, max)
    video.currentTime = next
    positionRef.current = next
    lastTimeRef.current = null
    endedRef.current = false
    setTime(next)
    setEnded(false)
  }, [])

  const seekBy = useCallback(
    (delta: number) => seekTo((videoRef.current?.currentTime ?? 0) + delta),
    [seekTo],
  )

  const setVolume = useCallback((value: number) => {
    const next = clamp(value, 0, 1)
    const video = videoRef.current
    if (video) {
      video.volume = next
      video.muted = next === 0
    }
    setVolumeState(next)
    setMuted(next === 0)
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    const next = !(video?.muted ?? muted)
    if (video) video.muted = next
    setMuted(next)
  }, [muted])

  const cycleRate = useCallback(() => {
    setRate((current) => {
      const index = VIDEO_SPEEDS.findIndex((speed) => speed === current)
      return VIDEO_SPEEDS[(index + 1) % VIDEO_SPEEDS.length]
    })
  }, [])

  const toggleCaptions = useCallback(() => {
    if (hasCaptions) setCaptionsOn((value) => !value)
  }, [hasCaptions])

  /** Try again after an error, from where it stopped. */
  const retry = useCallback(() => {
    resumeAtRef.current = positionRef.current
    setStatus('loading')
    setAttempt((value) => value + 1)
  }, [])

  /** Safe to call during unmount. */
  const getSnapshot = useCallback(
    (): VideoSnapshot => ({
      positionSec: positionRef.current,
      durationSec: durationRef.current ?? 0,
      playing: playingRef.current,
      ended: endedRef.current,
      inBrowserPip: pipRef.current,
    }),
    [],
  )

  const pipSupported =
    typeof document !== 'undefined' && document.pictureInPictureEnabled === true

  const togglePip = useCallback(() => {
    const video = videoRef.current
    if (!video || !pipSupported) return
    if (document.pictureInPictureElement === video) {
      void document.exitPictureInPicture().catch(() => undefined)
    } else {
      void video.requestPictureInPicture().catch(() => undefined)
    }
  }, [pipSupported])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const enter = () => {
      pipRef.current = true
      setPip(true)
    }
    const leave = () => {
      pipRef.current = false
      setPip(false)
    }
    video.addEventListener('enterpictureinpicture', enter)
    video.addEventListener('leavepictureinpicture', leave)
    return () => {
      video.removeEventListener('enterpictureinpicture', enter)
      video.removeEventListener('leavepictureinpicture', leave)
    }
  }, [attempt])

  const mediaProps = {
    onLoadStart: () => setStatus((s) => (s === 'error' ? s : 'loading')),
    onLoadedMetadata: (event: SyntheticEvent<HTMLVideoElement>) => {
      const video = event.currentTarget
      const total = Number.isFinite(video.duration) ? video.duration : 0
      setDuration(total)
      durationRef.current = total || undefined
      const resumeAt = resumeAtRef.current
      if (resumeAt > 0 && (total === 0 || resumeAt < total - 1)) {
        video.currentTime = resumeAt
        positionRef.current = resumeAt
        setTime(resumeAt)
      }
      video.playbackRate = rate
      applyCaptions(captionsOn)
      setStatus('ready')
      if (autoPlay && attempt === 0) play()
    },
    onDurationChange: (event: SyntheticEvent<HTMLVideoElement>) => {
      const total = event.currentTarget.duration
      if (Number.isFinite(total)) {
        setDuration(total)
        durationRef.current = total
      }
    },
    onCanPlay: () => setStatus((s) => (s === 'error' ? s : 'ready')),
    onWaiting: () => setStatus((s) => (s === 'error' ? s : 'buffering')),
    onPlaying: () => setStatus((s) => (s === 'error' ? s : 'ready')),
    onPlay: () => {
      playingRef.current = true
      endedRef.current = false
      setPlaying(true)
      setEnded(false)
      lastTimeRef.current = null
      claimMedia({
        id: claimId,
        kind: 'video',
        pause: () => videoRef.current?.pause(),
      })
    },
    onPause: (event: SyntheticEvent<HTMLVideoElement>) => {
      playingRef.current = false
      setPlaying(false)
      releaseMedia(claimId)
      // The browser also fires `pause` just before `ended`; ended saves itself.
      if (!event.currentTarget.ended) flush()
    },
    onEnded: () => {
      playingRef.current = false
      endedRef.current = true
      setPlaying(false)
      setEnded(true)
      releaseMedia(claimId)
      flush(true)
      positionRef.current = 0
      flushedPosRef.current = 0
    },
    onTimeUpdate: (event: SyntheticEvent<HTMLVideoElement>) => {
      const now = event.currentTarget.currentTime
      positionRef.current = now
      setTime(now)
      const previous = lastTimeRef.current
      lastTimeRef.current = now
      if (previous !== null) {
        const gap = now - previous
        if (gap > 0 && gap < MAX_PLAY_GAP_SEC) playedRef.current += gap
      }
      if (playedRef.current >= FLUSH_EVERY_SEC) flush()
    },
    onVolumeChange: (event: SyntheticEvent<HTMLVideoElement>) => {
      setVolumeState(event.currentTarget.volume)
      setMuted(event.currentTarget.muted)
    },
    onError: () => {
      playingRef.current = false
      setStatus('error')
      setPlaying(false)
    },
  }

  return {
    videoRef,
    attempt,
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
    play,
    pause,
    toggle,
    seekTo,
    seekBy,
    setVolume,
    toggleMute,
    cycleRate,
    toggleCaptions,
    retry,
    getSnapshot,
    pip,
    pipSupported,
    togglePip,
  }
}
