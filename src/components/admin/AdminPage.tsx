import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The working area of a page: a centred column with the shell's gutters.
 * Pages are not wrapped in a card; the page itself is the surface. The shell
 * puts every routed page in this container, so a page does not add its own.
 */
export function AdminContentContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto flex w-full max-w-[var(--admin-content-max)] flex-col gap-6 px-[var(--admin-gutter)] py-6', className)}>
      {children}
    </div>
  )
}

/**
 * The page header: title, short description, optional metadata and actions.
 * Breadcrumbs live in the shell's top bar, so they are not repeated here.
 */
export function AdminPageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: string
  description?: string
  /** Primary action first, then secondary ones. */
  actions?: ReactNode
  /** Small status or context next to the title, such as a status badge. */
  meta?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="admin-page-title text-[var(--admin-text)]">{title}</h1>
          {meta}
        </div>
        {description && <p className="max-w-prose nff-body-sm text-[var(--admin-text-muted)]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
