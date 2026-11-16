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

export function LearningPathCard({ entry }: { entry: AssignedPath }) {
  const { path, href, moduleCount, lessonCount, completedCount, percent, status } = entry
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
          <span className="rounded-sm bg-[var(--nff-sage-100)] px-2 py-0.5 nff-label-sm text-[var(--nff-forest-900)]">
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
          {assignedLine && <p className="nff-caption text-nff-text-secondary">{assignedLine}</p>}
        </div>
        <Link to={href} className={`${SECONDARY_ACTION} w-full sm:w-auto`}>
          View learning path
        </Link>
      </div>
    </article>
  )
}
