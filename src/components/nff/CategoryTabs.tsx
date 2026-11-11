import { ButtonGroup, type ButtonGroupItem } from '@/components/nff/ButtonGroup'
import { CATEGORY_COPY } from '@/services/content'
import type { Category } from '@/types'

const ALL = 'all'
type CategoryValue = Category | typeof ALL

const ITEMS: ButtonGroupItem<CategoryValue>[] = [
  { value: ALL, label: 'All' },
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

/** Catalogue category filter: the shared ButtonGroup in link mode. */
export function CategoryTabs({ active, hrefFor, label = 'Filter by category' }: CategoryTabsProps) {
  return (
    <ButtonGroup
      label={label}
      items={ITEMS}
      value={active ?? ALL}
      hrefFor={(value) => hrefFor(value === ALL ? undefined : value)}
    />
  )
}
