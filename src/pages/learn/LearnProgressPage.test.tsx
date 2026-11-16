import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { LearnProgressPage } from '@/pages/learn/LearnProgressPage'
import { progressKey } from '@/services/learning/progress'

const FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true }

function session(id: string, name: string, email: string, role: string) {
  window.localStorage.setItem(
    'nff.session',
    JSON.stringify({ token: 't', user: { id, name, email, role, verified: true } }),
  )
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/learn/progress']} future={FUTURE}>
          <Routes>
            <Route path="/learn/progress" element={<LearnProgressPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('Progress page', () => {
  it('shows real totals, each path with its action, and history without invented dates', async () => {
    session('u-demo', 'Maya Patel', 'practitioner@nff.demo', 'practitioner')
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Your Progress' })).toBeInTheDocument()
    const overview = await screen.findByRole('region', { name: 'Overview' })
    const stat = (label: string) =>
      within(overview).getByText(label).parentElement!.querySelector('dd')!.textContent
    const assigned = Number(stat('Learning paths assigned'))
    expect(assigned).toBeGreaterThan(0)
    const done = Number(stat('Lessons completed'))
    expect(done).toBeGreaterThan(0)

    const paths = screen.getByRole('region', { name: 'Your learning paths' })
    expect(within(paths).getAllByRole('article')).toHaveLength(assigned)
    const card = within(paths).getByRole('article', { name: 'Meadow Journey' })
    expect(within(card).getByText(new RegExp(`^${done} of \\d+ lessons complete`))).toBeInTheDocument()
    expect(within(card).getByText('In progress')).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: /Continue learning/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/learn\/paths\/meadow-journey\/lessons\//),
    )

    // Seeded completions carry no date, and say so (once, plus per row for screen readers).
    const history = screen.getByRole('region', { name: 'Completed lessons' })
    expect(within(history).getAllByText(/date not recorded/i).length).toBeGreaterThan(0)
    // Grouped by stage by default; "Newest first" re-orders in place.
    expect(within(history).getByRole('button', { name: 'By stage' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(history).getByRole('button', { name: `Show all ${done} completed lessons` }))
    expect(within(history).getAllByRole('link')).toHaveLength(done)
    await user.click(within(history).getByRole('button', { name: 'Newest first' }))
    expect(within(history).getAllByRole('link')).toHaveLength(done)

    expect(screen.getByRole('region', { name: 'Recent activity' })).toHaveTextContent('No activity recorded yet')
    expect(screen.queryByText(/streak|points|badge|minutes listened|hours/i)).not.toBeInTheDocument()
  })

  it('staff preview shows structure only and writes nothing', async () => {
    session('u-editor', 'Rowan Ellis', 'editor@nff.demo', 'editor')
    renderPage()
    expect(await screen.findByRole('region', { name: 'Learning paths' })).toBeInTheDocument()
    expect(screen.getByText(/Preview mode\. Progress belongs to each learner/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Overview' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Completed lessons' })).not.toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(window.localStorage.getItem(progressKey('u-editor'))).toBeNull()
    expect(window.localStorage.getItem('meadow.assignments.v1') ?? '').not.toContain('u-editor')
  })
})
