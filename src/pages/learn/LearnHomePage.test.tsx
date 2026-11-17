import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, renderHook, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { PlayerProvider, usePlayer } from '@/features/player/PlayerProvider'
import { content, demoProgress } from '@/mocks/db'
import { LearnHomePage } from '@/pages/learn/LearnHomePage'
import { lessonIdForItem } from '@/services/learning/catalogue'
import { progressKey } from '@/services/learning/progress'
import type { Meditation } from '@/types'

const FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true }

function session(id: string, name: string, email: string, role: string) {
  window.localStorage.setItem(
    'nff.session',
    JSON.stringify({ token: 't', user: { id, name, email, role, verified: true } }),
  )
}

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <PlayerProvider>
          <MemoryRouter initialEntries={['/learn']} future={FUTURE}>
            {children}
          </MemoryRouter>
        </PlayerProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

const renderHome = () => render(<LearnHomePage />, { wrapper: Providers })

beforeEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('Practitioner Home', () => {
  it('shows the seeded learner their real progress and next step', () => {
    session('u-demo', 'Maya Patel', 'practitioner@nff.demo', 'practitioner')
    renderHome()

    expect(screen.getByRole('heading', { level: 1, name: 'Welcome, Maya' })).toBeInTheDocument()
    expect(screen.queryByText(/welcome back/i)).not.toBeInTheDocument()
    // Analytics sidebar removed - progress now shown inline in path cards

    // Continue learning: the seeded in-progress item, linked inside /learn.
    const inProgress = content.find((item) => item.id === demoProgress.inProgressItemId)!
    const resume = screen.getByRole('link', { name: `Resume ${inProgress.title}` })
    expect(resume).toHaveAttribute(
      'href',
      `/learn/paths/meadow-journey/lessons/${lessonIdForItem(inProgress.id)}`,
    )

    // Assigned learning: up to three paths, the ones in progress first,
    // with real counts. Meadow Journey is out of 100 lessons.
    const assigned = screen.getByRole('region', { name: 'My assigned learning' })
    const titles = within(assigned).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual(['Meadow Journey', 'Rest and sleep', 'Attention in daily life'])
    expect(within(assigned).getByRole('link', { name: /View all 4/ })).toHaveAttribute('href', '/learn/my-learning')
    const meadow = within(assigned).getByRole('heading', { name: 'Meadow Journey' }).closest('article')!
    const done = demoProgress.completedItemIds.length
    expect(within(meadow).getByText(`${done} of 100 lessons complete`)).toBeInTheDocument()
    expect(within(meadow).getByText(/6 modules · 100 lessons/)).toBeInTheDocument()
    expect(within(meadow).getByRole('link', { name: 'View learning path' })).toHaveAttribute(
      'href',
      '/learn/paths/meadow-journey',
    )

    // Up next: one lesson from each path that has something left.
    const upNext = screen.getByRole('region', { name: 'Up next' })
    const upNextLinks = within(upNext).getAllByRole('link').map((link) => link.getAttribute('href'))
    expect(upNextLinks).toHaveLength(3)
    expect(new Set(upNextLinks.map((href) => href!.split('/lessons/')[0])).size).toBe(3)

    // A migrated record has no activity, so nothing is invented.
    const recent = screen.getByRole('region', { name: 'Recently accessed' })
    expect(within(recent).getByText('Nothing yet')).toBeInTheDocument()

    // Explore cards stay inside the Practitioner app.
    const explore = screen.getByRole('region', { name: 'Explore the library' })
    const cards = within(explore).getAllByRole('listitem')
    expect(cards.length).toBeGreaterThan(0)
    for (const link of within(explore).getAllByRole('link')) {
      expect(link.getAttribute('href')).toMatch(/^\/learn\/library/)
    }
  })

  it('offers a brand-new learner the start of the path, with no Continue card', () => {
    session('u-demo', 'Maya Patel', 'practitioner@nff.demo', 'practitioner')
    window.localStorage.setItem(
      progressKey('u-demo'),
      JSON.stringify({ version: 2, userId: 'u-demo', lessons: {}, media: {}, activity: [], updatedAt: '2026-11-10T09:00:00.000Z' }),
    )
    renderHome()

    expect(screen.queryByRole('region', { name: 'Continue learning' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start Meadow Journey' })).toBeInTheDocument()
    expect(screen.getByText('0 of 100 lessons complete')).toBeInTheDocument()
    const upNext = screen.getByRole('region', { name: 'Up next' })
    expect(within(upNext).getAllByRole('link')).toHaveLength(3)
  })

  it('gives staff a read-only preview without personal sections', () => {
    session('u-editor', 'Rowan Ellis', 'editor@nff.demo', 'editor')
    renderHome()

    expect(screen.getByRole('heading', { level: 1, name: 'Welcome, Rowan' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Continue learning' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Recently accessed' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Learning paths' })).toBeInTheDocument()
    expect(screen.getAllByText('Preview: not assigned to you').length).toBeGreaterThan(0)
    expect(window.localStorage.getItem(progressKey('u-editor'))).toBeNull()
  })
})

describe('Resume keeps the mini-player in place', () => {
  it('loading the track that is already playing does not restart it', () => {
    session('u-demo', 'Maya Patel', 'practitioner@nff.demo', 'practitioner')
    const track = content.find(
      (item): item is Meditation => item.type === 'meditation' && item.transcode === 'ready',
    )!
    const { result } = renderHook(() => usePlayer(), { wrapper: Providers })

    act(() => result.current.load(track, track.stageId, 0, true))
    act(() => result.current.seek(120))
    act(() => result.current.load(track, track.stageId, 0, true))

    expect(result.current.track?.id).toBe(track.id)
    expect(result.current.position).toBe(120)
  })
})
