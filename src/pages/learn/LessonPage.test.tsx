import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MiniPlayer } from '@/components/nff/MiniPlayer'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { PlayerProvider, usePlayer } from '@/features/player/PlayerProvider'
import { content } from '@/mocks/db'
import { LessonPage } from '@/pages/learn/LessonPage'
import { savePlaybackSpeed } from '@/services/account'
import { MEADOW_JOURNEY_ID, getLessonsOf, getModulesOf, lessonIdForItem } from '@/services/learning/catalogue'
import { progressKey } from '@/services/learning/progress'
import type { Meditation } from '@/types'

// These tests cover features switched off for SOW v1.3 (config/sowScope.ts).
// Run them with every feature on, so the code stays ready to switch back.
vi.mock('@/config/sowScope', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/sowScope')>()
  return {
    SOW_SCOPE: Object.fromEntries(Object.keys(actual.SOW_SCOPE).map((key) => [key, true])),
  }
})


const FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true }
const modules = () => getModulesOf(MEADOW_JOURNEY_ID).map((m) => getLessonsOf(m.id).map((l) => l.id.replace('lesson-', '')))
const allItems = () => modules().flat()

function session(id: string, name: string, email: string, role: string) {
  window.localStorage.setItem('nff.session', JSON.stringify({ token: 't', user: { id, name, email, role, verified: true } }))
}
const practitioner = () => session('u-demo', 'Maya Patel', 'practitioner@nff.demo', 'practitioner')

function storeWith(completed: string[]) {
  window.localStorage.setItem(
    progressKey('u-demo'),
    JSON.stringify({
      version: 2,
      userId: 'u-demo',
      lessons: Object.fromEntries(completed.map((id) => [lessonIdForItem(id), { lessonId: lessonIdForItem(id), status: 'completed' }])),
      media: {},
      activity: [],
      updatedAt: '2026-11-10T09:00:00.000Z',
    }),
  )
}
const stored = () => JSON.parse(window.localStorage.getItem(progressKey('u-demo')) ?? 'null')

function renderLesson(itemId: string, pathSlug = 'meadow-journey') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const lessonId = pathSlug === 'meadow-journey' ? lessonIdForItem(itemId) : `${lessonIdForItem(itemId)}@${pathSlug}`
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <PlayerProvider>
          <MemoryRouter initialEntries={[`/learn/paths/${pathSlug}/lessons/${lessonId}`]} future={FUTURE}>
            <Routes>
              <Route path="/learn/paths/:pathSlug/lessons/:lessonId" element={<LessonPage />} />
              <Route path="*" element={<p>Elsewhere</p>} />
            </Routes>
            <MiniPlayer />
          </MemoryRouter>
        </PlayerProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  cleanup()
  window.localStorage.clear()
})
afterEach(() => vi.restoreAllMocks())

