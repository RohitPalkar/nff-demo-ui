/**
 * Background photograph for the registration panel (AccountRegistrationCTA).
 *
 * Reuses the misty treeline already stored for the About page (Unsplash
 * License; credited in src/config/aboutImages.ts). It sits under a forest
 * overlay, so it is decorative and has no alt text.
 */
export interface CtaImage {
  src: string
  srcSet?: string
}

export const CTA_IMAGE: CtaImage = {
  src: '/images/about/misty-treeline-2000.webp',
  srcSet:
    '/images/about/misty-treeline-1200.webp 1200w, /images/about/misty-treeline-2000.webp 2000w',
}
