import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createEvent, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ContentVideo } from '@/components/nff/ContentVideo'
import { LibraryContentCard } from '@/components/nff/LibraryContentCard'
import { CONTENT_VIDEOS } from '@/config/contentVideos'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { PlayerProvider } from '@/features/player/PlayerProvider'
import { VideoProvider } from '@/features/video/VideoProvider'
import { getContentVideo, itemIdForVideoProgress, videoProgressId } from '@/services/learning/video'
import type { VideoMedia } from '@/types'

// These tests cover features switched off for SOW v1.3 (config/sowScope.ts).
// Run them with every feature on, so the code stays ready to switch back.
vi.mock('@/config/sowScope', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/sowScope')>()
  return {
    SOW_SCOPE: Object.fromEntries(Object.keys(actual.SOW_SCOPE).map((key) => [key, true])),
  }
})


const READY: VideoMedia = {
  availability: 'ready',
  src: '/test/video.mp4',
  posterUrl: '/test/poster.jpg',
  captionsUrl: '/test/captions.vtt',
}

function Wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient()
  return (
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AuthProvider>
          <PlayerProvider>
            <VideoProvider>{children}</VideoProvider>
          </PlayerProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  )
}

/**
 * jsdom has no PointerEvent, so set pointerType by hand. React builds
 * onPointerEnter from `pointerover`, so that is the event to send.
 */
function pointerEnter(element: Element, pointerType: string) {
  const event = createEvent.pointerOver(element)
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  fireEvent(element, event)
}

const card = (video?: VideoMedia) =>
  render(
    <Wrap>
      <LibraryContentCard
        kind="exploration"
        title="Noticing"
        description="Short"
        href="/explorations/noticing"
        readingTimeMin={5}
        video={video}
      />
    </Wrap>,
  )

describe('content video lookup', () => {
  it('returns the demo entries: ready ones are captioned demo files, one stays unavailable', () => {
    const ids = Object.keys(CONTENT_VIDEOS)
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) {
      const video = getContentVideo(id)!
      if (video.availability !== 'ready') continue
      expect(video.src).toMatch(/^\/media\/demo\/demo-.+\.mp4$/)
      expect(video.captionsUrl).toMatch(/\.en\.vtt$/)
      expect(video.posterUrl).toBeTruthy()
    }
    expect(ids.some((id) => getContentVideo(id)?.availability === 'unavailable')).toBe(true)
    expect(getContentVideo('not-a-video-item')).toBeUndefined()
  })

  it('keeps video progress apart from audio progress', () => {
    expect(videoProgressId('med-56')).toBe('med-56#video')
    expect(itemIdForVideoProgress('med-56#video')).toBe('med-56')
    expect(itemIdForVideoProgress('med-56')).toBeUndefined()
  })
})

describe('card video preview', () => {
  it('has no video chip or preview for a non-video item', () => {
    card()
    expect(screen.queryByText('Video')).not.toBeInTheDocument()
    expect(screen.getByText('Read exploration')).toBeInTheDocument()
  })

  it('marks a not-ready video lesson but never plays a preview', () => {
    const { container } = card({ availability: 'unavailable' })
    expect(screen.getByText('Video')).toBeInTheDocument()
    pointerEnter(container.querySelector('article')!, 'mouse')
    expect(screen.queryByTestId('card-video-preview')).not.toBeInTheDocument()
    // Not watchable yet, so the card keeps its reading action.
    expect(screen.getByText('Read exploration')).toBeInTheDocument()
  })

  it('plays a silent preview on hover and focus once ready, and stops on leave', () => {
    const { container } = card(READY)
    const article = container.querySelector('article')!
    expect(screen.getByText('Watch')).toBeInTheDocument()

    pointerEnter(article, 'mouse')
    const preview = screen.getByTestId('card-video-preview') as HTMLVideoElement
    expect(preview.muted).toBe(true)
    expect(preview).toHaveAttribute('aria-hidden', 'true')
    fireEvent.pointerLeave(article)
    expect(screen.queryByTestId('card-video-preview')).not.toBeInTheDocument()

    act(() => screen.getByRole('link', { name: 'Noticing' }).focus())
    expect(screen.getByTestId('card-video-preview')).toBeInTheDocument()
  })

  it('does not preview on touch', () => {
    const { container } = card(READY)
    pointerEnter(container.querySelector('article')!, 'touch')
    expect(screen.queryByTestId('card-video-preview')).not.toBeInTheDocument()
  })

  it('uses the poster when the card has no photograph', () => {
    const { container } = card(READY)
    expect(container.querySelector('img')).toHaveAttribute('src', READY.posterUrl)
  })
})

describe('detail page video block', () => {
  it('shows the unavailable state to everyone, without a sign-up prompt', () => {
    render(
      <Wrap>
        <ContentVideo
          itemId="exp-1"
          title="Noticing"
          video={{ availability: 'unavailable' }}
          returnTo="/explorations/noticing"
          fullAccess={false}
        />
      </Wrap>,
    )
    expect(screen.getByRole('status')).toHaveTextContent(/isn’t available yet/i)
    expect(screen.queryByRole('link', { name: /Sign up/ })).not.toBeInTheDocument()
  })

  it('asks visitors to sign up for a ready video', () => {
    const { container } = render(
      <Wrap>
        <ContentVideo
          itemId="exp-1"
          title="Noticing"
          video={READY}
          returnTo="/explorations/noticing"
          fullAccess={false}
        />
      </Wrap>,
    )
    expect(screen.getByText('Sign up free to watch')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sign up free/ })).toHaveAttribute('href', '/signup')
    expect(container.querySelector('video')).toBeNull()
  })

  it('gives account holders the player', () => {
    render(
      <Wrap>
        <ContentVideo
          itemId="exp-1"
          title="Noticing"
          video={READY}
          returnTo="/explorations/noticing"
          fullAccess
        />
      </Wrap>,
    )
    expect(screen.getByRole('group', { name: 'Video player: Noticing' })).toBeInTheDocument()
  })
})
