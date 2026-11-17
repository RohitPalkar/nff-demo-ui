import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { CmsOverviewPage } from '@/pages/cms/CmsOverviewPage'
import { DeliveryPage } from '@/pages/cms/DeliveryPage'
import { EngagementDashboardPage } from '@/pages/cms/EngagementDashboardPage'
import { PublishingPage } from '@/pages/cms/PublishingPage'
import { RolesPage } from '@/pages/cms/RolesPage'
import { createCmsItem, getCmsItem, saveCmsItem, setCmsStatus } from '@/services/cms'
import { ExplorationEditorPage } from '@/pages/cms/ExplorationEditorPage'
import { ScoreSettingsPage } from '@/pages/cms/ScoreSettingsPage'
import { VisitorDashboardPage } from '@/pages/cms/VisitorDashboardPage'

const EMAIL = {
  editor: 'editor@nff.demo',
  campaign: 'campaign@nff.demo',
  admin: 'ops.admin@nff.demo',
  superAdmin: 'admin@nff.demo',
}

function renderPage(page: ReactElement, email: string) {
  localStorage.setItem(
    'nff.session',
    JSON.stringify({ token: 't', user: { id: 'x', name: 'x', email, role: 'visitor', verified: true } }),
  )
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter>{page}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

const T = { timeout: 5000 }

// Radix's slider (Score settings) measures itself.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  cleanup()
  localStorage.clear()
})

describe('data-source labels', () => {
  it('Visitors does not claim GA4 or consent measurement, and labels everything simulated or demo', async () => {
    const { container } = renderPage(<VisitorDashboardPage />, EMAIL.superAdmin)
    expect(await screen.findByText(/Visitor analytics are not connected/, {}, T)).toBeInTheDocument()
    expect(screen.queryByText(/GA4/)).not.toBeInTheDocument()
    expect(screen.queryByText(/accepted analytics cookies/)).not.toBeInTheDocument()
    expect(screen.getAllByText('Simulated').length).toBeGreaterThan(3)
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0)
    expect(container.querySelector('[data-source="live"]')).toBeNull()
  })

  it('Engagement labels seeded figures as demo, invented ones as simulated, and claims no rollup', async () => {
    const { container } = renderPage(<EngagementDashboardPage />, EMAIL.superAdmin)
    expect(await screen.findByText(/not aggregated here/, {}, T)).toBeInTheDocument()
    expect(screen.queryByText(/Rolled up nightly/)).not.toBeInTheDocument()
    expect(screen.getAllByText('Demo data').length).toBeGreaterThan(3)
    expect(screen.getAllByText('Simulated').length).toBeGreaterThan(1)
    expect(container.querySelector('[data-source="live"]')).toBeNull()
  })

  it('Score settings says nothing recalculates scores and shows relevant demo change history', async () => {
    renderPage(<ScoreSettingsPage />, EMAIL.superAdmin)
    expect(await screen.findByText(/nothing calculates engagement scores from them/, {}, T)).toBeInTheDocument()
    expect(screen.queryByText(/recalculate this weekend/i)).not.toBeInTheDocument()
    expect(screen.getAllByText('Weighting updated')).toHaveLength(3)
    expect(screen.getByText('3 entries')).toBeInTheDocument()
    expect(screen.getAllByText('Saved by Adeola Bankole')).toHaveLength(3)
  })

  it('Overview shows no value for an engagement trend it cannot measure, and labels seeded counts as demo', async () => {
    const { container } = renderPage(<CmsOverviewPage />, EMAIL.admin)
    const card = (await screen.findByText('Engagement trend', {}, T)).closest('div')!
    expect(within(card).getByText('—')).toBeInTheDocument()
    expect(within(card).getByText('Unavailable')).toBeInTheDocument()
    expect(screen.queryByText('+4.2%')).not.toBeInTheDocument()
    expect(screen.getAllByText('Demo data').length).toBeGreaterThan(1)
    expect(container.querySelector('[data-source="live"]')).toBeNull()
  })
})