describe('reading lesson', () => {
  it('shows the article, the curriculum and previous/next, and completes nothing on open', async () => {
    practitioner()
    storeWith([])
    const [stage1] = modules()
    const first = stage1![0]!
    renderLesson(first)

    const item = content.find((entry) => entry.id === first)!
    expect(await screen.findByRole('heading', { level: 1, name: item.title })).toBeInTheDocument()
    expect(screen.getByText(/Lesson 1 of /)).toBeInTheDocument()

    const sidebar = screen.getByRole('complementary', { name: 'Curriculum' })
    const current = within(sidebar).getByRole('link', { current: 'page' })
    expect(current).toHaveTextContent(item.title)
    // Later modules are locked: their lessons are not links.
    expect(within(sidebar).getAllByText(/Locked · opens when/).length).toBeGreaterThan(0)

    const pager = screen.getByRole('navigation', { name: 'Lesson navigation' })
    expect(within(pager).queryByText('Previous')).not.toBeInTheDocument()
    expect(within(pager).getByRole('link', { name: /Next/ })).toHaveAttribute(
      'href',
      `/learn/paths/meadow-journey/lessons/${lessonIdForItem(stage1![1]!)}`,
    )

    // Opening is not completing.
    expect(screen.getByRole('button', { name: 'Mark as complete' })).toBeInTheDocument()
    expect(stored().lessons[lessonIdForItem(first)]?.status).not.toBe('completed')
  })

  it('completes on request, shows module context and next lesson, and persists it', async () => {
    practitioner()
    storeWith([])
    const user = userEvent.setup()
    const [stage1] = modules()
    renderLesson(stage1![0]!)
    await user.click(await screen.findByRole('button', { name: 'Mark as complete' }))

    const panel = await screen.findByRole('region', { name: 'Lesson complete' })
    expect(within(panel).getByText(`Stage 1 · Arriving: 1 of ${stage1!.length} lessons complete.`)).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: /Continue learning/ })).toHaveAttribute(
      'href',
      `/learn/paths/meadow-journey/lessons/${lessonIdForItem(stage1![1]!)}`,
    )
    expect(within(panel).getByRole('link', { name: 'Back to curriculum' })).toHaveAttribute('href', '/learn/paths/meadow-journey')
    expect(stored().lessons[lessonIdForItem(stage1![0]!)].status).toBe('completed')
    expect(screen.queryByText(/streak|points|badge|certificate/i)).not.toBeInTheDocument()
  })

  it('says when finishing a lesson finishes the module, and that the next module is open', async () => {
    practitioner()
    storeWith(['exp-14'])
    const user = userEvent.setup()
    renderLesson('exp-15', 'rest-and-sleep')
    await user.click(await screen.findByRole('button', { name: 'Mark as complete' }))
    expect(await screen.findByText(/You have finished Module 1 · Why rest matters\. Module 2 · .+ is open\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Continue learning/ })).toHaveAttribute(
      'href',
      '/learn/paths/rest-and-sleep/lessons/lesson-exp-16@rest-and-sleep',
    )
  })

  it('says the path is complete, and offers no further lesson, on its last lesson', async () => {
    practitioner()
    storeWith(['exp-14', 'exp-15', 'exp-16', 'med-9'])
    renderLesson('med-9', 'rest-and-sleep')
    const panel = await screen.findByRole('region', { name: 'Lesson complete' })
    expect(within(panel).getByText('You have completed Rest and sleep.')).toBeInTheDocument()
    expect(within(panel).queryByRole('link', { name: /Continue learning/ })).not.toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: 'Back to curriculum' })).toBeInTheDocument()
  })

  it('saves reading position from real scrolling, offers to pick up, and records nothing on open', async () => {
    practitioner()
    storeWith([])
    const first = modules()[0]![0]!
    // An article 1000px tall on a 500px screen, scrolled 250px: halfway.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: -250, bottom: 750, left: 0, right: 600, width: 600, height: 1000, x: 0, y: -250, toJSON: () => ({}),
    })
    Object.defineProperty(window, 'innerHeight', { value: 500, configurable: true })
    renderLesson(first)
    await screen.findByRole('heading', { level: 1 })
    expect(stored().lessons[lessonIdForItem(first)]?.reading).toBeUndefined()

    fireEvent.scroll(window)
    await waitFor(() => expect(stored().lessons[lessonIdForItem(first)].reading.scrollPct).toBe(50), { timeout: 3000 })
    expect(stored().lessons[lessonIdForItem(first)].status).not.toBe('completed')

    cleanup()
    renderLesson(first)
    expect(await screen.findByText('You stopped about 50% of the way through.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pick up where you left off' })).toBeInTheDocument()
  })

  it('gives staff a read-only preview: no progress written, completion not offered', async () => {
    session('u-editor', 'Rowan Ellis', 'editor@nff.demo', 'editor')
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: -250, bottom: 750, left: 0, right: 600, width: 600, height: 1000, x: 0, y: -250, toJSON: () => ({}),
    })
    renderLesson(modules()[0]![0]!)
    await screen.findByRole('heading', { level: 1 })
    fireEvent.scroll(window)
    await act(() => new Promise((resolve) => setTimeout(resolve, 900)))
    expect(screen.getByText('Preview mode: completion is not recorded.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as complete' })).not.toBeInTheDocument()
    expect(window.localStorage.getItem(progressKey('u-editor'))).toBeNull()
  })

  it('works in another path with that path\'s own curriculum and neighbours', async () => {
    practitioner()
    renderLesson('exp-15', 'rest-and-sleep')
    expect(await screen.findByRole('heading', { level: 1, name: content.find((c) => c.id === 'exp-15')!.title })).toBeInTheDocument()
    const sidebar = screen.getByRole('complementary', { name: 'Curriculum' })
    expect(within(sidebar).getByRole('link', { name: /Rest and sleep/ })).toHaveAttribute('href', '/learn/paths/rest-and-sleep')
    const pager = screen.getByRole('navigation', { name: 'Lesson navigation' })
    expect(within(pager).getByRole('link', { name: /Previous/ })).toHaveAttribute('href', '/learn/paths/rest-and-sleep/lessons/lesson-exp-14@rest-and-sleep')
  })
})

