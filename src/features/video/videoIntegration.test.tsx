import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useEffect, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HomeVideo } from '@/components/nff/HomeVideo'
import { ResourceVideo } from '@/components/nff/ResourceVideo'
import { VideoMiniPlayer } from '@/components/nff/VideoMiniPlayer'
import type { LandingVideo } from '@/config/landingVideo'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { getActiveMedia, resetMediaClaims } from '@/features/media/mediaExclusive'
import { PlayerProvider, usePlayer } from '@/features/player/PlayerProvider'
import { VideoProvider } from '@/features/video/VideoProvider'
import { content } from '@/mocks/db'
import { loadProgress } from '@/services/learning/progress'
import type { Meditation, VideoMedia } from '@/types'

const track = content.find(
  (item): item is Meditation => item.type === 'meditation' && item.published,
)!

const READY: VideoMedia = {
  availability: 'ready',
  src: '/test/video.mp4',
  captionsUrl: '/test/captions.vtt',
  durationSec: 120,
}

const probe: { player?: ReturnType<typeof usePlayer> } = {}
function PlayerProbe() {
  const value = usePlayer()
  useEffect(() => {
    probe.player = value
  })
  return null
}
const player = new Proxy({} as ReturnType<typeof usePlayer>, {
  get: (_target, key) => probe.player![key as keyof ReturnType<typeof usePlayer>],
})

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <PlayerProvider>
          <VideoProvider>
            {children}
            <PlayerProbe />
          </VideoProvider>
        </PlayerProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

function ready(video: HTMLVideoElement, duration = 120) {
  Object.defineProperty(video, 'duration', { configurable: true, value: duration })
  fireEvent.loadedMetadata(video)
}

function setTime(video: HTMLVideoElement, seconds: number) {
  Object.defineProperty(video, 'currentTime', {
    configurable: true,
    writable: true,
    value: seconds,
  })
  fireEvent.timeUpdate(video)
}

const pageVideo = (container: HTMLElement) =>
  container.querySelector('video') as HTMLVideoElement

beforeEach(() => {
  window.localStorage.clear()
  resetMediaClaims()
  vi.mocked(HTMLMediaElement.prototype.play).mockClear()
  vi.mocked(HTMLMediaElement.prototype.pause).mockClear()
})

describe('one media at a time (audio player and video)', () => {
  it('starting a video pauses the audio player', () => {
    const { container } = render(
      <Providers>
        <ResourceVideo resourceId="lesson-film" title="Film" video={READY} returnTo="/x" />
      </Providers>,
    )
    act(() => player.load(track, track.stageId, 0, true))
    expect(player.playing).toBe(true)
    expect(getActiveMedia()?.kind).toBe('audio')

    const video = pageVideo(container)
    ready(video)
    fireEvent.play(video)

    expect(player.playing).toBe(false)
    expect(getActiveMedia()?.id).toBe('video:lesson-film')
  })

  it('starting audio pauses the video', () => {
    const { container } = render(
      <Providers>
        <ResourceVideo resourceId="lesson-film" title="Film" video={READY} returnTo="/x" />
      </Providers>,
    )
    const video = pageVideo(container)
    ready(video)
    fireEvent.play(video)
    vi.mocked(HTMLMediaElement.prototype.pause).mockClear()

    act(() => player.load(track, track.stageId, 0, true))

    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledWith()
    expect(vi.mocked(HTMLMediaElement.prototype.pause).mock.contexts).toContain(video)
    expect(player.playing).toBe(true)
  })

  it('does not pause audio that is already paused when a video starts', () => {
    const { container } = render(
      <Providers>
        <ResourceVideo resourceId="lesson-film" title="Film" video={READY} returnTo="/x" />
      </Providers>,
    )
    act(() => player.load(track, track.stageId, 0, false))
    const video = pageVideo(container)
    ready(video)
    fireEvent.play(video)
    expect(player.playing).toBe(false)
    expect(player.track?.id).toBe(track.id)
  })
})

