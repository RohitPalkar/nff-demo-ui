import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatDate } from '@/lib/format'
import { cancelDeletion, getDeletion } from '@/services/account'

const TABS = [
  { label: 'Profile', to: '/account/profile' },
  { label: 'Email', to: '/account/email' },
  { label: 'Privacy', to: '/account/privacy' },
]

export function AccountLayout() {
  const { user } = useAuth()
  const [deletion, setDeletion] = useState(() =>
    user ? getDeletion(user.id) : null,
  )

  return (
    <div className="nff-content flex flex-col gap-6 py-8 md:py-12">
      {deletion && user && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-nff-border-warning bg-nff-bg-warning-subtle p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="nff-body-md text-nff-text-warning">
            Your account is scheduled for deletion on{' '}
            <strong>{formatDate(deletion.scheduledFor)}</strong>.
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-11 bg-nff-bg-surface"
            onClick={() => {
              cancelDeletion(user.id)
              setDeletion(null)
              toast.success('Deletion cancelled. Your account stays as it is.')
            }}
          >
            Cancel deletion
          </Button>
        </div>
      )}

      <header className="flex flex-col gap-2">
        <h1 className="nff-heading-h1">Account settings</h1>
      </header>

      <nav aria-label="Account" className="border-b">
        <ul className="flex gap-1">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                className={({ isActive }) =>
                  `inline-flex min-h-11 items-center border-b-2 px-4 nff-label-md nff-focus-ring ${
                    isActive
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="max-w-2xl">
        <Outlet context={{ deletion, onDeletionChange: setDeletion }} />
      </div>
    </div>
  )
}
