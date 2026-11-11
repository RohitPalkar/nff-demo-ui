import { useCallback, useMemo } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import type { VideoProgressEvent } from '@/features/video/useVideoController'
import { loadProgress, recordMedia } from '@/services/learning/progress'

/** Ignore tiny positions: a click and an instant pause is not "watched". */
const MIN_RESUME_SEC = 5

/**
 * Saved video progress for the signed-in viewer, via the learning progress
 * service (`recordMedia`). Visitors have no account to save to, so nothing is
 * stored for them (the mini-player still carries their position in memory).
 */
export function useVideoProgress(resourceId: string) {
  const { user } = useAuth()
  const userId = user?.id

  // Read once per viewer/video; later saves must not shift the start point.
  const resumeAtSec = useMemo(() => {
    if (!userId) return 0
    const saved = loadProgress(userId).media[resourceId]
    return saved && saved.positionSec >= MIN_RESUME_SEC ? saved.positionSec : 0
  }, [userId, resourceId])

  const onProgress = useCallback(
    (event: VideoProgressEvent) => {
      if (!userId) return
      recordMedia(userId, resourceId, {
        kind: 'video',
        positionSec: event.positionSec,
        playedDeltaSec: event.playedDeltaSec,
        completed: event.completed,
      })
    },
    [userId, resourceId],
  )

  return { resumeAtSec, onProgress, canSave: !!userId }
}
