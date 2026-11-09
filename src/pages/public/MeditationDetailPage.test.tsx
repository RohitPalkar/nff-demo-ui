import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { setScenario } from '@/mocks/scenario'
import { MeditationDetailPage } from '@/pages/public/MeditationDetailPage'

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
          initialEntries={[`/meditations/${slug}`]}
          future={ROUTER_FUTURE}
        >
          <Routes>
            <Route
              path="/meditations/:slug"
              element={<MeditationDetailPage />}
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

describe('MeditationDetailPage', () => {
  it('plays a free preview for visitors and explains the one-minute limit', async () => {
    renderPage('loving-kindness-for-a-difficult-day')

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Loving-kindness for a difficult day' },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: 'Sign up free to listen to this track',
      }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    expect(
      screen.getByText(/The player stops after one minute/),
    ).toBeInTheDocument()
  })

  it('gates a non-preview track for visitors', async () => {
    renderPage('body-scan-for-rest')

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Body scan for rest' },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Sign up free to listen to this track',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Play' }),
    ).not.toBeInTheDocument()
  })

  it('gives a practitioner the full track', async () => {
    signInAsPractitioner()
    renderPage('body-scan-for-rest')

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Body scan for rest' },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: 'Sign up free to listen to this track',
      }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
  })

  it('explains when the audio is still being prepared', async () => {
    renderPage('morning-grounding')

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'This track is not ready yet' },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
  })

  it('explains when transcoding has failed', async () => {
    setScenario('transcode-failed')
    renderPage('gratitude-at-the-end-of-the-day')

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'This track is unavailable' },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
  })

  it('starts playback and shows the sign-up prompt when the preview ends', async () => {
    renderPage('loving-kindness-for-a-difficult-day')

    await screen.findByRole(
      'heading',
      { level: 1, name: 'Loving-kindness for a difficult day' },
      { timeout: 3000 },
    )

    await userEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(await screen.findByText('Preparing audio…')).toBeInTheDocument()
    expect(
      await screen.findByRole(
        'button',
        { name: 'Pause' },
        { timeout: 2000 },
      ),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Seek'), {
      target: { value: '60' },
    })

    expect(
      screen.getByRole('heading', { name: 'Your preview has ended' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Sign up free' }),
    ).toHaveAttribute('href', '/signup')
  })
})
