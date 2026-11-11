import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Lock,
  PlayCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/nff/ErrorState'
import { StatusChip, type StatusTone } from '@/components/nff/StatusChip'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { pluralise } from '@/lib/format'
import { getJourney } from '@/services/content'
import type { ContentItem, StageProgressStatus } from '@/types'
import { lessonHref, moduleHref } from '@/services/learning/routes'

const STATUS: Record<
  StageProgressStatus,
  { label: string; tone: StatusTone; icon: typeof Lock }
> = {
  completed: { label: 'Completed', tone: 'success', icon: CheckCircle2 },
  in_progress: { label: 'In progress', tone: 'info', icon: CircleDot },
  available: { label: 'Available', tone: 'neutral', icon: PlayCircle },
  locked: { label: 'Locked', tone: 'neutral', icon: Lock },
}

export function itemHref(item: ContentItem) {
  return lessonHref(item.id)
}

export function JourneyPage() {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['journey', user?.id],
    queryFn: () => getJourney(user!.id),
    enabled: Boolean(user),
  })

  if (query.isPending) {
    return (
      <div aria-busy="true" className="nff-content flex flex-col gap-6 py-10">
        <span className="nff-visually-hidden">Loading your journey</span>
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="nff-content py-16">
        <ErrorState
          title="We could not load your journey"
          description="Check your connection and try again."
          onRetry={() => void query.refetch()}
        />
      </div>
    )
  }

  const journey = query.data
  const allDone = journey.stagesCompleted === journey.totalStages

  return (
    <div className="nff-content flex flex-col gap-8 py-8 md:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="nff-heading-h1 text-foreground">Meadow Journey</h1>
      </header>

      {journey.continueItem && (
        <section
          aria-labelledby="continue-heading"
          className="flex flex-col gap-4 rounded-xl border bg-nff-bg-brand-subtle p-6 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex flex-col gap-1">
            <h2 id="continue-heading" className="nff-overline text-nff-text-brand">
              Continue Stage {journey.continueItem.stage.number} ·{' '}
              {journey.continueItem.stage.title}
            </h2>
            <p className="nff-heading-h3 text-foreground">
              {journey.continueItem.item.title}
            </p>
            <p className="nff-body-sm text-muted-foreground">
              {journey.continueItem.stage.completedCount} of{' '}
              {journey.continueItem.stage.itemCount} complete
            </p>
          </div>
          <Button asChild className="h-11 w-fit">
            <Link
              to={itemHref(journey.continueItem.item,
              )}
            >
              Resume
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </section>
      )}

      {allDone && (
        <p className="rounded-xl border border-nff-border-success bg-nff-bg-success-subtle p-4 nff-body-md text-nff-text-success">
          You have completed every stage. Revisit any practice whenever you like.
        </p>
      )}

      <section aria-labelledby="overview-heading" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 id="overview-heading" className="nff-heading-h3">
            Overall progress
          </h2>
          <span className="nff-label-md text-muted-foreground">
            {journey.stagesCompleted} of {journey.totalStages} stages
          </span>
        </div>
        <Progress
          value={journey.overallPercent}
          aria-label="Overall progress"
        />
        <p className="nff-caption text-muted-foreground">
          {journey.overallPercent}% of the curriculum complete
        </p>
      </section>

      <section aria-labelledby="stages-heading" className="flex flex-col gap-4">
        <h2 id="stages-heading" className="nff-heading-h3">
          Stages
        </h2>
        <ol className="flex flex-col gap-4">
          {journey.stages.map((stage, index) => {
            const meta = STATUS[stage.status]
            const locked = stage.status === 'locked'
            const previous = journey.stages[index - 1]
            return (
              <li
                key={stage.id}
                className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-nff-1 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-nff-bg-brand-subtle nff-heading-h3 text-nff-text-brand"
                  >
                    {stage.number}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="nff-heading-h4 text-foreground">
                      {stage.title}
                    </h3>
                    <p className="nff-body-sm text-muted-foreground">
                      {stage.description}
                    </p>
                    <p className="nff-caption text-muted-foreground">
                      {pluralise(stage.itemCount, 'item')} ·{' '}
                      {stage.completedCount} complete
                    </p>
                    {locked && previous && (
                      <p className="nff-body-sm text-nff-text-warning">
                        Complete Stage {previous.number} to unlock
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusChip tone={meta.tone} icon={meta.icon}>
                    {meta.label}
                  </StatusChip>
                  <Button
                    asChild={!locked}
                    variant={locked ? 'outline' : 'default'}
                    className="h-11"
                    disabled={locked}
                  >
                    {locked ? (
                      <span>Open</span>
                    ) : (
                      <Link to={moduleHref(stage.id)}>Open</Link>
                    )}
                  </Button>
                </div>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
