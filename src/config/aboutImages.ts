/**
 * Photography for the About page.
 *
 * These are larger crops of photographs already used as library card images
 * (see src/config/libraryImages.ts), from Unsplash under the Unsplash License
 * (free for commercial use, no attribution required; credited here anyway).
 * Each was downloaded once from the Unsplash CDN at 2400px, converted to WebP
 * and stored in /public/images/about.
 *
 * To replace one, drop the new file in that folder and update this record.
 */
export interface AboutPhotoImage {
  src: string
  /** Responsive candidates for `srcset`. */
  srcSet?: string
  alt: string
  width: number
  height: number
  credit: string
  source: string
}

const dir = '/images/about'

export const ABOUT_IMAGES = {
  /** Wide band under the introduction. */
  intro: {
    src: `${dir}/misty-treeline-2000.webp`,
    srcSet: `${dir}/misty-treeline-1200.webp 1200w, ${dir}/misty-treeline-2000.webp 2000w`,
    alt: 'A treeline fading into warm morning fog',
    width: 2000,
    height: 1333,
    credit: 'Philipp',
    source: 'https://unsplash.com/photos/upR8raSXvwg',
  },
  /** Beside "The people behind it". */
  people: {
    src: `${dir}/hands-warm-mug-1200.webp`,
    alt: 'Hands in a knitted sweater holding a warm mug',
    width: 1200,
    height: 800,
    credit: 'Kira auf der Heide',
    source: 'https://unsplash.com/photos/ZH8hV44gHEU',
  },
  /** Full-width band in "How we do it", carrying the path caption. */
  path: {
    src: `${dir}/woodland-path-2000.webp`,
    srcSet: `${dir}/woodland-path-1200.webp 1200w, ${dir}/woodland-path-2000.webp 2000w`,
    alt: 'A gravel path running through green woodland',
    width: 2000,
    height: 1410,
    credit: 'Megan Lee',
    source: 'https://unsplash.com/photos/sHq15rZgo1g',
  },
} satisfies Record<string, AboutPhotoImage>
