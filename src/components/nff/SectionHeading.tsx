import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  id?: string
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="flex max-w-2xl flex-col gap-2">
        <p className="nff-overline text-nff-text-brand">{eyebrow}</p>
        <h2 id={id} className="nff-heading-h2 text-foreground">
          {title}
        </h2>
        {description && (
          <p className="nff-body-lg text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
