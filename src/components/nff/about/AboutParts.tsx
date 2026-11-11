import { ImageOff } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { AboutPhotoImage } from '@/config/aboutImages'
import { useRevealOnce } from '@/lib/useRevealOnce'
import { cn } from '@/lib/utils'
import { delay } from './aboutLayout'

export function Eyebrow({
  children,
  delayMs = 0,
  className,
}: {
  children: ReactNode
  delayMs?: number
  className?: string
}) {
  return (
    <p
      className={cn(
        'nff-reveal-fade flex items-center gap-3 nff-overline text-nff-text-brand',
        className,
      )}
      style={delay(delayMs)}
    >
      <span aria-hidden="true" className="h-px w-8 bg-current" />
      {children}
    </p>
  )
}

/**
 * Opening of a main part of the page (What we do, How we do it): a numbered
 * eyebrow and large title on the left, the part's lead on the right.
 */
export function ChapterHeader({
  number,
  title,
  lead,
  headingId,
}: {
  number: number
  title: string
  lead: string
  headingId: string
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end md:gap-12 lg:gap-20">
      <div className="flex flex-col items-start gap-5">
        <Eyebrow>
          <span className="font-serif text-[0.9375rem] tracking-normal normal-case">
            {String(number).padStart(2, '0')}
          </span>
          <span aria-hidden="true">·</span>
          {title}
        </Eyebrow>
        <h2 id={headingId} className="nff-display text-balance text-foreground">
          <span className="nff-reveal-line">
            <span style={delay(100)}>{title}</span>
          </span>
        </h2>
      </div>
      <p
        className="nff-reveal-fade max-w-[34rem] nff-reading-lead text-pretty text-nff-text-secondary md:justify-self-end md:pb-2"
        style={delay(240)}
      >
        {lead}
      </p>
    </div>
  )
}

/** Heading on the left, copy on the right, with a hairline above. */
export function SubSection({
  heading,
  paragraphs,
  id,
  className,
  children,
}: {
  heading: string
  paragraphs?: string[]
  id: string
  className?: string
  children?: ReactNode
}) {
  const [ref, shown] = useRevealOnce<HTMLElement>(0.15)
  return (
    <section
      ref={ref}
      aria-labelledby={id}
      data-reveal={shown ? 'shown' : 'pending'}
      className={cn(
        'grid gap-6 border-t border-nff-border-default pt-10 md:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16 xl:gap-24',
        className,
      )}
    >
      <h3 id={id} className="nff-reveal-fade nff-heading-h2 text-balance text-foreground">
        {heading}
      </h3>
      <div className="flex flex-col gap-10">
        {paragraphs && <Paragraphs paragraphs={paragraphs} delayMs={120} className="max-w-[42rem]" />}
        {children}
      </div>
    </section>
  )
}

/** Paragraphs of existing copy; the first can be set as a lead. */
export function Paragraphs({
  paragraphs,
  leadFirst = false,
  delayMs = 0,
  className,
}: {
  paragraphs: string[]
  leadFirst?: boolean
  delayMs?: number
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {paragraphs.map((paragraph, index) => (
        <p
          key={paragraph}
          className={cn(
            'nff-reveal-fade text-pretty',
            leadFirst && index === 0
              ? 'nff-reading-lead text-foreground'
              : 'nff-reading-body text-nff-text-secondary',
          )}
          style={delay(delayMs + index * 80)}
        >
          {paragraph}
        </p>
      ))}
    </div>
  )
}

/**
 * A photograph that fades in once loaded and falls back to a quiet
 * "Image unavailable" panel if it fails (or when `missing` forces it).
 */
export function AboutPhoto({
  image,
  sizes = '100vw',
  eager = false,
  missing = false,
  className,
  children,
}: {
  image: AboutPhotoImage
  sizes?: string
  eager?: boolean
  missing?: boolean
  className?: string
  children?: ReactNode
}) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const fallback = failed || missing

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-[24px] bg-nff-bg-tonal md:rounded-[28px]',
        className,
      )}
    >
      {fallback ? (
        <div
          role="img"
          aria-label="Image unavailable"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-nff-bg-muted text-nff-text-tertiary"
        >
          <ImageOff aria-hidden="true" className="size-6" />
          <span className="nff-body-sm">Image unavailable</span>
        </div>
      ) : (
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes={image.srcSet ? sizes : undefined}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            'nff-card-image absolute inset-0 size-full object-cover',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
      {children}
    </div>
  )
}
