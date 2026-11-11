import type { LibraryImage } from '@/config/libraryImages'

/**
 * Temporary photography for the home "Featured this week" cards, keyed by
 * exploration id. Featuring is the CMS "Featured on home" flag; these are the
 * six explorations that carry it in the demo data. Featured pieces get their
 * own images so they do not repeat the library cards shown just above.
 *
 * All images are from Unsplash under the Unsplash License (free for commercial
 * use, no attribution required; credited here anyway), cropped to 800 x 600
 * (4:3) WebP and stored in /public/images/featured.
 *
 * To replace one, drop the new file in that folder and update `src` and `alt`.
 * An exploration featured later without an entry here falls back to its
 * library image, so a featured card always has a photograph.
 */
const dir = '/images/featured'

export const FEATURED_IMAGES: Record<string, LibraryImage> = {
  // What is Meadow?
  'exp-1': {
    src: `${dir}/featured-dawn-over-misty-ridges.webp`,
    alt: 'A low sun rising over layered ridges above a valley filled with mist',
    credit: 'Ravi Sharma',
    source: 'https://unsplash.com/photos/hNv5s6NEYig',
  },
  // Making time for practice
  'exp-8': {
    src: `${dir}/featured-writing-at-quiet-desk.webp`,
    alt: 'A hand writing in a notebook beside a mug and a small vase on a wooden desk',
    credit: 'Priscilla Du Preez',
    source: 'https://unsplash.com/photos/ZDDF6LMvh2s',
  },
  // Sleep and the restful mind
  'exp-15': {
    src: `${dir}/featured-crescent-moon-at-dusk.webp`,
    alt: 'A thin crescent moon in a deep blue dusk sky above dark hills',
    credit: 'Jordan Steranka',
    source: 'https://unsplash.com/photos/JPdapbV4C6Q',
  },
  // The space between thoughts
  'exp-22': {
    src: `${dir}/featured-still-sea-horizon.webp`,
    alt: 'A still sea meeting a soft grey sky at the horizon',
    credit: 'Nick Fewings',
    source: 'https://unsplash.com/photos/YkA7CLrMg8g',
  },
  // Sitting with uncertainty
  'exp-29': {
    src: `${dir}/featured-path-through-fog.webp`,
    alt: 'A dirt path disappearing into a quiet forest filled with fog',
    credit: 'Marek Szturc',
    source: 'https://unsplash.com/photos/4CDdd1RCt6w',
  },
  // Time outdoors, time inward
  'exp-36': {
    src: `${dir}/featured-overlooking-the-valley.webp`,
    alt: 'A person sitting on a rocky ridge, looking out over a misty valley',
    credit: 'Phoenix Williams',
    source: 'https://unsplash.com/photos/2xSOE4kN8MA',
  },
}
