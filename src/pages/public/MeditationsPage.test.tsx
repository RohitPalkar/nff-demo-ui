import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { setScenario } from '@/mocks/scenario'
import { MeditationsPage } from '@/pages/public/MeditationsPage'

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
}

function renderPage(entry = '/meditations') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[entry]} future={ROUTER_FUTURE}>
          <MeditationsPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  setScenario('default')
})

describe('MeditationsPage', () => {
  it('paginates the track grid', async () => {
    renderPage()

    expect(
      await screen.findByText(
        'Showing 1–12 of 60 meditations',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(12)

    await userEvent.click(screen.getByRole('link', { name: 'Next page' }))

    expect(
      screen.getByText('Showing 13–24 of 60 meditations'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(12)
  })

  it('filters to free previews', async () => {
    renderPage('/meditations?preview=1')

    expect(
      await screen.findByText('15 free previews', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(12)
    expect(screen.getAllByText('Free preview')).toHaveLength(12)
    expect(
      screen.getByRole('button', { name: 'Free previews only' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows the library empty state', async () => {
    setScenario('empty')
    renderPage()

    expect(
      await screen.findByText(
        'No meditations published yet',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Browse explorations' }),
    ).toHaveAttribute('href', '/explorations')
  })

  it('marks a track as unavailable when transcoding fails', async () => {
    setScenario('transcode-failed')
    renderPage()

    expect(
      await screen.findByText('Unavailable', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
  })
})
