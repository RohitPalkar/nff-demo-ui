import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { CmsLayout } from '@/app/layouts/CmsLayout'
import { RequireAuth } from '@/app/RequireAuth'
import { RequireCmsAccess } from '@/app/RequirePermission'
import { cmsRoutes } from '@/app/cmsRoutes'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { CMS_ROUTES } from '@/services/rbac/navigation'

function signIn(email: string | null) {
  if (!email) return
  localStorage.setItem(
    'nff.session',
    JSON.stringify({ token: 't', user: { id: 'x', name: 'x', email, role: 'visitor', verified: true } }),
  )
}

function Tree() {
  const location = useLocation()
  const element = useRoutes([
    {
      path: '/cms',
      element: (
        <RequireAuth>
          <RequireCmsAccess>
            <CmsLayout />
          </RequireCmsAccess>
        </RequireAuth>
      ),
      children: cmsRoutes,
    },
    { path: '/login', element: <p>Sign in page</p> },
    { path: '/403', element: <p>Forbidden page</p> },
  ])
  return (
    <>
      {element}
      <output data-testid="where">{location.pathname}</output>
    </>
  )
}

function open(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={[url]}>
          <Tree />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
  return { path: () => screen.getByTestId('where').textContent }
}

// Radix's slider (Score settings) measures itself.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const DENIED = /You do not have access to this section/
const navLabels = () =>
  within(screen.getByRole('navigation', { name: 'Admin' }))
    .getAllByRole('link')
    .map((link) => link.textContent)

beforeEach(() => {
  cleanup()
  localStorage.clear()
})

describe('/cms route enforcement', () => {
  it('sends a missing session to sign in, keeping the return path', async () => {
    const router = open('/cms/users')
    expect(await screen.findByText('Sign in page')).toBeInTheDocument()
    expect(router.path()).toBe('/login')
  })

  it('sends a Practitioner to the 403 page for /cms and every deep link', async () => {
    signIn('practitioner@nff.demo')
    for (const url of ['/cms', '/cms/explorations', '/cms/users']) {
      cleanup()
      open(url)
      expect(await screen.findByText('Forbidden page')).toBeInTheDocument()
    }
  })

  it('denies an Editor every section it has no permission for, by direct URL, in place', async () => {
    signIn('editor@nff.demo')
    for (const url of [
      '/cms/users',
      '/cms/users/u-demo',
      '/cms/analytics/visitors',
      '/cms/analytics/engagement',
      '/cms/settings/score',
      '/cms/roles',
      '/cms/campaigns',
      '/cms/templates',
      '/cms/delivery',
    ]) {
      cleanup()
      const router = open(url)
      expect(await screen.findByRole('alert'), url).toHaveTextContent(DENIED)
      // The URL is kept (no silent redirect) and the explanation names the role.
      expect(router.path()).toBe(url)
      expect(screen.getByRole('alert')).toHaveTextContent('Editor')
      expect(screen.getByRole('link', { name: 'Back to the dashboard' })).toHaveAttribute('href', '/cms')
    }
  })

  it('lets an Editor into the content sections, and shows only those in the sidebar', async () => {
    signIn('editor@nff.demo')
    open('/cms/curriculum')
    expect(await screen.findByRole('heading', { name: 'Curriculum' })).toBeInTheDocument()
    expect(screen.queryByText(DENIED)).not.toBeInTheDocument()
    expect(navLabels()).toEqual(['Dashboard', 'Explorations', 'Meditations', 'Curriculum', 'Review Queue'])
  })

  it('shows an Editor the curriculum read-only', async () => {
    signIn('editor@nff.demo')
    open('/cms/curriculum')
    expect(await screen.findByText(/Changing it needs an admin/)).toBeInTheDocument()
    // A role sees only what it can do: no Add stage button at all.
    expect(screen.queryByRole('button', { name: /Add stage/ })).not.toBeInTheDocument()
  })

  it('denies a Campaign manager content administration, and shows only campaign sections', async () => {
    signIn('campaign@nff.demo')
    for (const url of ['/cms/explorations', '/cms/meditations/med-1', '/cms/publishing', '/cms/curriculum', '/cms/users']) {
      cleanup()
      open(url)
      expect(await screen.findByRole('alert'), url).toHaveTextContent(DENIED)
    }
    cleanup()
    open('/cms/campaigns')
    expect(await screen.findByRole('heading', { name: /Campaigns/ })).toBeInTheDocument()
    expect(screen.queryByText(DENIED)).not.toBeInTheDocument()
    expect(navLabels()).toEqual(['Dashboard', 'Campaigns', 'Templates', 'Delivery'])
  })

  it('lets an Admin into the operational sections', async () => {
    signIn('ops.admin@nff.demo')
    open('/cms/users')
    expect(await screen.findByRole('heading', { name: 'Practitioners' })).toBeInTheDocument()
    expect(screen.queryByText(DENIED)).not.toBeInTheDocument()
    for (const label of ['Review Queue', 'Practitioners', 'Visitors', 'Engagement', 'Team & Roles', 'Campaigns']) {
      expect(navLabels()).toContain(label)
    }
    // Score configuration is Super admin only until a scoring engine exists.
    expect(navLabels()).not.toContain('Score Settings')
  })

  it('denies an Admin the score settings by direct URL, and lets a Super admin in', async () => {
    signIn('ops.admin@nff.demo')
    open('/cms/settings/score')
    expect(await screen.findByRole('alert')).toHaveTextContent(DENIED)
    cleanup()
    signIn('admin@nff.demo')
    open('/cms/settings/score')
    expect(await screen.findByRole('heading', { name: 'Score Settings' })).toBeInTheDocument()
  })

  it('lets a Super admin into every registered section', async () => {
    signIn('admin@nff.demo')
    open('/cms/roles')
    expect(await screen.findByRole('heading', { name: 'Team & Roles' })).toBeInTheDocument()
    expect(navLabels()).toHaveLength(CMS_ROUTES.filter((route) => 'nav' in route).length)
  })

  it('names Admin and Super admin differently in the user menu', async () => {
    const user = userEvent.setup()
    signIn('ops.admin@nff.demo')
    open('/cms')
    await user.click((await screen.findAllByRole('button', { name: /^Account menu for/ }))[0]!)
    expect(await screen.findByText('Admin', { selector: 'span.font-normal' })).toBeInTheDocument()
    cleanup()
    signIn('admin@nff.demo')
    open('/cms')
    await user.click((await screen.findAllByRole('button', { name: /^Account menu for/ }))[0]!)
    expect(await screen.findByText('Super admin', { selector: 'span.font-normal' })).toBeInTheDocument()
  })
})
