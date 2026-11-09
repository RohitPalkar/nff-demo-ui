import type { Category } from '@/types'

const CATEGORIES: Category[] = [
  'foundations',
  'understand',
  'contemplate',
  'explore',
]

export function readCategoryParam(value: string | null): Category | undefined {
  return CATEGORIES.find((category) => category === value)
}
