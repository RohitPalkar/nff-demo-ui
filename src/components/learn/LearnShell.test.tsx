import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LearnLayout } from '@/app/layouts/LearnLayout'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { PlayerProvider } from '@/features/player/PlayerProvider'
import { LEARN_NAV } from '@/components/learn/navItems'

// These tests cover features switched off for SOW v1.3 (config/sowScope.ts).
// Run them with every feature on, so the code stays ready to switch back.
vi.mock('@/config/sowScope', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/sowScope')>()
  return {
    SOW_SCOPE: Object.fromEntries(Object.keys(actual.SOW_SCOPE).map((key) => [key, true])),
  }
})


const FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true }

function session(email: string, role: string, id: string, name: string) {
  window.localStorage.setItem(
    'nff.session',
    JSON.stringify({ token: 't', user: { id, name, email, role, verified: true } }),
  )
}

function shell(url = '/learn') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <PlayerProvider>
          <MemoryRouter initialEntries={[url]} future={FUTURE}>
            <Routes>
              <Route element={<LearnLayout />}>
                <Route path="/learn/*" element={<p>CONTENT</p>} />
                <Route path="/login" element={<p>LOGIN PAGE</p>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </PlayerProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('Practitioner shell', () => {
  it('has exactly the five primary destinations, in order', () => {
    expect(LEARN_NAV.map((item) => [item.label, item.to])).toEqual([
      ['Home', '/learn'],
      ['My Learning', '/learn/my-learning'],
      ['Library', '/learn/library'],
      ['Meditations', '/learn/meditations'],
      ['Progress', '/learn/progress'],
    ])
  })

  it('renders the nav and marks the current item', () => {
    session('practitioner@nff.demo', 'practitioner', 'u-demo', 'Maya Patel')
    shell('/learn/library')
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(
      LEARN_NAV.map((item) => item.label),
    )
    expect(within(nav).getByRole('link', { name: 'Library' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('keeps My Learning active on a path or lesson URL', () => {
    session('practitioner@nff.demo', 'practitioner', 'u-demo', 'Maya Patel')
    shell('/learn/paths/meadow-journey/lessons/lesson-exp-1')
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(nav).getByRole('link', { name: 'My Learning' })).toHaveAttribute('aria-current', 'page')
  })

  it('never links to the public website from the shell chrome', () => {
    session('practitioner@nff.demo', 'practitioner', 'u-demo', 'Maya Patel')
    shell()
    const header = screen.getByRole('banner')
    for (const link of within(header).getAllByRole('link')) {
      expect(link.getAttribute('href')).toMatch(/^\/learn/)
    }
  })

  it('profile menu shows the signed-in identity and the account actions', async () => {
    session('someone.else@example.com', 'practitioner', 'u-demo', 'Priya Nair')
    window.localStorage.setItem(
      'nff.session',
      JSON.stringify({
        token: 't',
        user: { id: 'u-demo', name: 'Maya Patel', email: 'practitioner@nff.demo', role: 'practitioner', verified: true },
      }),
    )
    shell()
    await userEvent.click(screen.getByRole('button', { name: /Account menu for Maya Patel/ }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('Maya Patel')).toBeInTheDocument()
    expect(within(menu).getByText('practitioner@nff.demo')).toBeInTheDocument()
    const links = within(menu).getAllByRole('menuitem').map((item) => item.getAttribute('href') ?? item.textContent)
    expect(links).toEqual([
      '/account/profile',
      '/account/preferences',
      '/account/email',
      '/account/privacy',
      '/learn/support',
      'Log out',
    ])
  })

  it('log out clears the session and lands on the login page, not the marketing site', async () => {
    session('practitioner@nff.demo', 'practitioner', 'u-demo', 'Maya Patel')
    shell()
    await userEvent.click(screen.getByRole('button', { name: /Account menu/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Log out' }))
    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument()
    expect(window.localStorage.getItem('nff.session')).toBeNull()
  })

  it('Escape closes the profile menu and returns focus to the trigger', async () => {
    session('practitioner@nff.demo', 'practitioner', 'u-demo', 'Maya Patel')
    shell()
    const trigger = screen.getByRole('button', { name: /Account menu/ })
    await userEvent.click(trigger)
    await screen.findByRole('menu')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('mobile sheet lists all five destinations and closes with Escape', async () => {
    session('practitioner@nff.demo', 'practitioner', 'u-demo', 'Maya Patel')
    shell()
    const open = screen.getByRole('button', { name: 'Open menu' })
    await userEvent.click(open)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getAllByRole('link').map((l) => l.textContent).filter((t) => t && t !== 'Meadow')).toEqual(
      LEARN_NAV.map((item) => item.label),
    )
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(open).toHaveFocus()
  })

  it('shows the preview indicator to staff only, and offers a way back to the CMS', async () => {
    session('editor@nff.demo', 'editor', 'u-editor', 'Rowan Ellis')
    const { unmount } = shell()
    expect(screen.getByRole('status')).toHaveTextContent('Preview mode')
    await userEvent.click(screen.getByRole('button', { name: /Account menu/ }))
    expect(await screen.findByRole('menuitem', { name: 'Back to CMS' })).toHaveAttribute('href', '/cms')
    unmount()

    window.localStorage.clear()
    session('practitioner@nff.demo', 'practitioner', 'u-demo', 'Maya Patel')
    shell()
    expect(screen.queryByText(/Preview mode/)).not.toBeInTheDocument()
  })
})
