import { ArrowRight, BookOpen, CheckCircle2, Circle, CircleDot, Headphones, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { LessonState, PathLesson } from '@/services/learning/pathPage'

/**
 * One lesson in a module. State is a word and an icon, never colour alone.
 * Rows are plain text (no thumbnails) so a module of many lessons stays calm.
 * 
 * Active lesson (isActive): receives a distinct card treatment with muted sage
 * background, subtle border, and "CURRENT LESSON" label.
 */

const STATE: Record<LessonState, { label: string; icon: typeof Circle; tone: string }> = {
  complete: { label: 'Completed', icon: CheckCircle2, tone: 'text-[var(--nff-sage-600)]' },
  'in-progress': { label: 'In progress', icon: CircleDot, tone: 'text-[var(--nff-forest-900)]' },
  available: { label: 'Not started', icon: Circle, tone: 'text-nff-icon-secondary' },
  locked: { label: 'Locked', icon: Lock, tone: 'text-nff-icon-secondary' },
  unavailable: { label: 'Not ready yet', icon: Circle, tone: 'text-nff-icon-secondary' },
}

const ACTION: Partial<Record<LessonState, string>> = {
  complete: 'Review',
  'in-progress': 'Resume',
  available: 'Start',
}

export function LessonStatus({ state }: { state: LessonState }) {
  const { label, icon: Icon, tone } = STATE[state]
  return (
    <span className="inline-flex items-center gap-1.5 nff-caption text-nff-text-secondary">
      <Icon aria-hidden="true" className={cn('size-4 shrink-0', tone)} />
      {label}
    </span>
  )
}

export function LessonFormatIndicator({ lesson }: { lesson: PathLesson }) {
  const Icon = lesson.format === 'audio' ? Headphones : BookOpen
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 nff-caption text-nff-text-secondary">
      <span className="inline-flex items-center gap-1.5">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        {lesson.format === 'audio' ? 'Audio' : 'Article'} · {lesson.duration}
      </span>
    </span>
  )
}

interface LessonRowProps {
  lesson: PathLesson
  /** Whether this lesson is the currently selected/active one */
  isActive?: boolean
}

export function LessonRow({ lesson, isActive = false }: LessonRowProps) {
  const action = ACTION[lesson.state]
  const body = (
    <>
      <span aria-hidden="true" className="w-6 shrink-0 text-right nff-label-md text-nff-text-secondary">
        {lesson.number}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn(
          'nff-label-md text-foreground',
          isActive && 'font-semibold'
        )}>
          {lesson.item.title}
        </span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <LessonStatus state={lesson.state} />
          <LessonFormatIndicator lesson={lesson} />
          {isActive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--nff-accent-active)] px-2 py-0.5 nff-caption font-medium text-[var(--nff-ivory-50)]">
              Current lesson
            </span>
          )}
        </span>
        {lesson.note && <span className="nff-caption text-nff-text-secondary">{lesson.note}</span>}
      </span>
      {action && (
        <span className="hidden shrink-0 items-center gap-1.5 nff-label-md text-nff-text-brand group-hover:underline group-hover:underline-offset-4 sm:inline-flex">
          {action}
          <ArrowRight aria-hidden="true" className="size-4" />
        </span>
      )}
    </>
  )

  const openable = lesson.state !== 'locked' && lesson.state !== 'unavailable'
  const baseClasses = 'group flex items-start gap-3 px-4 py-3.5 transition-colors nff-focus-ring sm:items-center sm:gap-4 sm:px-6'
  const activeClasses = cn(
    baseClasses,
    isActive && 'bg-[var(--nff-bg-active)] border border-[var(--nff-border-active)] rounded-[var(--nff-radius-lg)] shadow-nff-1',
    !isActive && 'hover:bg-[var(--nff-sage-50)]',
  )

  return openable ? (
    <Link
      to={lesson.href}
      className={activeClasses}
      aria-current={isActive ? 'page' : undefined}
    >
      {body}
    </Link>
  ) : (
    <div className={cn(
      'flex items-start gap-3 px-4 py-3.5 sm:items-center sm:gap-4 sm:px-6',
      isActive && 'bg-[var(--nff-bg-active)] border border-[var(--nff-border-active)] rounded-[var(--nff-radius-lg)]'
    )}>
      {body}
    </div>
  )
}
