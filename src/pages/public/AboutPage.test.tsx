import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { setScenario } from '@/mocks/scenario'
import { AboutPage } from '@/pages/public/AboutPage'

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
}

function renderPage(entry = '/about/who-we-are') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]} future={ROUTER_FUTURE}>
        <Routes>
          <Route path="/about/:slug" element={<AboutPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  setScenario('default')
})

describe('AboutPage', () => {
  it('renders the topic navigation and long editorial body', async () => {
    renderPage()

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Who we are' },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Who we are' }),
    ).toHaveAttribute('aria-current', 'page')
    expect(
      screen.getByRole('heading', { name: 'A practice, not a promise' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'The people behind it' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Updated 14 Oct 2026/)).toBeInTheDocument()
  })

  it('links to the next topic and the catalogue', async () => {
    renderPage()

    await screen.findByRole(
      'heading',
      { level: 1, name: 'Who we are' },
      { timeout: 3000 },
    )

    expect(
      screen.getByRole('link', { name: 'Explore the library' }),
    ).toHaveAttribute('href', '/explorations')

    await userEvent.click(
      screen.getByRole('link', { name: /Continue the About section/ }),
    )

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'What we do' },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
  })

  it('shows a missing-image fallback and keeps the caption', async () => {
    renderPage('/about/who-we-are?image=missing')

    await screen.findByRole(
      'heading',
      { level: 1, name: 'Who we are' },
      { timeout: 3000 },
    )
    expect(
      screen.getByRole('img', { name: 'Image unavailable' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Our work begins with attention/)).toBeInTheDocument()
  })

  it('shows a missing-page state for an unknown topic', async () => {
    renderPage('/about/does-not-exist')

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'We could not find that page' },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
  })
})
