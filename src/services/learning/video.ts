import { CONTENT_VIDEOS } from '@/config/contentVideos'
import { SOW_SCOPE } from '@/config/sowScope'
import type { VideoMedia } from '@/types'
import { getResource } from './catalogue'

/**
 * The video for a library item, if it is a video lesson. `Resource.video`
 * (the learning model) wins over the demo config.
 */
export function getContentVideo(itemId: string): VideoMedia | undefined {
  // Video is out of scope in SOW v1.3 (see config/sowScope.ts).
  if (!SOW_SCOPE.video) return undefined
  return getResource(itemId)?.video ?? CONTENT_VIDEOS[itemId]
}

/**
 * Saved-progress id for an item's video. Kept apart from the item id so a
 * meditation's video position never overwrites its audio position.
 */
export const VIDEO_PROGRESS_SUFFIX = '#video'
export const videoProgressId = (itemId: string) => `${itemId}${VIDEO_PROGRESS_SUFFIX}`

/** The content id behind a video progress id, or undefined if it is not one. */
export function itemIdForVideoProgress(progressId: string): string | undefined {
  return progressId.endsWith(VIDEO_PROGRESS_SUFFIX)
    ? progressId.slice(0, -VIDEO_PROGRESS_SUFFIX.length)
    : undefined
}
