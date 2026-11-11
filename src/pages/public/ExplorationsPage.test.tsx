import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { setScenario } from '@/mocks/scenario'
import { ExplorationsPage } from '@/pages/public/ExplorationsPage'

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
}

function renderPage(entry = '/explorations') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[entry]} future={ROUTER_FUTURE}>
          <ExplorationsPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  setScenario('default')
})

describe('ExplorationsPage', () => {
  it('shows the first page of explorations and loads more', async () => {
    renderPage()

    expect(
      await screen.findByText(
        'Showing 12 of 40 explorations',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(12)

    await userEvent.click(
      screen.getByRole('button', { name: 'Load more explorations' }),
    )

    expect(screen.getAllByRole('article')).toHaveLength(24)
  })

  it('filters the catalogue from the category URL parameter', async () => {
    renderPage('/explorations?tab=understand')

    expect(
      await screen.findByText('10 explorations', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Understand' }),
    ).toHaveAttribute('aria-current', 'page')
    expect(
      screen.getByRole('heading', { name: 'How the mind meets the moment' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'What is Meadow?' }),
    ).not.toBeInTheDocument()
  })

  it('shows a no-results state and clears the search', async () => {
    renderPage('/explorations?q=zzzz')

    expect(
      await screen.findByText(
        'No results for “zzzz”',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(
      await screen.findByText(
        'Showing 12 of 40 explorations',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
  })

  it('shows the library empty state', async () => {
    setScenario('empty')
    renderPage()

    expect(
      await screen.findByText(
        'No explorations published yet',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse meditations' })).toHaveAttribute(
      'href',
      '/meditations',
    )
  })
})
