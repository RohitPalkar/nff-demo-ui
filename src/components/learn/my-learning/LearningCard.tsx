import { SOW_SCOPE } from '@/config/sowScope'
import { ArrowRight, Check, Route } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LearnProgress } from '@/components/learn/home/homeParts'
import { HOME_CARD, PRIMARY_ACTION, SECONDARY_ACTION } from '@/components/learn/home/homeStyles'
import { formatDate, pluralise } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { LearningStatus, MyLearningItem } from '@/services/learning/myLearning'

const STATUS_LABEL: Record<LearningStatus, string> = {
  'in-progress': 'In progress',
  'not-started': 'Not started',
  completed: 'Completed',
}

/**
 * The visual panel. Each status looks different for a reason: in progress
 * shows where you are across the modules, not started is quiet, completed is
 * settled. The module bars are real per-module completion.
 */
function PathVisual({ item }: { item: MyLearningItem }) {
  const tone = {
    'in-progress': 'bg-[var(--nff-forest-900)] text-[var(--nff-ivory-50)]',
    'not-started': 'bg-[var(--nff-sage-100)] text-[var(--nff-forest-900)]',
    completed: 'bg-[var(--nff-ivory-100)] text-[var(--nff-forest-900)]',
  }[item.status]

  return (
    <div
      aria-hidden="true"
      className={cn('flex min-h-36 flex-col justify-between gap-6 p-5 sm:w-56 sm:shrink-0 lg:w-64', tone)}
    >
      <div className="flex items-center gap-2 nff-label-sm opacity-80">
        {item.status === 'completed' ? <Check className="size-4" /> : <Route className="size-4" />}
        {STATUS_LABEL[item.status]}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-1">
          {item.modules.map((module) => (
            <span
              key={module.id}
              className={cn(
                'relative h-1.5 flex-1 overflow-hidden',
                item.status === 'in-progress' ? 'bg-white/20' : 'bg-[var(--nff-forest-900)]/12',
              )}
            >
              <span
                className={cn(
                  'absolute inset-y-0 left-0',
                  item.status === 'in-progress' ? 'bg-[var(--nff-sage-300)]' : 'bg-[var(--nff-sage-600)]',
                )}
                style={{ width: `${module.percent}%` }}
              />
            </span>
          ))}
        </div>
        <p className="nff-caption opacity-80">
          {item.status === 'completed'
            ? `All ${pluralise(item.moduleCount, 'module')} complete`
            : `${item.modules.filter((module) => module.complete).length} of ${pluralise(item.moduleCount, 'module')} complete`}
        </p>
      </div>
    </div>
  )
}

/**
 * A learning path in My Learning. The title is the card's link to the path
 * (its hit area covers the card); the one primary action sits above it, so
 * both stay real, separately focusable links.
 */
export function LearningCard({ item }: { item: MyLearningItem }) {
  const titleId = `learning-${item.path.id}`
  const isPrimary = item.action.label === 'Continue learning' || item.action.label === 'Start learning'
  const footer = [
    item.lastAccessedAt ? `Last accessed ${formatDate(item.lastAccessedAt)}` : null,
    item.preview
      ? 'Preview: not assigned to you'
      : SOW_SCOPE.assignmentDates && item.assignedAt
        ? `Assigned ${formatDate(item.assignedAt)}`
        : null,
    SOW_SCOPE.assignmentDates && item.dueAt ? `Due ${formatDate(item.dueAt)}` : null,
  ].filter(Boolean)

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        HOME_CARD,
        'group relative flex flex-col overflow-hidden transition-colors focus-within:border-[var(--nff-forest-800)] hover:border-[var(--nff-forest-800)] sm:flex-row',
      )}
    >
      <PathVisual item={item} />

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-1.5">
          <p className="nff-caption text-nff-text-secondary">
            Learning path · {pluralise(item.moduleCount, 'module')} · {pluralise(item.lessonCount, 'lesson')}
          </p>
          <h3 id={titleId} className="nff-heading-h4 text-foreground">
            <Link
              to={item.href}
              className="after:absolute after:inset-0 after:rounded-md after:content-[''] group-hover:underline group-hover:underline-offset-4 focus-visible:outline-none focus-visible:after:shadow-[var(--nff-focus-ring)]"
            >
              {item.path.title}
            </Link>
          </h3>
          <p className="nff-body-sm text-nff-text-secondary">{item.path.summary}</p>
        </div>

        {item.status === 'in-progress' && (
          <div className="max-w-md">
            <LearnProgress
              value={item.percent}
              label={`${item.completedCount} of ${item.lessonCount} lessons complete · ${item.percent}%`}
              ariaLabel={`${item.path.title} progress`}
            />
          </div>
        )}

        {item.nextLesson && (
          <p className="nff-body-sm text-foreground">
            <span className="text-nff-text-secondary">
              {item.nextLesson.resume ? 'Resume' : item.status === 'not-started' ? 'Starts with' : 'Next'}:{' '}
            </span>
            {item.nextLesson.item.title}
            <span className="text-nff-text-secondary"> · {item.nextLesson.moduleLabel}</span>
          </p>
        )}
        {!item.nextLesson && item.currentModule && item.status !== 'completed' && (
          <p className="nff-body-sm text-nff-text-secondary">Current: {item.currentModule.label}</p>
        )}

        <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {footer.length > 0 ? (
            <p className="nff-caption text-nff-text-secondary">{footer.join(' · ')}</p>
          ) : (
            <span />
          )}
          <Link
            to={item.action.href}
            aria-label={`${item.action.label}: ${item.path.title}`}
            className={cn(isPrimary ? PRIMARY_ACTION : SECONDARY_ACTION, 'relative z-10 w-full sm:w-auto')}
          >
            {item.action.label}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}
