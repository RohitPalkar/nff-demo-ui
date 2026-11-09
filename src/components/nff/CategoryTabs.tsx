import { Link } from 'react-router-dom'
import { CATEGORY_COPY } from '@/services/content'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

const TABS: Array<{ value: Category; label: string }> = [
  { value: 'foundations', label: CATEGORY_COPY.foundations.label },
  { value: 'understand', label: CATEGORY_COPY.understand.label },
  { value: 'contemplate', label: CATEGORY_COPY.contemplate.label },
  { value: 'explore', label: CATEGORY_COPY.explore.label },
]

interface CategoryTabsProps {
  active?: Category
  hrefFor: (category?: Category) => string
  label?: string
}

export function CategoryTabs({
  active,
  hrefFor,
  label = 'Filter by category',
}: CategoryTabsProps) {
  return (
    <nav aria-label={label}>
      <ul className="flex gap-1 overflow-x-auto rounded-lg border bg-nff-bg-muted p-1">
        <li className="shrink-0">
          <Link
            to={hrefFor(undefined)}
            aria-current={active ? undefined : 'page'}
            className={cn(
              'inline-flex min-h-11 items-center rounded-md px-4 nff-label-md transition-colors nff-focus-ring',
              active
                ? 'text-muted-foreground hover:bg-nff-bg-hover hover:text-foreground'
                : 'bg-background text-foreground shadow-nff-1',
            )}
          >
            All
          </Link>
        </li>
        {TABS.map((tab) => {
          const isActive = active === tab.value
          return (
            <li key={tab.value} className="shrink-0">
              <Link
                to={hrefFor(tab.value)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-md px-4 nff-label-md transition-colors nff-focus-ring',
                  isActive
                    ? 'bg-background text-foreground shadow-nff-1'
                    : 'text-muted-foreground hover:bg-nff-bg-hover hover:text-foreground',
                )}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
