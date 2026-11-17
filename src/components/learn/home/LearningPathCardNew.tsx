'use client'

import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { AssignedPath, PathStatus } from '@/services/learning/home'
import { LearnProgress } from './homeParts'
import { HOME_CARD, SECONDARY_ACTION } from './homeStyles'
import { GrowthPlant } from './BotanicalIllustrations'

const STATUS_LABEL: Record<PathStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  complete: 'Complete',
}

const STATUS_ICON = {
  'not-started': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-3.5" aria-hidden="true">
      <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
    </svg>
  ),
  'in-progress': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden="true">
      <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
      <path d="M12 8v4l2 2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  complete: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden="true">
      <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
      <path d="M8 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

export function LearningPathCardNew({ entry }: { entry: AssignedPath }) {
  const { path, href, lessonCount, completedCount, percent, status, nextLesson } = entry
  const isActive = status === 'in-progress'
  const isComplete = status === 'complete'

  return (
    <article className={cn(
      HOME_CARD,
      'flex flex-col gap-4 p-4 sm:p-5',
      isActive && 'ring-2 ring-[var(--nff-forest-300)] bg-[var(--nff-forest-50)]/50',
      isComplete && 'bg-[var(--nff-sage-50)]/50'
    )}>
      {/* Header with status and path info */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'inline-flex items-center justify-center rounded-full px-2 py-0.5 nff-label-sm font-medium',
              {
                'bg-[var(--nff-forest-100)] text-[var(--nff-forest-900)]': status === 'in-progress',
                'bg-[var(--nff-sage-100)] text-[var(--nff-sage-800)]': status === 'complete',
                'bg-[var(--nff-slate-100)] text-[var(--nff-slate-700)]': status === 'not-started',
              }
            )}>
              {STATUS_ICON[status]}
              <span>{STATUS_LABEL[status]}</span>
            </span>
            {isActive && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--nff-forest-100)] text-[var(--nff-forest-800)] text-xs font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--nff-forest-500)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--nff-forest-500)]" />
                </span>
                <span className="font-medium">Active</span>
              </span>
            )}
          </div>
          <Link to={href} className="group">
            <h3 className="nff-heading-h5 text-foreground group-hover:text-[var(--nff-forest-900)] transition-colors line-clamp-1">
              {path.title}
            </h3>
          </Link>
          <p className="nff-body-sm text-[var(--nff-text-secondary)] line-clamp-2">{path.summary}</p>
        </div>

        {/* Progress with growth plant */}
        <div className="flex flex-col items-end sm:flex-row sm:items-center sm:justify-between gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <GrowthPlant stage={Math.max(1, Math.round(percent / 33.3))} size="sm" />
            <LearnProgress
              value={percent}
              label={`${completedCount} of ${lessonCount} lessons · ${percent}%`}
              ariaLabel={`${path.title} progress`}
            />
          </div>
          <Link to={href} className={`${SECONDARY_ACTION} whitespace-nowrap`}>
            View path
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 ml-1" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Progress bar with growth plant */}
      <div className="pt-2">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="nff-caption text-[var(--nff-text-tertiary)]">
            {completedCount} of {lessonCount} lessons · {percent}%
          </span>
          <GrowthPlant stage={Math.max(1, Math.round(percent / 33.3))} size="sm" />
        </div>
        <div className="h-1.5 rounded-full bg-[var(--nff-sage-100)] overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${path.title} progress`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--nff-forest-500)] to-[var(--nff-forest-700)] transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Next lesson or completion */}
      <div className="pt-2 border-t border-[var(--nff-border-default)]">
        {nextLesson ? (
          <Link to={nextLesson.href} className="group flex items-center gap-3 p-3 rounded-lg bg-[var(--nff-sage-50)] border border-[var(--nff-sage-200)] transition-colors hover:bg-[var(--nff-sage-100)]">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white border border-[var(--nff-sage-200)] group-hover:border-[var(--nff-forest-300)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 text-[var(--nff-forest-600)] group-hover:text-[var(--nff-forest-900)]" aria-hidden="true">
                <path d="M8 5v14l11-7-11-7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="nff-caption text-[var(--nff-text-tertiary)]">Next lesson</p>
              <p className="nff-label-md text-foreground group-hover:text-[var(--nff-forest-900)] truncate">{nextLesson.title}</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 text-[var(--nff-icon-secondary)] group-hover:text-[var(--nff-forest-600)]" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ) : isComplete ? (
          <div className="flex items-center justify-center gap-2 p-4 text-center bg-[var(--nff-sage-50)] rounded-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6 text-[var(--nff-sage-600)]" aria-hidden="true">
              <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
              <path d="M8 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <p className="nff-label-md text-[var(--nff-forest-900)]">Path complete</p>
              <p className="nff-caption text-[var(--nff-text-secondary)]">Every step matters. Well done.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 p-4 text-center bg-[var(--nff-slate-50)] rounded-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6 text-[var(--nff-slate-400)]" aria-hidden="true">
              <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
            </svg>
            <div>
              <p className="nff-label-md text-[var(--nff-slate-600)]">Not started yet</p>
              <p className="nff-caption text-[var(--nff-text-tertiary)]">Begin when you're ready. No rush.</p>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}