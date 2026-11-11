import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ user: null as unknown }))
vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: () => ({ user: auth.user }) }))

import { RequireCmsAccess, RequireRoutePermission } from './RequirePermission'

function renderGuard(user: unknown) {
  auth.user = user
  render(
    <MemoryRouter initialEntries={['/cms/users']}>
      <Routes>
        <Route
          path="/cms/users"
          element={
            <RequireCmsAccess>
              <RequireRoutePermission route="/cms/users">
                <p>Users page</p>
              </RequireRoutePermission>
            </RequireCmsAccess>
          }
        />
        <Route path="/403" element={<p>Forbidden page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => cleanup())

describe('route guard with arbitrary identities', () => {
  it('denies an unknown role', () => {
    renderGuard({ id: 'u1', role: 'ghost' })
    expect(screen.getByText('Forbidden page')).toBeInTheDocument()
    expect(screen.queryByText('Users page')).not.toBeInTheDocument()
  })

  it('denies a role that merely looks like an object property', () => {
    renderGuard({ id: 'u1', role: 'constructor' })
    expect(screen.getByText('Forbidden page')).toBeInTheDocument()
  })

  it('denies no user and a user without an id', () => {
    renderGuard(null)
    expect(screen.getByText('Forbidden page')).toBeInTheDocument()
    cleanup()
    renderGuard({ id: '', role: 'super_admin' })
    expect(screen.getByText('Forbidden page')).toBeInTheDocument()
  })

  it('shows an in-place denial to staff without the section permission', () => {
    renderGuard({ id: 'u1', role: 'editor' })
    expect(screen.getByRole('alert')).toHaveTextContent('Editor')
    expect(screen.queryByText('Users page')).not.toBeInTheDocument()
  })

  it('renders the page for a role that has the permission', () => {
    renderGuard({ id: 'u1', role: 'admin' })
    expect(screen.getByText('Users page')).toBeInTheDocument()
  })
})
