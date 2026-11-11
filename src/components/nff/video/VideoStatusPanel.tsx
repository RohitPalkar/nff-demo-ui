import { Clock, Loader2, LockKeyhole, TriangleAlert, VideoOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export type VideoPanelKind = 'unavailable' | 'processing' | 'error' | 'locked'

const COPY: Record<
  VideoPanelKind,
  { title: string; body: string; icon: typeof VideoOff }
> = {
  unavailable: {
    title: 'This video isn’t available yet',
    body: 'It hasn’t been added to Meadow yet. Everything else here works as usual.',
    icon: VideoOff,
  },
  processing: {
    title: 'This video is being prepared',
    body: 'It will appear here when it is ready. Please check back later.',
    icon: Clock,
  },
  locked: {
    title: 'Sign up free to watch',
    body: 'Create a free account to watch this video and keep your place on any device.',
    icon: LockKeyhole,
  },
  error: {
    title: 'We couldn’t play this video',
    body: 'Check your connection and try again.',
    icon: TriangleAlert,
  },
}

interface VideoStatusPanelProps {
  kind: VideoPanelKind
  /** Extra line under the body, e.g. a link to something else to do. */
  children?: ReactNode
  onRetry?: () => void
  compact?: boolean
}

/** A calm, in-frame explanation that replaces the video. Never a blank box. */
export function VideoStatusPanel({
  kind,
  children,
  onRetry,
  compact,
}: VideoStatusPanelProps) {
  const { title, body, icon: Icon } = COPY[kind]
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      data-video-state={kind}
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-nff-text-on-brand"
    >
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-white/12"
      >
        <Icon className="size-5" />
      </span>
      <p className={compact ? 'nff-label-lg' : 'nff-heading-h4'}>{title}</p>
      {!compact && (
        <p className="max-w-[26rem] nff-body-md text-pretty text-nff-text-on-brand/80">
          {body}
        </p>
      )}
      {children}
      {kind === 'error' && onRetry && (
        <Button
          type="button"
          variant="secondary"
          className="mt-1 h-11 rounded-full px-6"
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  )
}

/** Spinner over the frame while loading or buffering. */
export function VideoBusy({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-video-state="busy"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-black/40 text-white">
        <Loader2 aria-hidden="true" className="size-6 animate-spin motion-reduce:animate-none" />
      </span>
      <span className="sr-only">{label}</span>
    </div>
  )
}
