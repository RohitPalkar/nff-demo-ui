import { Headphones, Pause, Play, RotateCcw, RotateCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LessonVideo } from '@/components/learn/LessonVideo'
import { Thumb } from '@/components/learn/home/homeParts'
import { HOME_CARD, PRIMARY_ACTION, SECONDARY_ACTION } from '@/components/learn/home/homeStyles'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthProvider'
import { useLessonCompletion } from '@/features/learn/useLessonCompletion'
import { SPEEDS, usePlayer } from '@/features/player/PlayerProvider'
import { formatClock, formatDuration } from '@/lib/format'
import { getPlaybackSpeed, savePlaybackSpeed } from '@/services/account'
import { isPreviewRole } from '@/services/learning/previewRoles'
import { CATEGORY_COPY } from '@/services/content'
import type { LessonPageData } from '@/services/learning/lessonView'
import { LEARN_LIBRARY, lessonHref, pathHref } from '@/services/learning/routes'
import { getContentVideo } from '@/services/learning/video'
import type { Meditation } from '@/types'
import { CompletionPanel, LessonPager } from './LessonPager'
import { LessonNotice } from './LessonNotice'
import { LessonShell } from './LessonShell'

/** Resume is offered only past this many saved seconds. */
const RESUME_AFTER_SEC = 30

/**
 * The audio controls, on the app's one player (`PlayerProvider`): the track
 * keeps playing in the mini-player when the learner leaves the page, and is
 * never reloaded when they come back. Seek, skip, speed (remembered per
 * account) and resume all act on that player.
 *
 * Demo limitation: the player advances position on a timer and plays a short
 * placeholder recording on loop, so position and completion here are not a
 * measure of real listening. See docs/practitioner-foundation.md.
 */
