import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, CheckCircle2, FileQuestion } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { UnavailableState } from '@/components/nff/UnavailableState'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { FLAGS } from '@/config/flags'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatReadingTime } from '@/lib/format'
import {
  getItemById,
  getProgress,
  getStage,
  saveProgress,
} from '@/services/content'
import { itemHref } from './JourneyPage'

export function ExplorationReaderPage() {
  const { stageId = '', contentId = '' } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [scrolled, setScrolled] = useState(0)

  const progressQuery = useQuery({
    queryKey: ['progress', user?.id],
    queryFn: () => getProgress(user!.id),
    enabled: Boolean(user),
  })

  const item = getItemById(contentId)
  const stage = getStage(stageId)
  const [justCompleted, setJustCompleted] = useState(false)

  useEffect(() => {
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setScrolled(max <= 0 ? 100 : Math.min(100, (window.scrollY / max) * 100))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const progress = progressQuery.data
  const completed = progress?.completedItemIds.includes(contentId) ?? false

  function complete() {
    if (!progress || !user || completed) return
    saveProgress({
      ...progress,
      completedItemIds: [...progress.completedItemIds, contentId],
      inProgressItemId:
        progress.inProgressItemId === contentId
          ? undefined
          : progress.inProgressItemId,
    })
    setJustCompleted(true)
    void queryClient.invalidateQueries({ queryKey: ['progress'] })
    void queryClient.invalidateQueries({ queryKey: ['journey'] })
    void queryClient.invalidateQueries({ queryKey: ['stage'] })
  }

  useEffect(() => {
    if (FLAGS.completionMode === 'scroll' && scrolled >= 98) complete()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrolled])

  if (!item || item.type !== 'exploration' || !stage) {
    return (
      <UnavailableState
        icon={FileQuestion}
        title="We could not find that lesson"
        description="Head back to your stage to pick something to read."
        trail={[{ label: 'Journey', to: '/journey' }]}
        backTo="/journey"
        backLabel="Back to journey"
      />
    )
  }

  if (progressQuery.isPending) {
    return (
      <div aria-busy="true" className="nff-content py-10">
        <Skeleton className="h-10 w-64" />
      </div>
    )
  }

  const position = stage.itemIds.indexOf(contentId)
  const prev = getItemById(stage.itemIds[position - 1] ?? '')
  const next = getItemById(stage.itemIds[position + 1] ?? '')

  return (
    <div>
      <div className="sticky top-[var(--nff-layout-header-height)] z-30 border-b bg-background/95 backdrop-blur">
        <div className="nff-content flex h-12 items-center justify-between gap-4">
          <Link
            to={`/journey/stages/${stage.id}`}
            className="inline-flex items-center gap-1.5 nff-label-md text-muted-foreground hover:text-foreground nff-focus-ring"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Stage {stage.number}
          </Link>
          <span className="nff-caption text-muted-foreground">
            Lesson {position + 1} of {stage.itemIds.length}
          </span>
        </div>
        <Progress
          value={scrolled}
          aria-label="Reading progress"
          className="h-1 rounded-none"
        />
      </div>

      <article className="nff-content pb-20 pt-10">
        <div className="nff-reading mx-auto flex flex-col gap-6">
          <header className="flex flex-col gap-3">
            <p className="nff-overline text-nff-text-brand">
              Stage {stage.number} · {stage.title}
            </p>
            <h1 className="nff-heading-h1">{item.title}</h1>
            <p className="nff-label-md text-muted-foreground">
              {formatReadingTime(item.readingTimeMin)}
            </p>
          </header>
          <p className="nff-reading-lead text-nff-text-secondary">
            {item.excerpt}
          </p>
          {item.body.map((paragraph) => (
            <p
              key={paragraph}
              className="nff-reading-body text-nff-text-secondary"
            >
              {paragraph}
            </p>
          ))}

          <section
            aria-live="polite"
            className="mt-4 flex flex-col items-start gap-3 rounded-xl border bg-card p-6"
          >
            {completed ? (
              <p className="inline-flex items-center gap-2 nff-label-lg text-nff-text-success">
                <CheckCircle2 aria-hidden="true" className="size-5" />
                {justCompleted ? 'Marked as complete. Nice work.' : 'Completed'}
              </p>
            ) : FLAGS.completionMode === 'button' ? (
              <>
                <p className="nff-body-md text-nff-text-secondary">
                  Finished reading? Mark this lesson complete to move on.
                </p>
                <Button type="button" className="h-11" onClick={complete}>
                  Mark as complete
                </Button>
              </>
            ) : (
              <p className="nff-body-md text-muted-foreground">
                This lesson completes when you reach the end.
              </p>
            )}
          </section>

          <nav
            aria-label="Lesson navigation"
            className="flex items-center justify-between gap-3 border-t pt-6"
          >
            {prev ? (
              <Button asChild variant="outline" className="h-11">
                <Link to={itemHref(stage.id, prev)}>
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  Previous
                </Link>
              </Button>
            ) : (
              <span />
            )}
            {next ? (
              <Button asChild className="h-11">
                <Link to={itemHref(stage.id, next)}>
                  Next
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild className="h-11">
                <Link to={`/journey/stages/${stage.id}`}>Back to stage</Link>
              </Button>
            )}
          </nav>
        </div>
      </article>
    </div>
  )
}
