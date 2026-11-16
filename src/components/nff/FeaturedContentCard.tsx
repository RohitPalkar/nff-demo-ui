import type { CSSProperties } from 'react'
import { LibraryContentCard } from '@/components/nff/LibraryContentCard'
import type { ContentImage } from '@/types'

export interface FeaturedContentCardProps {
  title: string
  description: string
  href: string
  image?: ContentImage
  stage?: number
  readingTimeMin?: number
  /** Action label; defaults to "Read exploration". */
  ctaLabel?: string
  className?: string
  style?: CSSProperties
}

/** Featured reading, rendered through the shared LibraryContentCard. */
export function FeaturedContentCard(props: FeaturedContentCardProps) {
  return <LibraryContentCard kind="exploration" {...props} />
}