export function AudioPlayerCard({
  item,
  saved,
  completed,
  ready,
}: {
  item: Meditation
  saved: number
  completed: boolean
  /** Saved progress has loaded. Until then nothing is loaded into the player, so a resume point is never missed. */
  ready: boolean
}) {
  const { user } = useAuth()
  const player = usePlayer()
  const [choiceMade, setChoiceMade] = useState(false)
  const alreadyLoaded = player.track?.id === item.id
  const needsPrompt = ready && !alreadyLoaded && !choiceMade && saved > RESUME_AFTER_SEC && !completed
  const current = alreadyLoaded ? player.position : 0

  // Start at the saved speed, unless this track is already playing.
  useEffect(() => {
    if (user && player.track?.id !== item.id) player.setSpeed(getPlaybackSpeed(user.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, item.id])

  // Load without a prompt when there is nothing to resume.
  useEffect(() => {
    if (!ready || alreadyLoaded || needsPrompt) return
    player.load(item, item.stageId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, ready, alreadyLoaded, needsPrompt])

  if (needsPrompt) {
    return (
      <div className={`${HOME_CARD} flex flex-col items-center gap-3 p-5 text-center`}>
        <p className="nff-label-lg">Resume from {formatClock(saved)}?</p>
        <div className="flex gap-3">
          <button type="button" className={PRIMARY_ACTION} onClick={() => { player.load(item, item.stageId, saved); setChoiceMade(true) }}>
            Resume
          </button>
          <button type="button" className={SECONDARY_ACTION} onClick={() => { player.load(item, item.stageId, 0); setChoiceMade(true) }}>
            Start over
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`${HOME_CARD} flex flex-col gap-5 p-5 sm:p-6`}>
      <div className="flex flex-col gap-2">
        <input
          type="range"
          min={0}
          max={item.durationSec}
          step={1}
          value={Math.min(current, item.durationSec)}
          onChange={(event) => player.seek(Number(event.target.value))}
          aria-label="Seek"
          aria-valuetext={`${formatClock(current)} of ${formatClock(item.durationSec)}`}
          className="nff-range"
        />
        <div className="flex justify-between nff-caption text-nff-text-secondary">
          <span>{formatClock(current)}</span>
          <span>-{formatClock(Math.max(0, item.durationSec - current))}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button type="button" variant="ghost" size="icon" className="size-12" aria-label="Back 15 seconds" onClick={() => player.skip(-15)}>
          <RotateCcw aria-hidden="true" className="size-6" />
        </Button>
        <Button
          type="button"
          size="icon"
          className="size-16 rounded-full"
          aria-label={player.ended && alreadyLoaded ? 'Play again' : alreadyLoaded && player.playing ? 'Pause' : 'Play'}
          onClick={() => (alreadyLoaded ? player.toggle() : player.load(item, item.stageId, 0, true))}
        >
          {alreadyLoaded && player.playing ? <Pause aria-hidden="true" className="size-7" /> : <Play aria-hidden="true" className="size-7" />}
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-12" aria-label="Forward 15 seconds" onClick={() => player.skip(15)}>
          <RotateCw aria-hidden="true" className="size-6" />
        </Button>
      </div>

      <div role="group" aria-label="Playback speed" className="flex flex-wrap justify-center gap-2">
        {SPEEDS.map((speed) => (
          <Button
            key={speed}
            type="button"
            size="sm"
            variant={player.speed === speed ? 'default' : 'outline'}
            aria-pressed={player.speed === speed}
            onClick={() => {
              player.setSpeed(speed)
              // Staff preview never changes anyone's saved preferences.
              if (user && !isPreviewRole(user.role)) savePlaybackSpeed(user.id, speed)
            }}
          >
            {speed}×
          </Button>
        ))}
      </div>

      <p className="text-center nff-caption text-nff-text-secondary">
        Demo audio: a short placeholder recording plays on a timer, so time shown here is not real listening time.
      </p>
    </div>
  )
}

/** An audio lesson: calm and centred, on the shared player. */
export function AudioLesson({
  item,
  data,
  back = { href: LEARN_LIBRARY, label: 'Library' },
}: {
  item: Meditation
  data: LessonPageData | null
  /** Where "back" goes when opened outside a path: the Library or Meditations. */
  back?: { href: string; label: string }
}) {
  const { completed, progress, ready } = useLessonCompletion([item.id])
  const saved = progress?.positionsSec[item.id] ?? 0
  const hasVideo = Boolean(getContentVideo(item.id))
  const category = CATEGORY_COPY[item.category].label
  const shellLibrary = { backHref: back.href, backLabel: back.label, label: `${back.label} · ${category}` }

  if (item.transcode !== 'ready') {
    const failed = item.transcode === 'failed'
    return (
      <LessonShell data={data} library={shellLibrary}>
        <LessonNotice
          icon={Headphones}
          title={failed ? 'This audio is unavailable' : 'This audio is not ready yet'}
          description={
            failed
              ? 'We could not prepare the audio for this lesson. It has not been counted as complete.'
              : 'The audio is still being prepared. Try again in a few minutes. It has not been counted as complete.'
          }
          backTo={data ? pathHref(data.path.slug) : back.href}
          backLabel={data ? 'Back to curriculum' : `Back to ${back.label}`}
        />
      </LessonShell>
    )
  }

  return (
    <LessonShell data={data} library={shellLibrary}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 pb-16 pt-8 md:pt-12">
        <header className="flex flex-col gap-2 text-center">
          <p className="nff-overline text-nff-text-brand">{data ? data.module.label : `${back.label} · ${category}`}</p>
          <h1 className="nff-heading-h2 text-foreground">{item.title}</h1>
          <p className="nff-body-sm text-nff-text-secondary">Audio · {formatDuration(item.durationSec)}</p>
        </header>

        {hasVideo ? (
          <LessonVideo itemId={item.id} title={item.title} returnTo={data ? data.lesson.href : lessonHref(item.id)} />
        ) : item.image ? (
          <Thumb
            item={item}
            className="mx-auto aspect-square w-full max-w-xs rounded-md border border-nff-border-default"
          />
        ) : (
          <div
            aria-hidden="true"
            className="mx-auto flex aspect-square w-full max-w-xs items-center justify-center rounded-md border border-nff-border-default bg-[var(--nff-sage-100)] text-[var(--nff-forest-900)]"
          >
            <span className="nff-display text-7xl font-semibold opacity-40">{item.artwork.label}</span>
          </div>
        )}

        <p className="text-center nff-body-md text-nff-text-secondary">{item.excerpt}</p>

        <AudioPlayerCard item={item} saved={saved} completed={completed} ready={ready} />

        {completed && <CompletionPanel data={data} libraryBack={data ? undefined : back.href} libraryBackLabel={`Back to ${back.label}`} />}

        {data && <LessonPager data={data} />}
      </div>
    </LessonShell>
  )
}
