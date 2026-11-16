import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { claimMedia, releaseMedia } from '@/features/media/mediaExclusive'
import { usePlayer } from '@/features/player/PlayerProvider'
import {
  canAccessResource,
  hasRegisteredAccess,
  publicAccessContext,
} from '@/services/learning/access'
import { getResource } from '@/services/learning/catalogue'
import type { ContentItem, Meditation } from '@/types'

/** Same limit as the meditation page: visitors hear the first minute. */
const PREVIEW_LIMIT_SEC = 60

/** The card preview's slot in the one-media-at-a-time registry. */
const PREVIEW_CLAIM_ID = 'audio:library-preview'

export type PlaybackState = 'idle' | 'playing' | 'paused'

export interface LibraryPlayback {
  /** Whether this viewer is allowed to play the item from a card. */
  canPlay: (item: ContentItem) => item is Meditation
  /** True when the viewer hears a time-limited preview, not the full track. */
  isPreview: boolean
  state: (id: string) => PlaybackState
  /** 0-1 through the playable length (preview or full track). */
  progress: (id: string) => number
  toggle: (item: Meditation) => void
  stopPreview: () => void
}

/** The section's single preview element, created on first play. */
function previewAudio(ref: MutableRefObject<HTMLAudioElement | null>) {
  ref.current ??= new Audio()
  return ref.current
}

/** Swap the preview element to a new track and start it (demo audio loops). */
function startTrack(audio: HTMLAudioElement, src: string) {
  audio.pause()
  audio.src = src
  audio.loop = true
  return audio.play()
}

interface PreviewState {
  id: string
  playing: boolean
  position: number
  limit: number
}

/**
 * Card playback for the home library, using the app's existing rules:
 * - Practitioners (full access) play through the global player, so the mini
 *   player appears and progress is saved as it is everywhere else.
 * - Everyone else may play free-preview tracks only, for the first 60 seconds,
 *   matching the preview player on the meditation page.
 * Tracks that are still transcoding or failed are never playable.
 */
export function useLibraryPlayback(): LibraryPlayback {
  const { user } = useAuth()
  const player = usePlayer()
  const access = useMemo(() => publicAccessContext(user), [user])
  const fullAccess = hasRegisteredAccess(access)

  const [preview, setPreview] = useState<PreviewState | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const baseRef = useRef({ at: 0, pos: 0 })

  // Preview clock, like the meditation page player (the demo audio loops).
  useEffect(() => {
    if (!preview?.playing) return
    const id = window.setInterval(() => {
      const next = baseRef.current.pos + (Date.now() - baseRef.current.at) / 1000
      if (next >= preview.limit) {
        audioRef.current?.pause()
        releaseMedia(PREVIEW_CLAIM_ID)
        setPreview(null)
      } else {
        setPreview((current) => (current ? { ...current, position: next } : current))
      }
    }, 200)
    return () => window.clearInterval(id)
  }, [preview?.playing, preview?.limit])

  const stopPreview = useCallback(() => {
    audioRef.current?.pause()
    releaseMedia(PREVIEW_CLAIM_ID)
    setPreview(null)
  }, [])

  // Starting another audio source pauses the preview; it can be resumed.
  const claimPreviewSlot = useCallback(() => {
    claimMedia({
      id: PREVIEW_CLAIM_ID,
      kind: 'audio',
      pause: () => {
        audioRef.current?.pause()
        setPreview((current) => (current ? { ...current, playing: false } : current))
      },
    })
  }, [])

  useEffect(() => {
    const ref = audioRef
    return () => {
      ref.current?.pause()
      releaseMedia(PREVIEW_CLAIM_ID)
    }
  }, [])

  const canPlay = useCallback(
    (item: ContentItem): item is Meditation =>
      item.type === 'meditation' &&
      item.transcode === 'ready' &&
      canAccessResource(access, getResource(item.id)).mode !== 'none',
    [access],
  )

  const toggle = useCallback(
    (item: Meditation) => {
      if (fullAccess) {
        if (player.track?.id === item.id) {
          player.toggle()
        } else {
          player.load(item, item.stageId, 0, true)
        }
        return
      }

      if (!item.preview) return
      const audio = previewAudio(audioRef)

      if (preview?.id === item.id) {
        if (preview.playing) {
          audio.pause()
          releaseMedia(PREVIEW_CLAIM_ID)
          setPreview({ ...preview, playing: false })
        } else {
          claimPreviewSlot()
          baseRef.current = { at: Date.now(), pos: preview.position }
          void audio.play().catch(() => setPreview(null))
          setPreview({ ...preview, playing: true })
        }
        return
      }

      claimPreviewSlot()
      baseRef.current = { at: Date.now(), pos: 0 }
      void startTrack(audio, item.audioUrl).catch(() => setPreview(null))
      setPreview({
        id: item.id,
        playing: true,
        position: 0,
        limit: Math.min(PREVIEW_LIMIT_SEC, item.durationSec),
      })
    },
    [fullAccess, player, preview, claimPreviewSlot],
  )

  const state = useCallback(
    (id: string): PlaybackState => {
      if (fullAccess) {
        if (player.track?.id !== id) return 'idle'
        return player.playing ? 'playing' : 'paused'
      }
      if (preview?.id !== id) return 'idle'
      return preview.playing ? 'playing' : 'paused'
    },
    [fullAccess, player.track?.id, player.playing, preview],
  )

  const progress = useCallback(
    (id: string) => {
      if (fullAccess) {
        if (player.track?.id !== id) return 0
        return Math.min(1, player.position / player.track.durationSec)
      }
      if (preview?.id !== id) return 0
      return Math.min(1, preview.position / preview.limit)
    },
    [fullAccess, player.track, player.position, preview],
  )

  return { canPlay, isPreview: !fullAccess, state, progress, toggle, stopPreview }
}
