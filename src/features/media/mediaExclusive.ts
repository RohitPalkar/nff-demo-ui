/**
 * One media at a time.
 *
 * Anything that starts audible playback (the global audio player, the card
 * preview, a video) claims the single slot. Claiming pauses whoever held it.
 * Holders release the slot when they pause, end or unmount.
 *
 * A plain module (not React state) so the audio player, card previews and
 * video can coordinate without importing each other.
 */
export type MediaKind = 'audio' | 'video'

export interface MediaClaim {
  /** Unique per playing thing, e.g. `video:landing-welcome-video`. */
  id: string
  kind: MediaKind
  /** Pause this media. Must be safe to call when it is already paused. */
  pause: () => void
}

let current: MediaClaim | null = null

export function claimMedia(claim: MediaClaim) {
  const previous = current
  // Take the slot first, so a pause event fired by `previous` cannot
  // release the new holder.
  current = claim
  if (previous && previous.id !== claim.id) previous.pause()
}

export function releaseMedia(id: string) {
  if (current?.id === id) current = null
}

export function getActiveMedia(): MediaClaim | null {
  return current
}

/** Test helper. */
export function resetMediaClaims() {
  current = null
}
