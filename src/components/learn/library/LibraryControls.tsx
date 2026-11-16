import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  LIBRARY_SORTS,
  LIBRARY_SORT_LABEL,
  type LibraryFormat,
  type LibrarySort as LibrarySortValue,
} from '@/services/learning/library'
import type { Category } from '@/types'

/** Category, format and sort controls, and the results line. Presentation only. */

const CHIP =
  'inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3.5 nff-label-md transition-colors nff-focus-ring'
const CHIP_OFF =
  'border-nff-border-default bg-nff-bg-surface text-nff-text-secondary hover:border-[var(--nff-forest-800)] hover:text-foreground'
const CHIP_ON = 'border-[var(--nff-border-active)] bg-[var(--nff-bg-active)] text-[var(--nff-text-active)]'

function Count({ value, active }: { value: number; active: boolean }) {
  return (
    <span
      className={cn(
        'rounded-sm px-1.5 nff-caption',
        active ? 'bg-[var(--nff-ivory-50)]/15 text-[var(--nff-ivory-50)]' : 'bg-[var(--nff-sage-100)] text-[var(--nff-forest-900)]',
      )}
    >
      {value}
    </span>
  )
}

export function LibraryCategoryNavigation({
  value,
  all,
  categories,
  onChange,
}: {
  value: Category | 'all'
  all: number
  categories: { category: Category; label: string; count: number }[]
  onChange: (value: Category | 'all') => void
}) {
  const options = [{ category: 'all' as const, label: 'All', count: all }, ...categories]
  return (
    <nav aria-label="Library categories" className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-2">
        {options.map((option) => {
          const active = option.category === value
          return (
            <li key={option.category}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onChange(option.category)}
                className={cn(CHIP, active ? CHIP_ON : CHIP_OFF)}
              >
                {option.label}
                <Count value={option.count} active={active} />
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function LibraryFilters({
  value,
  all,
  formats,
  onChange,
}: {
  value: LibraryFormat | 'all'
  all: number
  formats: { format: LibraryFormat; label: string; count: number }[]
  onChange: (value: LibraryFormat | 'all') => void
}) {
  const options = [{ format: 'all' as const, label: 'All formats', count: all }, ...formats]
  return (
    <div
      role="group"
      aria-label="Format"
      className="flex max-w-full gap-1 overflow-x-auto rounded-md border border-nff-border-default bg-nff-bg-surface p-1"
    >
      {options.map((option) => {
        const active = option.format === value
        return (
          <button
            key={option.format}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.format)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-sm px-2.5 nff-label-md transition-colors nff-focus-ring sm:px-3',
              active
                ? 'bg-[var(--nff-bg-active)] text-[var(--nff-text-active)] border border-[var(--nff-border-active)]'
                : 'text-nff-text-secondary hover:text-foreground',
            )}
          >
            {option.format === 'all' ? (
              <>
                <span className="sm:hidden">All</span>
                <span className="max-sm:hidden">{option.label}</span>
              </>
            ) : (
              option.label
            )}
            <span className="nff-caption opacity-80">{option.count}</span>
          </button>
        )
      })}
    </div>
  )
}

export function LibrarySort({
  value,
  onChange,
}: {
  value: LibrarySortValue
  onChange: (value: LibrarySortValue) => void
}) {
  return (
    <label className="flex items-center gap-2 nff-label-md text-nff-text-secondary">
      Sort by
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as LibrarySortValue)}
        className="h-10 rounded-md border border-nff-border-strong bg-nff-bg-surface px-3 nff-body-sm text-foreground nff-focus-ring"
      >
        {LIBRARY_SORTS.map((option) => (
          <option key={option} value={option}>
            {LIBRARY_SORT_LABEL[option]}
          </option>
        ))}
      </select>
    </label>
  )
}

export interface ActiveFilter {
  key: 'q' | 'category' | 'format' | 'ready'
  label: string
}

export function LibraryResultsSummary({
  shown,
  total,
  active,
  onRemove,
  onClearAll,
  noun = 'resource',
}: {
  shown: number
  total: number
  active: ActiveFilter[]
  onRemove: (key: ActiveFilter['key']) => void
  onClearAll: () => void
  /** What is being counted, singular. */
  noun?: string
}) {
  const word = total === 1 ? noun : `${noun}s`
  return (
    <div className="flex flex-col gap-3">
      <p className="nff-body-sm text-nff-text-secondary" aria-live="polite" aria-atomic="true">
        {total === 0
          ? `No ${noun}s match`
          : shown < total
            ? `Showing ${shown} of ${total} ${word}`
            : `${total} ${word}`}
      </p>
      {active.length > 0 && (
        <ul aria-label="Active filters" className="flex flex-wrap items-center gap-2">
          {active.map((filter) => (
            <li key={filter.key}>
              <button
                type="button"
                onClick={() => onRemove(filter.key)}
                aria-label={`Remove filter: ${filter.label}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-[var(--nff-sage-100)] pl-2.5 pr-2 nff-label-sm text-[var(--nff-forest-900)] transition-colors hover:bg-[var(--nff-sage-200)] nff-focus-ring"
              >
                {filter.label}
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
          {active.length > 1 && (
            <li>
              <button
                type="button"
                onClick={onClearAll}
                className="h-8 px-1 nff-label-sm text-nff-text-brand underline underline-offset-4 nff-focus-ring"
              >
                Clear all
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
