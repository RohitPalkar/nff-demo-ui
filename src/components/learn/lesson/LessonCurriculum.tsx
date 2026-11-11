import { CheckCircle2, Circle, CircleDot, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'
import type { LessonPageData } from '@/services/learning/lessonView'
import type { LessonState } from '@/services/learning/pathPage'
import { pathHref } from '@/services/learning/routes'

/**
 * The path's curriculum inside the lesson screen (sidebar on large screens,
 * drawer below). Each state has its own icon and a word for screen readers;
 * the current lesson is marked `aria-current`. Locked lessons are not links.
 */

const ICON: Record<LessonState, { icon: typeof Circle; label: string }> = {
  complete: { icon: CheckCircle2, label: 'Completed' },
  'in-progress': { icon: CircleDot, label: 'In progress' },
  available: { icon: Circle, label: 'Not started' },
  locked: { icon: Lock, label: 'Locked' },
  unavailable: { icon: Circle, label: 'Not ready yet' },
}

export function LessonCurriculum({
  data,
  open,
  onOpenChange,
  onNavigate,
}: {
  data: LessonPageData
  open: string[]
  onOpenChange: (open: string[]) => void
  onNavigate?: () => void
}) {
  return (
    <nav aria-label="Curriculum" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <Link
          to={pathHref(data.path.slug)}
          onClick={onNavigate}
          className="nff-label-lg text-foreground hover:underline hover:underline-offset-4 nff-focus-ring"
        >
          {data.path.title}
        </Link>
        <p className="nff-caption text-nff-text-secondary">
          {data.modules.reduce((n, m) => n + m.completedCount, 0)} of{' '}
          {data.modules.reduce((n, m) => n + m.total, 0)} lessons complete
        </p>
      </div>

      <AccordionPrimitive.Root type="multiple" value={open} onValueChange={onOpenChange} asChild>
        <ol className="flex flex-col divide-y divide-nff-border-default border-y border-nff-border-default">
          {data.modules.map((module) => (
            <li key={module.id}>
              <AccordionPrimitive.Item value={module.id}>
                <AccordionPrimitive.Header asChild>
                  <h3>
                    <AccordionPrimitive.Trigger className="group flex w-full items-start gap-2 py-3 text-left nff-focus-ring">
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="nff-label-md text-foreground">{module.label}</span>
                        <span className="nff-caption text-nff-text-secondary">
                          {module.lockedBy
                            ? `Locked · opens when ${module.lockedBy} is complete`
                            : `${module.completedCount} of ${module.total} complete`}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="mt-1 text-nff-icon-secondary transition-transform group-data-[state=open]:rotate-180"
                      >
                        ⌄
                      </span>
                    </AccordionPrimitive.Trigger>
                  </h3>
                </AccordionPrimitive.Header>
                <AccordionPrimitive.Content>
                  <ul className="flex flex-col pb-2">
                    {module.lessons.map((lesson) => {
                      const current = lesson.lessonId === data.lesson.lessonId
                      const { icon: Icon, label } = ICON[lesson.state]
                      const body = (
                        <>
                          <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-nff-icon-secondary" />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className={cn('nff-body-sm text-foreground', current && 'nff-label-md')}>
                              {lesson.item.title}
                            </span>
                            <span className="nff-caption text-nff-text-secondary">
                              <span className="sr-only">{label}. </span>
                              {current ? 'Current lesson' : lesson.state === 'locked' ? 'Locked' : lesson.state === 'unavailable' ? 'Not ready yet' : lesson.duration}
                            </span>
                          </span>
                        </>
                      )
                      const base = 'flex items-start gap-2.5 rounded-sm px-2 py-2'
                      return (
                        <li key={lesson.lessonId}>
                          {lesson.state === 'locked' || lesson.state === 'unavailable' ? (
                            <div className={cn(base, 'opacity-70')}>{body}</div>
                          ) : (
                            <Link
                              to={lesson.href}
                              onClick={onNavigate}
                              aria-current={current ? 'page' : undefined}
                              className={cn(
                                base,
                                'transition-colors hover:bg-[var(--nff-sage-50)] nff-focus-ring',
                                current && 'bg-[var(--nff-sage-100)]',
                              )}
                            >
                              {body}
                            </Link>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </AccordionPrimitive.Content>
              </AccordionPrimitive.Item>
            </li>
          ))}
        </ol>
      </AccordionPrimitive.Root>
    </nav>
  )
}
