import { CheckCircle2, Headphones } from 'lucide-react'
import { LessonVideo } from '@/components/learn/LessonVideo'
import { HOME_CARD, PRIMARY_ACTION } from '@/components/learn/home/homeStyles'
import { useLessonCompletion } from '@/features/learn/useLessonCompletion'
import { content } from '@/mocks/db'
import type { LessonPageData } from '@/services/learning/lessonView'
import { LEARN_LIBRARY, pathHref } from '@/services/learning/routes'
import type { Lesson } from '@/types'
import { AudioPlayerCard } from './AudioLesson'
import { LessonNotice } from './LessonNotice'
import { CompletionPanel, LessonPager } from './LessonPager'
import { LessonShell } from './LessonShell'

/**
 * Renders a lesson from its blocks, in order: `text` blocks as paragraphs and
 * `resource` blocks as the resource's own content (article text, audio
 * player, video). For lessons of kind `video` or `mixed`. The current
 * catalogue has none, so this is ready, not in use: no lesson was invented to
 * show it. Completion is the explicit button, for every resource at once.
 */
export function BlockLesson({ lesson, data }: { lesson: Lesson; data: LessonPageData }) {
  const items = lesson.blocks.flatMap((block) => {
    if (block.type !== 'resource') return []
    const item = content.find((entry) => entry.id === block.resourceId)
    return item ? [item] : []
  })
  const { completed, complete, isPreview, progress, ready } = useLessonCompletion(items.map((item) => item.id))

  return (
    <LessonShell data={data}>
      <div className="nff-reading mx-auto flex flex-col gap-6 pb-16 pt-8 md:pt-12">
        <header className="flex flex-col gap-2">
          <p className="nff-overline text-nff-text-brand">{data.module.label}</p>
          <h1 className="nff-heading-h1 text-foreground">{data.lesson.item.title}</h1>
        </header>

        {lesson.blocks.map((block) => {
          if (block.type === 'text') {
            return (
              <div key={block.id} className="flex flex-col gap-4">
                {block.body.map((paragraph, index) => (
                  <p key={index} className="nff-reading-body text-nff-text-secondary">{paragraph}</p>
                ))}
              </div>
            )
          }
          const item = content.find((entry) => entry.id === block.resourceId)
          if (!item || !item.published) return null
          return (
            <section key={block.id} aria-label={item.title} className="flex flex-col gap-4">
              <LessonVideo itemId={item.id} title={item.title} returnTo={data.lesson.href} />
              {item.type === 'exploration' ? (
                <>
                  <h2 className="nff-heading-h3 text-foreground">{item.title}</h2>
                  {item.body.map((paragraph, index) => (
                    <p key={index} className="nff-reading-body text-nff-text-secondary">{paragraph}</p>
                  ))}
                </>
              ) : item.transcode === 'ready' ? (
                <AudioPlayerCard item={item} saved={progress?.positionsSec[item.id] ?? 0} completed={completed} ready={ready} />
              ) : (
                <LessonNotice
                  icon={Headphones}
                  title="This audio is not ready yet"
                  description="It has not been counted as complete."
                  backTo={pathHref(data.path.slug)}
                  backLabel="Back to curriculum"
                />
              )}
            </section>
          )
        })}

        {completed ? (
          <CompletionPanel data={data} libraryBack={LEARN_LIBRARY} />
        ) : isPreview ? (
          <p className={`${HOME_CARD} p-5 nff-body-md text-nff-text-secondary`}>Preview mode: completion is not recorded.</p>
        ) : (
          <button type="button" onClick={complete} className={`${PRIMARY_ACTION} w-fit`}>
            <CheckCircle2 aria-hidden="true" className="size-4" />
            Mark as complete
          </button>
        )}
        <LessonPager data={data} />
      </div>
    </LessonShell>
  )
}
