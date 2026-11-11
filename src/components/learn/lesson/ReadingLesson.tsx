import { CheckCircle2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LessonVideo } from '@/components/learn/LessonVideo'
import { HOME_CARD, PRIMARY_ACTION, SECONDARY_ACTION } from '@/components/learn/home/homeStyles'
import { Thumb } from '@/components/learn/home/homeParts'
import { FLAGS } from '@/config/flags'
import { useAuth } from '@/features/auth/AuthProvider'
import { useLessonCompletion } from '@/features/learn/useLessonCompletion'
import { formatReadingTime } from '@/lib/format'
import { lessonIdForItem } from '@/services/learning/catalogue'
import type { LessonPageData } from '@/services/learning/lessonView'
import { loadProgress, recordReading } from '@/services/learning/progress'
import { LEARN_LIBRARY, lessonHref } from '@/services/learning/routes'
import { getContentVideo } from '@/services/learning/video'
import { CATEGORY_COPY } from '@/services/content'
import type { Exploration } from '@/types'
import { CompletionPanel, LessonPager } from './LessonPager'
import { LessonShell } from './LessonShell'

const SAVE_AFTER_MS = 700
/** Below this the learner has barely started; above, they are essentially done. */
const RESUME_MIN = 3
const RESUME_MAX = 97

/**
 * How far through the article the reader has scrolled, 0-100: 0 with the top
 * of the article at the top of the screen, 100 when its end reaches the bottom
 * of the screen. An article that fits on one screen is fully visible, so 100.
 */
function readPercent(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  const scrollable = rect.height - window.innerHeight
  if (scrollable <= 0) return 100
  return Math.min(100, Math.max(0, Math.round((-rect.top / scrollable) * 100)))
}

/**
 * Reading position, from real scrolling. Saved (after a pause, and when
 * leaving) through the progress service against the item's lesson, only for
 * a signed-in practitioner who has not finished it. The service ignores staff
 * in preview. Opening an article records nothing until the reader scrolls.
 */
function useReadingProgress(articleRef: React.RefObject<HTMLElement | null>, itemId: string, record: boolean) {
  const { user } = useAuth()
  const userId = user?.id
  const lessonId = lessonIdForItem(itemId)
  const saved = useMemo(
    () => (userId ? (loadProgress(userId).lessons[lessonId]?.reading?.scrollPct ?? 0) : 0),
    [userId, lessonId],
  )
  const [percent, setPercent] = useState(0)

  useEffect(() => {
    const element = articleRef.current
    if (!element) return
    let timer: number | undefined
    let latest = 0
    let dirty = false
    const flush = () => {
      window.clearTimeout(timer)
      if (dirty && record && userId && latest >= 1) recordReading(userId, lessonId, latest)
      dirty = false
    }
    const onScroll = () => {
      latest = readPercent(element)
      setPercent(latest)
      dirty = true
      window.clearTimeout(timer)
      timer = window.setTimeout(flush, SAVE_AFTER_MS)
    }
    onScroll()
    dirty = false
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      flush()
    }
  }, [articleRef, userId, lessonId, record])

  return { percent, saved }
}

/**
 * An article lesson: a focused reading column, real reading progress, an
 * explicit completion action and, once complete, where to go next. Used for
 * path lessons (`data` set) and for articles opened from the Library.
 */
export function ReadingLesson({ item, data }: { item: Exploration; data: LessonPageData | null }) {
  const articleRef = useRef<HTMLElement>(null)
  const { completed, justCompleted, complete, isPreview, ready } = useLessonCompletion([item.id])
  const { percent, saved } = useReadingProgress(articleRef, item.id, !completed && !isPreview)
  const [pickedUp, setPickedUp] = useState(false)

  // The scroll-completion flag is a product setting; the default is the button.
  useEffect(() => {
    if (FLAGS.completionMode === 'scroll' && percent >= 98) complete()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent])

  const resumable = ready && !completed && !pickedUp && saved >= RESUME_MIN && saved <= RESUME_MAX
  const resume = () => {
    const element = articleRef.current
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY
      const scrollable = Math.max(0, element.offsetHeight - window.innerHeight)
      window.scrollTo({ top: top + (scrollable * saved) / 100, behavior: 'smooth' })
    }
    setPickedUp(true)
  }

  return (
    <LessonShell data={data} progress={percent} library={{ backHref: LEARN_LIBRARY, label: `Library · ${CATEGORY_COPY[item.category].label}` }}>
      <article ref={articleRef} className="nff-reading mx-auto flex flex-col gap-6 pb-16 pt-8 md:pt-12">
        <header className="flex flex-col gap-3">
          <p className="nff-overline text-nff-text-brand">
            {data ? data.module.label : `Library · ${CATEGORY_COPY[item.category].label}`}
          </p>
          <h1 className="nff-heading-h1 text-foreground">{item.title}</h1>
          <p className="nff-label-md text-nff-text-secondary">{formatReadingTime(item.readingTimeMin)}</p>
        </header>

        {resumable && (
          <div role="status" className={`${HOME_CARD} flex flex-wrap items-center justify-between gap-3 p-4`}>
            <p className="nff-body-sm text-foreground">You stopped about {saved}% of the way through.</p>
            <div className="flex gap-2">
              <button type="button" onClick={resume} className={`${PRIMARY_ACTION} h-10 px-4`}>Pick up where you left off</button>
              <button type="button" onClick={() => setPickedUp(true)} className={`${SECONDARY_ACTION} h-10 px-4`}>Dismiss</button>
            </div>
          </div>
        )}

        <LessonVideo itemId={item.id} title={item.title} returnTo={data ? data.lesson.href : lessonHref(item.id)} />

        {item.image && !getContentVideo(item.id) && (
          <figure className="overflow-hidden rounded-md">
            <Thumb item={item} className="aspect-[16/9] w-full" />
          </figure>
        )}

        <p className="nff-reading-lead text-nff-text-secondary">{item.excerpt}</p>
        {item.body.map((paragraph, index) => (
          <p key={index} className="nff-reading-body text-nff-text-secondary">{paragraph}</p>
        ))}

        <section aria-live="polite" className="mt-4 flex flex-col gap-4">
          {completed ? (
            <CompletionPanel data={data} libraryBack={data ? undefined : LEARN_LIBRARY} />
          ) : isPreview ? (
            <p className={`${HOME_CARD} p-5 nff-body-md text-nff-text-secondary`}>
              Preview mode: completion is not recorded.
            </p>
          ) : FLAGS.completionMode === 'button' ? (
            <div className={`${HOME_CARD} flex flex-col items-start gap-3 p-5 sm:p-6`}>
              <p className="nff-body-md text-nff-text-secondary">
                Finished reading? Mark this lesson complete to move on.
              </p>
              <button type="button" onClick={complete} className={PRIMARY_ACTION}>
                <CheckCircle2 aria-hidden="true" className="size-4" />
                Mark as complete
              </button>
            </div>
          ) : (
            <p className="nff-body-md text-nff-text-secondary">This lesson completes when you reach the end.</p>
          )}
          {justCompleted && <p className="sr-only" role="status">Marked as complete.</p>}
        </section>

        {data && <LessonPager data={data} />}
      </article>
    </LessonShell>
  )
}
