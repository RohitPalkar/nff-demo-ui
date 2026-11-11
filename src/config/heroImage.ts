/**
 * Home hero photograph.
 *
 * Leave as null until a licensed photograph is approved; the hero then shows
 * its designed forest backdrop instead of a placeholder or a broken URL.
 *
 * Image requirements (see the hero report for the full brief):
 * - Subject: a person in quiet reflection or learning (reading, listening,
 *   looking out of a window, journalling). Not yoga or spa imagery.
 * - Light: soft, natural, warm-to-neutral; darker tones on the left/lower-left
 *   so ivory text reads without heavy overlays.
 * - Desktop: landscape, at least 2400 x 1350, subject on the right third.
 * - Mobile: portrait or 4:5 crop, at least 1200 x 1500, subject in the top half.
 * - Format: AVIF or WebP with a JPEG fallback, under 350 KB per file.
 * - Licence: owned by Meadow or free for commercial use; record the source below.
 */
export interface HeroImage {
  /** Landscape crop for ≥768px, served from /public. */
  desktop: string
  /** Portrait crop for <768px. Falls back to `desktop`. */
  mobile?: string
  /** Describes the photograph; never empty for a meaningful image. */
  alt: string
  /** CSS object-position for each crop, to keep the focal point in view. */
  focus?: { desktop?: string; mobile?: string }
  /** Where the image came from and under what licence. */
  source: string
}

export const HERO_IMAGE: HeroImage | null = null
