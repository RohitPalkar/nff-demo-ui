import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { usePlayer } from '@/features/player/PlayerProvider'
import { claimMedia, releaseMedia } from '@/features/media/mediaExclusive'
import type { VideoMedia } from '@/types'

/** A video handed from its page to the persistent mini-player. */
export interface VideoDockSession {
  /** Same id the page player uses, so the page can take it back. */
  mediaId: string
  /** Progress id (see `recordMedia`). */
  resourceId: string
  title: string
  video: VideoMedia
  positionSec: number
  /** True when it was playing as the viewer navigated away. */
  resumePlaying: boolean
  /** Where "Expand" goes back to. */
  returnTo: string
}

interface VideoDockContextValue {
  dock: VideoDockSession | null
  dockVideo: (session: VideoDockSession) => void
  /** The mini-player keeps the latest position here without re-rendering. */
  reportDockPosition: (positionSec: number, playing: boolean) => void
  /** Read the docked session for a video without changing anything. */
  peekDock: (mediaId: string) => VideoDockSession | null
  /** The page player takes the video back; returns it with the latest position. */
  takeDock: (mediaId: string) => VideoDockSession | null
  closeDock: () => void
}

const VideoDockContext = createContext<VideoDockContextValue | null>(null)

/**
 * Keeps one video alive across route changes in a mini-player, and makes the
 * existing audio player share the one-media-at-a-time slot with video.
 * Must sit inside PlayerProvider.
 */
export function VideoProvider({ children }: { children: ReactNode }) {
  const player = usePlayer()
  const playerRef = useRef(player)
  useLayoutEffect(() => {
    playerRef.current = player
  })

  // Audio side of "one media at a time": when the audio player is playing it
  // holds the slot, and a starting video pauses it through this claim.
  const audioPlaying = player.playing && !!player.track
  const audioId = player.track ? `audio:${player.track.id}` : null
  useEffect(() => {
    if (!audioPlaying || !audioId) return
    claimMedia({
      id: audioId,
      kind: 'audio',
      pause: () => {
        if (playerRef.current.playing) playerRef.current.toggle()
      },
    })
    return () => releaseMedia(audioId)
  }, [audioPlaying, audioId])

  const [dock, setDock] = useState<VideoDockSession | null>(null)
  const dockRef = useRef<VideoDockSession | null>(null)
  const latestRef = useRef<{ positionSec: number; playing: boolean } | null>(null)

  const merged = useCallback((): VideoDockSession | null => {
    const current = dockRef.current
    if (!current) return null
    const latest = latestRef.current
    return latest
      ? { ...current, positionSec: latest.positionSec, resumePlaying: latest.playing }
      : current
  }, [])

  const dockVideo = useCallback((session: VideoDockSession) => {
    dockRef.current = session
    latestRef.current = null
    setDock(session)
  }, [])

  const reportDockPosition = useCallback((positionSec: number, playing: boolean) => {
    latestRef.current = { positionSec, playing }
  }, [])

  const peekDock = useCallback(
    (mediaId: string) => {
      const current = merged()
      return current && current.mediaId === mediaId ? current : null
    },
    [merged],
  )

  const closeDock = useCallback(() => {
    dockRef.current = null
    latestRef.current = null
    setDock(null)
  }, [])

  const takeDock = useCallback(
    (mediaId: string) => {
      const taken = peekDock(mediaId)
      if (taken) closeDock()
      return taken
    },
    [peekDock, closeDock],
  )

  const value = useMemo<VideoDockContextValue>(
    () => ({ dock, dockVideo, reportDockPosition, peekDock, takeDock, closeDock }),
    [dock, dockVideo, reportDockPosition, peekDock, takeDock, closeDock],
  )

  return <VideoDockContext.Provider value={value}>{children}</VideoDockContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useVideoDock(): VideoDockContextValue {
  const context = useContext(VideoDockContext)
  if (context) return context
  // Without a provider the player still works; there is just no mini-player.
  return INERT_DOCK
}

const INERT_DOCK: VideoDockContextValue = {
  dock: null,
  dockVideo: () => undefined,
  reportDockPosition: () => undefined,
  peekDock: () => null,
  takeDock: () => null,
  closeDock: () => undefined,
}
