import { SOW_SCOPE } from '@/config/sowScope'
import { Link } from 'react-router-dom'
import { formatDate, pluralise } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AssignedPath, PathStatus } from '@/services/learning/home'
import { LearnProgress } from './homeParts'
import { HOME_CARD, SECONDARY_ACTION } from './homeStyles'

const STATUS_LABEL: Record<PathStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  complete: 'Complete',
}

const STATUS_COLOR: Record<PathStatus, string> = {
  'not-started': 'bg-[var(--nff-slate-100)] text-[var(--nff-slate-700)]',
  'in-progress': 'bg-[var(--nff-forest-100)] text-[var(--nff-forest-900)]',
  complete: 'bg-[var(--nff-sage-100)] text-[var(--nff-sage-800)]',
}

export function LearningPathCard({ entry }: { entry: AssignedPath }) {
  const { path, href, moduleCount, lessonCount, completedCount, percent, status, nextLesson } = entry
  const assignedLine = entry.preview
    ? 'Preview: not assigned to you'
    : SOW_SCOPE.assignmentDates && entry.assignedAt
      ? `Assigned ${formatDate(entry.assignedAt)}${entry.dueAt ? ` · Due ${formatDate(entry.dueAt)}` : ''}`
      : null

  return (
    <article className={cn(HOME_CARD, 'flex flex-col gap-5 p-5 sm:p-6')}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="nff-caption text-nff-text-secondary">
            Learning path · {pluralise(moduleCount, 'module')} · {pluralise(lessonCount, 'lesson')}
          </p>
          <span className={cn('rounded-sm px-2 py-0.5 nff-label-sm', STATUS_COLOR[status])}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        <h3 className="nff-heading-h4 text-foreground">{path.title}</h3>
        <p className="nff-body-sm text-nff-text-secondary">{path.summary}</p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-sm">
          {lessonCount > 0 && (
            <LearnProgress
              value={percent}
              label={`${completedCount} of ${lessonCount} lessons complete`}
              ariaLabel={`${path.title} progress`}
            />
          )}
          {nextLesson && (
            <div className="flex items-center gap-2 text-[var(--nff-forest-700)]">
              <span className="nff-caption">Next:</span>
              <span className="nff-label-md truncate">{nextLesson.title}</span>
            </div>
          )}
          {assignedLine && <p className="nff-caption text-nff-text-secondary">{assignedLine}</p>}
        </div>
        <Link to={href} className={`${SECONDARY_ACTION} w-full sm:w-auto`}>
          View learning path
        </Link>
      </div>
    </article>
  )
}
