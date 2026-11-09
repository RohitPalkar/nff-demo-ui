import {
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ErrorState } from '@/components/nff/ErrorState'
import { Button } from '@/components/ui/button'
import { formatClock } from '@/lib/format'

interface AudioPlayerProps {
  src: string
  durationSec: number
  limitSec?: number
  preview?: boolean
  endedContent?: ReactNode
}

export function AudioPlayer({
  src,
  durationSec,
  limitSec,
  preview = false,
  endedContent,
}: AudioPlayerProps) {
  const limit = Math.min(limitSec ?? durationSec, durationSec)
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const [failed, setFailed] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const baseRef = useRef({ at: 0, pos: 0 })
  const bufferingTimer = useRef<number | undefined>(undefined)

  const ended = position >= limit

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      try {
        const result = audio.play()
        if (result) {
          void result.catch(() => {
            setFailed(true)
            setPlaying(false)
          })
        }
      } catch {
        window.setTimeout(() => {
          setFailed(true)
          setPlaying(false)
        }, 0)
      }
    } else {
      audio.pause()
    }
  }, [playing])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.volume = volume
  }, [volume])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const next =
        baseRef.current.pos + (Date.now() - baseRef.current.at) / 1000
      if (next >= limit) {
        setPosition(limit)
        setPlaying(false)
      } else {
        setPosition(next)
      }
    }, 200)
    return () => window.clearInterval(id)
  }, [playing, limit])

  useEffect(
    () => () => {
      if (bufferingTimer.current) {
        window.clearTimeout(bufferingTimer.current)
      }
    },
    [],
  )

  function toggle() {
    if (failed) {
      setFailed(false)
      setPosition(0)
      return
    }
    if (playing) {
      setPlaying(false)
      return
    }
    if (buffering) return

    const startPos = ended ? 0 : position
    setPosition(startPos)
    setBuffering(true)
    bufferingTimer.current = window.setTimeout(() => {
      baseRef.current = { at: Date.now(), pos: startPos }
      setBuffering(false)
      setPlaying(true)
    }, 500)
  }

  function seek(value: number) {
    const next = Math.min(Math.max(value, 0), limit)
    setPosition(next)
    baseRef.current = { at: Date.now(), pos: next }
    const audio = audioRef.current
    if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = next % audio.duration
    }
    if (next >= limit) setPlaying(false)
  }

  const buttonLabel = buffering
    ? 'Preparing audio'
    : playing
      ? 'Pause'
      : ended
        ? 'Play from the beginning'
        : 'Play'

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-nff-1 md:p-6">
      <div className="flex items-center gap-3 md:gap-4">
        <Button
          type="button"
          size="icon"
          className="size-14 shrink-0 rounded-full"
          aria-label={buttonLabel}
          onClick={toggle}
          disabled={buffering}
        >
          {buffering ? (
            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          ) : playing ? (
            <Pause aria-hidden="true" className="size-5" />
          ) : ended ? (
            <RotateCcw aria-hidden="true" className="size-5" />
          ) : (
            <Play aria-hidden="true" className="size-5" />
          )}
        </Button>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            type="range"
            min={0}
            max={limit}
            step={1}
            value={Math.min(position, limit)}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="Seek"
            className="nff-range"
          />
          <div className="flex items-center justify-between nff-caption text-muted-foreground">
            <span>{formatClock(position)}</span>
            <span>
              {preview ? `Preview · ${formatClock(limit)}` : formatClock(limit)}
            </span>
          </div>
        </div>

        <div className="hidden w-24 shrink-0 items-center gap-2 sm:flex">
          <Volume2
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(volume * 100)}
            onChange={(event) => setVolume(Number(event.target.value) / 100)}
            aria-label="Volume"
            className="nff-range"
          />
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        loop
        preload="metadata"
        className="hidden"
        onError={() => {
          setFailed(true)
          setPlaying(false)
          setBuffering(false)
        }}
      />

      {buffering && (
        <p role="status" className="nff-body-sm text-muted-foreground">
          Preparing audio…
        </p>
      )}

      {failed && (
        <ErrorState
          title="The audio did not start"
          description="Check your connection and try again. Your place will be kept."
          onRetry={() => {
            setFailed(false)
            setPosition(0)
            audioRef.current?.load()
          }}
        />
      )}

      {ended && endedContent && (
        <div className="border-t pt-4">{endedContent}</div>
      )}
    </div>
  )
}
