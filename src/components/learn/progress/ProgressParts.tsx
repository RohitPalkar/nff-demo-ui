import { ArrowRight, Check, ChevronDown, CircleDot, Circle, PlayCircle } from 'lucide-react'
import type { ReactNode } from 'react'
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

function LessonLine({
  entry,
  meta,
  trailing,
}: {
  entry: HistoryEntry | TimelineEvent
  meta: string
  trailing?: ReactNode
}) {
  return (
    <Link
      to={entry.href}
      className="group flex items-center gap-3 p-3 transition-colors hover:bg-[var(--nff-sage-50)] nff-focus-ring sm:gap-4 sm:px-4"
    >
      <Thumb item={entry.item} className="size-12 shrink-0 rounded-sm" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate nff-caption text-nff-text-secondary">
          {entry.path.title} · {entry.moduleLabel}
        </span>
        <span className="line-clamp-2 nff-label-md text-foreground group-hover:underline group-hover:underline-offset-4">
          {entry.item.title}
        </span>
        <span className="nff-caption text-nff-text-secondary">{meta}</span>
      </span>
      {trailing}
    </Link>
  )
}

const LIST = cn(HOME_CARD, 'divide-y divide-nff-border-default overflow-hidden')

/**
 * Completed lessons. Recorded dates first; completions carried over from the
 * old record have no date and say so, rather than showing an invented one.
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
  const shownDated = dated.slice(0, limit)
  const shownUndated = undated.slice(0, Math.max(0, limit - shownDated.length))
  const hidden = dated.length + undated.length - shownDated.length - shownUndated.length
  return (
    <div className="flex flex-col gap-4">
      {shownDated.length > 0 && (
        <ul className={LIST}>
          {shownDated.map((entry) => (
            <li key={entry.lessonId}>
              <LessonLine
                entry={entry}
                meta={`${itemMeta(entry.item).split(' · ')[0]} · Completed ${formatDate(entry.completedAt!)}`}
              />
            </li>
          ))}
        </ul>
      )}
      {shownUndated.length > 0 && (
        <div className="flex flex-col gap-2">
          {shownDated.length > 0 && (
            <p className="nff-label-sm text-nff-text-secondary">Completed earlier, date not recorded</p>
          )}
          <ul className={LIST}>
            {shownUndated.map((entry) => (
              <li key={entry.lessonId}>
                <LessonLine
                  entry={entry}
                  meta={`${itemMeta(entry.item).split(' · ')[0]} · Completed · date not recorded`}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      {hidden > 0 && onShowAll && (
        <button type="button" onClick={onShowAll} className={cn(SECONDARY_ACTION, 'self-start')}>
          Show all {dated.length + undated.length} completed lessons
        </button>
      )}
    </div>
  )
}

const dayKey = (iso: string) => {
  const date = new Date(iso)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}
const timeOf = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

/** Started and completed lessons, grouped by day, newest first. */
export function ActivityTimeline({ events }: { events: TimelineEvent[] }) {
  const days: Array<{ key: string; at: string; events: TimelineEvent[] }> = []
  for (const event of events) {
    const key = dayKey(event.at)
    const last = days[days.length - 1]
    if (last?.key === key) last.events.push(event)
    else days.push({ key, at: event.at, events: [event] })
  }
  return (
    <ol className="flex flex-col gap-5">
      {days.map((day) => (
        <li key={day.key} className="flex flex-col gap-2">
          <h3 className="nff-label-sm text-nff-text-secondary">
            <time dateTime={day.at}>{formatDate(day.at)}</time>
          </h3>
          <ol className={LIST}>
            {day.events.map((event) => {
              const Icon = event.kind === 'completed' ? Check : PlayCircle
              return (
                <li key={event.id}>
                  <LessonLine
                    entry={event}
                    meta={`${event.kind === 'completed' ? 'Completed' : 'Started'} at ${timeOf(event.at)}`}
                    trailing={<Icon aria-hidden="true" className="size-4 shrink-0 text-nff-text-brand" />}
                  />
                </li>
              )
            })}
          </ol>
        </li>
      ))}
    </ol>
  )
}
