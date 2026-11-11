import { ArrowLeft, ListTree, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { LessonPageData } from '@/services/learning/lessonView'
import { pathHref } from '@/services/learning/routes'
import { LessonCurriculum } from './LessonCurriculum'

/**
 * The frame every lesson sits in: a slim bar (back, where you are, curriculum)
 * and, in a path, the curriculum itself: a sticky column from 1024px, a
 * bottom drawer below it. Opened from the Library there is no curriculum and
 * no "Lesson n of n". The content area is left to each lesson format.
 */
export function LessonShell({
  data,
  library,
  progress,
  children,
}: {
  /** Set for a lesson inside a path. */
  data: LessonPageData | null
  /** Set when opened from the Library: where "back" goes and what the bar says. */
  library?: { backHref: string; label: string; backLabel?: string }
  /** Reading progress, 0-100. Shown as a thin bar under the bar. */
  progress?: number
  children: ReactNode
}) {
  const [drawer, setDrawer] = useState(false)
  const [open, setOpen] = useState<string[]>(() => (data ? [data.module.id] : []))
  const back = data
    ? { to: pathHref(data.path.slug), label: data.path.title }
    : { to: library?.backHref ?? '/learn/library', label: library?.backLabel ?? 'Library' }

  const curriculum = (onNavigate?: () => void) =>
    data && <LessonCurriculum data={data} open={open} onOpenChange={setOpen} onNavigate={onNavigate} />

  return (
    <div>
      <div className="sticky top-16 z-30 border-b border-nff-border-default bg-nff-bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
          <Link
            to={back.to}
            className="inline-flex min-w-0 items-center gap-1.5 nff-label-md text-nff-text-secondary hover:text-foreground nff-focus-ring"
          >
            <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{back.label}</span>
          </Link>
          <p className="hidden min-w-0 truncate nff-caption text-nff-text-secondary sm:block">
            {data
              ? `${data.module.label} · Lesson ${data.position} of ${data.total}`
              : (library?.label ?? 'Library')}
          </p>
          {data && (
            <Sheet open={drawer} onOpenChange={setDrawer}>
              <SheetTrigger asChild>
                <Button type="button" variant="ghost" className="h-9 gap-1.5 px-2 nff-label-md lg:hidden">
                  <ListTree aria-hidden="true" className="size-4" />
                  Curriculum
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                showCloseButton={false}
                className="max-h-[80dvh] gap-0 rounded-t-md bg-nff-bg-surface p-0"
              >
                <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
                  <SheetTitle className="nff-heading-h4">Curriculum</SheetTitle>
                  <SheetClose asChild>
                    <Button type="button" variant="ghost" size="icon" className="size-10" aria-label="Close curriculum">
                      <X className="size-5" />
                    </Button>
                  </SheetClose>
                </div>
                <SheetDescription className="sr-only">Lessons in {data.path.title}</SheetDescription>
                <div className="overflow-y-auto px-4 py-4">{curriculum(() => setDrawer(false))}</div>
              </SheetContent>
            </Sheet>
          )}
        </div>
        {progress !== undefined && (
          <Progress
            value={progress}
            aria-label="Reading progress"
            className="h-1 rounded-none bg-[var(--nff-sage-100)] [&>*]:bg-[var(--nff-sage-600)]"
          />
        )}
      </div>

      <div
        className={
          data
            ? 'mx-auto grid max-w-[1440px] gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-10 xl:grid-cols-[minmax(0,1fr)_360px]'
            : 'mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10'
        }
      >
        <div className="min-w-0">{children}</div>
        {data && (
          <aside
            aria-label="Curriculum"
            className="hidden lg:sticky lg:top-[7.5rem] lg:block lg:max-h-[calc(100dvh-9rem)] lg:self-start lg:overflow-y-auto lg:py-10"
          >
            {curriculum()}
          </aside>
        )}
      </div>
    </div>
  )
}
