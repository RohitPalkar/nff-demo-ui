import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Clock,
  FileClock,
  FileQuestion,
  LockKeyhole,
  Route,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ContentCard } from '@/components/nff/ContentCard'
import { DetailBreadcrumb } from '@/components/nff/DetailBreadcrumb'
import { ErrorState } from '@/components/nff/ErrorState'
import { SectionHeading } from '@/components/nff/SectionHeading'
import { StatusChip } from '@/components/nff/StatusChip'
import { UnavailableState } from '@/components/nff/UnavailableState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { canReadArticleInFull, publicAccessContext } from '@/services/learning/access'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatReadingTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  CATEGORY_COPY,
  getContentDetail,
  getStageTitle,
} from '@/services/content'
import type { Artwork } from '@/types'

const TONE_BG: Record<Artwork['tone'], string> = {
  brand: 'bg-nff-bg-brand-subtle text-nff-text-brand',
  accent: 'bg-nff-bg-accent-subtle text-nff-text-accent',
  info: 'bg-nff-bg-info-subtle text-nff-text-info',
  warning: 'bg-nff-bg-warning-subtle text-nff-text-warning',
  success: 'bg-nff-bg-success-subtle text-nff-text-success',
  neutral: 'bg-nff-bg-muted text-nff-text-secondary',
}

const TRAIL = [
  { label: 'Home', to: '/' },
  { label: 'Explorations', to: '/explorations' },
]

function DetailSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="nff-content py-8 md:py-12"
    >
      <span className="nff-visually-hidden">Loading exploration</span>
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="nff-reading mt-10 flex flex-col gap-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-12 w-full max-w-xl" />
        <Skeleton className="h-5 w-2/3" />
      </div>
      <Skeleton className="mt-10 aspect-[16/8] w-full rounded-xl" />
      <div className="nff-reading mt-10 flex flex-col gap-4">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </div>
    </div>
  )
}

