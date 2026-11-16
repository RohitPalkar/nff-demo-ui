import { Search, SearchX, X, type LucideIcon } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { EmptyState } from './AdminFeedback'
import { SortableHead, type SortDirection } from './AdminTable'

/**
 * The one list table for the Admin. Give it rows and column definitions; it
 * adds search, filters, saved views (tabs with counts), sorting, paging and an
 * empty state. On a phone each row becomes a card (same DOM, see admin.css),
 * so nothing scrolls sideways.
 *
 *   <DataTable
 *     caption="Explorations"
 *     rows={items}
 *     getRowId={(item) => item.id}
 *     columns={[{ id: 'title', header: 'Title', cell: (item) => item.title, sortValue: (item) => item.title }]}
 *     search={{ placeholder: 'Search title', text: (item) => [item.title] }}
 *     filters={[{ id: 'stage', label: 'Stage', options, predicate: (item, value) => item.stageId === value }]}
 *   />
 */

export interface DataTableColumn<T> {
  id: string
  header: string
  cell: (row: T) => ReactNode
  /** Makes the column sortable. */
  sortValue?: (row: T) => string | number
  className?: string
  /** Hide the header text (an actions column). The cell still renders. */
  hideHeader?: boolean
  /** The row's title: on a phone it heads the card, without a label. */
  primary?: boolean
  align?: 'start' | 'end'
}

export interface DataTableFilter<T> {
  id: string
  /** "Status": the trigger reads "Any status" until something is picked. */
  label: string
  options: Array<{ value: string; label: string }>
  predicate: (row: T, value: string) => boolean
}

export interface DataTableView<T> {
  id: string
  label: string
  predicate: (row: T) => boolean
}

export interface DataTableProps<T> {
  /** Names the table for assistive technology. */
  caption: string
  rows: readonly T[]
  columns: Array<DataTableColumn<T>>
  getRowId: (row: T) => string
  /** Singular noun for the count: "3 explorations". */
  noun: string
  search?: { placeholder: string; text: (row: T) => Array<string | undefined | null> }
  filters?: Array<DataTableFilter<T>>
  /** Tabs above the table, each with its count. The first is selected by default. */
  views?: Array<DataTableView<T>>
  view?: string
  onViewChange?: (view: string) => void
  initialSort?: { id: string; direction: SortDirection }
  pageSize?: number
  /** Shown on the right of the toolbar. */
  actions?: ReactNode
  /** When there are no rows at all (not when a search finds nothing). */
  empty: { icon: LucideIcon; title: string; description: string; action?: ReactNode }
  rowClassName?: (row: T) => string | undefined
  /** Marks the selected row (an open review, an open editor). */
  selectedId?: string | null
}

const pluralise = (count: number, noun: string) => `${count} ${count === 1 ? noun : `${noun}s`}`

