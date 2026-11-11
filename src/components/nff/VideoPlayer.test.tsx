import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VideoPlayer } from '@/components/nff/VideoPlayer'
import { getActiveMedia, resetMediaClaims } from '@/features/media/mediaExclusive'
import type { VideoMedia } from '@/types'

const READY: VideoMedia = {
  availability: 'ready',
  src: '/test/video.mp4',
  posterUrl: '/test/poster.jpg',
  captionsUrl: '/test/captions.vtt',
  durationSec: 120,
}

function renderPlayer(props: Partial<React.ComponentProps<typeof VideoPlayer>> = {}) {
  const result = render(
    <VideoPlayer mediaId="test-video" title="Test film" video={READY} {...props} />,
  )
  const video = result.container.querySelector('video') as HTMLVideoElement
  return { ...result, video }
}

/** jsdom has no media pipeline: give the element a duration and fire the event. */
function loadMetadata(video: HTMLVideoElement, duration = 120) {
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

beforeEach(() => {
  resetMediaClaims()
  vi.mocked(HTMLMediaElement.prototype.play).mockClear()
  vi.mocked(HTMLMediaElement.prototype.pause).mockClear()
})

describe('VideoPlayer: states', () => {
  it('shows a calm unavailable state, and no <video>, when unavailable', () => {
    const { container } = render(
      <VideoPlayer mediaId="v" title="Film" video={{ availability: 'unavailable' }} />,
    )
    expect(screen.getByRole('status')).toHaveTextContent(/isn’t available yet/i)
    expect(container.querySelector('video')).toBeNull()
  })

  it('shows a processing state while the video is being prepared', () => {
    render(<VideoPlayer mediaId="v" title="Film" video={{ availability: 'processing' }} />)
    expect(screen.getByRole('status')).toHaveTextContent(/being prepared/i)
  })

  it('treats a missing video record as unavailable', () => {
    render(<VideoPlayer mediaId="v" title="Film" video={undefined} />)
    expect(screen.getByRole('status')).toHaveTextContent(/isn’t available yet/i)
  })

  it('treats "ready" without a source as unavailable', () => {
    const { container } = render(
      <VideoPlayer
        mediaId="v"
        title="Film"
        video={{ availability: 'ready', captionsUrl: '/c.vtt' }}
      />,
    )
    expect(container.querySelector('video')).toBeNull()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('treats "ready" without captions as unavailable (captions are required)', () => {
    const { container } = render(
      <VideoPlayer
        mediaId="v"
        title="Film"
        video={{ availability: 'ready', src: '/v.mp4' }}
      />,
    )
    expect(container.querySelector('video')).toBeNull()
  })

  it('shows extra content in the unavailable panel', () => {
    render(
      <VideoPlayer
        mediaId="v"
        title="Film"
        video={{ availability: 'unavailable' }}
        unavailableAction={<a href="#x">Another way in</a>}
      />,
    )
    expect(screen.getByRole('link', { name: 'Another way in' })).toBeInTheDocument()
  })

  it('renders the video with poster and a captions track when ready', () => {
    const { video } = renderPlayer()
    expect(video).toHaveAttribute('src', READY.src)
    expect(video).toHaveAttribute('poster', READY.posterUrl)
    const track = video.querySelector('track')
    expect(track).toHaveAttribute('kind', 'captions')
    expect(track).toHaveAttribute('src', READY.captionsUrl)
  })

  it('announces loading until metadata arrives, then shows controls', () => {
    const { video } = renderPlayer()
    expect(screen.getByRole('status')).toHaveTextContent('Loading video')
    loadMetadata(video)
    expect(screen.queryByText('Loading video')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument()
  })

  it('announces buffering when playback stalls, and clears it', () => {
    const { video } = renderPlayer()
    loadMetadata(video)
    fireEvent.waiting(video)
    expect(screen.getByRole('status')).toHaveTextContent('Buffering')
    fireEvent.playing(video)
    expect(screen.queryByText('Buffering')).not.toBeInTheDocument()
  })

  it('shows an error with Try again, and reloads from the same place', () => {
    const { video, container } = renderPlayer()
    loadMetadata(video)
    setTime(video, 42)
    fireEvent.error(video)
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn’t play/i)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    // A fresh <video> element is mounted for the retry.
    const next = container.querySelector('video') as HTMLVideoElement
    expect(next).not.toBe(video)
    Object.defineProperty(next, 'duration', { configurable: true, value: 120 })
    fireEvent.loadedMetadata(next)
    expect(next.currentTime).toBe(42)
  })
})

describe('VideoPlayer: controls', () => {
  it('plays and pauses from the control button', () => {
    const { video } = renderPlayer()
    loadMetadata(video)
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
    fireEvent.play(video)
    const pause = screen.getByRole('button', { name: 'Pause' })
    Object.defineProperty(video, 'paused', { configurable: true, value: false })
    fireEvent.click(pause)
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  })

  it('has labelled, keyboard-reachable controls', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    renderPlayer()
    for (const name of ['Play', 'Mute', /Playback speed/, 'Captions', 'Fullscreen']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    expect(screen.getByRole('slider', { name: 'Seek' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Video player: Test film' })).toHaveAttribute(
      'tabindex',
      '0',
    )
  })

  it('seeks with the slider and gives it a spoken value', () => {
    const { video } = renderPlayer()
    loadMetadata(video)
    setTime(video, 65)
    const seek = screen.getByRole('slider', { name: 'Seek' })
    expect(seek).toHaveAttribute(
      'aria-valuetext',
      '1 minute 5 seconds of 2 minutes',
    )
    fireEvent.change(seek, { target: { value: '30' } })
    expect(video.currentTime).toBe(30)
  })

  it('supports keyboard shortcuts on the player', () => {
    const { video } = renderPlayer()
    loadMetadata(video)
    setTime(video, 20)
    const group = screen.getByRole('group', { name: /Video player/ })
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    expect(video.currentTime).toBe(25)
    fireEvent.keyDown(group, { key: 'ArrowLeft' })
    expect(video.currentTime).toBe(20)
    fireEvent.keyDown(group, { key: ' ' })
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
    fireEvent.keyDown(group, { key: 'm' })
    expect(screen.getByRole('button', { name: 'Unmute' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('leaves keys alone when a control has focus', () => {
    const { video } = renderPlayer()
    loadMetadata(video)
    setTime(video, 20)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Mute' }), { key: 'ArrowRight' })
    expect(video.currentTime).toBe(20)
  })

  it('mutes and unmutes', () => {
    renderPlayer()
    const mute = screen.getByRole('button', { name: 'Mute' })
    expect(mute).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(mute)
    expect(screen.getByRole('button', { name: 'Unmute' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sets volume from the slider', () => {
    const { video } = renderPlayer()
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), {
      target: { value: '0.5' },
    })
    expect(video.volume).toBe(0.5)
  })

  it('cycles playback speed', () => {
    const { video } = renderPlayer()
    const speed = () => screen.getByRole('button', { name: /Playback speed/ })
    expect(speed()).toHaveAccessibleName(/1×/)
    fireEvent.click(speed())
    expect(speed()).toHaveAccessibleName(/1\.25×/)
    expect(video.playbackRate).toBe(1.25)
  })

  it('toggles captions through the text track', () => {
    const { video } = renderPlayer()
    const tracks = [{ mode: 'disabled' }]
    Object.defineProperty(video, 'textTracks', { configurable: true, value: tracks })
    const button = screen.getByRole('button', { name: 'Captions' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(tracks[0].mode).toBe('showing')
    fireEvent.click(button)
    expect(tracks[0].mode).toBe('hidden')
  })

  it('enters and leaves fullscreen on the whole player', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    const request = vi.fn().mockResolvedValue(undefined)
    renderPlayer()
    const group = screen.getByRole('group', { name: /Video player/ })
    group.requestFullscreen = request
    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' }))
    expect(request).toHaveBeenCalled()
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: group })
    fireEvent(document, new Event('fullscreenchange'))
    expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
  })

  it('resumes from startAt once metadata is loaded', () => {
    const { video } = renderPlayer({ startAt: 37 })
    loadMetadata(video)
    expect(video.currentTime).toBe(37)
  })

  it('offers replay once the video has ended', () => {
    const { video } = renderPlayer()
    loadMetadata(video)
    fireEvent.ended(video)
    expect(screen.getByRole('button', { name: 'Replay video' })).toBeInTheDocument()
  })
})

describe('VideoPlayer: progress and one-at-a-time', () => {
  it('reports real position and played time on pause', () => {
    const onProgress = vi.fn()
    const { video } = renderPlayer({ onProgress })
    loadMetadata(video)
    fireEvent.play(video)
    setTime(video, 1)
    setTime(video, 2)
    setTime(video, 3)
    fireEvent.pause(video)
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ positionSec: 3, playedDeltaSec: 2, completed: false }),
    )
  })

  it('does not count a seek as played time', () => {
    const onProgress = vi.fn()
    const { video } = renderPlayer({ onProgress })
    loadMetadata(video)
    fireEvent.play(video)
    setTime(video, 1)
    setTime(video, 90)
    fireEvent.pause(video)
    expect(onProgress.mock.calls[0][0].playedDeltaSec).toBe(0)
  })

  it('reports completion when it ends', () => {
    const onProgress = vi.fn()
    const { video } = renderPlayer({ onProgress })
    loadMetadata(video)
    fireEvent.play(video)
    setTime(video, 119)
    Object.defineProperty(video, 'ended', { configurable: true, value: true })
    fireEvent.ended(video)
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ completed: true }))
  })

  it('holds the single media slot while playing and releases it on pause', () => {
    const { video } = renderPlayer()
    loadMetadata(video)
    fireEvent.play(video)
    expect(getActiveMedia()?.id).toBe('video:test-video')
    fireEvent.pause(video)
    expect(getActiveMedia()).toBeNull()
  })

  it('pauses itself when something else takes the media slot', async () => {
    const { video } = renderPlayer()
    loadMetadata(video)
    fireEvent.play(video)
    const { claimMedia } = await import('@/features/media/mediaExclusive')
    act(() => claimMedia({ id: 'audio:other', kind: 'audio', pause: vi.fn() }))
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  })

  it('tells the page how it was left, and saves progress on unmount', () => {
    const onLeave = vi.fn()
    const onProgress = vi.fn()
    const { video, unmount } = renderPlayer({ onLeave, onProgress })
    loadMetadata(video)
    fireEvent.play(video)
    setTime(video, 10)
    unmount()
    expect(onLeave).toHaveBeenCalledWith(
      expect.objectContaining({ playing: true, positionSec: 10, ended: false }),
    )
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ positionSec: 10 }))
    expect(getActiveMedia()).toBeNull()
  })
})
