import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MiniPlayer } from '@/components/nff/MiniPlayer'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { PlayerProvider } from '@/features/player/PlayerProvider'
import { content } from '@/mocks/db'
import { LearnMeditationsPage } from '@/pages/learn/LearnMeditationsPage'
import { MeditationPage } from '@/pages/learn/MeditationPage'
import { savePlaybackSpeed } from '@/services/account'
import { getAccessContext } from '@/services/learning/accessContext'
import { lessonIdForItem } from '@/services/learning/catalogue'
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
const meditations = content.filter((item): item is Meditation => item.type === 'meditation' && item.published)
const ready = meditations.filter((item) => item.transcode === 'ready')
const processing = meditations.find((item) => item.transcode === 'transcoding')!

function session(id: string, name: string, email: string, role: string) {
  window.localStorage.setItem('nff.session', JSON.stringify({ token: 't', user: { id, name, email, role, verified: true } }))
}
const practitioner = () => session('u-demo', 'Maya Patel', 'practitioner@nff.demo', 'practitioner')
const setStore = (extra: object = {}) =>
  window.localStorage.setItem(
    progressKey('u-demo'),
    JSON.stringify({ version: 2, userId: 'u-demo', lessons: {}, media: {}, activity: [], updatedAt: '2026-11-10T09:00:00.000Z', ...extra }),
  )

function Where() {
  const location = useLocation()
  return <output data-testid="where">{location.pathname + location.search}</output>
}

function renderAt(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <PlayerProvider>
          <MemoryRouter initialEntries={[url]} future={FUTURE}>
            <Routes>
              <Route path="/learn/meditations" element={<LearnMeditationsPage />} />
              <Route path="/learn/meditations/:slug" element={<MeditationPage />} />
              <Route path="*" element={<p>Elsewhere</p>} />
            </Routes>
            <MiniPlayer />
            <Where />
          </MemoryRouter>
        </PlayerProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

const browse = () => screen.getByRole('region', { name: /All meditations|Results/ })
const titles = () => within(browse()).queryAllByRole('heading', { level: 3 }).map((h) => h.textContent)

beforeEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('Meditations page', () => {
  it('introduces the page and lists real meditations as cards inside the app', async () => {
    practitioner()
    setStore()
    renderAt('/learn/meditations')
    expect(screen.getByRole('heading', { level: 1, name: 'Meditations' })).toBeInTheDocument()
    expect(screen.getByText('Find a little space to pause, listen and return to your practice.')).toBeInTheDocument()
    expect(await screen.findByText(`Showing 24 of ${meditations.length} meditations`)).toBeInTheDocument()
    for (const link of within(browse()).getAllByRole('link')) {
      const href = link.getAttribute('href')
      if (href && href !== '#') {
        expect(href).toMatch(/^\/learn\/meditations\/[a-z0-9-]+$/)
      }
    }
    expect(screen.queryByText(/popular|rating|reviews|listeners|streak/i)).not.toBeInTheDocument()
  })

  it('shows Continue listening only when a real position is saved', async () => {
    practitioner()
    setStore()
    const { unmount } = renderAt('/learn/meditations')
    await screen.findByText(/Showing 24 of/)
    expect(screen.queryByRole('region', { name: 'Continue listening' })).not.toBeInTheDocument()
    unmount()

    const target = ready[3]!
    setStore({ media: { [target.id]: { resourceId: target.id, kind: 'audio', positionSec: 125, updatedAt: '2026-11-09T10:00:00.000Z' } } })
    renderAt('/learn/meditations')
    const section = await screen.findByRole('region', { name: 'Continue listening' })
    expect(within(section).getByRole('heading', { name: target.title })).toBeInTheDocument()
    expect(within(section).getByText(`Saved at 2:05 of ${Math.round(target.durationSec / 60)} min`)).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: `Resume ${target.title}` })).toHaveAttribute('href', `/learn/meditations/${target.slug}`)
  })

  it('features only flagged meditations, and only while browsing', async () => {
    practitioner()
    setStore()
    renderAt('/learn/meditations')
    const featured = await screen.findByRole('region', { name: 'Featured' })
    for (const heading of within(featured).getAllByRole('heading', { level: 3 })) {
      expect(meditations.find((item) => item.title === heading.textContent)?.featured).toBe(true)
    }
  })

  it('shows processing audio as not ready, with no link and no play action', async () => {
    practitioner()
    setStore()
    renderAt(`/learn/meditations?q=${encodeURIComponent(processing.title)}`)
    const heading = await screen.findByRole('heading', { level: 3, name: processing.title })
    const card = heading.closest('li')!
    expect(within(card).getByText('Audio is still being prepared')).toBeInTheDocument()
    expect(within(card).queryByRole('link')).not.toBeInTheDocument()
  })

  it('"Ready to play only" hides processing audio and is kept in the URL', async () => {
    practitioner()
    setStore()
    const user = userEvent.setup()
    renderAt('/learn/meditations')
    await screen.findByText(/Showing 24 of/)
    await user.click(screen.getByRole('checkbox', { name: 'Ready to play only' }))
    expect(screen.getByTestId('where')).toHaveTextContent('ready=1')
    expect(screen.getByText(`Showing 24 of ${ready.length} meditations`)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Active filters' })).toHaveTextContent('Ready to play')
  })

  it('browses by category with real counts, searches and sorts, keeping all in the URL', async () => {
    practitioner()
    setStore()
    const user = userEvent.setup()
    renderAt('/learn/meditations?sort=title')
    await screen.findByText(/Showing 24 of/)

    const nav = screen.getByRole('navigation', { name: 'Library categories' })
    const foundations = meditations.filter((item) => item.category === 'foundations')
    const chip = within(nav).getByRole('button', { name: new RegExp(`Foundations ${foundations.length}`) })
    await user.click(chip)
    expect(screen.getByTestId('where')).toHaveTextContent('category=foundations')
    expect(screen.getByTestId('where')).toHaveTextContent('sort=title')
    expect(titles()).toHaveLength(foundations.length)
    const sorted = titles() as string[]
    expect(sorted).toEqual([...sorted].sort((a, b) => a.localeCompare(b)))

    const search = screen.getByRole('searchbox', { name: 'Search meditations' })
    await user.type(search, 'qwertyuiop')
    expect(await screen.findByText('No meditations for “qwertyuiop”')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search and filters' }))
    expect(screen.getByTestId('where')).toHaveTextContent(/sort=title/)
    expect(screen.getByTestId('where')).not.toHaveTextContent('category=')
  })

  it('gives staff a read-only preview with no personal sections', async () => {
    session('u-editor', 'Rowan Ellis', 'editor@nff.demo', 'editor')
    renderAt('/learn/meditations')
    await screen.findByText(/Showing 24 of/)
    expect(screen.queryByRole('region', { name: 'Continue listening' })).not.toBeInTheDocument()
    expect(window.localStorage.getItem(progressKey('u-editor'))).toBeNull()
  })
})