export function DataTable<T>({
  caption,
  rows,
  columns,
  getRowId,
  noun,
  search,
  filters = [],
  views,
  view: controlledView,
  onViewChange,
  initialSort,
  pageSize = 10,
  actions,
  empty,
  rowClassName,
  selectedId,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [ownView, setOwnView] = useState(views?.[0]?.id ?? '')
  const [sort, setSort] = useState<{ id: string; direction: SortDirection } | null>(initialSort ?? null)
  const [page, setPage] = useState(1)

  const view = controlledView ?? ownView
  const activeView = views?.find((entry) => entry.id === view) ?? views?.[0]

  function changeView(next: string) {
    setOwnView(next)
    onViewChange?.(next)
    setPage(1)
  }

  // Search and filters first; views count what is left, so the counts match the tabs.
  const matched = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (q && search && !search.text(row).some((text) => text?.toLowerCase().includes(q))) return false
      return filters.every((filter) => {
        const value = values[filter.id]
        return !value || value === 'all' || filter.predicate(row, value)
      })
    })
  }, [rows, query, search, filters, values])

  const inView = useMemo(
    () => (activeView ? matched.filter(activeView.predicate) : matched),
    [matched, activeView],
  )

  const sorted = useMemo(() => {
    const column = sort ? columns.find((entry) => entry.id === sort.id) : undefined
    if (!sort || !column?.sortValue) return inView
    const by = column.sortValue
    const factor = sort.direction === 'asc' ? 1 : -1
    return [...inView].sort((a, b) => {
      const x = by(a)
      const y = by(b)
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * factor
      return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' }) * factor
    })
  }, [inView, sort, columns])

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const current = Math.min(page, pages)
  const slice = sorted.slice((current - 1) * pageSize, current * pageSize)
  const activeFilters = filters.filter((filter) => values[filter.id] && values[filter.id] !== 'all')
  const narrowed = query.trim() !== '' || activeFilters.length > 0

  function clearAll() {
    setQuery('')
    setValues({})
    setPage(1)
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {actions && <div className="flex justify-end">{actions}</div>}
        <EmptyState icon={empty.icon} title={empty.title} description={empty.description} action={empty.action} />
      </div>
    )
  }

  return (
    <div className="admin-dt flex min-w-0 flex-col gap-3">
      {views && views.length > 1 && (
        <div role="tablist" aria-label={`${caption} views`} className="admin-dt-views">
          {views.map((entry) => {
            const count = matched.filter(entry.predicate).length
            const selected = entry.id === activeView?.id
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={selected}
                data-state={selected ? 'active' : 'inactive'}
                className="admin-dt-view nff-target nff-focus-ring"
                onClick={() => changeView(entry.id)}
              >
                {entry.label}
                <span className="admin-dt-count" aria-label={`, ${count}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div role="toolbar" aria-label={`${caption} search and filters`} className="admin-dt-toolbar">
        {search && (
          <div className="relative w-full sm:w-72">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--admin-text-muted)]" />
            <Input
              type="search"
              aria-label={`Search ${caption.toLowerCase()}`}
              placeholder={search.placeholder}
              className="pr-10 pl-9"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                className="nff-target absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] nff-focus-ring"
                onClick={() => setQuery('')}
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            )}
          </div>
        )}
        {filters.map((filter) => (
          <Select
            key={filter.id}
            value={values[filter.id] ?? 'all'}
            onValueChange={(value) => {
              setValues((current) => ({ ...current, [filter.id]: value }))
              setPage(1)
            }}
          >
            <SelectTrigger
              aria-label={filter.label}
              className={cn(
                'w-full bg-[var(--admin-surface)] data-[size=default]:h-11 sm:w-auto sm:min-w-40',
                values[filter.id] && values[filter.id] !== 'all' && 'border-[var(--admin-primary)] bg-[var(--admin-nav-active-bg)]',
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any {filter.label.toLowerCase()}</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        {narrowed && (
          <Button type="button" variant="ghost" size="sm" className="h-11" onClick={clearAll}>
            <X aria-hidden="true" className="size-4" />
            Clear
          </Button>
        )}
        <div className="admin-dt-toolbar-end">
          <p aria-live="polite" className="nff-caption whitespace-nowrap text-[var(--admin-text-muted)]">
            {narrowed || (activeView && views && views.length > 1)
              ? `${sorted.length} of ${pluralise(rows.length, noun)}`
              : pluralise(rows.length, noun)}
          </p>
          {actions}
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={narrowed ? 'No matches' : 'Nothing here'}
          description={
            narrowed
              ? 'Nothing matches the search and filters. Try fewer filters.'
              : `There are no ${noun}s in this view yet.`
          }
          action={
            narrowed ? (
              <Button type="button" size="sm" variant="outline" onClick={clearAll}>
                Clear search and filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="admin-dt-frame">
          <table aria-label={caption} className="admin-dt-table w-full caption-bottom text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((column) =>
                  column.sortValue ? (
                    <SortableHead
                      key={column.id}
                      label={column.header}
                      sortKey={column.id}
                      active={sort?.id}
                      direction={sort?.direction}
                      onSort={(id, direction) => setSort({ id, direction })}
                      className={cn(column.className, column.align === 'end' && 'text-right')}
                    />
                  ) : (
                    <TableHead key={column.id} scope="col" className={cn(column.className, column.align === 'end' && 'text-right')}>
                      {column.hideHeader ? <span className="sr-only">{column.header}</span> : column.header}
                    </TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.map((row) => {
                const id = getRowId(row)
                return (
                  <TableRow
                    key={id}
                    data-state={selectedId === id ? 'selected' : undefined}
                    className={rowClassName?.(row)}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        data-label={column.hideHeader || column.primary ? undefined : column.header}
                        data-primary={column.primary ? '' : undefined}
                        data-actions={column.hideHeader ? '' : undefined}
                        className={cn(column.className, column.align === 'end' && 'text-right')}
                      >
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label={`${caption} pages`} className="flex flex-wrap items-center justify-between gap-2">
          <span className="nff-caption text-[var(--admin-text-muted)]">
            {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, sorted.length)} of {sorted.length} · Page {current} of {pages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={current >= pages} onClick={() => setPage(current + 1)}>
              Next
            </Button>
          </div>
        </nav>
      )}
    </div>
  )
}

/** Name over a quiet second line, the usual first cell. */
export function CellStack({ title, meta, children }: { title: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate font-medium text-[var(--admin-text)]">{title}</span>
      {meta && <span className="truncate nff-caption text-[var(--admin-text-muted)]">{meta}</span>}
      {children}
    </div>
  )
}

/** Initials in a square-ish tile, for people tables. */
export function Initials({ name, className }: { name: string; className?: string }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--admin-nav-active-bg)] nff-label-sm text-[var(--admin-primary)]',
        className,
      )}
    >
      {letters}
    </span>
  )
}
