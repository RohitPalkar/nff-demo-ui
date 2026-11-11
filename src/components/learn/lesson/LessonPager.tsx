import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HOME_CARD, PRIMARY_ACTION, SECONDARY_ACTION } from '@/components/learn/home/homeStyles'
import { pluralise } from '@/lib/format'
import type { LessonPageData } from '@/services/learning/lessonView'
import { pathHref } from '@/services/learning/routes'

/**
 * Previous and next, from the lessons the learner can open now. The service
 * never offers a locked lesson, so neither link can lead to a closed door.
 */
export function LessonPager({ data }: { data: LessonPageData }) {
  const { prev, next, path } = data
  return (
    <nav aria-label="Lesson navigation" className="flex flex-col gap-3 border-t border-nff-border-default pt-6 sm:flex-row sm:items-stretch sm:justify-between">
      {prev ? (
        <Link to={prev.href} className={`${SECONDARY_ACTION} h-auto min-h-11 justify-start py-2 text-left sm:max-w-[48%]`}>
          <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
          <span className="flex min-w-0 flex-col">
            <span className="nff-caption text-nff-text-secondary">Previous</span>
            <span className="truncate">{prev.item.title}</span>
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link to={next.href} className={`${PRIMARY_ACTION} h-auto min-h-11 justify-end py-2 text-right sm:max-w-[48%]`}>
          <span className="flex min-w-0 flex-col">
            <span className="nff-caption opacity-80">Next</span>
            <span className="truncate">{next.item.title}</span>
          </span>
          <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
        </Link>
      ) : (
        <Link to={pathHref(path.slug)} className={SECONDARY_ACTION}>
          Back to curriculum
        </Link>
      )}
    </nav>
  )
}

/**
 * Shown once the lesson is complete. Says only what is true: how the module
 * stands, whether the next module is open (by its own unlock rule, not
 * because of this lesson), and what comes next. No points, streaks or badges.
 */
export function CompletionPanel({
  data,
  libraryBack,
  libraryBackLabel = 'Back to Library',
}: {
  data: LessonPageData | null
  libraryBack?: string
  libraryBackLabel?: string
}) {
  if (!data) {
    return (
      <section aria-label="Lesson complete" className={`${HOME_CARD} flex flex-col gap-4 p-5 sm:p-6`}>
        <p className="inline-flex items-center gap-2 nff-label-lg text-nff-text-success">
          <CheckCircle2 aria-hidden="true" className="size-5" />
          Completed
        </p>
        <p className="nff-body-sm text-nff-text-secondary">
          This counts in every learning path that uses it.
        </p>
        {libraryBack && (
          <Link to={libraryBack} className={`${SECONDARY_ACTION} w-fit`}>
            {libraryBackLabel}
          </Link>
        )}
      </section>
    )
  }

  const { completion, module, next, path } = data
  return (
    <section aria-label="Lesson complete" className={`${HOME_CARD} flex flex-col gap-4 p-5 sm:p-6`}>
      <div className="flex flex-col gap-1.5">
        <p className="inline-flex items-center gap-2 nff-label-lg text-nff-text-success">
          <CheckCircle2 aria-hidden="true" className="size-5" />
          Lesson complete
        </p>
        <p className="nff-body-sm text-nff-text-secondary">
          {module.label}: {completion.completedInModule} of {pluralise(completion.totalInModule, 'lesson')} complete.
        </p>
        {completion.pathComplete ? (
          <p className="nff-body-md text-foreground">You have completed {path.title}.</p>
        ) : completion.moduleComplete ? (
          <p className="nff-body-md text-foreground">
            You have finished {module.label}.
            {completion.nextModule &&
              (completion.nextModule.open
                ? ` ${completion.nextModule.label} is open.`
                : ` ${completion.nextModule.label} opens when ${completion.nextModule.lockedBy} is complete.`)}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3">
        {next && !completion.pathComplete && (
          <Link to={next.href} className={PRIMARY_ACTION}>
            Continue learning
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        )}
        <Link to={pathHref(path.slug)} className={SECONDARY_ACTION}>
          Back to curriculum
        </Link>
      </div>
    </section>
  )
}
