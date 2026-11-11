import type { VideoMedia } from '@/types'
import { DEMO_VIDEO } from './contentVideos'

/**
 * Home page video ("Watch" section).
 *
 * >>> NO REAL VIDEO HAS BEEN SUPPLIED YET. <<<
 * The entry below plays DEMO placeholder footage (public/media/demo), labelled
 * "Demo video" on screen. Replace it with the real video before launch.
 * While `video.availability` is 'unavailable' the section shows a calm
 * "not available yet" state instead of a player. Nothing is fetched and no
 * placeholder footage is used.
 *
 * To switch it on, replace the `video` entry below with real assets served
 * from /public (or your media host) and set availability to 'ready':
 *
 *   video: {
 *     availability: 'ready',
 *     src: '/media/meadow-introduction.mp4',
 *     posterUrl: '/media/meadow-introduction-poster.webp',
 *     captionsUrl: '/media/meadow-introduction.en.vtt',
 *     durationSec: 0, // real duration in seconds
 *   }
 *
 * Requirements before it can go live:
 * - Captions (WebVTT, English) are required. A 'ready' video without
 *   `captionsUrl` is treated as unavailable, so nothing ships uncaptioned.
 * - MP4 (H.264 + AAC) for broad support; keep it under ~25 MB for the
 *   landing page. Use `availability: 'processing'` while it is being encoded.
 * - Poster: 16:9, at least 1280 x 720, WebP or JPEG.
 * - Titles and descriptions below must describe the real video. Do not add
 *   testimonials, statistics or outcome claims to this entry.
 */
export interface LandingVideo {
  /**
   * Stable id used for saved progress ("resume") and for telling this video
   * apart from audio. Do not reuse an id from the content library.
   */
  resourceId: string
  title: string
  /** One or two plain sentences about what the video shows. */
  description: string
  video: VideoMedia
  /** Where the video came from and who may use it. Fill in with the assets. */
  source: string
}

export const LANDING_VIDEO: LandingVideo | null = {
  resourceId: 'landing-welcome-video',
  title: 'Welcome to Meadow',
  description: 'Demo placeholder footage, shown here until the introduction video is ready.',
  video: DEMO_VIDEO('welcome', 36),
  source: 'Demo placeholder generated from the library photos. Not a real Meadow video.',
}
