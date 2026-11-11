import { ResourceVideo } from '@/components/nff/ResourceVideo'
import { cn } from '@/lib/utils'
import { getContentVideo, videoProgressId } from '@/services/learning/video'

/** Anchor the video mini-player returns to. */
export const LESSON_VIDEO_ID = 'lesson-video'

/**
 * The video for a lesson or library item inside the Practitioner app, when it
 * has one. Renders nothing otherwise. Uses the shared ResourceVideo, so saved
 * position, resume, captions, the video mini-player and "one media at a time"
 * with the audio player all work here as on the public site. Progress is not
 * written for staff in preview (the progress service ignores them).
 */
export function LessonVideo({
  itemId,
  title,
  returnTo,
  className,
}: {
  itemId: string
  title: string
  /** The page to come back to from the mini-player. */
  returnTo: string
  className?: string
}) {
  const video = getContentVideo(itemId)
  if (!video) return null
  return (
    <section
      id={LESSON_VIDEO_ID}
      aria-label={`Video: ${title}`}
      className={cn('w-full scroll-mt-28', className)}
    >
      <ResourceVideo
        resourceId={videoProgressId(itemId)}
        title={title}
        video={video}
        returnTo={`${returnTo}#${LESSON_VIDEO_ID}`}
        scrollToId={LESSON_VIDEO_ID}
        className="rounded-md"
      />
    </section>
  )
}
