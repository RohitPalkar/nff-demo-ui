import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { PlayerProvider } from '@/features/player/PlayerProvider'
import { content } from '@/mocks/db'
import { LibraryPage } from '@/pages/learn/LibraryPage'
import { ResourcePage } from '@/pages/learn/ResourcePage'
import { getLearningCatalogue } from '@/services/learning/catalogue'
import { progressKey } from '@/services/learning/progress'
import { getPlaybackSpeed } from '@/services/account'

// These tests cover features switched off for SOW v1.3 (config/sowScope.ts).
// Run them with every feature on, so the code stays ready to switch back.
vi.mock('@/config/sowScope', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/sowScope')>()
  return {
    SOW_SCOPE: Object.fromEntries(Object.keys(actual.SOW_SCOPE).map((key) => [key, true])),
  }
})


const FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true }
const published = content.filter((item) => item.published)

function session(id: string, name: string, email: string, role: string) {
  window.localStorage.setItem(
    'nff.session',
    JSON.stringify({ token: 't', user: { id, name, email, role, verified: true } }),
  )
}
const practitioner = () => session('u-demo', 'Maya Patel', 'practitioner@nff.demo', 'practitioner')

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
              <Route path="/learn/library" element={<LibraryPage />} />
              <Route path="/learn/library/:type/:slug" element={<ResourcePage />} />
              <Route path="*" element={<p>Elsewhere</p>} />
            </Routes>
            <Where />
          </MemoryRouter>
        </PlayerProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

const grid = () => screen.getByRole('region', { name: /All resources|Results/ })
const cardTitles = () =>
  within(grid())
    .queryAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent)

beforeEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('Library page', () => {
  it('shows the heading, featured items and the first page of real resources', async () => {
    practitioner()
    renderAt('/learn/library')

    expect(screen.getByRole('heading', { level: 1, name: 'Explore the Library' })).toBeInTheDocument()
    expect(
      screen.getByText('Discover learning resources, practices and ideas to explore at your own pace.'),
    ).toBeInTheDocument()
    expect(await screen.findByText(`Showing 9 of ${published.length} resources`)).toBeInTheDocument()
    expect(cardTitles()).toHaveLength(9)

    const featured = screen.getByRole('region', { name: 'Featured' })
    for (const heading of within(featured).getAllByRole('heading', { level: 3 })) {
      expect(content.find((item) => item.title === heading.textContent)?.featured).toBe(true)
    }

    // Every resource card stays inside the Practitioner app (exclude pagination links).
    for (const link of within(grid()).getAllByRole('link')) {
      const href = link.getAttribute('href')
      if (href && href !== '#') {
        expect(href).toMatch(/^\/learn\/library\/(article|audio)\//)
      }
    }
    expect(screen.queryByText(/rating|enrol|popular|review/i)).not.toBeInTheDocument()
  })

  it('shows next page via pagination', async () => {
    practitioner()
    const user = userEvent.setup()
    renderAt('/learn/library')
    await screen.findByText(/Showing 9 of/)
    const page1Titles = cardTitles()
    // Click page 2 in pagination
    await user.click(screen.getByRole('link', { name: 'Page 2' }))
    const page2Titles = cardTitles()
    expect(page2Titles).toHaveLength(9)
    expect(page2Titles).not.toEqual(page1Titles)
  })

  it('searches after typing, keeps the query in the URL, and clears with Escape', async () => {
    practitioner()
    const user = userEvent.setup()
    renderAt('/learn/library?sort=title')
    await screen.findByText(/Showing 9 of/)

    const target = published.find((item) => item.type === 'exploration')!
    const search = screen.getByRole('searchbox', { name: 'Search the library' })
    await user.type(search, target.title.toUpperCase())

    await waitFor(() => expect(cardTitles()).toContain(target.title))
    expect(screen.getByTestId('where').textContent).toContain('sort=title')
    expect(screen.getByTestId('where').textContent).toContain('q=')
    expect(screen.queryByRole('region', { name: 'Featured' })).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(search).toHaveValue('')
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/learn/library?sort=title'))
  })

  it('says so when nothing matches, and clears from the empty state', async () => {
    practitioner()
    const user = userEvent.setup()
    renderAt('/learn/library?q=qwertyuiop&category=explore')

    expect(await screen.findByText('No results for “qwertyuiop”')).toBeInTheDocument()
    expect(screen.getByText('No resources match')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search and filters' }))
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/learn\/library$/)
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  it('filters by category and format, with real counts and removable chips', async () => {
    practitioner()
    const user = userEvent.setup()
    renderAt('/learn/library')
    await screen.findByText(/Showing 9 of/)

    const nav = screen.getByRole('navigation', { name: 'Library categories' })
    const contemplate = published.filter((item) => item.category === 'contemplate')
    const button = within(nav).getByRole('button', { name: new RegExp(`Contemplate ${contemplate.length}`) })
    await user.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('where')).toHaveTextContent('category=contemplate')

    const formats = screen.getByRole('group', { name: 'Format' })
    await user.click(within(formats).getByRole('button', { name: /^Article/ }))
    const expected = contemplate.filter((item) => item.type === 'exploration').length
    // With pagination showing 9 per page, the summary says "Showing 9 of X resources"
    expect(await screen.findByText(`Showing ${Math.min(expected, 9)} of ${expected} resources`)).toBeInTheDocument()
    expect(cardTitles()).toHaveLength(Math.min(expected, 9))

    const chips = screen.getByRole('list', { name: 'Active filters' })
    await user.click(within(chips).getByRole('button', { name: 'Remove filter: Contemplate' }))
    expect(screen.getByTestId('where')).toHaveTextContent('/learn/library?format=article')
  })

  it('treats unsupported media formats as no filter', async () => {
    practitioner()
    renderAt('/learn/library?format=video')
    expect(await screen.findByText(`Showing 9 of ${published.length} resources`)).toBeInTheDocument()
    expect(within(grid()).queryByText('Video', { selector: 'span' })).not.toBeInTheDocument()
  })

  it('sorts with the select and keeps it in the URL', async () => {
    practitioner()
    const user = userEvent.setup()
    renderAt('/learn/library')
    await screen.findByText(/Showing 9 of/)
    await user.selectOptions(screen.getByLabelText('Sort by'), 'title')
    expect(screen.getByTestId('where')).toHaveTextContent('sort=title')
    const titles = cardTitles() as string[]
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)))
  })

  it('lists nothing unpublished, even for staff', async () => {
    session('u-editor', 'Rowan Ellis', 'editor@nff.demo', 'editor')
    renderAt('/learn/library?q=')
    expect(await screen.findByText(`Showing 9 of ${published.length} resources`)).toBeInTheDocument()
  })
})

