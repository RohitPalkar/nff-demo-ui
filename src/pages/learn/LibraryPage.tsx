import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SECONDARY_ACTION } from '@/components/learn/home/homeStyles'
import {
  LibraryCategoryNavigation,
  LibraryFilters,
  LibraryResultsSummary,
  LibrarySort,
  type ActiveFilter,
} from '@/components/learn/library/LibraryControls'
import { SOW_SCOPE } from '@/config/sowScope'
import { LibrarySearch } from '@/components/learn/library/LibrarySearch'
import { FeaturedResource, LibraryEmptyState, ResourceGrid } from '@/components/learn/library/ResourceGrid'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { getAccessContext } from '@/services/learning/accessContext'
import {
  FORMAT_LABEL,
  featuredResources,
  filterLibrary,
  libraryCounts,
  listLibraryResources,
  parseCategory,
  parseFormat,
  parseLibrarySort,
  sortLibrary,
} from '@/services/learning/library'
import { CATEGORY_COPY } from '@/services/content'

/** Cards per "Show more". */
const PAGE_SIZE = 24

/**
 * `/learn/library`: search, browse and filter every resource the viewer may
 * open. Rules live in `services/learning/library.ts`; the URL holds the view
 * (q, category, format, sort) so it survives reloads and the back button.
 */
export function LibraryPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  // Search is not in SOW v1.3; ignore a ?q= left in an old link.
  const q = SOW_SCOPE.librarySearch ? (params.get('q') ?? '') : ''
  const category = parseCategory(params.get('category'))
  const format = parseFormat(params.get('format'))
  const sort = parseLibrarySort(params.get('sort'))

  // Synchronous today; a query so a backend can slot in.
  const query = useQuery({
    queryKey: ['library', user?.id],
    queryFn: () => listLibraryResources(getAccessContext(user, { surface: 'learn' })),
    enabled: Boolean(user),
    staleTime: 0,
  })

  const update = (changes: Partial<Record<'q' | 'category' | 'format' | 'sort', string>>) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          const trimmed = value?.trim() ?? ''
          if (!trimmed || trimmed === 'all' || (key === 'sort' && trimmed === 'updated')) next.delete(key)
          else next.set(key, trimmed)
        }
        return next
      },
      { replace: true },
    )
  }

  const resources = query.data
  const view = useMemo(() => {
    if (!resources) return null
    const filters = { q, category, format }
    return {
      results: sortLibrary(filterLibrary(resources, filters), sort),
      counts: libraryCounts(resources, filters),
      featured: featuredResources(resources),
    }
  }, [resources, q, category, format, sort])

  // Paging restarts whenever the view changes.
  const viewKey = [q, category, format, sort].join('|')
  const [paging, setPaging] = useState({ viewKey, limit: PAGE_SIZE })
  const limit = paging.viewKey === viewKey ? paging.limit : PAGE_SIZE

  const active: ActiveFilter[] = [
    ...(q.trim() ? [{ key: 'q' as const, label: `“${q.trim()}”` }] : []),
    ...(category !== 'all' ? [{ key: 'category' as const, label: CATEGORY_COPY[category].label }] : []),
    ...(format !== 'all' ? [{ key: 'format' as const, label: FORMAT_LABEL[format] }] : []),
  ]
  const clearAll = () => update({ q: '', category: 'all', format: 'all' })
  const browsing = active.length === 0

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 sm:px-6 md:gap-10 md:py-12 lg:px-10">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="nff-heading-h1 text-foreground">Explore the Library</h1>
          <p className="max-w-2xl nff-body-lg text-nff-text-secondary">
            Discover learning resources, practices and ideas to explore at your own pace.
          </p>
        </div>
        {SOW_SCOPE.librarySearch && (
          <LibrarySearch value={q} onSearch={(value) => update({ q: value })} />
        )}
      </header>

      {!view ? (
        <div aria-busy="true" aria-label="Loading the library" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-md" />
          ))}
        </div>
      ) : resources!.length === 0 ? (
        <LibraryEmptyState
          title="Nothing in the library for you yet"
          description="Resources you can open will appear here once they are published."
        />
      ) : (
        <>
          {browsing && view.featured.length > 0 && (
            <section aria-labelledby="library-featured" className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 id="library-featured" className="nff-heading-h3 text-foreground">
                  Featured
                </h2>
                <p className="nff-body-sm text-nff-text-secondary">Highlighted by the Meadow team.</p>
              </div>
              <ul className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-6">
                <li className="lg:row-span-2">
                  <FeaturedResource resource={view.featured[0]!} lead />
                </li>
                {view.featured.slice(1).map((resource) => (
                  <li key={resource.item.id}>
                    <FeaturedResource resource={resource} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="library-results" className="flex flex-col gap-5">
            <h2 id="library-results" className="nff-heading-h3 text-foreground">
              {browsing ? 'All resources' : 'Results'}
            </h2>

            <div className="flex flex-col gap-4">
              <LibraryCategoryNavigation
                value={category}
                all={view.counts.all}
                categories={view.counts.categories}
                onChange={(value) => update({ category: value })}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                {view.counts.formats.length > 1 ? (
                  <LibraryFilters
                    value={format}
                    all={view.counts.allFormats}
                    formats={view.counts.formats}
                    onChange={(value) => update({ format: value })}
                  />
                ) : (
                  <span />
                )}
                <LibrarySort value={sort} onChange={(value) => update({ sort: value })} />
              </div>
            </div>

            <LibraryResultsSummary
              shown={Math.min(limit, view.results.length)}
              total={view.results.length}
              active={active}
              onRemove={(key) => update({ [key]: '' })}
              onClearAll={clearAll}
            />

            {view.results.length > 0 ? (
              <>
                <ResourceGrid resources={view.results.slice(0, limit)} />
                {view.results.length > limit && (
                  <button
                    type="button"
                    onClick={() => setPaging({ viewKey, limit: limit + PAGE_SIZE })}
                    className={`${SECONDARY_ACTION} self-center`}
                  >
                    Show more
                  </button>
                )}
              </>
            ) : (
              <LibraryEmptyState
                title={q.trim() ? `No results for “${q.trim()}”` : 'Nothing matches these filters'}
                description="Try a different word, or clear the search and filters to see everything."
                onClear={clearAll}
              />
            )}
          </section>
        </>
      )}
    </div>
  )
}
