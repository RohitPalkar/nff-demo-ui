import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { setScenario } from '@/mocks/scenario'
import { AboutPage } from '@/pages/public/AboutPage'

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
}

beforeAll(() => {
  // jsdom has no layout APIs.
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
})

function renderPage(entry = '/about') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[entry]} future={ROUTER_FUTURE}>
          <Routes>
            <Route path="/about" element={<AboutPage />} />
            <Route path="/about/:slug" element={<AboutPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  setScenario('default')
})

async function findTitle() {
  return screen.findByRole('heading', { level: 1, name: 'Who we are' }, { timeout: 3000 })
}

describe('AboutPage', () => {
  it('renders all three parts as one page, without tabs', async () => {
    renderPage()
    await findTitle()

    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'What we do' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'How we do it' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'A practice, not a promise' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'The people behind it' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Evidence, held lightly' })).toBeInTheDocument()
    expect(screen.getByText(/Updated 14 Oct 2026/)).toBeInTheDocument()
  })

  it('has a breadcrumb and an in-page index', async () => {
    renderPage()
    await findTitle()

    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')

    const index = screen.getByRole('navigation', { name: 'On this page' })
    expect(within(index).getByRole('link', { name: /What we do/ })).toHaveAttribute(
      'href',
      '#what-we-do',
    )
  })

  it('links the library categories to their catalogue tabs', async () => {
    renderPage()
    await findTitle()

    expect(screen.getByRole('link', { name: 'Foundations' })).toHaveAttribute(
      'href',
      '/explorations?tab=foundations',
    )
    expect(screen.getByRole('link', { name: 'Browse meditations' })).toHaveAttribute(
      'href',
      '/meditations',
    )
  })

  it('ends with the registration panel for visitors', async () => {
    renderPage()
    await findTitle()

    expect(screen.getByRole('link', { name: /Create your free account/ })).toHaveAttribute(
      'href',
      '/signup',
    )
  })

  it('opens the same page from the older topic links', async () => {
    renderPage('/about/how-we-do-it')
    await findTitle()
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('shows a missing-image fallback and keeps the caption', async () => {
    renderPage('/about?image=missing')
    await findTitle()

    expect(screen.getAllByRole('img', { name: 'Image unavailable' }).length).toBeGreaterThan(0)
    expect(screen.getByText(/Our work begins with attention/)).toBeInTheDocument()
  })

  it('shows a missing-page state for an unknown topic', async () => {
    renderPage('/about/does-not-exist')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'We could not find that page' }),
    ).toBeInTheDocument()
  })
})