describe('Library resource detail', () => {
  it('opens an article in the reader with Library navigation, paths and related items', async () => {
    practitioner()
    const item = content.find((entry) => entry.id === 'exp-14')!
    renderAt(`/learn/library/article/${item.slug}`)

    expect(await screen.findByRole('heading', { level: 1, name: item.title })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Library/ })[0]).toHaveAttribute('href', '/learn/library')
    expect(screen.queryByText(/Lesson \d+ of \d+/)).not.toBeInTheDocument()

    const paths = screen.getByRole('region', { name: 'Also in your learning paths' })
    expect(within(paths).getByRole('link', { name: /Rest and sleep/ })).toHaveAttribute('href', '/learn/paths/rest-and-sleep')
    const related = screen.getByRole('region', { name: 'Related in the library' })
    expect(within(related).getAllByRole('link')).toHaveLength(3)
  })

  it('opens audio in the player', async () => {
    practitioner()
    const item = content.find((entry) => entry.type === 'meditation' && entry.published && entry.transcode === 'ready')!
    renderAt(`/learn/library/audio/${item.slug}`)
    expect(await screen.findByRole('heading', { level: 1, name: item.title })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Library/ })[0]).toHaveAttribute('href', '/learn/library')
    expect(screen.getByRole('group', { name: 'Playback speed' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Seek' })).toBeInTheDocument()
    expect(screen.queryByText(/Lesson \d+ of/)).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Curriculum' })).not.toBeInTheDocument()
  })

  it('does not resolve unsupported media route types', async () => {
    practitioner()
    const item = published.find((entry) => entry.type === 'exploration')!

    for (const type of ['video', 'mixed']) {
      const view = renderAt(`/learn/library/${type}/${item.slug}`)
      expect(await screen.findByText('We could not find that')).toBeInTheDocument()
      expect(screen.queryByRole('heading', { level: 1, name: item.title })).not.toBeInTheDocument()
      view.unmount()
    }
  })

  it('says audio that is still processing is not ready, inside the app', async () => {
    practitioner()
    const item = content.find((entry) => entry.type === 'meditation' && entry.transcode === 'transcoding')!
    renderAt(`/learn/library/audio/${item.slug}`)
    expect(await screen.findByText('This audio is not ready yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Library' })).toHaveAttribute('href', '/learn/library')
  })

  it('enforces access on the direct URL without leaving the app', async () => {
    // A visitor (no session) on a resource that needs an account.
    const item = published.find((entry) => entry.type === 'exploration')!
    renderAt(`/learn/library/article/${item.slug}`)
    expect(await screen.findByRole('link', { name: 'Back to Library' })).toHaveAttribute('href', '/learn/library')
    expect(screen.queryByRole('heading', { name: item.title })).not.toBeInTheDocument()
    expect(screen.queryByText(item.excerpt)).not.toBeInTheDocument()
    expect(screen.getByTestId('where').textContent).toBe(`/learn/library/article/${item.slug}`)
  })

  it('hides an unpublished item from learners, with the unpublished state', async () => {
    practitioner()
    const hidden = content.find((item) => !item.published)
    if (!hidden) return
    renderAt(`/learn/library/${hidden.type === 'meditation' ? 'audio' : 'article'}/${hidden.slug}`)
    expect(await screen.findByText('This is not available yet')).toBeInTheDocument()
  })

  it('hides a restricted item from a learner without a grant', async () => {
    practitioner()
    const item = content.find((entry) => entry.id === 'exp-3')!
    const { resources } = getLearningCatalogue()
    const index = resources.findIndex((entry) => entry.id === item.id)
    const original = resources[index]!
    resources[index] = { ...original, access: 'restricted' }
    try {
      renderAt(`/learn/library/article/${item.slug}`)
      expect(await screen.findByText('This is restricted')).toBeInTheDocument()
    } finally {
      resources[index] = original
    }
  })

  it('shows unknown resources as not found', async () => {
    practitioner()
    renderAt('/learn/library/article/no-such-thing')
    expect(await screen.findByText('We could not find that')).toBeInTheDocument()
  })

  it('opening a resource assigns nothing and records no progress for staff', async () => {
    session('u-editor', 'Rowan Ellis', 'editor@nff.demo', 'editor')
    const item = content.find((entry) => entry.id === 'exp-14')!
    renderAt(`/learn/library/article/${item.slug}`)
    expect(await screen.findByRole('heading', { level: 1, name: item.title })).toBeInTheDocument()
    expect(screen.getByText('Preview mode: completion is not recorded.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Also in your learning paths' })).not.toBeInTheDocument()
    expect(window.localStorage.getItem(progressKey('u-editor'))).toBeNull()
    expect(window.localStorage.getItem('meadow.assignments.v1') ?? '[]').not.toContain('u-editor')
  })

  it('staff preview can change speed while listening without saving it as a preference', async () => {
    session('u-editor', 'Rowan Ellis', 'editor@nff.demo', 'editor')
    const user = userEvent.setup()
    const item = content.find((entry) => entry.type === 'meditation' && entry.published && entry.transcode === 'ready')!
    renderAt(`/learn/library/audio/${item.slug}`)
    const speeds = await screen.findByRole('group', { name: 'Playback speed' })
    await user.click(within(speeds).getByRole('button', { name: '1.5×' }))
    expect(within(speeds).getByRole('button', { name: '1.5×' })).toHaveAttribute('aria-pressed', 'true')
    expect(getPlaybackSpeed('u-editor')).toBe(1)
  })
})
