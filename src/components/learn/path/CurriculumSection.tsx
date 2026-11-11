import { ChevronDown, Lock } from 'lucide-react'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import { LearnProgress } from '@/components/learn/home/homeParts'
import { HOME_CARD } from '@/components/learn/home/homeStyles'
import { pluralise } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PathModule } from '@/services/learning/pathPage'
import { LessonRow } from './LessonRow'

/**
 * The curriculum: one expandable section per module. Which sections are open
 * is owned by the page (so "Expand all" and a `?module=` link can set it).
 */

function moduleState(module: PathModule) {
  if (module.lockedBy) return 'Locked'
  if (module.complete) return 'Completed'
  return module.completedCount > 0 || module.current ? 'In progress' : 'Not started'
}

export function CurriculumSection({
  modules,
  open,
  onOpenChange,
}: {
  modules: PathModule[]
  open: string[]
  onOpenChange: (open: string[]) => void
}) {
  const allOpen = modules.length > 0 && open.length === modules.length
  return (
    <section aria-labelledby="curriculum-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="curriculum-heading" tabIndex={-1} className="nff-heading-h3 text-foreground focus-visible:outline-none">
          Curriculum
        </h2>
        {modules.length > 1 && (
          <button
            type="button"
            onClick={() => onOpenChange(allOpen ? [] : modules.map((module) => module.id))}
            className="h-9 nff-label-md text-nff-text-brand underline-offset-4 hover:underline nff-focus-ring"
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>

      <AccordionPrimitive.Root
        type="multiple"
        value={open}
        onValueChange={onOpenChange}
        asChild
      >
        <ol className="flex flex-col gap-3">
          {modules.map((module) => {
            const locked = Boolean(module.lockedBy)
            return (
              <li key={module.id}>
                <AccordionPrimitive.Item
                  value={module.id}
                  id={`module-${module.id}`}
                  className={cn(HOME_CARD, 'overflow-hidden', locked && 'bg-[var(--nff-ivory-50)]')}
                >
                  <AccordionPrimitive.Header asChild>
                    <h3>
                      <AccordionPrimitive.Trigger className="group flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-[var(--nff-sage-50)] nff-focus-ring sm:gap-4 sm:p-5">
                        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <span className="nff-caption text-nff-text-secondary">
                            {module.label.split(' · ')[0]} · {moduleState(module)}
                          </span>
                          <span className="nff-heading-h4 text-foreground">{module.title}</span>
                          {module.summary && (
                            <span className="nff-body-sm text-nff-text-secondary">{module.summary}</span>
                          )}
                          {locked ? (
                            <span className="inline-flex items-center gap-1.5 nff-label-sm text-nff-text-secondary">
                              <Lock aria-hidden="true" className="size-4 shrink-0" />
                              Opens when {module.lockedBy} is complete
                            </span>
                          ) : (
                            <span className="max-w-sm pt-1">
                              <LearnProgress
                                value={module.percent}
                                label={`${module.completedCount} of ${pluralise(module.total, 'lesson')} complete`}
                                ariaLabel={`${module.title} progress`}
                              />
                            </span>
                          )}
                        </span>
                        <ChevronDown
                          aria-hidden="true"
                          className="mt-1 size-5 shrink-0 text-nff-icon-secondary transition-transform group-data-[state=open]:rotate-180"
                        />
                      </AccordionPrimitive.Trigger>
                    </h3>
                  </AccordionPrimitive.Header>
                  <AccordionPrimitive.Content className="border-t border-nff-border-default">
                    {module.intro && (
                      <p className="px-4 pt-4 nff-body-sm text-nff-text-secondary sm:px-6">{module.intro}</p>
                    )}
                    <ul className="divide-y divide-nff-border-default py-1">
                      {module.lessons.map((lesson) => (
                        <li key={lesson.lessonId}>
                          <LessonRow lesson={lesson} />
                        </li>
                      ))}
                    </ul>
                  </AccordionPrimitive.Content>
                </AccordionPrimitive.Item>
              </li>
            )
          })}
        </ol>
      </AccordionPrimitive.Root>
    </section>
  )
}
