import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter, useLocation, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AdminLayout } from '@/components/admin/AdminLayout'
import {
  AccessDeniedState,
  AdminPageHeader,
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  FormField,
  InlineNotice,
  LoadingState,
  SortableHead,
  StatusBadge,
} from '@/components/admin'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableRow } from '@/components/ui/table'
import { RequireAuth } from '@/app/RequireAuth'
import { RequireCmsAccess } from '@/app/RequirePermission'
import { cmsRoutes } from '@/app/cmsRoutes'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { Inbox } from 'lucide-react'

const EMAIL = {
  editor: 'editor@nff.demo',
  campaign: 'campaign@nff.demo',
  admin: 'ops.admin@nff.demo',
  superAdmin: 'admin@nff.demo',
}

function Tree() {
  const location = useLocation()
  const element = useRoutes([
    {
      path: '/cms',
      element: (
        <RequireAuth>
          <RequireCmsAccess>
            <AdminLayout />
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

function open(email: string | null, url = '/cms') {
  if (email) {
    localStorage.setItem(
      'nff.session',
      JSON.stringify({ token: 't', user: { id: 'x', name: 'x', email, role: 'visitor', verified: true } }),
    )
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={[url]}>
          <Tree />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

const sidebar = () => screen.getByRole('navigation', { name: 'Admin' })
const groupHeadings = () => within(sidebar()).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
const current = () => within(sidebar()).getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page')

beforeEach(() => {
  cleanup()
  localStorage.clear()
  delete document.body.dataset.surface
})

describe('Admin shell', () => {
  it('renders landmarks: skip link, sidebar, breadcrumb, main', async () => {
    open(EMAIL.superAdmin)
    expect(await screen.findByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#admin-main')
    expect(screen.getByRole('complementary', { name: 'Admin sidebar' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'admin-main')
  })

  it('marks the page with the Admin surface while mounted, and clears it after', async () => {
    const { unmount } = open(EMAIL.editor)
    await screen.findByRole('main')
    expect(document.body.dataset.surface).toBe('cms')
    unmount()
    expect(document.body.dataset.surface).toBeUndefined()
  })

  it('sets the document title from the route', async () => {
    open(EMAIL.editor, '/cms/curriculum')
    await screen.findByRole('heading', { name: 'Curriculum' })
    expect(document.title).toBe('Curriculum · Meadow Admin')
  })

  it('Editor: grouped navigation with only authorised destinations', async () => {
    open(EMAIL.editor)
    await screen.findByRole('main')
    expect(groupHeadings()).toEqual(['Overview', 'Content', 'Learning', 'Publishing'])
    expect(within(sidebar()).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Dashboard', 'Explorations', 'Meditations', 'Curriculum', 'Review Queue',
    ])
  })

  it('Campaign manager: Overview and Campaigns only', async () => {
    open(EMAIL.campaign)
    await screen.findByRole('main')
    expect(groupHeadings()).toEqual(['Overview', 'Campaigns'])
  })

  it('Admin: People and Insights, no Settings', async () => {
    open(EMAIL.admin)
    await screen.findByRole('main')
    expect(groupHeadings()).toEqual(['Overview', 'Content', 'Learning', 'Publishing', 'People', 'Insights', 'Campaigns'])
    expect(within(sidebar()).queryByRole('link', { name: 'Score Settings' })).not.toBeInTheDocument()
  })

  it('Super admin: Settings with Score Settings', async () => {
    open(EMAIL.superAdmin)
    await screen.findByRole('main')
    expect(groupHeadings().at(-1)).toBe('Settings')
    expect(within(sidebar()).getByRole('link', { name: 'Score Settings' })).toBeInTheDocument()
  })

  it('does not link modules that do not exist', async () => {
    open(EMAIL.superAdmin)
    await screen.findByRole('main')
    for (const name of ['Media Library', 'Learning Paths', 'Assignments', 'Groups', 'Audit Log', 'Platform Settings']) {
      expect(within(sidebar()).queryByRole('link', { name })).not.toBeInTheDocument()
    }
  })
})

describe('active navigation state', () => {
  it('marks the current section with aria-current', async () => {
    open(EMAIL.admin, '/cms/publishing')
    await screen.findByRole('main')
    expect(current().map((link) => link.textContent)).toEqual(['Review Queue'])
  })

  it('keeps the parent section active on a detail route, and only the dashboard on /cms', async () => {
    open(EMAIL.admin, '/cms/users/u-demo')
    await screen.findByRole('main')
    expect(current().map((link) => link.textContent)).toEqual(['Practitioners'])
    cleanup()
    open(EMAIL.admin, '/cms')
    await screen.findByRole('main')
    expect(current().map((link) => link.textContent)).toEqual(['Dashboard'])
  })

  it('follows navigation by link', async () => {
    const user = userEvent.setup()
    open(EMAIL.editor, '/cms')
    await screen.findByRole('main')
    await user.click(within(sidebar()).getByRole('link', { name: 'Meditations' }))
    expect(screen.getByTestId('where')).toHaveTextContent('/cms/meditations')
    expect(current().map((link) => link.textContent)).toEqual(['Meditations'])
  })
})

describe('breadcrumbs', () => {
  it('show group, parent and page from the registry, with the page as current', async () => {
    open(EMAIL.admin, '/cms/users/u-demo')
    await screen.findByRole('main')
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(trail).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['People', 'Practitioners', 'Practitioner'])
    expect(within(trail).getByRole('link', { name: 'Practitioners' })).toHaveAttribute('href', '/cms/users')
    expect(within(trail).getByText('Practitioner')).toHaveAttribute('aria-current', 'page')
  })
})

describe('profile menu', () => {
  async function openMenu(email: string) {
    const user = userEvent.setup()
    open(email)
    const trigger = (await screen.findAllByRole('button', { name: /^Account menu for/ }))[0]!
    await user.click(trigger)
    return { user, trigger }
  }

  it('shows the real account: name, email and role', async () => {
    const { trigger } = await openMenu(EMAIL.admin)
    expect(trigger).toHaveAccessibleName('Account menu for Imani Okafor, Admin')
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('ops.admin@nff.demo')).toBeInTheDocument()
    expect(within(menu).getByText('Admin', { selector: 'span' })).toBeInTheDocument()
  })

  it('offers the learner preview to roles that may preview it, and not to a Campaign manager', async () => {
    await openMenu(EMAIL.editor)
    expect(await screen.findByRole('menuitem', { name: 'Preview the learner area' })).toHaveAttribute('href', '/learn')
    cleanup()
    await openMenu(EMAIL.campaign)
    expect(await screen.findByRole('menuitem', { name: 'Public website' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Preview the learner area' })).not.toBeInTheDocument()
  })

  it('logs out: clears the session and returns to sign in', async () => {
    const { user } = await openMenu(EMAIL.editor)
    await user.click(await screen.findByRole('menuitem', { name: 'Log out' }))
    expect(await screen.findByText('Sign in page')).toBeInTheDocument()
    expect(localStorage.getItem('nff.session')).toBeNull()
  })

  it('closes with Escape and returns focus to the trigger', async () => {
    const { user, trigger } = await openMenu(EMAIL.editor)
    await screen.findByRole('menu')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})

describe('responsive navigation', () => {
  it('opens a drawer with the same authorised destinations, and closes it on selection', async () => {
    const user = userEvent.setup()
    open(EMAIL.campaign)
    await user.click(await screen.findByRole('button', { name: 'Open navigation menu' }))
    const drawer = await screen.findByRole('dialog')
    const nav = within(drawer).getByRole('navigation', { name: 'Admin (mobile)' })
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(['Dashboard', 'Campaigns', 'Templates', 'Delivery'])
    await user.click(within(nav).getByRole('link', { name: 'Templates' }))
    expect(screen.getByTestId('where')).toHaveTextContent('/cms/templates')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes the drawer with Escape and returns focus to the menu button', async () => {
    const user = userEvent.setup()
    open(EMAIL.editor)
    const button = await screen.findByRole('button', { name: 'Open navigation menu' })
    await user.click(button)
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('collapses the sidebar to icons with accessible names', async () => {
    const user = userEvent.setup()
    open(EMAIL.editor)
    await screen.findByRole('main')
    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    const links = within(sidebar()).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual(['Dashboard', 'Explorations', 'Meditations', 'Curriculum', 'Review Queue'])
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('access and existing routes inside the shell', () => {
  it('shows the Admin access-denied state in place, inside the shell', async () => {
    open(EMAIL.editor, '/cms/users')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('You do not have access to this section')
    expect(alert).toHaveTextContent('Editor')
    expect(screen.getByTestId('where')).toHaveTextContent('/cms/users')
    expect(screen.getByRole('main')).toContainElement(alert)
    expect(within(sidebar()).queryByRole('link', { name: 'Practitioners' })).not.toBeInTheDocument()
  })

  it('keeps existing pages working in the shell', async () => {
    open(EMAIL.superAdmin, '/cms/roles')
    expect(await screen.findByRole('heading', { name: 'Team & Roles' })).toBeInTheDocument()
    cleanup()
    open(EMAIL.admin, '/cms/analytics/visitors')
    expect(await screen.findByRole('heading', { name: 'Visitors' }, { timeout: 4000 })).toBeInTheDocument()
  })

  it('denies a deactivated account: no session, back to sign in', async () => {
    localStorage.setItem('nff.cms.user-status', JSON.stringify({ 'u-editor': 'deactivated' }))
    open(EMAIL.editor)
    expect(await screen.findByText('Sign in page')).toBeInTheDocument()
  })

  it('sends a signed-out visitor to sign in and a Practitioner to 403', async () => {
    open(null)
    expect(await screen.findByText('Sign in page')).toBeInTheDocument()
    cleanup()
    open('practitioner@nff.demo')
    expect(await screen.findByText('Forbidden page')).toBeInTheDocument()
  })
})

describe('design primitives', () => {
  it('StatusBadge shows a word and an icon, never colour alone', () => {
    render(
      <>
        <StatusBadge status="in_review" />
        <StatusBadge status="deactivated" />
        <StatusBadge status="unassigned" />
      </>,
    )
    for (const label of ['In review', 'Deactivated', 'Unassigned']) {
      const badge = screen.getByText(label).closest('span[data-status]')!
      expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('InlineNotice announces warnings and errors, and keeps info quiet', () => {
    render(
      <>
        <InlineNotice tone="warning">Careful</InlineNotice>
        <InlineNotice tone="info">FYI</InlineNotice>
      </>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Careful')
    expect(screen.getByRole('status')).toHaveTextContent('FYI')
  })

  it('Empty, error and loading states are announced correctly', async () => {
    const retries: string[] = []
    render(
      <>
        <EmptyState icon={Inbox} title="Nothing here" description="Add something." />
        <ErrorState onRetry={() => retries.push('x')} />
        <LoadingState label="Loading things" />
      </>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Nothing here')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(retries).toHaveLength(1)
    expect(screen.getByText('Loading things').closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true')
  })

  it('AccessDeniedState names the role and links back', () => {
    render(
      <MemoryRouter>
        <AccessDeniedState roleLabel="Editor" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Your role (Editor)')
    expect(screen.getByRole('link', { name: 'Back to the dashboard' })).toHaveAttribute('href', '/cms')
  })

  it('FormField wires label, helper, error and required state to the control', () => {
    render(
      <FormField label="Title" required helper="Shown in lists." error="Add a title.">
        <Input />
      </FormField>,
    )
    const input = screen.getByRole('textbox', { name: /Title/ })
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.getAttribute('aria-describedby')!.split(' ')).toHaveLength(2)
    expect(screen.getByRole('alert')).toHaveTextContent('Add a title.')
  })

  it('SortableHead states the order and cycles ascending then descending', async () => {
    const calls: Array<[string, string]> = []
    const { rerender } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="Title" sortKey="title" onSort={(key, direction) => calls.push([key, direction])} />
          </TableRow>
        </TableHeader>
      </Table>,
    )
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'none')
    await userEvent.setup().click(screen.getByRole('button'))
    expect(calls).toEqual([['title', 'asc']])
    rerender(
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="Title" sortKey="title" active="title" direction="asc" onSort={(key, direction) => calls.push([key, direction])} />
          </TableRow>
        </TableHeader>
      </Table>,
    )
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'ascending')
    await userEvent.setup().click(screen.getByRole('button'))
    expect(calls.at(-1)).toEqual(['title', 'desc'])
  })

  it('ConfirmationDialog confirms or cancels, and Escape cancels', async () => {
    const user = userEvent.setup()
    const log: string[] = []
    function Host() {
      return (
        <ConfirmationDialog
          open
          onOpenChange={(value) => log.push(`open:${value}`)}
          title="Deactivate?"
          description="They cannot sign in."
          confirmLabel="Deactivate"
          onConfirm={() => log.push('confirm')}
        />
      )
    }
    render(<Host />)
    expect(await screen.findByRole('alertdialog', { name: 'Deactivate?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Deactivate' }))
    expect(log).toContain('confirm')
    await user.keyboard('{Escape}')
    expect(log).toContain('open:false')
  })

  it('ConfirmationDialog returns focus to the button that opened it, and to main if that button is gone', async () => {
    const user = userEvent.setup()
    function Host() {
      const [open, setOpen] = useState(false)
      const [gone, setGone] = useState(false)
      return (
        <main id="admin-main" tabIndex={-1}>
          {!gone && <button onClick={() => setOpen(true)}>Remove</button>}
          <ConfirmationDialog
            open={open}
            onOpenChange={setOpen}
            title="Remove?"
            description="Sure?"
            onConfirm={() => {
              setGone(true)
              setOpen(false)
            }}
          />
        </main>
      )
    }
    const { unmount } = render(<Host />)
    const opener = screen.getByRole('button', { name: 'Remove' })
    await user.click(opener)
    await screen.findByRole('alertdialog')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()

    await user.click(opener)
    await user.click(await screen.findByRole('button', { name: 'Confirm' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveFocus()
    unmount()
  })

  it('AdminPageHeader gives one h1, a description and actions', () => {
    render(<AdminPageHeader title="Explorations" description="Everything you can edit." actions={<button>New</button>} meta={<StatusBadge status="draft" />} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Explorations' })).toBeInTheDocument()
    expect(screen.getByText('Everything you can edit.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument()
  })
})
