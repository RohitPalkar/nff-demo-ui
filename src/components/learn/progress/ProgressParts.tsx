import { ArrowRight, Check, ChevronDown, CircleDot, Circle, PlayCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LearnProgress, Thumb } from '@/components/learn/home/homeParts'
import { HOME_CARD, PRIMARY_ACTION, SECONDARY_ACTION, itemMeta } from '@/components/learn/home/homeStyles'
import { formatDate, pluralise } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { LearningStatus } from '@/services/learning/myLearning'
import type {
  HistoryEntry,
  PathProgress,
  ProgressOverview as Overview,
  TimelineEvent,
} from '@/services/learning/progressPage'

/** Presentation for `/learn/progress`. Every value comes from `progressPage.ts`. */

const STATUS: Record<LearningStatus, { label: string; icon: typeof Check; tone: string }> = {
  completed: { label: 'Completed', icon: Check, tone: 'bg-[var(--nff-sage-100)] text-[var(--nff-forest-900)]' },
  'in-progress': { label: 'In progress', icon: CircleDot, tone: 'bg-[var(--nff-forest-900)] text-[var(--nff-ivory-50)]' },
  'not-started': { label: 'Not started', icon: Circle, tone: 'bg-nff-bg-muted text-nff-text-secondary' },
}

/** Status in words and an icon, never colour alone. */
export function StatusLabel({ status }: { status: LearningStatus }) {
  const { label, icon: Icon, tone } = STATUS[status]
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 nff-label-sm', tone)}>
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  )
}

