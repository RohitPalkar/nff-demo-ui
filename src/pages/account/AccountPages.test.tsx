import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { AccountLayout } from '@/pages/account/AccountLayout'
import { EmailPreferencesPage } from '@/pages/account/EmailPreferencesPage'
import { PreferencesPage } from '@/pages/account/PreferencesPage'
import { PrivacyPage } from '@/pages/account/PrivacyPage'
import { ProfilePage } from '@/pages/account/ProfilePage'
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
            <Route path="/account" element={<AccountLayout />}>
              <Route path="profile" element={<ProfilePage />} />
              <Route path="preferences" element={<PreferencesPage />} />
              <Route path="email" element={<EmailPreferencesPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
            </Route>
            <Route path="/login" element={<p>Sign in page</p>} />
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

describe('Account pages', () => {
  it('names the sections as the account menu does', () => {
    practitioner()
    renderAt('/account/profile')
    const nav = screen.getByRole('navigation', { name: 'Account' })
    expect([...nav.querySelectorAll('a')].map((link) => link.textContent)).toEqual([
      'My Profile',
      'Preferences',
      'Email Preferences',
      'Privacy & Security',
    ])
  })

  it('shows the signed-in account on the profile', async () => {
    practitioner()
    renderAt('/account/profile')
    expect(await screen.findByRole('heading', { name: 'Maya Patel' })).toBeInTheDocument()
    expect(screen.getByText('Practitioner · Email verified')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('practitioner@nff.demo')
    expect(screen.queryByText(/daily email arrives/i)).not.toBeInTheDocument()
  })

  it('saves the default playback speed per account', async () => {
    practitioner()
    const user = userEvent.setup()
    renderAt('/account/preferences')
    await user.click(screen.getByRole('radio', { name: '1.25×' }))
    expect(getPlaybackSpeed('u-demo')).toBe(1.25)
    expect(getPlaybackSpeed('u-editor')).toBe(1)

    cleanup()
    renderAt('/account/preferences')
    expect(screen.getByRole('radio', { name: '1.25×' })).toBeChecked()
  })

  it('says plainly that no email is sent', async () => {
    practitioner()
    renderAt('/account/email')
    expect(
      await screen.findByText(/Email sending is not connected in this demo/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/tonight/i)).not.toBeInTheDocument()
  })

  it('logs out from Privacy & Security and returns to sign in', async () => {
    practitioner()
    const user = userEvent.setup()
    renderAt('/account/privacy')
    expect(screen.getByRole('heading', { name: 'Sign-in and security' })).toBeInTheDocument()
    expect(screen.getByText(/not available in this demo/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Log out' }))
    expect(await screen.findByText('Sign in page')).toBeInTheDocument()
    expect(window.localStorage.getItem('nff.session')).toBeNull()
  })
})