describe('page behaviour follows permissions', () => {
  it('Overview for a Campaign manager asks for no content and shows campaign cards', async () => {
    renderPage(<CmsOverviewPage />, EMAIL.campaign)
    expect(await screen.findByText('Next send', {}, T)).toBeInTheDocument()
    expect(screen.queryByText('My tasks')).not.toBeInTheDocument()
    expect(screen.queryByText('Recent activity')).not.toBeInTheDocument()
  })

  it('Publishing: an Editor can follow status but cannot act; an Admin decides, and sending back needs feedback', async () => {
    const user = userEvent.setup()
    // The Editor sees their own items only: create one in review as them.
    const own = createCmsItem('exploration', { id: 'u-editor', role: 'editor' })
    setCmsStatus(own.id, 'in_review', {}, { id: 'u-editor', role: 'editor' })
    renderPage(<PublishingPage />, EMAIL.editor)
    expect(await screen.findByText(/done by an admin/, {}, T)).toBeInTheDocument()
    await user.click((await screen.findAllByRole('button', { name: /^Review / }))[0]!)
    expect(await screen.findByText(/Approving, scheduling and sending back are done by an admin/)).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Approve and publish/ })).not.toBeInTheDocument()

    cleanup()
    renderPage(<PublishingPage />, EMAIL.admin)
    await screen.findByRole('heading', { name: 'Review Queue' }, T)
    expect(screen.queryByText(/done by an admin/)).not.toBeInTheDocument()
    await user.click((await screen.findAllByRole('button', { name: /^Review / }))[0]!)
    const decision = await screen.findByRole('radiogroup')
    await user.click(within(decision).getByRole('radio', { name: /Send back/ }))
    const send = screen.getByRole('button', { name: 'Send back to author' })
    expect(send).toBeDisabled()
    await user.type(screen.getByLabelText('Feedback for the author'), 'Please tighten the opening.')
    expect(send).toBeEnabled()
  })

  it('Publishing: each row says plainly whether it is ready, instead of three stacked checks', async () => {
    renderPage(<PublishingPage />, EMAIL.admin)
    const table = await screen.findByRole('table', { name: 'Review queue' }, T)
    const badges = within(table).getAllByText(/^(Ready to publish|Needs .+)$/)
    expect(badges.length).toBeGreaterThan(0)
    expect(within(table).queryByText('Audio ready')).not.toBeInTheDocument()
  })

  it('Team: an Admin edits Editors through a dialog, and only views Admins and Super admins', async () => {
    const user = userEvent.setup()
    renderPage(<RolesPage />, EMAIL.admin)
    await user.click(await screen.findByRole('button', { name: 'Edit Rowan Ellis' }, T))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('combobox', { name: 'Role for Rowan Ellis' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('button', { name: 'Edit Adeola Bankole' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'View Adeola Bankole' }))
    const view = await screen.findByRole('dialog')
    expect(within(view).queryByRole('combobox')).not.toBeInTheDocument()
    expect(within(view).getByText(/Only a Super admin can change an Admin or a Super admin/)).toBeInTheDocument()
    expect(within(view).getByRole('button', { name: /Deactivate/ })).toBeDisabled()
    await user.click(within(view).getAllByRole('button', { name: 'Close' })[0]!)
    expect(await screen.findByRole('button', { name: 'View Imani Okafor' })).toBeInTheDocument()

    cleanup()
    renderPage(<RolesPage />, EMAIL.superAdmin)
    expect(await screen.findByRole('button', { name: 'Edit Imani Okafor' }, T)).toBeInTheDocument()
    // The only Super admin is you: deactivating yourself is refused.
    await user.click(screen.getByRole('button', { name: 'Edit Adeola Bankole' }))
    expect(within(await screen.findByRole('dialog')).getByRole('button', { name: /Deactivate/ })).toBeDisabled()
  })

  it('Roles: the comparison is read from the registry, with Admin and Super admin as separate columns', async () => {
    const user = userEvent.setup()
    renderPage(<RolesPage />, EMAIL.superAdmin)
    await user.click(await screen.findByRole('tab', { name: 'Roles & permissions' }, T))
    const table = await screen.findByRole('table', { name: 'Permissions by role' })
    const headers = within(table).getAllByRole('columnheader').map((header) => header.textContent)
    expect(headers.some((text) => text?.startsWith('Admin'))).toBe(true)
    expect(headers.some((text) => text?.startsWith('Super admin'))).toBe(true)
    expect(within(table).getByRole('checkbox', { name: 'Edit role permissions, Super admin' })).toBeChecked()
  })

  it('Delivery: recipients are hidden for a Campaign manager and shown to an Admin', async () => {
    renderPage(<DeliveryPage />, EMAIL.campaign)
    const row = (await screen.findAllByText('Hidden', {}, T))[0]!.closest('tr')!
    expect(row.textContent).not.toMatch(/@/)

    cleanup()
    renderPage(<DeliveryPage />, EMAIL.admin)
    const cell = (await screen.findAllByText(/@/, {}, T))[0]!
    expect(cell.textContent).toMatch(/@/)
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
  })
})

describe('pending revision warning', () => {
  // The editor uses a router blocker, which needs a data router.
  function renderEditor(email: string) {
    localStorage.setItem(
      'nff.session',
      JSON.stringify({ token: 't', user: { id: 'x', name: 'x', email, role: 'visitor', verified: true } }),
    )
    const router = createMemoryRouter(
      [{ path: '/cms/explorations/:id', element: <ExplorationEditorPage /> }],
      { initialEntries: ['/cms/explorations/exp-1'] },
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>,
    )
  }

  it('shows an Admin the warning with an inspector, and an Editor the revision notice instead', async () => {
    const editorActor = { id: 'u-editor', role: 'editor' } as const
    const working = (await getCmsItem('exp-1', editorActor))!
    saveCmsItem({ ...working, title: 'A proposed title' }, editorActor)

    renderEditor(EMAIL.admin)
    const warning = await screen.findByText('This live item has a pending revision', {}, T)
    expect(warning.closest('[role=alert]')).toHaveTextContent('Title')
    await userEvent.setup().click(screen.getByText('Inspect the pending revision'))
    expect(await screen.findByText(/A proposed title/)).toBeInTheDocument()
    expect(screen.getByText(/Live now:/)).toBeInTheDocument()
    expect(screen.queryByText(/Your edits are saved as a draft revision/)).not.toBeInTheDocument()

    cleanup()
    renderEditor(EMAIL.editor)
    expect(await screen.findByText(/You have a draft revision/, {}, T)).toBeInTheDocument()
    expect(screen.queryByText('This live item has a pending revision')).not.toBeInTheDocument()
  }, 15_000)
})