export function ProgressOverview({ overview }: { overview: Overview }) {
  const stats = [
    { label: 'Learning paths assigned', value: overview.assignedPaths },
    { label: 'Paths completed', value: overview.completedPaths },
    { label: 'Lessons completed', value: overview.lessonsCompleted },
    { label: 'Lessons remaining', value: overview.lessonsRemaining },
  ]
  return (
    <dl className={cn(HOME_CARD, 'grid grid-cols-2 overflow-hidden md:grid-cols-4')}>
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={cn(
            'flex flex-col-reverse gap-1 p-4 sm:p-5',
            index % 2 === 1 && 'border-l border-nff-border-default',
            index >= 2 && 'border-t border-nff-border-default md:border-t-0',
            index === 2 && 'md:border-l',
          )}
        >
          <dt className="nff-body-sm text-nff-text-secondary">{stat.label}</dt>
          <dd className="nff-heading-h2 tabular-nums text-foreground">{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function PathProgressCard({ entry, preview }: { entry: PathProgress; preview: boolean }) {
  const { item, modules } = entry
  const titleId = `progress-${item.path.id}`
  const primary = item.action.label === 'Continue learning' || item.action.label === 'Start learning'
  return (
    <article aria-labelledby={titleId} className={cn(HOME_CARD, 'flex flex-col')}>
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="nff-caption text-nff-text-secondary">
              Learning path · {pluralise(item.moduleCount, 'module')} · {pluralise(item.lessonCount, 'lesson')}
            </p>
            <h3 id={titleId} className="nff-heading-h4 text-foreground">
              <Link to={item.href} className="underline-offset-4 hover:underline nff-focus-ring">
                {item.path.title}
              </Link>
            </h3>
          </div>
          {!preview && <StatusLabel status={item.status} />}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {!preview && (
              <LearnProgress
                value={item.percent}
                label={`${item.completedCount} of ${pluralise(item.lessonCount, 'lesson')} complete · ${item.percent}%`}
                ariaLabel={`${item.path.title} progress`}
              />
            )}
            {item.currentModule && item.status !== 'completed' && !preview && (
              <p className="nff-body-sm text-nff-text-secondary">
                {item.status === 'not-started' ? 'Starts in' : 'Current module'}:{' '}
                <span className="text-foreground">{item.currentModule.label}</span>
              </p>
            )}
          </div>
          <Link
            to={item.action.href}
            className={cn(primary ? PRIMARY_ACTION : SECONDARY_ACTION, 'w-full sm:w-auto')}
          >
            {preview ? 'View learning path' : item.action.label}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>

      {modules.length > 1 && (
        <details className="group border-t border-nff-border-default">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 nff-label-md text-foreground transition-colors hover:bg-[var(--nff-sage-50)] sm:px-6 nff-focus-ring [&::-webkit-details-marker]:hidden">
            {preview ? `Modules (${modules.length})` : `Progress by module (${modules.length})`}
            <ChevronDown
              aria-hidden="true"
              className="size-4 text-nff-icon-secondary transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <ol className="flex flex-col gap-4 px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
            {modules.map((module) => (
              <li key={module.id} className="grid gap-x-6 gap-y-1.5 sm:grid-cols-[minmax(0,16rem)_1fr]">
                <p className="flex items-center gap-2 nff-label-md text-foreground">
                  {module.complete && !preview && (
                    <Check aria-hidden="true" className="size-4 shrink-0 text-nff-text-brand" />
                  )}
                  <span className="truncate">{module.label}</span>
                </p>
                {preview ? (
                  <p className="nff-caption text-nff-text-secondary">{pluralise(module.total, 'lesson')}</p>
                ) : (
                  <LearnProgress
                    value={module.percent}
                    label={
                      module.complete
                        ? `Complete · ${pluralise(module.total, 'lesson')}`
                        : `${module.completed} of ${pluralise(module.total, 'lesson')} complete`
                    }
                    ariaLabel={`${module.label} progress`}
                  />
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
    </article>
  )
}


type HistoryView = 'stage' | 'recent'

/* Rows fill the width in two columns from md up, with hairline dividers
   between rows and columns. */
const ROWS =
  'grid md:grid-cols-2 [&>li]:border-t [&>li]:border-nff-border-default [&>li:first-child]:border-t-0 md:[&>li:nth-child(2)]:border-t-0 md:[&>li:nth-child(odd)]:border-r'

interface HistoryGroup {
  key: string
  path: HistoryEntry['path']
  module: HistoryEntry['module']
  moduleLabel: string
  total: number
  entries: HistoryEntry[]
}

/** One completed lesson: thumbnail, title and type, with the date in its own column. */
function CompletedRow({ entry, showPlace }: { entry: HistoryEntry; showPlace: boolean }) {
  return (
    <Link
      to={entry.href}
      className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--nff-sage-50)] nff-focus-ring sm:gap-4 sm:px-4"
    >
      <Thumb item={entry.item} className="size-10 shrink-0 rounded-sm" />
      <span className="flex min-w-0 flex-1 flex-col">
        {showPlace && (
          <span className="truncate nff-caption text-nff-text-secondary">
            {entry.path.title} · {entry.moduleLabel}
          </span>
        )}
        <span className="truncate nff-label-md text-foreground group-hover:underline group-hover:underline-offset-4">
          {entry.item.title}
        </span>
        <span className="nff-caption text-nff-text-secondary">{itemMeta(entry.item).split(' · ')[0]}</span>
      </span>
      <span className="shrink-0 text-right nff-caption tabular-nums text-nff-text-secondary">
        {entry.completedAt ? (
          <time dateTime={entry.completedAt}>{formatDate(entry.completedAt)}</time>
        ) : (
          <>
            <span aria-hidden="true">—</span>
            <span className="sr-only">Date not recorded</span>
          </>
        )}
      </span>
    </Link>
  )
}

function groupByStage(entries: HistoryEntry[]): HistoryGroup[] {
  const groups = new Map<string, HistoryGroup>()
  for (const entry of entries) {
    const key = `${entry.path.id}:${entry.module.id}`
    const group = groups.get(key)
    if (group) group.entries.push(entry)
    else
      groups.set(key, {
        key,
        path: entry.path,
        module: entry.module,
        moduleLabel: entry.moduleLabel,
        total: 0,
        entries: [entry],
      })
  }
  return [...groups.values()]
    .map((group) => ({ ...group, total: group.entries.length }))
    .sort((a, b) => a.path.title.localeCompare(b.path.title) || a.module.order - b.module.order)
}

/**
 * Completed lessons, grouped by stage (default) or newest first. Recorded
 * dates sit in their own column; completions carried over from the old
 * record show a dash, explained once below the list, never an invented date.
 */
export function LearningHistory({
  dated,
  undated,
  limit,
  onShowAll,
}: {
  dated: HistoryEntry[]
  undated: HistoryEntry[]
  limit: number
  onShowAll?: () => void
}) {
  const [view, setView] = useState<HistoryView>('stage')
  const all = [...dated, ...undated]
  const total = all.length
  const hidden = Math.max(0, total - limit)

  // Both views show the same first `limit` lessons in their own order.
  const groups = groupByStage(all)
  const stageOrder = groups.flatMap((group) => group.entries)
  const shown = new Set((view === 'stage' ? stageOrder : all).slice(0, limit))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="nff-body-sm text-nff-text-secondary">
          <strong className="font-medium text-foreground">{pluralise(total, 'lesson')}</strong> completed
        </p>
        <div
          role="group"
          aria-label="Order completed lessons"
          className="inline-flex rounded-md border border-nff-border-default bg-nff-bg-surface p-0.5"
        >
          {(
            [
              ['stage', 'By stage'],
              ['recent', 'Newest first'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={cn(
                'nff-target rounded-[5px] px-3 py-1.5 nff-label-sm transition-colors nff-focus-ring',
                view === value
                  ? 'bg-[var(--nff-forest-900)] text-[var(--nff-ivory-50)]'
                  : 'text-nff-text-secondary hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'stage' ? (
        <ul className="flex flex-col gap-4">
          {groups
            .filter((group) => group.entries.some((entry) => shown.has(entry)))
            .map((group) => (
              <li key={group.key} className={cn(HOME_CARD, 'overflow-hidden')}>
                <h3 className="flex items-baseline justify-between gap-3 border-b border-nff-border-default bg-nff-bg-surface-sunken px-4 py-2.5">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate nff-caption text-nff-text-secondary">{group.path.title}</span>
                    <span className="truncate nff-label-md text-foreground">{group.moduleLabel}</span>
                  </span>
                  <span className="shrink-0 nff-caption text-nff-text-secondary">{group.total} completed</span>
                </h3>
                <ul className={ROWS}>
                  {group.entries
                    .filter((entry) => shown.has(entry))
                    .map((entry) => (
                      <li key={entry.lessonId}>
                        <CompletedRow entry={entry} showPlace={false} />
                      </li>
                    ))}
                </ul>
              </li>
            ))}
        </ul>
      ) : (
        <ul className={cn(HOME_CARD, 'overflow-hidden', ROWS)}>
          {all
            .filter((entry) => shown.has(entry))
            .map((entry) => (
              <li key={entry.lessonId}>
                <CompletedRow entry={entry} showPlace />
              </li>
            ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {hidden > 0 && onShowAll ? (
          <button type="button" onClick={onShowAll} className={SECONDARY_ACTION}>
            Show all {total} completed lessons
          </button>
        ) : (
          <span />
        )}
        {undated.length > 0 && (
          <p className="nff-caption text-nff-text-secondary">
            <span aria-hidden="true">— </span>Date not recorded: completed before dates were kept.
          </p>
        )}
      </div>
    </div>
  )
}

const dayKey = (iso: string) => {
  const date = new Date(iso)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}
const timeOf = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

/** Started and completed lessons as a vertical timeline, grouped by day, newest first. */
export function ActivityTimeline({ events }: { events: TimelineEvent[] }) {
  const days: Array<{ key: string; at: string; events: TimelineEvent[] }> = []
  for (const event of events) {
    const key = dayKey(event.at)
    const last = days[days.length - 1]
    if (last?.key === key) last.events.push(event)
    else days.push({ key, at: event.at, events: [event] })
  }
  return (
    <ol className="flex flex-col gap-6">
      {days.map((day) => (
        <li key={day.key} className="flex flex-col gap-3">
          <h3 className="nff-label-sm text-foreground">
            <time dateTime={day.at}>{formatDate(day.at)}</time>
          </h3>
          <ol className="relative flex flex-col gap-1 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-nff-border-default">
            {day.events.map((event) => {
              const done = event.kind === 'completed'
              const Icon = done ? Check : PlayCircle
              return (
                <li key={event.id} className="relative flex gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'relative z-10 mt-2.5 flex size-6 shrink-0 items-center justify-center rounded-full ring-4 ring-nff-bg-surface',
                      done
                        ? 'bg-[var(--nff-forest-900)] text-[var(--nff-ivory-50)]'
                        : 'border border-nff-border-strong bg-nff-bg-surface text-nff-text-brand',
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <Link
                    to={event.href}
                    className="group flex min-w-0 flex-1 flex-col rounded-md px-2 py-2 transition-colors hover:bg-[var(--nff-sage-50)] nff-focus-ring"
                  >
                    <span className="nff-caption text-nff-text-secondary">
                      {done ? 'Completed' : 'Started'} · <time dateTime={event.at}>{timeOf(event.at)}</time>
                    </span>
                    <span className="truncate nff-label-md text-foreground group-hover:underline group-hover:underline-offset-4">
                      {event.item.title}
                    </span>
                    <span className="truncate nff-caption text-nff-text-secondary">
                      {event.path.title} · {event.moduleLabel}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>
        </li>
      ))}
    </ol>
  )
}
