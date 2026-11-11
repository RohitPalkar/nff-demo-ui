import type { VideoMedia } from '@/types'

/**
 * Video for library items (explorations and meditations), by content id.
 *
 * Any item listed here is a video lesson: its card shows a "Video" chip (and a
 * silent hover preview once the video is ready), and its detail and lesson
 * pages show the video player above the reading or audio, which stays.
 *
 * >>> DEMO ENTRIES. NO REAL VIDEO HAS BEEN SUPPLIED. <<<
 * The files in /public/media/demo are placeholder footage generated for the
 * demo from the library photos and the demo audio tone; each is labelled
 * "Demo video" on screen and in its captions. Replace them with real assets
 * (MP4, WebVTT captions required, poster 16:9), or delete these entries,
 * before launch. `med-5` stays 'unavailable' so that state can still be seen.
 *
 * Long term this belongs on `Resource.video` (src/types/learning.ts), set by
 * the CMS; `getContentVideo` already reads `Resource.video` first.
 */
const demo = (name: 'welcome' | 'lesson' | 'outdoors', durationSec: number): VideoMedia => ({
  availability: 'ready',
  src: `/media/demo/demo-${name}.mp4`,
  posterUrl: `/media/demo/demo-${name}-poster.webp`,
  captionsUrl: `/media/demo/demo-${name}.en.vtt`,
  durationSec,
})

export const DEMO_VIDEO = demo

export const CONTENT_VIDEOS: Readonly<Record<string, VideoMedia>> = {
  'exp-1': demo('welcome', 36),
  'exp-7': demo('lesson', 30),
  'exp-20': demo('lesson', 30),
  'med-56': demo('outdoors', 30),
  'med-5': { availability: 'unavailable' },
}