describe('audio lesson', () => {
  const ready = () => modules()[0]!.find((id) => {
    const item = content.find((entry) => entry.id === id)
    return item?.type === 'meditation' && item.transcode === 'ready'
  })!

  it('uses the shared player with seek, speed and the saved speed preference', async () => {
    practitioner()
    storeWith([])
    savePlaybackSpeed('u-demo', 1.25)
    renderLesson(ready())
    expect(await screen.findByRole('slider', { name: 'Seek' })).toBeInTheDocument()
    const speeds = screen.getByRole('group', { name: 'Playback speed' })
    expect(within(speeds).getByRole('button', { name: '1.25×' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Demo audio:/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    // Not complete just because it opened, and no duplicate mini-player on its own page.
    expect(stored().lessons[lessonIdForItem(ready())]?.status).not.toBe('completed')
    expect(screen.queryByRole('region', { name: 'Now playing' })).not.toBeInTheDocument()
  })

  it('shows audio that is still processing as unavailable, not as a player', async () => {
    practitioner()
    storeWith(allItems())
    renderLesson('med-20')
    expect(await screen.findByText('This audio is not ready yet')).toBeInTheDocument()
    expect(screen.queryByRole('slider', { name: 'Seek' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to curriculum' })).toBeInTheDocument()
  })
})

describe('access', () => {
  it('keeps a locked lesson closed on a direct URL, inside the app', async () => {
    practitioner()
    storeWith([])
    renderLesson(modules()[1]![0]!)
    expect(await screen.findByText('This stage is not open yet')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: content.find((c) => c.id === modules()[1]![0])!.title })).not.toBeInTheDocument()
  })
})

describe('mini-player', () => {
  function Load({ track }: { track: Meditation }) {
    const player = usePlayer()
    useEffect(() => player.load(track, track.stageId), [track]) // eslint-disable-line react-hooks/exhaustive-deps
    return null
  }
  const track = content.find((i): i is Meditation => i.type === 'meditation' && i.transcode === 'ready')!
  const renderAt = (url: string) =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <PlayerProvider>
            <Load track={track} />
            <MemoryRouter initialEntries={[url]} future={FUTURE}>
              <MiniPlayer />
            </MemoryRouter>
          </PlayerProvider>
        </AuthProvider>
      </QueryClientProvider>,
    )

  it('stays on other pages and hides on the track\'s own page in any path or the Library', () => {
    practitioner()
    renderAt('/learn/my-learning')
    expect(screen.getByRole('region', { name: 'Now playing' })).toBeInTheDocument()
    cleanup()
    renderAt(`/learn/paths/rest-and-sleep/lessons/lesson-${track.id}@rest-and-sleep`)
    expect(screen.queryByRole('region', { name: 'Now playing' })).not.toBeInTheDocument()
    cleanup()
    renderAt(`/learn/library/audio/${track.slug}`)
    expect(screen.queryByRole('region', { name: 'Now playing' })).not.toBeInTheDocument()
  })
})