describe('mini-player', () => {
  function renderWithMini(page: boolean) {
    return (
      <Providers>
        {page && (
          <ResourceVideo
            resourceId="lesson-film"
            title="Lesson film"
            video={READY}
            returnTo="/learn/film"
          />
        )}
        <VideoMiniPlayer onExpand={onExpand} />
      </Providers>
    )
  }
  const onExpand = vi.fn()

  it('takes over a playing video when the page is left, at the same second', () => {
    const view = render(renderWithMini(true))
    const video = pageVideo(view.container)
    ready(video)
    fireEvent.play(video)
    setTime(video, 33)
    expect(screen.queryByRole('region', { name: /Video mini-player/ })).not.toBeInTheDocument()

    view.rerender(renderWithMini(false))

    const mini = screen.getByRole('region', { name: 'Video mini-player: Lesson film' })
    expect(mini).toBeInTheDocument()
    const miniVideo = mini.querySelector('video') as HTMLVideoElement
    ready(miniVideo)
    expect(miniVideo.currentTime).toBe(33)
    // It was playing, so it carries on playing.
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
  })

  it('does not appear for a video that was never started or is paused', () => {
    const view = render(renderWithMini(true))
    ready(pageVideo(view.container))
    view.rerender(renderWithMini(false))
    expect(screen.queryByRole('region', { name: /Video mini-player/ })).not.toBeInTheDocument()

    const again = render(renderWithMini(true))
    const video = pageVideo(again.container)
    ready(video)
    fireEvent.play(video)
    setTime(video, 20)
    fireEvent.pause(video)
    again.rerender(renderWithMini(false))
    expect(screen.queryByRole('region', { name: /Video mini-player/ })).not.toBeInTheDocument()
  })

  it('has play, captions, back and close controls and closes cleanly', () => {
    const view = render(renderWithMini(true))
    const video = pageVideo(view.container)
    ready(video)
    fireEvent.play(video)
    setTime(video, 12)
    view.rerender(renderWithMini(false))

    expect(screen.getByRole('button', { name: /Pause|Play/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Captions' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to the video on the page' }))
    expect(onExpand).toHaveBeenCalledWith('/learn/film')

    fireEvent.click(screen.getByRole('button', { name: 'Close video' }))
    expect(screen.queryByRole('region', { name: /Video mini-player/ })).not.toBeInTheDocument()
  })

  it('hands the video back to the page at the mini-player position', () => {
    const view = render(renderWithMini(true))
    const video = pageVideo(view.container)
    ready(video)
    fireEvent.play(video)
    setTime(video, 40)
    view.rerender(renderWithMini(false))

    const miniVideo = screen
      .getByRole('region', { name: /Video mini-player/ })
      .querySelector('video') as HTMLVideoElement
    ready(miniVideo)
    fireEvent.play(miniVideo)
    setTime(miniVideo, 55)

    view.rerender(renderWithMini(true))
    expect(screen.queryByRole('region', { name: /Video mini-player/ })).not.toBeInTheDocument()
    expect(screen.getByText('Picking up from 0:55.')).toBeInTheDocument()
    const back = view.container.querySelector('video') as HTMLVideoElement
    ready(back)
    expect(back.currentTime).toBe(55)
  })

  it('sits above the audio mini-player when audio is loaded', () => {
    const view = render(renderWithMini(true))
    act(() => player.load(track, track.stageId, 0, false))
    const video = pageVideo(view.container)
    ready(video)
    fireEvent.play(video)
    setTime(video, 10)
    view.rerender(renderWithMini(false))
    expect(screen.getByRole('region', { name: /Video mini-player/ }).className).toContain(
      'bottom-[5.75rem]',
    )
  })
})

describe('saved progress and resume', () => {
  function signIn() {
    window.localStorage.setItem(
      'nff.session',
      JSON.stringify({
        token: 't',
        user: { id: 'u-demo', name: 'Maya Patel', email: 'practitioner@nff.demo', role: 'practitioner', verified: true },
      }),
    )
  }

  it('saves position through recordMedia and resumes with Start over', () => {
    signIn()
    const first = render(
      <Providers>
        <ResourceVideo resourceId="lesson-film" title="Film" video={READY} returnTo="/x" />
      </Providers>,
    )
    const video = pageVideo(first.container)
    ready(video)
    fireEvent.play(video)
    setTime(video, 1)
    setTime(video, 2)
    setTime(video, 30)
    fireEvent.pause(video)
    const saved = loadProgress('u-demo').media['lesson-film']
    expect(saved).toMatchObject({ kind: 'video', positionSec: 30 })
    first.unmount()

    const second = render(
      <Providers>
        <ResourceVideo resourceId="lesson-film" title="Film" video={READY} returnTo="/x" />
      </Providers>,
    )
    expect(screen.getByText('Picking up from 0:30.')).toBeInTheDocument()
    const next = pageVideo(second.container)
    ready(next)
    expect(next.currentTime).toBe(30)

    fireEvent.click(screen.getByRole('button', { name: 'Start over' }))
    expect(screen.queryByText(/Picking up/)).not.toBeInTheDocument()
  })

  it('stores nothing for visitors and offers no resume', () => {
    const { container } = render(
      <Providers>
        <ResourceVideo resourceId="lesson-film" title="Film" video={READY} returnTo="/x" />
      </Providers>,
    )
    const video = pageVideo(container)
    ready(video)
    fireEvent.play(video)
    setTime(video, 30)
    fireEvent.pause(video)
    expect(screen.queryByText(/Picking up/)).not.toBeInTheDocument()
    expect(Object.keys(window.localStorage).some((key) => key.includes('progress.v2'))).toBe(false)
  })
})

describe('landing video section', () => {
  it('shows the unavailable state when no asset is supplied', () => {
    const entry: LandingVideo = {
      resourceId: 'landing-none',
      title: 'Welcome to Meadow',
      description: 'Not supplied.',
      video: { availability: 'unavailable' },
      source: 'none',
    }
    render(
      <Providers>
        <HomeVideo entry={entry} />
      </Providers>,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Welcome to Meadow' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/isn’t available yet/i)
    expect(screen.getByRole('link', { name: /See how it works/ })).toHaveAttribute(
      'href',
      '#how-it-works',
    )
    expect(document.querySelector('video')).toBeNull()
  })

  it('plays the shipped demo clip, captioned and labelled as a demo', () => {
    const { container } = render(
      <Providers>
        <HomeVideo />
      </Providers>,
    )
    expect(pageVideo(container)).toHaveAttribute('src', '/media/demo/demo-welcome.mp4')
    expect(container.querySelector('track')).toHaveAttribute('src', '/media/demo/demo-welcome.en.vtt')
    expect(screen.getByText(/Demo placeholder footage/)).toBeInTheDocument()
  })

  it('plays a ready entry in the same section', () => {
    const entry: LandingVideo = {
      resourceId: 'landing-test',
      title: 'Test intro',
      description: 'Test description.',
      video: READY,
      source: 'test',
    }
    const { container } = render(
      <Providers>
        <HomeVideo entry={entry} />
      </Providers>,
    )
    expect(pageVideo(container)).toHaveAttribute('src', READY.src)
    expect(screen.getByRole('group', { name: 'Video player: Test intro' })).toBeInTheDocument()
  })

  it('renders nothing when the config entry is null', () => {
    const { container } = render(
      <Providers>
        <HomeVideo entry={null} />
      </Providers>,
    )
    expect(container.querySelector('section')).toBeNull()
  })
})
