import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SOW_SCOPE } from '@/config/sowScope'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatDate } from '@/lib/format'
import { cancelDeletion, getDeletion } from '@/services/account'

// Same names as the account menu, so each place reads the same.
const TABS = [
  { label: 'My Profile', to: '/account/profile' },
  // Not in SOW v1.3 (see config/sowScope.ts).
  ...(SOW_SCOPE.playbackPreferences
    ? [{ label: 'Preferences', to: '/account/preferences' }]
    : []),
  { label: 'Email Preferences', to: '/account/email' },
  { label: 'Privacy & Security', to: '/account/privacy' },
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
        <p className="max-w-2xl nff-body-lg text-nff-text-secondary">
          Your profile and settings. In this demo they are saved in this browser.
        </p>
      </header>

      <nav aria-label="Account" className="border-b">
        <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                className={({ isActive }) =>
                  `-mb-px inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-3 nff-label-md transition-colors nff-focus-ring sm:px-4 ${
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

      <div>
        <Outlet context={{ deletion, onDeletionChange: setDeletion }} />
      </div>
    </div>
  )
}
