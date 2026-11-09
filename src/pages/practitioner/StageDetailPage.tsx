import { useQuery } from '@tanstack/react-query'
import { BookOpen, CheckCircle2, Headphones, Lock } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { DetailBreadcrumb } from '@/components/nff/DetailBreadcrumb'
import { ErrorState } from '@/components/nff/ErrorState'
import { StatusChip } from '@/components/nff/StatusChip'
import { UnavailableState } from '@/components/nff/UnavailableState'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatDuration, formatReadingTime } from '@/lib/format'
import { getItemById, getJourney, getProgress } from '@/services/content'
import { itemHref } from './JourneyPage'

export function StageDetailPage() {
  const { stageId = '' } = useParams()
  const { user } = useAuth()

  const query = useQuery({
    queryKey: ['stage', user?.id, stageId],
    queryFn: async () => {
      const [journey, progress] = await Promise.all([
        getJourney(user!.id),
        getProgress(user!.id),
      ])
      return { journey, progress }
    },
    enabled: Boolean(user),
  })

  if (query.isPending) {
    return (
      <div aria-busy="true" className="nff-content flex flex-col gap-4 py-10">
        <span className="nff-visually-hidden">Loading stage</span>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="nff-content py-16">
        <ErrorState
          title="We could not load this stage"
          description="Check your connection and try again."
          onRetry={() => void query.refetch()}
        />
      </div>
    )
  }

  const { journey, progress } = query.data
  const index = journey.stages.findIndex((stage) => stage.id === stageId)
  const stage = journey.stages[index]
  const trail = [
    { label: 'Home', to: '/' },
    { label: 'Journey', to: '/journey' },
  ]

  if (!stage) {
    return (
      <UnavailableState
        icon={Lock}
        title="We could not find that stage"
        description="Head back to your journey to pick a stage."
        trail={trail}
        backTo="/journey"
        backLabel="Back to journey"
      />
    )
  }

  const previous = journey.stages[index - 1]
  const next = journey.stages[index + 1]
  const locked = stage.status === 'locked'
  const completed = new Set(progress.completedItemIds)
  const percent =
    stage.itemCount === 0
      ? 0
      : Math.round((stage.completedCount / stage.itemCount) * 100)

  return (
    <div className="nff-content flex flex-col gap-8 py-8 md:py-12">
      <DetailBreadcrumb
        trail={trail}
        current={`Stage ${stage.number} · ${stage.title}`}
      />

      <header className="flex flex-col gap-3">
        <p className="nff-overline text-nff-text-brand">Stage {stage.number}</p>
        <h1 className="nff-heading-h1">{stage.title}</h1>
        <p className="nff-body-lg max-w-2xl text-nff-text-secondary">
          {stage.intro}
        </p>
        <div className="flex max-w-md flex-col gap-2">
          <Progress value={percent} aria-label="Stage progress" />
          <p className="nff-caption text-muted-foreground">
            {stage.completedCount} of {stage.itemCount} complete
          </p>
        </div>
      </header>

      {stage.status === 'completed' && (
        <p className="rounded-xl border border-nff-border-success bg-nff-bg-success-subtle p-4 nff-body-md text-nff-text-success">
          Stage complete. Well done.
          {next && (
            <>
              {' '}
              <Link
                to={`/journey/stages/${next.id}`}
                className="font-medium underline"
              >
                Continue to Stage {next.number}
              </Link>
            </>
          )}
        </p>
      )}

      {locked && (
        <p className="rounded-xl border border-nff-border-warning bg-nff-bg-warning-subtle p-4 nff-body-md text-nff-text-warning">
          {previous
            ? `Complete Stage ${previous.number} to unlock this stage.`
            : 'This stage is locked.'}
        </p>
      )}

      {stage.itemIds.length === 0 ? (
        <p className="nff-body-md text-muted-foreground">
          This stage has no content yet.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {stage.itemIds.map((id, position) => {
            const item = getItemById(id)
            if (!item) return null
            const done = completed.has(id)
            const started = progress.inProgressItemId === id
            const Icon = item.type === 'exploration' ? BookOpen : Headphones
            return (
              <li
                key={id}
                className="flex items-center gap-4 rounded-xl border bg-card p-4"
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-nff-bg-muted text-nff-icon-secondary"
                >
                  <Icon className="size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="nff-caption text-muted-foreground">
                    {position + 1}.{' '}
                    {item.type === 'exploration'
                      ? `Exploration · ${formatReadingTime(item.readingTimeMin)}`
                      : `Meditation · ${formatDuration(item.durationSec)}`}
                  </span>
                  <span className="nff-label-lg truncate text-foreground">
                    {item.title}
                  </span>
                </div>
                {done ? (
                  <StatusChip tone="success" icon={CheckCircle2}>
                    Completed
                  </StatusChip>
                ) : started ? (
                  <StatusChip tone="info" icon={CheckCircle2}>
                    In progress
                  </StatusChip>
                ) : null}
                <Button
                  asChild={!locked}
                  disabled={locked}
                  variant={done ? 'outline' : 'default'}
                  className="h-11"
                >
                  {locked ? (
                    <span>Locked</span>
                  ) : (
                    <Link to={itemHref(stage.id, item)}>
                      {item.type === 'exploration' ? 'Read' : 'Play'}
                    </Link>
                  )}
                </Button>
              </li>
            )
          })}
        </ol>
      )}

      {next && (
        <aside className="rounded-xl border bg-nff-bg-surface-sunken p-5">
          <p className="nff-overline text-muted-foreground">Up next</p>
          <p className="nff-heading-h4">
            Stage {next.number} · {next.title}
          </p>
          <p className="nff-body-sm text-muted-foreground">{next.description}</p>
        </aside>
      )}
    </div>
  )
}
