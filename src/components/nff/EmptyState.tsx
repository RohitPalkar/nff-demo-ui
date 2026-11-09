import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-nff-border-strong bg-nff-bg-surface-sunken px-6 py-12 text-center"
    >
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-nff-bg-muted text-nff-icon-secondary"
      >
        <Icon className="size-6" />
      </span>
      <div className="flex max-w-prose flex-col gap-2">
        <h3 className="nff-title-section text-foreground">{title}</h3>
        <p className="nff-body-md text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}
