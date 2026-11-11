import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { setScenario } from '@/mocks/scenario'
import { ExplorationDetailPage } from '@/pages/public/ExplorationDetailPage'

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
}

const SESSION_KEY = 'nff.session'

function signInAsPractitioner() {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      token: 'test-token',
      user: {
        id: 'u-demo',
        name: 'Maya Patel',
        email: 'practitioner@nff.demo',
        role: 'practitioner',
        verified: true,
      },
    }),
  )
}

function renderPage(slug: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter
          initialEntries={[`/explorations/${slug}`]}
          future={ROUTER_FUTURE}
        >
          <Routes>
            <Route
              path="/explorations/:slug"
              element={<ExplorationDetailPage />}
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  localStorage.clear()
  setScenario('default')
})

describe('ExplorationDetailPage', () => {
  it('shows the opening excerpt and a sign-up gate to visitors', async () => {
    renderPage('what-is-meadow')

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'What is Meadow?' },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Sign up free to read the full lesson',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/Progress here is rarely dramatic/),
    ).not.toBeInTheDocument()
  })

  it('shows the full lesson to a signed-in practitioner', async () => {
    signInAsPractitioner()
    renderPage('what-is-meadow')

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'What is Meadow?' },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Progress here is rarely dramatic/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: 'Sign up free to read the full lesson',
      }),
    ).not.toBeInTheDocument()
  })

  it('explains when an exploration is not published', async () => {
    renderPage('a-draft-exploration')

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'This exploration is not published yet' },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
  })

  it('shows a missing-content state for an unknown slug', async () => {
    renderPage('does-not-exist')

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'We could not find that exploration' },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
  })
})
