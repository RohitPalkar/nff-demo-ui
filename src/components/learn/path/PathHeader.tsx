import { SOW_SCOPE } from '@/config/sowScope'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LearnProgress } from '@/components/learn/home/homeParts'
import { HOME_CARD, PRIMARY_ACTION, SECONDARY_ACTION } from '@/components/learn/home/homeStyles'
import { formatDate, pluralise } from '@/lib/format'
import type { PathPageData } from '@/services/learning/pathPage'
import { LEARN_MY_LEARNING } from '@/services/learning/routes'

const UNLOCK_NOTE = {
  sequential: 'Modules open in order: finish one to open the next.',
  open: 'Modules can be taken in any order.',
  mixed: 'Some modules open in order; others can be taken any time.',
} as const

const STATUS_LABEL = {
  'in-progress': 'In progress',
  'not-started': 'Not started',
  completed: 'Completed',
} as const

export function LearningPathHeader({ data }: { data: PathPageData }) {
  const { path } = data
  return (
    <header className="flex flex-col gap-4">
      <nav aria-label="Breadcrumb" className="flex items-center nff-label-md">
        <Link to={LEARN_MY_LEARNING} className="text-nff-text-secondary hover:text-foreground nff-focus-ring">
          My Learning
        </Link>
        <span aria-hidden="true" className="px-2 text-nff-text-secondary">/</span>
        <span aria-current="page" className="text-foreground">{path.title}</span>
      </nav>
      <div className="flex flex-col gap-3">
        <p className="nff-caption text-nff-text-secondary">
          Learning path · {pluralise(data.moduleCount, 'module')} · {pluralise(data.lessonCount, 'lesson')}
        </p>
        <h1 className="nff-heading-h1 text-foreground">{path.title}</h1>
        <p className="max-w-2xl nff-body-lg text-nff-text-secondary">{path.summary}</p>
      </div>
    </header>
  )
}

/** Progress, the one next action, and what is true about this assignment. */
export function LearningPathProgress({
  data,
  onReview,
}: {
  data: PathPageData
  onReview: () => void
}) {
  const { action, nextLesson } = data
  const label =
    data.status === 'completed'
      ? `All ${data.lessonCount} lessons complete`
      : `${data.completedCount} of ${data.lessonCount} lessons complete · ${data.percent}%`
  return (
    <aside aria-label="Your progress" className={`${HOME_CARD} flex flex-col gap-5 p-5 sm:p-6`}>
      {data.preview ? (
        <p className="nff-body-sm text-nff-text-secondary">
          Preview: not assigned to you. Nothing you open here is recorded.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <p className="nff-label-md text-foreground">{STATUS_LABEL[data.status]}</p>
            <LearnProgress value={data.percent} label={label} ariaLabel={`${data.path.title} progress`} />
          </div>

          {action && data.status !== 'completed' && nextLesson && (
            <div className="flex flex-col gap-2">
              <Link to={action.href} className={`${PRIMARY_ACTION} w-full`}>
                {action.label}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <p className="nff-caption text-nff-text-secondary">
                {nextLesson.resume ? 'Resume' : 'Next'}: {nextLesson.item.title} · {nextLesson.moduleLabel}
              </p>
            </div>
          )}
          {data.status === 'completed' && (
            <button type="button" onClick={onReview} className={`${SECONDARY_ACTION} w-full`}>
              Review learning
            </button>
          )}
          {data.status !== 'completed' && !nextLesson && (
            <p className="nff-body-sm text-nff-text-secondary">No lesson is open right now.</p>
          )}
        </>
      )}

      <dl className="flex flex-col gap-2 border-t border-nff-border-default pt-4 nff-body-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="nff-caption text-nff-text-secondary">How it unlocks</dt>
          <dd className="text-foreground">{UNLOCK_NOTE[data.unlock]}</dd>
        </div>
        {SOW_SCOPE.assignmentDates && data.assignedAt && (
          <div className="flex flex-col gap-0.5">
            <dt className="nff-caption text-nff-text-secondary">Assigned</dt>
            <dd className="text-foreground">{formatDate(data.assignedAt)}</dd>
          </div>
        )}
        {SOW_SCOPE.assignmentDates && data.dueAt && (
          <div className="flex flex-col gap-0.5">
            <dt className="nff-caption text-nff-text-secondary">Due</dt>
            <dd className="text-foreground">{formatDate(data.dueAt)}</dd>
          </div>
        )}
      </dl>
    </aside>
  )
}
