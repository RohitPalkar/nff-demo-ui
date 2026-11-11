import type { VideoMedia } from '@/types'

export type ResolvedVideoState = 'ready' | 'processing' | 'unavailable'

export interface ResolveOptions {
  /** Captions are required before publishing; default true. */
  requireCaptions?: boolean
}

/**
 * What a viewer may be shown for a video record. Only a 'ready' video with a
 * source (and captions, unless waived) is playable; anything else is a calm
 * in-app state, never a broken player.
 */
export function resolveVideoState(
  video: VideoMedia | undefined,
  { requireCaptions = true }: ResolveOptions = {},
): ResolvedVideoState {
  if (!video) return 'unavailable'
  if (video.availability === 'processing') return 'processing'
  if (video.availability !== 'ready') return 'unavailable'
  if (!video.src) return 'unavailable'
  if (requireCaptions && !video.captionsUrl) return 'unavailable'
  return 'ready'
}

export const VIDEO_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

/** Spoken form for a range's aria-valuetext, e.g. "1 minute 5 seconds". */
export function spokenTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  const parts: string[] = []
  if (m) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`)
  if (s || !m) parts.push(`${s} ${s === 1 ? 'second' : 'seconds'}`)
  return parts.join(' ')
}