describe('Meditation detail', () => {
  it('opens in the shared audio screen with Back to Meditations, seek and speed', async () => {
    practitioner()
    setStore()
    savePlaybackSpeed('u-demo', 1.5)
    const item = ready[0]!
    // The learner's own default assignments exist from sign-in; opening a
    // meditation must not add or change any.
    getAccessContext({ id: 'u-demo', role: 'practitioner' }, { surface: 'learn' })
    const assignments = window.localStorage.getItem('meadow.assignments.v1')
    renderAt(`/learn/meditations/${item.slug}`)
    expect(await screen.findByRole('heading', { level: 1, name: item.title })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Meditations/ })[0]).toHaveAttribute('href', '/learn/meditations')
    expect(screen.getByRole('slider', { name: 'Seek' })).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Playback speed' })).getByRole('button', { name: '1.5×' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Demo audio:/)).toBeInTheDocument()
    expect(screen.queryByText(/Lesson \d+ of/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'More meditations' })).toBeInTheDocument()
    // Opening records nothing and assigns nothing.
    expect(JSON.parse(window.localStorage.getItem(progressKey('u-demo'))!).lessons[lessonIdForItem(item.id)]).toBeUndefined()
    expect(window.localStorage.getItem('meadow.assignments.v1')).toBe(assignments)
  })

  it('shows processing audio as not ready, inside Meditations', async () => {
    practitioner()
    setStore()
    renderAt(`/learn/meditations/${processing.slug}`)
    expect(await screen.findByText('This audio is not ready yet')).toBeInTheDocument()
    expect(screen.queryByRole('slider', { name: 'Seek' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Meditations' })).toHaveAttribute('href', '/learn/meditations')
  })

  it('resumes from the saved position and does not complete on open', async () => {
    practitioner()
    const item = ready[1]!
    setStore({ media: { [item.id]: { resourceId: item.id, kind: 'audio', positionSec: 200, updatedAt: '2026-11-09T10:00:00.000Z' } } })
    // The player's own resume prompt reads the legacy position.
    renderAt(`/learn/meditations/${item.slug}`)
    expect(await screen.findByText('Resume from 3:20?')).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(progressKey('u-demo'))!).lessons[lessonIdForItem(item.id)]?.status).not.toBe('completed')
  })

  it('denies a visitor and an unknown meditation inside the app', async () => {
    renderAt(`/learn/meditations/${ready[0]!.slug}`)
    expect(await screen.findByRole('link', { name: 'Back to Meditations' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: ready[0]!.title })).not.toBeInTheDocument()
    cleanup()
    practitioner()
    renderAt('/learn/meditations/no-such-thing')
    expect(await screen.findByText('We could not find that')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/learn/meditations/no-such-thing'))
  })
})
