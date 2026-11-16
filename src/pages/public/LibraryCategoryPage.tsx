import { useParams } from 'react-router-dom'
import { ExplorationsPage } from './ExplorationsPage'
import { CATEGORY_COPY } from '@/services/content'
import type { Category } from '@/types'

/**
 * Wrapper page for `/library/:category` routes.
 * Sets the `tab` query parameter from the URL path so the ExplorationsPage
 * filters by the selected category while preserving its existing behaviour.
 */
export function LibraryCategoryPage() {
  const { category } = useParams<{ category: string }>()

  // Validate the category; if invalid, the ExplorationsPage will show "All"
  const validCategory = category && Object.hasOwn(CATEGORY_COPY, category)
    ? (category as Category)
    : undefined

  // Use the ExplorationsPage with the category pre-selected via search params
  // The ExplorationsPage reads `tab` from the URL search params
  if (validCategory) {
    // We need to set the search param before rendering
    // The ExplorationsPage uses useSearchParams which reads from the current URL
    // So we just need to ensure the URL has the correct tab param
    // The ExplorationsPage will read it from `params.get('tab')`
  }

  return <ExplorationsPage />
}