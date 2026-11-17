import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { demoProgress } from '@/mocks/db'
import { MyLearningPage } from '@/pages/learn/MyLearningPage'
import {
  defaultAssignmentId,
  ensureDefaultAssignment,
  ensureDemoAssignments,
  listAssignments,
  withdrawAssignment,
} from '@/services/learning/assignments'
import { DEMO_PATH_IDS } from '@/services/learning/catalogue'
import { progressKey } from '@/services/learning/progress'

const FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true }

function session(id: string, name: string, email: string, role: string) {
  window.localStorage.setItem(
    'nff.session',
    JSON.stringify({ token: 't', user: { id, name, email, role, verified: true } }),
  )
}

function Where() {
  const location = useLocation()
  return <output data-testid="where">{location.pathname + location.search}</output>
}

function renderPage(url = '/learn/my-learning') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={[url]} future={FUTURE}>
          <Routes>
            <Route path="/learn/my-learning" element={<><MyLearningPage /><Where /></>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

const practitioner = () => session('u-demo', 'Maya Patel', 'practitioner@nff.demo', 'practitioner')

beforeEach(() => {
  cleanup()
  window.localStorage.clear()
})

const titlesInView = () =>
  screen.queryAllByRole('article').map((card) => within(card).getByRole('heading', { level: 3 }).textContent)

describe('My Learning', () => {
  it('lists every assigned path with its real status, progress and action', async () => {
    practitioner()
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'My Learning' })).toBeInTheDocument()
    expect(screen.getByText('Your assigned learning paths, organized by progress. Resume where you left off or start something new.')).toBeInTheDocument()

    const card = await screen.findByRole('article', { name: 'Meadow Journey' })
    const done = demoProgress.completedItemIds.length
    expect(within(card).getByText(`${done} of 100 lessons complete · ${done}%`)).toBeInTheDocument()
    expect(within(card).getByText(/6 modules · 100 lessons/)).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: 'Meadow Journey' })).toHaveAttribute('href', '/learn/paths/meadow-journey')
    const resume = within(card).getByRole('link', { name: 'Continue learning: Meadow Journey' })
    expect(resume.getAttribute('href')).toMatch(/^\/learn\/paths\/meadow-journey\/lessons\/lesson-/)

    expect(titlesInView()).toHaveLength(4)
    expect(screen.getByText('4 learning paths')).toBeInTheDocument()

    // Completion is shared by item: First steps reuses stage-one items the
    // seeded learner has finished, so it is complete from real records.
    const firstSteps = screen.getByRole('article', { name: 'First steps' })
    expect(within(firstSteps).getByRole('link', { name: 'Review learning: First steps' })).toHaveAttribute(
      'href',
      '/learn/paths/first-steps',
    )
    const attention = screen.getByRole('article', { name: 'Attention in daily life' })
    expect(within(attention).getByRole('link', { name: 'Start learning: Attention in daily life' }).getAttribute('href')).toMatch(
      /^\/learn\/paths\/attention-in-daily-life\/lessons\/lesson-.+@attention-in-daily-life$/,
    )
  })

  it('switches tabs with the keyboard-accessible tablist and keeps the tab in the URL', async () => {
    practitioner()
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('article', { name: 'Meadow Journey' })

    const tabs = screen.getByRole('tablist', { name: 'Filter learning by status' })
    expect(within(tabs).getAllByRole('tab')).toHaveLength(4)
    expect(within(tabs).getByRole('tab', { name: /All Learning/ })).toHaveAttribute('aria-selected', 'true')

    await user.click(within(tabs).getByRole('tab', { name: /In Progress/ }))
    expect(screen.getByTestId('where')).toHaveTextContent('/learn/my-learning?tab=in-progress')
    expect(titlesInView().sort()).toEqual(['Meadow Journey', 'Rest and sleep'])

    await user.click(within(tabs).getByRole('tab', { name: /Not Started/ }))
    expect(titlesInView()).toEqual(['Attention in daily life'])

    await user.click(within(tabs).getByRole('tab', { name: /Completed/ }))
    expect(titlesInView()).toEqual(['First steps'])

    // Arrow keys move between tabs (Radix roving focus).
    await user.keyboard('{ArrowLeft}')
    expect(within(tabs).getByRole('tab', { name: /Not Started/ })).toHaveFocus()
  })

  it('sorts with a working control kept in the URL', async () => {
    practitioner()
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('article', { name: 'Meadow Journey' })

    await user.selectOptions(screen.getByLabelText('Sort by'), 'title')
    expect(screen.getByTestId('where')).toHaveTextContent('sort=title')
    expect(titlesInView()).toEqual(['Attention in daily life', 'First steps', 'Meadow Journey', 'Rest and sleep'])

    await user.selectOptions(screen.getByLabelText('Sort by'), 'progress')
    expect(titlesInView()[0]).toBe('First steps')
    expect(titlesInView().at(-1)).toBe('Attention in daily life')
  })

  it('opens on the tab named in the URL, with an empty state when a view is empty', async () => {
    practitioner()
    window.localStorage.setItem(
      progressKey('u-demo'),
      JSON.stringify({ version: 2, userId: 'u-demo', lessons: {}, media: {}, activity: [], updatedAt: '2026-11-10T09:00:00.000Z' }),
    )
    renderPage('/learn/my-learning?tab=completed')
    expect(await screen.findByText('Nothing completed yet')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('shows a new learner every path under Not Started with Start learning', async () => {
    practitioner()
    window.localStorage.setItem(
      progressKey('u-demo'),
      JSON.stringify({ version: 2, userId: 'u-demo', lessons: {}, media: {}, activity: [], updatedAt: '2026-11-10T09:00:00.000Z' }),
    )
    renderPage('/learn/my-learning?tab=not-started')
    const card = await screen.findByRole('article', { name: 'Meadow Journey' })
    expect(titlesInView()).toHaveLength(4)
    expect(within(card).getByRole('link', { name: 'Start learning: Meadow Journey' })).toBeInTheDocument()
    expect(within(card).queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('lists a withdrawn path apart from the rest', async () => {
    practitioner()
    ensureDefaultAssignment({ id: 'u-demo', role: 'practitioner' })
    withdrawAssignment(defaultAssignmentId('u-demo'), new Date('2026-11-09T12:00:00.000Z'))
    renderPage()
    await screen.findByRole('article', { name: 'First steps' })
    expect(screen.queryByRole('article', { name: 'Meadow Journey' })).not.toBeInTheDocument()
    const withdrawn = screen.getByRole('region', { name: 'No longer assigned' })
    expect(within(withdrawn).getByText('Meadow Journey')).toBeInTheDocument()
    expect(within(withdrawn).getByText(/Withdrawn 9 Nov 2026/)).toBeInTheDocument()
  })

  it('with everything withdrawn, says so and points to the library', async () => {
    practitioner()
    const learner = { id: 'u-demo', role: 'practitioner' as const }
    ensureDefaultAssignment(learner)
    ensureDemoAssignments(learner, DEMO_PATH_IDS)
    for (const entry of listAssignments()) withdrawAssignment(entry.id, new Date('2026-11-09T12:00:00.000Z'))
    renderPage()
    expect(await screen.findByText('Nothing assigned yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse the library' })).toHaveAttribute('href', '/learn/library')
    const withdrawn = screen.getByRole('region', { name: 'No longer assigned' })
    expect(within(withdrawn).getAllByRole('listitem')).toHaveLength(4)
  })

  it('gives staff a read-only preview', async () => {
    session('u-editor', 'Rowan Ellis', 'editor@nff.demo', 'editor')
    renderPage()
    const card = await screen.findByRole('article', { name: 'Meadow Journey' })
    expect(within(card).getByRole('link', { name: 'View learning path: Meadow Journey' })).toBeInTheDocument()
    expect(within(card).getByText(/Preview: not assigned to you/)).toBeInTheDocument()
    expect(window.localStorage.getItem(progressKey('u-editor'))).toBeNull()
    expect(window.localStorage.getItem('meadow.assignments.v1') ?? '[]').not.toContain('u-editor')
  })
})
