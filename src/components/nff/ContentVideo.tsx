import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ResourceVideo } from '@/components/nff/ResourceVideo'
import { VideoStatusPanel } from '@/components/nff/video/VideoStatusPanel'
import { resolveVideoState } from '@/features/video/videoState'
import { cn } from '@/lib/utils'
import { videoProgressId } from '@/services/learning/video'
import type { VideoMedia } from '@/types'

interface ContentVideoProps {
  /** Content / Resource id. */
  itemId: string
  title: string
  video: VideoMedia
  /** The detail page path, so the mini-player can bring the viewer back. */
  returnTo: string
  /** Whether this viewer may watch in full (same rule as reading/listening). */
  fullAccess: boolean
  className?: string
}

/** Anchor on detail pages; the mini-player returns here. */
export const CONTENT_VIDEO_ID = 'video'

/**
 * Video block for a library item's detail page. Not-ready videos show their
 * calm state to everyone (no sign-up prompt for a video that does not exist
 * yet); a ready video is for account holders, like the full reading and audio.
 */
export function ContentVideo({
  itemId,
  title,
  video,
  returnTo,
  fullAccess,
  className,
}: ContentVideoProps) {
  const ready = resolveVideoState(video) === 'ready'
  const frame = 'rounded-xl'

  return (
    <section
      id={CONTENT_VIDEO_ID}
      aria-label={`Video: ${title}`}
      className={cn('mx-auto w-full max-w-[960px] scroll-mt-24', className)}
    >
      {ready && !fullAccess ? (
        <div className={cn('relative aspect-video min-h-[20rem] w-full overflow-hidden bg-nff-bg-inverse', frame)}>
          {video.posterUrl && (
            <img
              src={video.posterUrl}
              alt=""
              className="absolute inset-0 size-full object-cover opacity-30"
            />
          )}
          <VideoStatusPanel kind="locked">
            <div className="mt-1 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--nff-ivory-50)] px-6 nff-label-lg text-[var(--nff-forest-900)] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Sign up free
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex h-11 items-center rounded-full border border-white/40 px-6 nff-label-lg text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Log in
              </Link>
            </div>
          </VideoStatusPanel>
        </div>
      ) : (
        <ResourceVideo
          resourceId={videoProgressId(itemId)}
          title={title}
          video={video}
          returnTo={`${returnTo}#${CONTENT_VIDEO_ID}`}
          scrollToId={CONTENT_VIDEO_ID}
          className={frame}
        />
      )}
    </section>
  )
}
