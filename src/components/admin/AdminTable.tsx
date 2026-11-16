import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

/**
 * The table foundation. The table scrolls horizontally inside its own panel
 * (never the page), the header is quiet, and rows are 40px in the compact
 * density. Compose it from the existing `ui/table` parts:
 *
 *   <AdminTable caption="Explorations">
 *     <TableHeader>... <SortableHead .../> ...</TableHeader>
 *     <TableBody>...</TableBody>
 *   </AdminTable>
 */
export function AdminTable({
  caption,
  children,
  className,
}: {
  /** Names the table for assistive technology. */
  caption: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)]">
      <Table className={className} aria-label={caption}>
        {children}
      </Table>
    </div>
  )
}

export type SortDirection = 'asc' | 'desc'

/**
 * A column header that sorts. The button carries the action; `aria-sort` on
 * the header states the current order. Cycle: ascending, descending.
 */
export function SortableHead({
  label,
  sortKey,
  active,
  direction,
  onSort,
  className,
}: {
  label: string
  sortKey: string
  /** The key the table is currently sorted by. */
  active?: string
  direction?: SortDirection
  onSort: (key: string, direction: SortDirection) => void
  className?: string
}) {
  const isActive = active === sortKey
  const next: SortDirection = isActive && direction === 'asc' ? 'desc' : 'asc'
  const Icon = !isActive ? ChevronsUpDown : direction === 'asc' ? ArrowUp : ArrowDown
  return (
    <TableHead
      scope="col"
      aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={className}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1 px-3 nff-data-table-header"
        onClick={() => onSort(sortKey, next)}
      >
        {label}
        <Icon aria-hidden="true" className="size-3.5" />
        <span className="sr-only">{isActive ? `, sorted ${direction === 'asc' ? 'ascending' : 'descending'}` : ', not sorted'}. Sort {next === 'asc' ? 'ascending' : 'descending'}</span>
      </Button>
    </TableHead>
  )
}

/** Search and filters above a table, with the result count. */
export function TableToolbar({ children, count, noun = 'item' }: { children?: ReactNode; count?: number; noun?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
      {count !== undefined && (
        <p aria-live="polite" className="nff-caption text-[var(--admin-text-muted)]">
          {count} {count === 1 ? noun : `${noun}s`}
        </p>
      )}
    </div>
  )
}

/** Previous/next paging under a table. Renders nothing for a single page. */
export function AdminPagination({
  page,
  pages,
  onPage,
  className,
}: {
  page: number
  pages: number
  onPage: (page: number) => void
  className?: string
}) {
  if (pages <= 1) return null
  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-between pt-2', className)}>
      <span className="nff-caption text-[var(--admin-text-muted)]">
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  )
}
