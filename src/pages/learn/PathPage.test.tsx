import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { PathPage } from '@/pages/learn/PathPage'
import {
  MEADOW_JOURNEY_ID,
  getLessonsOf,
  getModulesOf,
  lessonIdForItem,
} from '@/services/learning/catalogue'
import { progressKey } from '@/services/learning/progress'

const FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true }

function session(id: string, name: string, email: string, role: string) {
  window.localStorage.setItem(
    'nff.session',
    JSON.stringify({ token: 't', user: { id, name, email, role, verified: true } }),
  )
}
const practitioner = () => session('u-demo', 'Maya Patel', 'practitioner@nff.demo', 'practitioner')

function renderAt(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={[url]} future={FUTURE}>
          <Routes>
            <Route path="/learn/paths/:pathSlug" element={<PathPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

const modules = () => getModulesOf(MEADOW_JOURNEY_ID)
const fresh = () =>
  window.localStorage.setItem(
    progressKey('u-demo'),
    JSON.stringify({ version: 2, userId: 'u-demo', lessons: {}, media: {}, activity: [], updatedAt: '2026-11-10T09:00:00.000Z' }),
  )

beforeEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('Meadow Journey path page', () => {
  it('shows the real title, counts and progress, with no greeting or invented metadata', () => {
    practitioner()
    renderAt('/learn/paths/meadow-journey')

    expect(screen.getByRole('heading', { level: 1, name: 'Meadow Journey' })).toBeInTheDocument()
    expect(screen.getByText('A staged practice, from arriving through to integration.')).toBeInTheDocument()
    expect(screen.getByText(/Learning path · 6 modules · 100 lessons/)).toBeInTheDocument()
    expect(screen.getByText(/of 100 lessons complete/)).toBeInTheDocument()
    expect(screen.queryByText(/welcome back/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/rating|reviews|enrolled|certificate|instructor|learners/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My Learning' })).toHaveAttribute('href', '/learn/my-learning')
  })

  it('opens the current module by default and toggles modules', async () => {
    practitioner()
    const user = userEvent.setup()
    renderAt('/learn/paths/meadow-journey')

    const triggers = screen.getAllByRole('button', { expanded: true })
    expect(triggers).toHaveLength(1)
    const toggle = triggers[0]!
    await user.click(toggle)
    expect(screen.queryAllByRole('button', { expanded: true })).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Expand all' }))
    expect(screen.getAllByRole('button', { expanded: true })).toHaveLength(modules().length)
    await user.click(screen.getByRole('button', { name: 'Collapse all' }))
    expect(screen.queryAllByRole('button', { expanded: true })).toHaveLength(0)
  })

  it('lists lessons in order with a word for each state', async () => {
    practitioner()
    const user = userEvent.setup()
    renderAt('/learn/paths/meadow-journey')
    await user.click(screen.getByRole('button', { name: 'Expand all' }))

    const first = modules()[0]!
    const section = document.getElementById(`module-${first.id}`)!
    const rows = within(section).getAllByRole('listitem')
    expect(rows).toHaveLength(getLessonsOf(first.id).length)
    expect(within(section).getAllByText('Completed').length).toBeGreaterThan(0)

    // Locked modules explain why, and their lessons cannot be opened.
    const locked = document.getElementById(`module-${modules()[3]!.id}`)!
    expect(within(locked).getByText(/Opens when .* is complete/)).toBeInTheDocument()
    expect(within(locked).queryAllByRole('link')).toHaveLength(0)
    expect(within(locked).getAllByText('Locked').length).toBeGreaterThan(0)
  })

  it('opens a module named in ?module=', () => {
    practitioner()
    const target = modules()[0]!
    renderAt(`/learn/paths/meadow-journey?module=${target.id}`)
    const section = document.getElementById(`module-${target.id}`)!
    expect(within(section).getByRole('button', { expanded: true })).toBeInTheDocument()
  })

  it('offers Start learning to a new learner, linking to the first lesson inside the app', () => {
    practitioner()
    fresh()
    renderAt('/learn/paths/meadow-journey')
    const first = getLessonsOf(modules()[0]!.id)[0]!
    const start = screen.getByRole('link', { name: /Start learning/ })
    expect(start).toHaveAttribute('href', `/learn/paths/meadow-journey/lessons/${first.id}`)
    expect(screen.getByText(/^Next: /)).toBeInTheDocument()
  })

  it('offers Continue learning to the seeded learner, ending in a real lesson URL', () => {
    practitioner()
    renderAt('/learn/paths/meadow-journey')
    const link = screen.getByRole('link', { name: /Continue learning/ })
    expect(link.getAttribute('href')).toMatch(/^\/learn\/paths\/meadow-journey\/lessons\/lesson-/)
  })

  it('offers Review learning when every lesson is complete', async () => {
    practitioner()
    const ids = modules().flatMap((m) => getLessonsOf(m.id)).map((l) => l.id.replace('lesson-', ''))
    window.localStorage.setItem(
      progressKey('u-demo'),
      JSON.stringify({
        version: 2,
        userId: 'u-demo',
        lessons: Object.fromEntries(ids.map((id) => [lessonIdForItem(id), { lessonId: lessonIdForItem(id), status: 'completed' }])),
        media: {},
        activity: [],
        updatedAt: '2026-11-10T09:00:00.000Z',
      }),
    )
    renderAt('/learn/paths/meadow-journey')
    expect(screen.getByText('All 100 lessons complete')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Continue learning|Start learning/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Review learning' })).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { expanded: true })).toHaveLength(0)
  })

  it('shows staff a read-only preview with nothing locked and no action', async () => {
    session('u-editor', 'Rowan Ellis', 'editor@nff.demo', 'editor')
    const user = userEvent.setup()
    renderAt('/learn/paths/meadow-journey')
    expect(screen.getByText(/Preview: not assigned to you/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Start learning|Continue learning/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Expand all' }))
    expect(screen.queryByText(/Opens when/)).not.toBeInTheDocument()
    expect(window.localStorage.getItem(progressKey('u-editor'))).toBeNull()
    expect(window.localStorage.getItem('meadow.assignments.v1') ?? '[]').not.toContain('u-editor')
  })

  it('serves other paths from the same page, with open modules unlocked', async () => {
    practitioner()
    const user = userEvent.setup()
    renderAt('/learn/paths/first-steps')
    expect(screen.getByRole('heading', { level: 1, name: 'First steps' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Expand all' }))
    expect(screen.queryByText(/Opens when/)).not.toBeInTheDocument()
  })

  it('does not render a path the viewer cannot open, or one that does not exist', () => {
    renderAt('/learn/paths/meadow-journey')
    expect(screen.queryByRole('heading', { level: 1, name: 'Meadow Journey' })).not.toBeInTheDocument()
    cleanup()
    practitioner()
    renderAt('/learn/paths/no-such-path')
    expect(screen.getByText('We could not find that')).toBeInTheDocument()
  })
})