export function ExplorationDetailPage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()

  const query = useQuery({
    queryKey: ['content', 'exploration', slug],
    queryFn: () => getContentDetail('exploration', slug),
    enabled: slug.length > 0,
  })

  const canReadFull = canReadArticleInFull(publicAccessContext(user))

  if (query.isPending) return <DetailSkeleton />

  if (query.isError) {
    const code = (query.error as { code?: string } | null)?.code
    if (code === 'unpublished') {
      return (
        <UnavailableState
          icon={FileClock}
          title="This exploration is not published yet"
          description="The piece is still being written. It will appear in the library once an editor has published it."
          trail={TRAIL}
          backTo="/explorations"
          backLabel="Back to explorations"
        />
      )
    }
    if (code === 'not_found') {
      return (
        <UnavailableState
          icon={FileQuestion}
          title="We could not find that exploration"
          description="The link may be broken or the piece may have moved. Browse the library to find something to read."
          trail={TRAIL}
          backTo="/explorations"
          backLabel="Back to explorations"
        />
      )
    }

    return (
      <div>
        <div className="nff-content pt-6 md:pt-8">
          <DetailBreadcrumb trail={TRAIL} current="Unavailable" />
        </div>
        <div className="nff-content py-16">
          <h1 className="sr-only">Exploration unavailable</h1>
          <div className="nff-reading mx-auto">
            <ErrorState
              title="We could not load this exploration"
              description="The lesson did not arrive. Check your connection and try again."
              onRetry={() => {
                void query.refetch()
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (!query.data) {
    return (
      <UnavailableState
        icon={FileQuestion}
        title="We could not find that exploration"
        description="The link may be broken or the piece may have moved. Browse the library to find something to read."
        trail={TRAIL}
        backTo="/explorations"
        backLabel="Back to explorations"
      />
    )
  }

  const item = query.data.item
  if (item.type !== 'exploration') {
    return (
      <UnavailableState
        icon={FileQuestion}
        title="We could not find that exploration"
        description="The link may be broken or the piece may have moved. Browse the library to find something to read."
        trail={TRAIL}
        backTo="/explorations"
        backLabel="Back to explorations"
      />
    )
  }

  const related = query.data.related
  const paragraphs = canReadFull ? item.body : item.body.slice(0, 1)

  return (
    <div>
      <div className="nff-content pt-6 md:pt-8">
        <DetailBreadcrumb trail={TRAIL} current={item.title} />
      </div>

      <article className="pb-16 md:pb-24">
        <header className="nff-content pt-8 md:pt-12">
          <div className="nff-reading mx-auto flex flex-col gap-5">
            <Link
              to={`/explorations?tab=${item.category}`}
              className="inline-flex w-fit items-center gap-1.5 nff-overline text-nff-text-brand hover:text-nff-text-link-hover nff-focus-ring"
            >
              {CATEGORY_COPY[item.category].label}
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
            <h1 className="nff-heading-h1 text-foreground">{item.title}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip tone="info" icon={Route}>
                {getStageTitle(item.stageId)}
              </StatusChip>
              <span className="inline-flex items-center gap-1.5 nff-label-md text-muted-foreground">
                <Clock aria-hidden="true" className="size-4" />
                {formatReadingTime(item.readingTimeMin)}
              </span>
            </div>
          </div>
        </header>

        <div className="nff-content mt-8 md:mt-10">
          <div
            aria-hidden="true"
            className={cn(
              'relative flex aspect-[16/8] items-center justify-center overflow-hidden rounded-xl border',
              TONE_BG[item.artwork.tone],
            )}
          >
            <span className="nff-display text-6xl font-semibold opacity-40 md:text-8xl">
              {item.artwork.label}
            </span>
          </div>
        </div>

        <div className="nff-content mt-10 md:mt-14">
          <div className="nff-reading mx-auto flex flex-col gap-6">
            <p className="nff-reading-lead text-nff-text-secondary">
              {item.excerpt}
            </p>

            {paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="nff-reading-body text-nff-text-secondary"
              >
                {paragraph}
              </p>
            ))}

            {!canReadFull && (
              <aside
                aria-labelledby="gate-heading"
                className="mt-2 flex flex-col items-start gap-4 rounded-xl border bg-nff-bg-brand-subtle p-6 md:p-8"
              >
                <span
                  aria-hidden="true"
                  className="flex size-12 items-center justify-center rounded-full bg-nff-bg-surface text-nff-icon-brand shadow-nff-1"
                >
                  <LockKeyhole className="size-5" />
                </span>
                <div className="flex flex-col gap-2">
                  <h2
                    id="gate-heading"
                    className="nff-heading-h3 text-foreground"
                  >
                    Sign up free to read the full lesson
                  </h2>
                  <p className="nff-body-md text-nff-text-secondary">
                    Create a free account to read every exploration, follow the
                    six stages at your own pace and keep your progress on any
                    device.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="h-11">
                    <Link to="/signup">
                      Sign up free
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-11 border-nff-border-strong bg-nff-bg-surface"
                  >
                    <Link to="/login">Log in</Link>
                  </Button>
                </div>
                <p className="nff-caption text-muted-foreground">
                  Free previews · No card needed · Cancel anytime
                </p>
              </aside>
            )}
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section
          aria-labelledby="related-heading"
          className="border-t bg-nff-bg-surface-sunken nff-section-gap"
        >
          <div className="nff-content flex flex-col gap-8">
            <SectionHeading
              id="related-heading"
              eyebrow="Keep reading"
              title="More like this"
              description="A few more explorations from the library."
              action={
                <Button asChild variant="ghost" className="h-11">
                  <Link to="/explorations">
                    Browse all explorations
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </Button>
              }
            />
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {related.map((entry) => (
                <ContentCard
                  key={entry.id}
                  item={entry}
                  stageLabel={getStageTitle(entry.stageId)}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
