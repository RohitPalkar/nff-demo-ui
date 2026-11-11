import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A heading inside a page, with an optional description and an action on the right. */
export function SectionHeader({
  id,
  title,
  description,
  action,
}: {
  id?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 id={id} className="admin-section-title text-[var(--admin-text)]">
          {title}
        </h2>
        {description && <p className="nff-body-sm text-[var(--admin-text-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/**
 * A titled part of a page. Content sits on the page; pass `surface` only
 * when the group needs to read as a panel (a form, a settings block).
 */
export function ContentSection({
  title,
  description,
  action,
  surface = false,
  children,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  surface?: boolean
  children: ReactNode
  className?: string
}) {
  const id = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <section aria-labelledby={id} className={cn('flex flex-col gap-3', className)}>
      <SectionHeader id={id} title={title} description={description} action={action} />
      <div className={cn(surface && 'rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 sm:p-5')}>{children}</div>
    </section>
  )
}

/** The row above a list or table: search and filters on the left, actions on the right. */
export function PageToolbar({ children, actions }: { children?: ReactNode; actions?: ReactNode }) {
  return (
    <div role="toolbar" aria-label="Page tools" className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Filter controls in a labelled group. Filters wrap rather than scroll. */
export function FilterBar({ label = 'Filters', children }: { label?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      {children}
    </div>
  )
}
