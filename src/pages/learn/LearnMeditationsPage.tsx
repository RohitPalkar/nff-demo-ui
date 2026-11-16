import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SECONDARY_ACTION } from '@/components/learn/home/homeStyles'
import {
  LibraryCategoryNavigation,
  LibraryResultsSummary,
  LibrarySort,
  type ActiveFilter,
} from '@/components/learn/library/LibraryControls'
import { FeaturedResource, LibraryEmptyState } from '@/components/learn/library/ResourceGrid'
import { MeditationContinueCard, MeditationGrid } from '@/components/learn/meditations/MeditationCards'
import { SOW_SCOPE } from '@/config/sowScope'
import { MeditationsHeader } from '@/components/learn/meditations/MeditationsHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { CATEGORY_COPY } from '@/services/content'
import { getAccessContext } from '@/services/learning/accessContext'
import { featuredResources, parseCategory, parseLibrarySort, sortLibrary } from '@/services/learning/library'
import {
  continueListening,
  filterMeditations,
  isPlayable,
  listMeditations,
  meditationCategories,
} from '@/services/learning/meditations'
import { loadProgress } from '@/services/learning/progress'

/** Cards per "Show more". */
const PAGE_SIZE = 24

/**
 * `/learn/meditations`: the audio side of the library as its own place.
 * Rules live in `services/learning/meditations.ts`; the URL holds the view
 * (q, category, ready, sort). "Continue listening" appears only when the
 * player has saved a real position.
 */
export function LearnMeditationsPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  // Search is not in SOW v1.3; ignore a ?q= left in an old link.
  const q = SOW_SCOPE.librarySearch ? (params.get('q') ?? '') : ''
  const category = parseCategory(params.get('category'))
  const readyOnly = params.get('ready') === '1'
  const sort = parseLibrarySort(params.get('sort'))

  const query = useQuery({
    queryKey: ['meditations', user?.id],
    queryFn: () => {
      const ctx = getAccessContext(user, { surface: 'learn', withProgress: true })
      return listMeditations(ctx, ctx.progress ?? loadProgress(user!.id))
    },
    enabled: Boolean(user),
    staleTime: 0,
  })

  const update = (changes: Partial<Record<'q' | 'category' | 'ready' | 'sort', string>>) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          const trimmed = value?.trim() ?? ''
          if (!trimmed || trimmed === 'all' || trimmed === '0' || (key === 'sort' && trimmed === 'updated')) next.delete(key)
          else next.set(key, trimmed)
        }
        return next
      },
      { replace: true },
    )

  const entries = query.data
  const view = useMemo(() => {
    if (!entries) return null
    const filters = { q, category, readyOnly }
    return {
      results: sortLibrary(filterMeditations(entries, filters), sort),
      nav: meditationCategories(entries, filters),
      resume: continueListening(entries),
      featured: featuredResources(entries.filter(isPlayable), 3),
    }
  }, [entries, q, category, readyOnly, sort])

  const viewKey = [q, category, readyOnly, sort].join('|')
  const [paging, setPaging] = useState({ viewKey, limit: PAGE_SIZE })
  const limit = paging.viewKey === viewKey ? paging.limit : PAGE_SIZE

  const active: ActiveFilter[] = [
    ...(q.trim() ? [{ key: 'q' as const, label: `“${q.trim()}”` }] : []),
    ...(category !== 'all' ? [{ key: 'category' as const, label: CATEGORY_COPY[category].label }] : []),
    ...(readyOnly ? [{ key: 'ready' as const, label: 'Ready to play' }] : []),
  ]
  const clearAll = () => update({ q: '', category: 'all', ready: '0' })
  const browsing = active.length === 0

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 sm:px-6 md:gap-10 md:py-12 lg:px-10">
      <MeditationsHeader
        query={q}
        onSearch={(value) => update({ q: value })}
        image={view?.featured[0]?.item.image}
      />

      {!view ? (
        <div aria-busy="true" aria-label="Loading meditations" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-md" />
          ))}
        </div>
      ) : entries!.length === 0 ? (
        <LibraryEmptyState
          title="No meditations for you yet"
          description="Meditations you can open will appear here once they are published."
        />
      ) : (
        <>
          {browsing && view.resume.length > 0 && (
            <section aria-labelledby="meditations-continue" className="flex flex-col gap-4">
              <h2 id="meditations-continue" className="nff-heading-h3 text-foreground">
                Continue listening
              </h2>
              {/* auto-fit: one or two saved meditations stretch across the row instead of leaving an empty column (at most three, see continueListening). */}
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]">
                {view.resume.map((entry) => (
                  <li key={entry.item.id}>
                    <MeditationContinueCard entry={entry} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {browsing && view.featured.length > 0 && (
            <section aria-labelledby="meditations-featured" className="flex flex-col gap-4">
              <h2 id="meditations-featured" className="nff-heading-h3 text-foreground">
                Featured
              </h2>
              <ul className="grid gap-4 md:grid-cols-3">
                {view.featured.map((entry) => (
                  <li key={entry.item.id}>
                    <FeaturedResource resource={entry} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="meditations-browse" className="flex flex-col gap-5">
            <h2 id="meditations-browse" className="nff-heading-h3 text-foreground">
              {browsing ? 'All meditations' : 'Results'}
            </h2>

            <LibraryCategoryNavigation
              value={category}
              all={view.nav.all}
              categories={view.nav.categories}
              onChange={(value) => update({ category: value })}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex min-h-10 items-center gap-2.5 nff-label-md text-nff-text-secondary">
                <input
                  type="checkbox"
                  checked={readyOnly}
                  onChange={(event) => update({ ready: event.target.checked ? '1' : '0' })}
                  className="size-4 accent-[var(--nff-forest-900)]"
                />
                Ready to play only
              </label>
              <LibrarySort value={sort} onChange={(value) => update({ sort: value })} />
            </div>

            <LibraryResultsSummary
              shown={Math.min(limit, view.results.length)}
              total={view.results.length}
              active={active}
              noun="meditation"
              onRemove={(key) => update(key === 'ready' ? { ready: '0' } : { [key]: '' })}
              onClearAll={clearAll}
            />

            {view.results.length > 0 ? (
              <>
                <MeditationGrid entries={view.results.slice(0, limit)} />
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
                title={q.trim() ? `No meditations for “${q.trim()}”` : 'Nothing matches these filters'}
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
