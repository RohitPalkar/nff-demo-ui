import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Flame, Headphones, Layers, ListChecks } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/nff/ErrorState'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatDate } from '@/lib/format'
import { userById } from '@/mocks/db'
import { getItemById, getJourney, getProgress } from '@/services/content'
import { itemHref } from './JourneyPage'

type Range = 'week' | 'month' | 'all'

const WEEKLY_MINUTES = [34, 52, 41, 68, 59, 77, 63]
const RANGE_FACTOR: Record<Range, number> = { week: 0.1, month: 0.35, all: 1 }

function Metric({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-5 shadow-nff-1">
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-full bg-nff-bg-brand-subtle text-nff-icon-brand"
      >
        {icon}
      </span>
      <span className="nff-caption text-muted-foreground">{label}</span>
      <span className="nff-heading-h2 text-foreground">{value}</span>
      {hint && <span className="nff-caption text-muted-foreground">{hint}</span>}
    </div>
  )
}

export function MyJourneyPage() {
  const { user } = useAuth()
  const [range, setRange] = useState<Range>('month')

  const query = useQuery({
    queryKey: ['my-journey', user?.id],
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
      <div aria-busy="true" className="nff-content flex flex-col gap-6 py-10">
        <span className="nff-visually-hidden">Loading your dashboard</span>
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="nff-content py-16">
        <ErrorState
          title="We could not load your dashboard"
          description="Check your connection and try again."
          onRetry={() => void query.refetch()}
        />
      </div>
    )
  }

  const { journey, progress } = query.data
  const totalMinutes = userById.get(user!.id)?.minutesListened ?? 0
  const minutes = Math.round(totalMinutes * RANGE_FACTOR[range])
  const completedCount = progress.completedItemIds.length

  if (completedCount === 0 && totalMinutes === 0) {
    return (
      <div className="nff-content flex flex-col items-start gap-4 py-16">
        <h1 className="nff-heading-h1">My Journey</h1>
        <p className="nff-body-lg max-w-xl text-nff-text-secondary">
          Your activity will appear here once you start your first practice.
        </p>
        <Button asChild className="h-11">
          <Link to="/journey">Begin your journey</Link>
        </Button>
      </div>
    )
  }

  const recent = progress.completedItemIds
    .slice(-5)
    .reverse()
    .map((id, index) => ({
      item: getItemById(id),
      date: new Date(Date.now() - index * 86_400_000).toISOString(),
    }))
    .filter((entry) => entry.item)

  const peak = Math.max(...WEEKLY_MINUTES)

  return (
    <div className="nff-content flex flex-col gap-8 py-8 md:py-12">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <p className="nff-overline text-nff-text-brand">Your progress</p>
          <h1 className="nff-heading-h1">My Journey</h1>
        </div>
        <Tabs value={range} onValueChange={(value) => setRange(value as Range)}>
          <TabsList aria-label="Date range">
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <section
        aria-label="Summary"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Metric
          icon={<Headphones className="size-5" />}
          label="Minutes listened"
          value={minutes.toLocaleString()}
        />
        <Metric
          icon={<ListChecks className="size-5" />}
          label="Items completed"
          value={String(completedCount)}
        />
        <Metric
          icon={<Flame className="size-5" />}
          label="Current streak"
          value="6 days"
          hint="No pressure. It resets gently."
        />
        <Metric
          icon={<Layers className="size-5" />}
          label="Stages completed"
          value={`${journey.stagesCompleted} of ${journey.totalStages}`}
        />
      </section>

      <section aria-labelledby="by-stage" className="flex flex-col gap-4">
        <h2 id="by-stage" className="nff-heading-h3">
          Progress by stage
        </h2>
        <ul className="flex flex-col gap-3">
          {journey.stages.map((stage) => {
            const percent =
              stage.itemCount === 0
                ? 0
                : Math.round((stage.completedCount / stage.itemCount) * 100)
            return (
              <li key={stage.id} className="flex items-center gap-4">
                <span className="w-40 shrink-0 nff-label-md">
                  {stage.number}. {stage.title}
                </span>
                <Progress
                  value={percent}
                  aria-label={`${stage.title} progress`}
                  className="flex-1"
                />
                <span className="w-12 shrink-0 text-right nff-caption text-muted-foreground">
                  {percent}%
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="activity" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 id="activity" className="nff-heading-h3">
            Listening activity
          </h2>
          <span className="nff-caption text-muted-foreground">
            Minutes per week · updated nightly
          </span>
        </div>
        <ol
          aria-label="Weekly minutes"
          className="flex h-44 items-end gap-3 rounded-xl border bg-card p-5"
        >
          {WEEKLY_MINUTES.map((value, index) => (
            <li
              key={index}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="nff-caption text-muted-foreground">{value}</span>
              <div
                className="w-full rounded-t-md bg-primary"
                style={{ height: `${(value / peak) * 100}%` }}
              />
              <span className="nff-caption text-muted-foreground">
                W{index + 1}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="recent" className="flex flex-col gap-4">
        <h2 id="recent" className="nff-heading-h3">
          Recently completed
        </h2>
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {recent.map(({ item, date }) => (
            <li
              key={item!.id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <span className="nff-label-lg">{item!.title}</span>
              <span className="nff-caption text-muted-foreground">
                {formatDate(date)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {journey.continueItem && (
        <Button asChild className="h-11 w-fit">
          <Link
            to={itemHref(
              journey.continueItem.stage.id,
              journey.continueItem.item,
            )}
          >
            Continue: {journey.continueItem.item.title}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      )}
    </div>
  )
}
