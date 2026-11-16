import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { RolesPage } from '@/pages/cms/RolesPage'
import { StageSequencePage } from '@/pages/cms/StageSequencePage'
import { MeditationsListPage } from '@/pages/cms/MeditationsListPage'
import { createCmsItem, loadStages } from '@/services/cms'
import { can } from '@/services/rbac/authorize'

const EMAIL = {
  editor: 'editor@nff.demo',
  admin: 'ops.admin@nff.demo',
  superAdmin: 'admin@nff.demo',
}
const T = { timeout: 5000 }

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

function renderAt(path: string, pattern: string, page: ReactElement, email: string) {
  localStorage.setItem(
    'nff.session',
    JSON.stringify({ token: 't', user: { id: 'x', name: 'x', email, role: 'visitor', verified: true } }),
  )
  const router = createMemoryRouter(
    [
      { path: pattern, element: page },
      { path: '*', element: <p>Elsewhere</p> },
    ],
    { initialEntries: [path] },
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

beforeEach(() => {
  cleanup()
  localStorage.clear()
})

describe('role permission editing', () => {
  it('a Super admin grants a permission, its prerequisite comes with it, and saving changes access', async () => {
    const user = userEvent.setup()
    renderAt('/cms/roles', '/cms/roles', <RolesPage />, EMAIL.superAdmin)
    await user.click(await screen.findByRole('tab', { name: 'Roles & permissions' }, T))
    await user.click(screen.getByRole('button', { name: /^Editor/ }))

    const approve = screen.getByRole('switch', { name: 'Approve' })
    expect(approve).not.toBeChecked()
    await user.click(approve)
    expect(approve).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Open the review queue' })).toBeChecked()
    expect(screen.getByText(/Also turned on what it needs: Open the review queue/)).toBeInTheDocument()
    // Fixed permissions cannot be switched.
    expect(screen.getByRole('switch', { name: 'Open the Admin' })).toBeDisabled()

    // Nothing changes until it is reviewed and saved.
    expect(can({ id: 'u-editor', role: 'editor' }, 'content.approve')).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Review and save' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Approve')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(can({ id: 'u-editor', role: 'editor' }, 'content.approve')).toBe(true)
    expect(await screen.findByRole('button', { name: 'Reset to defaults' })).toBeInTheDocument()

    // Resetting asks first (WCAG 3.3.6): nothing changes until it is confirmed.
    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }))
    const confirm = await screen.findByRole('alertdialog')
    expect(can({ id: 'u-editor', role: 'editor' }, 'content.approve')).toBe(true)
    await user.click(within(confirm).getByRole('button', { name: 'Reset to defaults' }))
    expect(can({ id: 'u-editor', role: 'editor' }, 'content.approve')).toBe(false)
  })

  it('the Super admin role itself is fixed', async () => {
    const user = userEvent.setup()
    renderAt('/cms/roles', '/cms/roles', <RolesPage />, EMAIL.superAdmin)
    await user.click(await screen.findByRole('tab', { name: 'Roles & permissions' }, T))
    await user.click(screen.getByRole('button', { name: /^Super admin/ }))
    expect(screen.getByText(/always holds every permission/)).toBeInTheDocument()
    expect(screen.getAllByRole('switch').every((element) => element.hasAttribute('disabled'))).toBe(true)
  })

  it('an Admin sees every role read-only', async () => {
    const user = userEvent.setup()
    renderAt('/cms/roles', '/cms/roles', <RolesPage />, EMAIL.admin)
    await user.click(await screen.findByRole('tab', { name: 'Roles & permissions' }, T))
    expect(screen.getAllByText(/Only a Super admin can change what roles can do/).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('switch').every((element) => element.hasAttribute('disabled'))).toBe(true)
    expect(screen.queryByRole('button', { name: 'Review and save' })).not.toBeInTheDocument()
  })
})

describe('adding content to a stage', () => {
  const stage = () => loadStages()[0]!

  it('lists every item by title (untitled drafts included) and adds several at once', async () => {
    const user = userEvent.setup()
    createCmsItem('exploration', { id: 'u-ops', role: 'admin' })
    const before = stage().itemIds.length
    renderAt(`/cms/curriculum/stages/${stage().id}`, '/cms/curriculum/stages/:stageId', <StageSequencePage />, EMAIL.admin)
    await user.click(await screen.findByRole('button', { name: 'Add content' }, T))
    const dialog = await screen.findByRole('dialog')
    const list = within(dialog).getByRole('list', { name: 'Content' })
    // The old picker showed bare icons for items without a title.
    expect(within(list).getAllByText('Untitled exploration').length).toBeGreaterThan(0)
    // Items already in the stage are ticked and cannot be picked again.
    const already = within(list).getAllByRole('checkbox').filter((box) => box.hasAttribute('disabled'))
    expect(already).toHaveLength(before)

    await user.click(within(dialog).getByRole('button', { name: /^Meditations/ }))
    const open = within(list).getAllByRole('checkbox').filter((box) => !box.hasAttribute('disabled'))
    await user.click(open[0]!)
    await user.click(open[1]!)
    await user.click(within(dialog).getByRole('button', { name: 'Add 2 items' }))

    expect(screen.getByRole('heading', { name: /Sequence/ })).toHaveTextContent(`${before + 2} items`)
    await user.click(screen.getByRole('button', { name: 'Save stage' }))
    expect(stage().itemIds).toHaveLength(before + 2)
  })

  it('creates a new exploration from the picker, straight into the stage', async () => {
    const user = userEvent.setup()
    const before = stage().itemIds.length
    renderAt(`/cms/curriculum/stages/${stage().id}`, '/cms/curriculum/stages/:stageId', <StageSequencePage />, EMAIL.admin)
    await user.click(await screen.findByRole('button', { name: 'Add content' }, T))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('tab', { name: 'Create new' }))
    await user.type(within(dialog).getByLabelText('Title'), 'Beginning again')
    await user.click(within(dialog).getByRole('button', { name: 'Create and add' }))

    expect(await screen.findByRole('link', { name: 'Beginning again' }, T)).toBeInTheDocument()
    // Saved straight away, so the draft is never orphaned.
    expect(stage().itemIds).toHaveLength(before + 1)
  })

  it('an Editor sees the stage read-only, with no way to add', async () => {
    renderAt(`/cms/curriculum/stages/${stage().id}`, '/cms/curriculum/stages/:stageId', <StageSequencePage />, EMAIL.editor)
    expect(await screen.findByText(/Changing the curriculum needs an admin/, {}, T)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add content' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('switch')[0]).toBeDisabled()
  })
})

describe('audio lock in the Meditations list', () => {
  it('an Admin toggles a track between free preview and locked', async () => {
    const user = userEvent.setup()
    renderAt('/cms/meditations', '/cms/meditations', <MeditationsListPage />, EMAIL.admin)
    const free = await screen.findAllByRole('button', { name: /: Free preview\. Lock to members$/ }, T)
    const title = free[0]!.getAttribute('aria-label')!.split(': Free preview')[0]!
    await user.click(free[0]!)
    const locked = await screen.findByRole('button', { name: `${title}: Locked. Make a free preview` }, T)
    expect(locked).toHaveAttribute('aria-pressed', 'false')
  })

  it('an Editor sees the lock state but cannot change it', async () => {
    renderAt('/cms/meditations', '/cms/meditations', <MeditationsListPage />, EMAIL.editor)
    await screen.findByRole('heading', { name: 'Meditations' }, T)
    expect(screen.queryByRole('button', { name: /Lock to members$|Make a free preview$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Access' })).not.toBeInTheDocument()
  })
})
