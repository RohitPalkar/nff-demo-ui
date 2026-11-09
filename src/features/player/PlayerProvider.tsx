import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { getProgress, saveProgress } from '@/services/content'
import type { Meditation } from '@/types'

export const SPEEDS = [0.75, 1, 1.25, 1.5] as const

interface PlayerContextValue {
  track: Meditation | null
  stageId: string | null
  position: number
  playing: boolean
  speed: number
  ended: boolean
  load: (track: Meditation, stageId: string, startAt?: number) => void
  toggle: () => void
  seek: (seconds: number) => void
  skip: (delta: number) => void
  setSpeed: (speed: number) => void
  close: () => void
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

const COMPLETE_AT = 0.95

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [track, setTrack] = useState<Meditation | null>(null)
  const [stageId, setStageId] = useState<string | null>(null)
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeedState] = useState(1)
  const [ended, setEnded] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const positionRef = useRef(0)
  const completedRef = useRef(false)
  const lastSaveRef = useRef(0)

  positionRef.current = position

  const persist = useCallback(
    async (complete: boolean) => {
      if (!user || !track) return
      const progress = await getProgress(user.id)
      const done = new Set(progress.completedItemIds)
      if (complete) done.add(track.id)
      saveProgress({
        ...progress,
        completedItemIds: [...done],
        inProgressItemId: complete ? undefined : track.id,
        positionsSec: {
          ...progress.positionsSec,
          [track.id]: complete ? 0 : Math.floor(positionRef.current),
        },
      })
      void queryClient.invalidateQueries({ queryKey: ['progress'] })
      if (complete) {
        void queryClient.invalidateQueries({ queryKey: ['journey'] })
        void queryClient.invalidateQueries({ queryKey: ['stage'] })
      }
    },
    [user, track, queryClient],
  )

  useEffect(() => {
    if (user) return
    setPlaying(false)
    setTrack(null)
    setStageId(null)
    setPosition(0)
    setEnded(false)
  }, [user])

  // Simulated clock keeps the demo working even when audio cannot load.
  useEffect(() => {
    if (!playing || !track) return
    const id = window.setInterval(() => {
      setPosition((current) => {
        const next = current + 0.25 * speed
        if (next >= track.durationSec) return track.durationSec
        return next
      })
    }, 250)
    return () => window.clearInterval(id)
  }, [playing, track, speed])

  useEffect(() => {
    if (!track) return
    if (position >= track.durationSec * COMPLETE_AT && !completedRef.current) {
      completedRef.current = true
      void persist(true)
    }
    if (position >= track.durationSec) {
      setPlaying(false)
      setEnded(true)
    }
    if (playing && position - lastSaveRef.current >= 15) {
      lastSaveRef.current = position
      void persist(false)
    }
  }, [position, track, playing, persist])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = speed
    if (playing) {
      void audio.play().catch(() => undefined)
    } else {
      audio.pause()
    }
  }, [playing, speed, track])

  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: 'NeuroFelicitology',
    })
    navigator.mediaSession.setActionHandler('play', () => setPlaying(true))
    navigator.mediaSession.setActionHandler('pause', () => setPlaying(false))
  }, [track])

  const load = useCallback(
    (next: Meditation, nextStage: string, startAt = 0) => {
      if (track?.id === next.id) return
      setTrack(next)
      setStageId(nextStage)
      setPosition(startAt)
      lastSaveRef.current = startAt
      completedRef.current = false
      setEnded(false)
      setPlaying(false)
    },
    [track],
  )

  const toggle = useCallback(() => {
    if (!track) return
    if (ended) {
      setPosition(0)
      lastSaveRef.current = 0
      setEnded(false)
      setPlaying(true)
      return
    }
    setPlaying((value) => !value)
  }, [track, ended])

  const seek = useCallback(
    (seconds: number) => {
      if (!track) return
      const next = Math.min(Math.max(seconds, 0), track.durationSec)
      setPosition(next)
      lastSaveRef.current = next
      setEnded(next >= track.durationSec)
      const audio = audioRef.current
      if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = next % audio.duration
      }
    },
    [track],
  )

  const skip = useCallback(
    (delta: number) => seek(positionRef.current + delta),
    [seek],
  )

  const close = useCallback(() => {
    void persist(completedRef.current)
    setPlaying(false)
    setTrack(null)
    setStageId(null)
    setPosition(0)
    setEnded(false)
  }, [persist])

  const value = useMemo<PlayerContextValue>(
    () => ({
      track,
      stageId,
      position,
      playing,
      speed,
      ended,
      load,
      toggle,
      seek,
      skip,
      setSpeed: setSpeedState,
      close,
    }),
    [track, stageId, position, playing, speed, ended, load, toggle, seek, skip, close],
  )

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {track && (
        <audio
          ref={audioRef}
          src={track.audioUrl}
          loop
          preload="metadata"
          className="hidden"
        />
      )}
    </PlayerContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) throw new Error('usePlayer must be used inside PlayerProvider')
  return context
}
