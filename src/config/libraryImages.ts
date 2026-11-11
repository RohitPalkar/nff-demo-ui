import type { Category, ContentImage } from '@/types'

/**
 * Temporary card photography for the home library.
 *
 * All images are from Unsplash under the Unsplash License (free for commercial
 * use, no attribution required; credited here anyway). Each was downloaded
 * once, cropped to 800 x 600 (4:3) WebP and stored in /public/images/library.
 *
 * To replace one with final artwork, drop the new file in the same folder and
 * update `src` and `alt` here. Cards read images from content data, so no
 * component changes are needed.
 *
 * Each category has four images: slots 0-1 go to explorations and 2-3 to
 * meditations (see assignLibraryImages in src/mocks/db.ts).
 */
export interface LibraryImage extends ContentImage {
  credit: string
  source: string
}

type Pool = readonly [LibraryImage, LibraryImage, LibraryImage, LibraryImage]

const dir = '/images/library'

export const LIBRARY_IMAGES: Record<Category, Pool> = {
  foundations: [
    {
      src: `${dir}/foundations-teacup-window-light.webp`,
      alt: 'A cup of tea on a saucer beside an open book in soft window light',
      credit: 'Sixteen Miles Out',
      source: 'https://unsplash.com/photos/SvbDNnbipj0',
    },
    {
      src: `${dir}/foundations-new-leaf.webp`,
      alt: 'A young green seedling unfolding its first leaves',
      credit: 'Guruprasath Chandrasekaran',
      source: 'https://unsplash.com/photos/Ov1rxAh1_AY',
    },
    {
      src: `${dir}/foundations-meadow-morning.webp`,
      alt: 'Tall meadow grass glowing in low morning sun',
      credit: 'Niklas Hamann',
      source: 'https://unsplash.com/photos/Cxjh4S2Pmt8',
    },
    {
      src: `${dir}/foundations-hands-warm-mug.webp`,
      alt: 'Hands in a knitted sweater holding a warm mug',
      credit: 'Kira auf der Heide',
      source: 'https://unsplash.com/photos/ZH8hV44gHEU',
    },
  ],
  understand: [
    {
      src: `${dir}/understand-books-window-sill.webp`,
      alt: 'A stack of books on a bright window sill beside a ceramic bowl',
      credit: 'Derek Prince Ministries',
      source: 'https://unsplash.com/photos/PsKmgOySKyM',
    },
    {
      src: `${dir}/understand-notebook-soft-light.webp`,
      alt: 'A closed notebook and pen on a pale table in soft light',
      credit: 'Bookblock',
      source: 'https://unsplash.com/photos/JPHPdqZrB3I',
    },
    {
      src: `${dir}/understand-morning-linen.webp`,
      alt: 'White pillows and soft bed linen in quiet morning light',
      credit: 'Priscilla Du Preez',
      source: 'https://unsplash.com/photos/LpZMZXXpRcM',
    },
    {
      src: `${dir}/understand-still-lake-mist.webp`,
      alt: 'A still lake reflecting autumn trees in morning mist',
      credit: 'Eugene Lagunov',
      source: 'https://unsplash.com/photos/dD7wg5G28hY',
    },
  ],
  contemplate: [
    {
      src: `${dir}/contemplate-window-seat.webp`,
      alt: 'A person sitting quietly on a window seat, looking outside',
      credit: 'Kelly Sikkema',
      source: 'https://unsplash.com/photos/LZ03UAy1SMc',
    },
    {
      src: `${dir}/contemplate-misty-treeline.webp`,
      alt: 'A treeline fading into warm morning fog',
      credit: 'Philipp',
      source: 'https://unsplash.com/photos/upR8raSXvwg',
    },
    {
      src: `${dir}/contemplate-dock-at-dawn.webp`,
      alt: 'A lone figure at the end of a dock facing the sea at dawn',
      credit: 'Joshua Earle',
      source: 'https://unsplash.com/photos/g1TWbj5XYb4',
    },
    {
      src: `${dir}/contemplate-fog-forest.webp`,
      alt: 'Tall evergreen trees softened by fog',
      credit: 'Dejan Zakic',
      source: 'https://unsplash.com/photos/rr2EF3J5F2Y',
    },
  ],
  explore: [
    {
      src: `${dir}/explore-woodland-path.webp`,
      alt: 'A gravel path running through green woodland',
      credit: 'Megan Lee',
      source: 'https://unsplash.com/photos/sHq15rZgo1g',
    },
    {
      src: `${dir}/explore-wildflowers.webp`,
      alt: 'Delicate white wildflowers in a sunlit field',
      credit: 'Annie Spratt',
      source: 'https://unsplash.com/photos/Ff6lw9hTnEw',
    },
    {
      src: `${dir}/explore-shoreline-walk.webp`,
      alt: 'A person walking through shallow water along a calm shoreline',
      credit: 'Kelli McClintock',
      source: 'https://unsplash.com/photos/mP7wcf3Pxtc',
    },
    {
      src: `${dir}/explore-fern-detail.webp`,
      alt: 'A fern frond in soft green light',
      credit: 'Marek Piwnicki',
      source: 'https://unsplash.com/photos/k6ZUnvmjDnM',
    },
  ],
}
