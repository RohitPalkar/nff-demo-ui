import { useQueryClient } from '@tanstack/react-query'
import { FlaskConical } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  getScenario,
  scenarioOptions,
  setScenario,
  subscribeScenario,
} from '@/mocks/scenario'
import type { Role, Scenario } from '@/types'

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: 'visitor', label: 'Visitor' },
  { value: 'practitioner', label: 'Practitioner' },
  { value: 'editor', label: 'Editor' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'admin', label: 'Admin' },
]

export function DevScenarioPanel() {
  const queryClient = useQueryClient()
  const { user, switchRole } = useAuth()
  const scenario = useSyncExternalStore(
    subscribeScenario,
    getScenario,
    () => 'default' as Scenario,
  )

  if (!import.meta.env.DEV) return null

  return (
    <aside
      aria-label="Demo controls"
      className="fixed bottom-4 left-4 z-50 hidden w-60 flex-col gap-3 rounded-lg border bg-popover p-3 shadow-nff-2 md:flex"
    >
      <div className="flex items-center gap-2">
        <FlaskConical aria-hidden="true" className="size-4 text-nff-icon-brand" />
        <h2 className="nff-label-md text-foreground">Demo controls</h2>
        <span className="ml-auto rounded-full bg-nff-bg-warning-subtle px-2 py-0.5 nff-label-sm text-nff-text-warning">
          Dev
        </span>
      </div>

      <label className="flex flex-col gap-1">
        <span className="nff-label-sm text-muted-foreground">Scenario</span>
        <select
          value={scenario}
          onChange={(event) => {
            setScenario(event.target.value as Scenario)
            void queryClient.invalidateQueries()
          }}
          className="h-9 rounded-md border border-input bg-background px-2 nff-body-sm text-foreground nff-focus-ring"
        >
          {scenarioOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="nff-label-sm text-muted-foreground">Role</span>
        <select
          value={user?.role ?? 'visitor'}
          onChange={(event) => switchRole(event.target.value as Role)}
          className="h-9 rounded-md border border-input bg-background px-2 nff-body-sm text-foreground nff-focus-ring"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </aside>
  )
}
