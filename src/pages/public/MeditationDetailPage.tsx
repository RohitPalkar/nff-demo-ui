import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Clock,
  FileClock,
  FileQuestion,
  Headphones,
  Info,
  LockKeyhole,
  Play,
  Route,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { AudioPlayer } from '@/components/nff/AudioPlayer'
import { ContentCard } from '@/components/nff/ContentCard'
import { ContentVideo } from '@/components/nff/ContentVideo'
import { DetailBreadcrumb } from '@/components/nff/DetailBreadcrumb'
import { ErrorState } from '@/components/nff/ErrorState'
import { SectionHeading } from '@/components/nff/SectionHeading'
import { StatusChip } from '@/components/nff/StatusChip'
import { UnavailableState } from '@/components/nff/UnavailableState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { hasRegisteredAccess, publicAccessContext } from '@/services/learning/access'
import { getContentVideo } from '@/services/learning/video'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  CATEGORY_COPY,
  getContentDetail,
  getStageTitle,
} from '@/services/content'
import type { Artwork } from '@/types'

const TRAIL = [
  { label: 'Home', to: '/' },
  { label: 'Meditations', to: '/meditations' },
]

const TONE_BG: Record<Artwork['tone'], string> = {
  brand: 'bg-nff-bg-brand-subtle text-nff-text-brand',
  accent: 'bg-nff-bg-accent-subtle text-nff-text-accent',
  info: 'bg-nff-bg-info-subtle text-nff-text-info',
  warning: 'bg-nff-bg-warning-subtle text-nff-text-warning',
  success: 'bg-nff-bg-success-subtle text-nff-text-success',
  neutral: 'bg-nff-bg-muted text-nff-text-secondary',
}

function DetailSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="nff-content py-8 md:py-12"
    >
      <span className="nff-visually-hidden">Loading meditation</span>
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr] lg:items-start">
        <Skeleton className="aspect-square w-full max-w-[320px] rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-12 w-full max-w-xl" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-4 h-28 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function MeditationDetailPage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()

  const query = useQuery({
    queryKey: ['content', 'meditation', slug],
    queryFn: () => getContentDetail('meditation', slug),
    enabled: slug.length > 0,
  })

  const canListenFull = hasRegisteredAccess(publicAccessContext(user))

  if (query.isPending) return <DetailSkeleton />

  if (query.isError) {
    const code = (query.error as { code?: string } | null)?.code
    if (code === 'unpublished') {
      return (
        <UnavailableState
          icon={FileClock}
          title="This meditation is not published yet"
          description="The track is still being prepared. It will appear in the library once an editor has published it."
          trail={TRAIL}
          backTo="/meditations"
          backLabel="Back to meditations"
        />
      )
    }
    if (code === 'not_found') {
      return (
        <UnavailableState
          icon={FileQuestion}
          title="We could not find that meditation"
          description="The link may be broken or the track may have moved. Browse the library to find something to listen to."
          trail={TRAIL}
          backTo="/meditations"
          backLabel="Back to meditations"
        />
      )
    }

    return (
      <div>
        <div className="nff-content pt-6 md:pt-8">
          <DetailBreadcrumb trail={TRAIL} current="Unavailable" />
        </div>
        <div className="nff-content py-16">
          <h1 className="sr-only">Meditation unavailable</h1>
          <div className="nff-reading mx-auto">
            <ErrorState
              title="We could not load this meditation"
              description="The track did not arrive. Check your connection and try again."
              onRetry={() => {
                void query.refetch()
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (!query.data) {
    return (
      <UnavailableState
        icon={FileQuestion}
        title="We could not find that meditation"
        description="The link may be broken or the track may have moved. Browse the library to find something to listen to."
        trail={TRAIL}
        backTo="/meditations"
        backLabel="Back to meditations"
      />
    )
  }

  const item = query.data.item
  if (item.type !== 'meditation') {
    return (
      <UnavailableState
        icon={FileQuestion}
        title="We could not find that meditation"
        description="The link may be broken or the track may have moved. Browse the library to find something to listen to."
        trail={TRAIL}
        backTo="/meditations"
        backLabel="Back to meditations"
      />
    )
  }

  if (item.transcode !== 'ready') {
    const failed = item.transcode === 'failed'
    return (
      <UnavailableState
        icon={Headphones}
        title={failed ? 'This track is unavailable' : 'This track is not ready yet'}
        description={
          failed
            ? 'We could not prepare the audio for this track. It has been flagged for review, and a working version will return shortly.'
            : 'The audio is still being prepared. Try again in a few minutes, or browse another practice in the meantime.'
        }
        trail={TRAIL}
        backTo="/meditations"
        backLabel="Back to meditations"
      />
    )
  }

  const related = query.data.related
  const showGate = !canListenFull && !item.preview
  const video = getContentVideo(item.id)
  const playerLimit =
    canListenFull || !item.preview
      ? item.durationSec
      : Math.min(60, item.durationSec)

  return (
    <div>
      <div className="nff-content pt-6 md:pt-8">
        <DetailBreadcrumb trail={TRAIL} current={item.title} />
      </div>

      <article className="pb-16 md:pb-24">
        <header className="nff-content pt-8 md:pt-12">
          <div className="grid gap-8 lg:grid-cols-[320px_1fr] lg:items-start lg:gap-10">
            <div
              aria-hidden="true"
              className={cn(
                'relative flex aspect-square w-full max-w-[320px] items-center justify-center overflow-hidden rounded-xl border',
                TONE_BG[item.artwork.tone],
              )}
            >
              <span className="nff-display text-6xl font-semibold opacity-50">
                {item.artwork.label}
              </span>
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <Link
                to={`/meditations?tab=${item.category}`}
                className="inline-flex w-fit items-center gap-1.5 nff-overline text-nff-text-brand hover:text-nff-text-link-hover nff-focus-ring"
              >
                {CATEGORY_COPY[item.category].label}
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>

              <h1 className="nff-heading-h1 text-foreground">{item.title}</h1>

              <div className="flex flex-wrap items-center gap-3">
                <StatusChip tone="info" icon={Route}>
                  {getStageTitle(item.stageId)}
                </StatusChip>
                {item.preview && (
                  <StatusChip tone="success" icon={Play}>
                    Free preview
                  </StatusChip>
                )}
                <span className="inline-flex items-center gap-1.5 nff-label-md text-muted-foreground">
                  <Clock aria-hidden="true" className="size-4" />
                  {formatDuration(item.durationSec)}
                </span>
              </div>

              <p className="nff-reading-lead text-nff-text-secondary">
                {item.excerpt}
              </p>

              {showGate ? (
                <aside
                  aria-labelledby="listen-gate-heading"
                  className="flex flex-col items-start gap-4 rounded-xl border bg-nff-bg-brand-subtle p-5 md:p-6"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-12 items-center justify-center rounded-full bg-nff-bg-surface text-nff-icon-brand shadow-nff-1"
                  >
                    <LockKeyhole className="size-5" />
                  </span>
                  <div className="flex flex-col gap-2">
                    <h2
                      id="listen-gate-heading"
                      className="nff-heading-h3 text-foreground"
                    >
                      Sign up free to listen to this track
                    </h2>
                    <p className="nff-body-md text-nff-text-secondary">
                      This practice is part of the full meditation library.
                      Create a free account to listen, follow the six stages and
                      keep your place on any device.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild className="h-11">
                      <Link to="/signup">
                        Sign up free
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 border-nff-border-strong bg-nff-bg-surface"
                    >
                      <Link to="/login">Log in</Link>
                    </Button>
                  </div>
                  <p className="nff-caption text-muted-foreground">
                    Free previews · No card needed · Cancel anytime
                  </p>
                </aside>
              ) : (
                <>
                  <AudioPlayer
                    src={item.audioUrl}
                    durationSec={item.durationSec}
                    limitSec={playerLimit}
                    preview={!canListenFull && item.preview}
                    endedContent={
                      !canListenFull ? (
                        <div className="flex flex-col items-start gap-3">
                          <h2 className="nff-heading-h3 text-foreground">
                            Your preview has ended
                          </h2>
                          <p className="nff-body-md text-nff-text-secondary">
                            Sign up free to listen to the full{' '}
                            {formatDuration(item.durationSec)} track and keep
                            your place on any device.
                          </p>
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <Button asChild className="h-11">
                              <Link to="/signup">
                                Sign up free
                                <ArrowRight
                                  aria-hidden="true"
                                  className="size-4"
                                />
                              </Link>
                            </Button>
                            <Button asChild variant="outline" className="h-11">
                              <Link to="/login">Log in</Link>
                            </Button>
                          </div>
                        </div>
                      ) : undefined
                    }
                  />

                  {!canListenFull && item.preview && (
                    <div className="flex items-start gap-3 rounded-lg border bg-nff-bg-surface-sunken p-4">
                      <Info
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-nff-text-info"
                      />
                      <p className="nff-body-sm text-nff-text-secondary">
                        This is a free preview. The player stops after one
                        minute.{' '}
                        <Link
                          to="/signup"
                          className="font-medium text-nff-text-link-default underline-offset-4 hover:underline nff-focus-ring"
                        >
                          Create a free account
                        </Link>{' '}
                        to hear the full track and keep your place.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </header>

        {video && (
          <div className="nff-content mt-10 md:mt-14">
            <ContentVideo
              itemId={item.id}
              title={item.title}
              video={video}
              returnTo={`/meditations/${item.slug}`}
              fullAccess={canListenFull}
            />
          </div>
        )}

        <div className="nff-content mt-10 md:mt-14">
          <div className="nff-reading mx-auto flex flex-col gap-5">
            <h2 className="nff-heading-h3 text-foreground">
              About this practice
            </h2>
            <p className="nff-reading-body text-nff-text-secondary">
              {item.excerpt}
            </p>
            <p className="nff-reading-body text-nff-text-secondary">
              Find a seat that feels steady, or lie down if that is kinder to
              your body. Let your hands rest and your eyes close or soften. You
              can pause at any point and return to the track later; there is no
              right way to do this.
            </p>
            <p className="nff-reading-body text-nff-text-secondary">
              When your attention wanders, that is not a mistake. Notice where
              it went, and gently come back to the next instruction. A few
              honest minutes are enough.
            </p>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section
          aria-labelledby="more-from-stage-heading"
          className="border-t bg-nff-bg-surface-sunken nff-section-gap"
        >
          <div className="nff-content flex flex-col gap-8">
            <SectionHeading
              id="more-from-stage-heading"
              eyebrow="Keep listening"
              title="More from this stage"
              description={`A few more practices from ${getStageTitle(item.stageId)}.`}
              action={
                <Button asChild variant="ghost" className="h-11">
                  <Link to="/meditations">
                    Browse all meditations
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </Button>
              }
            />
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {related.map((entry) => (
                <ContentCard
                  key={entry.id}
                  item={entry}
                  stageLabel={getStageTitle(entry.stageId)}
                  unavailable={
                    entry.type === 'meditation' && entry.transcode !== 'ready'
                  }
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
