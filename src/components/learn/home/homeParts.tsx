import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { ContentItem } from '@/types'
import { HOME_CARD, SECONDARY_ACTION } from './homeStyles'
import { LeafDivider } from './BotanicalIllustrations'

/** Small shared pieces of the Practitioner Home. Presentation only. */

export function HomeSectionHeader({
  id,
  title,
  description,
  link,
}: {
  id: string
  title: string
  description?: string
  link?: { label: string; to: string }
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="nff-heading-h3 text-foreground">
          {title}
        </h2>
        {description && (
          <p className="nff-body-sm text-nff-text-secondary">{description}</p>
        )}
      </div>
      {link && (
        <Link
          to={link.to}
          className="group inline-flex items-center gap-1.5 nff-label-md text-nff-text-brand underline-offset-4 hover:underline nff-focus-ring"
        >
          {link.label}
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </div>
  )
}

export function HomeSection({
  id,
  className,
  children,
}: {
  id: string
  className?: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className={cn('flex min-w-0 flex-col gap-4', className)}>
      {children}
    </section>
  )
}

export function HomeEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: { label: string; to: string }
}) {
  return (
    <div className={cn(HOME_CARD, 'flex flex-col items-start gap-3 p-5')}>
      <div className="flex flex-col gap-1">
        <p className="nff-label-md text-foreground">{title}</p>
        <p className="nff-body-sm text-nff-text-secondary">{description}</p>
      </div>
      {action && (
        <Link to={action.to} className={SECONDARY_ACTION}>
          {action.label}
        </Link>
      )}
    </div>
  )
}

/** Sage progress bar with its value in words. Square ends, opt-in styling. */
export function LearnProgress({
  value,
  label,
  ariaLabel,
}: {
  value: number
  label: string
  ariaLabel: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Progress
        value={value}
        aria-label={ariaLabel}
        aria-valuetext={label}
        className="h-1.5 rounded-none bg-[var(--nff-sage-100)] [&>*]:bg-[var(--nff-sage-600)]"
      />
      <p className="nff-caption text-nff-text-secondary">{label}</p>
    </div>
  )
}

/** Card thumbnail. Decorative: the title next to it carries the meaning. */
export function Thumb({ item, className }: { item: ContentItem; className?: string }) {
  if (!item.image) {
    return <div aria-hidden="true" className={cn('bg-[var(--nff-sage-100)]', className)} />
  }
  return (
    <img
      src={item.image.src}
      alt=""
      loading="lazy"
      decoding="async"
      className={cn('object-cover', className)}
    />
  )
}

export { LeafDivider }
