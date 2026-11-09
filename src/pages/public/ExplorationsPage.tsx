import { useQuery } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Search,
  SearchX,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CategoryTabs } from '@/components/nff/CategoryTabs'
import { ContentCard } from '@/components/nff/ContentCard'
import { EmptyState } from '@/components/nff/EmptyState'
import { ErrorState } from '@/components/nff/ErrorState'
import { LoadingState } from '@/components/nff/LoadingState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FLAGS } from '@/config/flags'
import { useAuth } from '@/features/auth/AuthProvider'
import { readCategoryParam } from '@/lib/catalogue'
import { pluralise } from '@/lib/format'
import {
  CATEGORY_COPY,
  getCatalogue,
  getJourney,
  getStageTitle,
} from '@/services/content'
import type { CatalogueSort } from '@/types'

const PAGE_SIZE = 12

const SORTS: Array<{ value: CatalogueSort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'shortest', label: 'Shortest read' },
]

function readSort(value: string | null): CatalogueSort {
  return value === 'title' || value === 'shortest' ? value : 'newest'
}

export function ExplorationsPage() {
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()

  const category = readCategoryParam(params.get('tab'))
  const rawSearch = params.get('q') ?? ''
  const search = rawSearch.trim()
  const sort = readSort(params.get('sort'))
  const filterKey = `${category ?? 'all'}:${search}:${sort}`
  const [pageState, setPageState] = useState({
    key: filterKey,
    count: PAGE_SIZE,
  })
  const visibleCount = pageState.key === filterKey ? pageState.count : PAGE_SIZE

  const catalogue = useQuery({
    queryKey: ['catalogue', 'exploration', category ?? 'all', search, sort],
    queryFn: () => getCatalogue('exploration', { category, search, sort }),
  })

  const isPractitioner = user?.role === 'practitioner'
  const journey = useQuery({
    queryKey: ['journey', user?.id],
    queryFn: () => getJourney(user?.id ?? ''),
    enabled: isPractitioner,
  })

  const lockedStageIds = new Set(
    (journey.data?.stages ?? [])
      .filter((stage) => stage.status === 'locked')
      .map((stage) => stage.id),
  )

  function updateParams(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  function hrefFor(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    const query = next.toString()
    return query ? `/explorations?${query}` : '/explorations'
  }

  const lead = category
    ? CATEGORY_COPY[category].description
    : 'Essays and reflections on attention, rest and the everyday — each one sitting within one of the six stages.'
  const total = catalogue.data?.total ?? 0
  const items = (catalogue.data?.items ?? []).slice(0, visibleCount)

  const countLabel = search
    ? `${pluralise(total, 'result')} for “${search}”`
    : total > items.length
      ? `Showing ${items.length} of ${pluralise(total, 'exploration')}`
      : pluralise(total, 'exploration')

  let body: ReactNode

  if (catalogue.isPending) {
    body = (
      <LoadingState
        count={6}
        className="sm:grid-cols-2 lg:grid-cols-3"
        label="Loading explorations"
      />
    )
  } else if (catalogue.isError) {
    body = (
      <ErrorState
        title="We could not load the explorations"
        description="The library did not arrive. Check your connection and try again."
        onRetry={() => {
          void catalogue.refetch()
        }}
      />
    )
  } else if (total === 0 && search) {
    body = (
      <EmptyState
        icon={SearchX}
        title={`No results for “${search}”`}
        description="Try a shorter word, or browse another category. New explorations are added each week."
        action={
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => updateParams({ q: undefined })}
          >
            Clear search
          </Button>
        }
      />
    )
  } else if (total === 0) {
    body = (
      <EmptyState
        icon={BookOpen}
        title={
          category
            ? `Nothing in ${CATEGORY_COPY[category].label} yet`
            : 'No explorations published yet'
        }
        description={
          category
            ? 'This category is still being written. Browse the full library in the meantime.'
            : 'The first explorations are on their way. Begin with a free meditation while you wait.'
        }
        action={
          <Button asChild variant="outline" className="h-11">
            <Link to={category ? hrefFor({ tab: undefined, q: undefined }) : '/meditations'}>
              {category ? 'Show all explorations' : 'Browse meditations'}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        }
      />
    )
  } else {
    body = (
      <>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              stageLabel={getStageTitle(item.stageId)}
              locked={lockedStageIds.has(item.stageId)}
              lockedLabel="Unlock in your journey"
            />
          ))}
        </div>

        {items.length < total && (
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() =>
                setPageState({
                  key: filterKey,
                  count: visibleCount + PAGE_SIZE,
                })
              }
            >
              Load more explorations
              <ArrowDown aria-hidden="true" className="size-4" />
            </Button>
          </div>
        )}
      </>
    )
  }

  return (
    <div>
      <section
        aria-labelledby="catalogue-heading"
        className="border-b bg-nff-bg-brand-subtle"
      >
        <div className="nff-content py-12 md:py-16">
          <div className="nff-reading flex flex-col gap-4">
            <p className="nff-overline text-nff-text-brand">The library</p>
            <h1
              id="catalogue-heading"
              className="nff-heading-h1 text-foreground"
            >
              Explorations
            </h1>
            <p className="nff-reading-lead text-nff-text-secondary">{lead}</p>
          </div>
        </div>
      </section>

      <section
        aria-label="Explorations catalogue"
        className="nff-content flex flex-col gap-6 py-10 md:py-12"
      >
        <CategoryTabs
          active={category}
          hrefFor={(next) => hrefFor({ tab: next })}
        />

        <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
          <p
            role="status"
            aria-live="polite"
            className="nff-body-sm text-muted-foreground"
          >
            {catalogue.isPending || catalogue.isError ? ' ' : countLabel}
          </p>

          {FLAGS.catalogueSearch && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-nff-icon-secondary"
                />
                <Input
                  type="search"
                  value={rawSearch}
                  onChange={(event) =>
                    updateParams({ q: event.target.value || undefined })
                  }
                  placeholder="Search explorations"
                  aria-label="Search explorations"
                  className="h-11 w-full pl-9 sm:w-64"
                />
              </div>
              <Select
                value={sort}
                onValueChange={(value) =>
                  updateParams({
                    sort: value === 'newest' ? undefined : value,
                  })
                }
              >
                <SelectTrigger
                  className="h-11 w-full sm:w-44"
                  aria-label="Sort explorations"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <h2 className="sr-only">Exploration results</h2>
        {body}
      </section>
    </div>
  )
}
