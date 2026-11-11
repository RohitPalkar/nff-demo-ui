import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Headphones, PlayCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AccountRegistrationCTA } from '@/components/nff/AccountRegistrationCTA'
import { CategoryTabs } from '@/components/nff/CategoryTabs'
import { ContentCard } from '@/components/nff/ContentCard'
import { EmptyState } from '@/components/nff/EmptyState'
import { ErrorState } from '@/components/nff/ErrorState'
import { LoadingState } from '@/components/nff/LoadingState'
import { PaginationBar } from '@/components/nff/PaginationBar'
import { Button } from '@/components/ui/button'
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

const PAGE_SIZE = 12

function readPage(value: string | null) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export function MeditationsPage() {
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()

  const category = readCategoryParam(params.get('tab'))
  const previewOnly =
    FLAGS.meditationPreviewFilter && params.get('preview') === '1'

  const catalogue = useQuery({
    queryKey: ['catalogue', 'meditation', category ?? 'all'],
    queryFn: () => getCatalogue('meditation', { category }),
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
    return query ? `/meditations?${query}` : '/meditations'
  }

  const allItems = catalogue.data?.items ?? []
  const filtered = previewOnly
    ? allItems.filter((item) => item.type === 'meditation' && item.preview)
    : allItems
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(readPage(params.get('page')), totalPages)
  const start = (page - 1) * PAGE_SIZE
  const items = filtered.slice(start, start + PAGE_SIZE)

  const lead = category
    ? `Guided practices in ${CATEGORY_COPY[category].label.toLowerCase()} — from a short pause to a longer sit.`
    : 'Guided practices for arrival, attention, rest and care — from a five-minute pause to a longer sit.'

  const countLabel = previewOnly
    ? pluralise(total, 'free preview')
    : total === 0
      ? '0 meditations'
      : `Showing ${start + 1}–${start + items.length} of ${pluralise(total, 'meditation')}`

  let body: ReactNode

  if (catalogue.isPending) {
    body = (
      <LoadingState
        count={8}
        className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        label="Loading meditations"
      />
    )
  } else if (catalogue.isError) {
    body = (
      <ErrorState
        title="We could not load the meditations"
        description="The audio library did not arrive. Check your connection and try again."
        onRetry={() => {
          void catalogue.refetch()
        }}
      />
    )
  } else if (total === 0 && previewOnly) {
    body = (
      <EmptyState
        icon={PlayCircle}
        title="No free previews here yet"
        description="Every track in this category is part of the full library. Browse all meditations to see what is available."
        action={
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() =>
              updateParams({ preview: undefined, page: undefined })
            }
          >
            Show all meditations
          </Button>
        }
      />
    )
  } else if (total === 0) {
    body = (
      <EmptyState
        icon={Headphones}
        title={
          category
            ? `Nothing in ${CATEGORY_COPY[category].label} yet`
            : 'No meditations published yet'
        }
        description={
          category
            ? 'This category is still being recorded. Browse the full library in the meantime.'
            : 'The first guided practices are on their way. Read an exploration while you wait.'
        }
        action={
          <Button asChild variant="outline" className="h-11">
            <Link
              to={
                category
                  ? hrefFor({
                      tab: undefined,
                      preview: undefined,
                      page: undefined,
                    })
                  : '/explorations'
              }
            >
              {category ? 'Show all meditations' : 'Browse explorations'}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        }
      />
    )
  } else {
    body = (
      <>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              stageLabel={getStageTitle(item.stageId)}
              locked={lockedStageIds.has(item.stageId)}
              lockedLabel="Unlock in your journey"
              unavailable={
                item.type === 'meditation' && item.transcode !== 'ready'
              }
            />
          ))}
        </div>

        <PaginationBar
          page={page}
          totalPages={totalPages}
          hrefForPage={(next) =>
            hrefFor({ page: next === 1 ? undefined : String(next) })
          }
        />
      </>
    )
  }

  return (
    <div>
      <section
        aria-labelledby="meditations-heading"
        className="border-b bg-nff-bg-brand-subtle"
      >
        <div className="nff-content py-12 md:py-16">
          <div className="nff-reading flex flex-col gap-4">
            <p className="nff-overline text-nff-text-brand">The library</p>
            <h1
              id="meditations-heading"
              className="nff-heading-h1 text-foreground"
            >
              Meditations
            </h1>
            <p className="nff-reading-lead text-nff-text-secondary">{lead}</p>
          </div>
        </div>
      </section>

      <section
        aria-label="Meditations catalogue"
        className="nff-content flex flex-col gap-6 py-10 md:py-12"
      >
        <CategoryTabs
          active={category}
          hrefFor={(next) => hrefFor({ tab: next, page: undefined })}
        />

        <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
          <p
            role="status"
            aria-live="polite"
            className="nff-body-sm text-muted-foreground"
          >
            {catalogue.isPending || catalogue.isError ? ' ' : countLabel}
          </p>

          {FLAGS.meditationPreviewFilter && (
            <Button
              type="button"
              variant={previewOnly ? 'secondary' : 'outline'}
              aria-pressed={previewOnly}
              className="h-11 w-fit"
              onClick={() =>
                updateParams({
                  preview: previewOnly ? undefined : '1',
                  page: undefined,
                })
              }
            >
              <PlayCircle aria-hidden="true" className="size-4" />
              Free previews only
            </Button>
          )}
        </div>

        <h2 className="sr-only">Meditation results</h2>
        {body}
      </section>

      <AccountRegistrationCTA />
    </div>
  )
}
