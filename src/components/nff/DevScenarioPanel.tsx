import { useQueryClient } from '@tanstack/react-query'
import { FlaskConical, X } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
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

const OPEN_KEY = 'nff.dev.controlsOpen'

/** Collapsed by default; remembers if the panel was left open. */
function readOpen() {
  try {
    return localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

export function DevScenarioPanel() {
  const queryClient = useQueryClient()
  const { user, switchRole } = useAuth()
  const scenario = useSyncExternalStore(
    subscribeScenario,
    getScenario,
    () => 'default' as Scenario,
  )

  const [open, setOpen] = useState(readOpen)

  const toggle = (next: boolean) => {
    setOpen(next)
    try {
      localStorage.setItem(OPEN_KEY, next ? '1' : '0')
    } catch {
      // Storage unavailable; the panel just won't remember its state.
    }
  }

  if (!import.meta.env.DEV) return null

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Open demo controls"
        title="Demo controls"
        onClick={() => toggle(true)}
        className="fixed bottom-24 left-4 z-[60] flex size-10 items-center justify-center rounded-full border bg-popover text-nff-icon-brand opacity-60 shadow-nff-2 transition-opacity hover:opacity-100 focus-visible:opacity-100 nff-focus-ring"
      >
        <FlaskConical aria-hidden="true" className="size-5" />
      </button>
    )
  }

  return (
    <aside
      aria-label="Demo controls"
      className="fixed bottom-24 left-4 z-[60] flex w-60 flex-col gap-3 rounded-lg border bg-popover p-3 shadow-nff-2"
    >
      <div className="flex items-center gap-2">
        <FlaskConical aria-hidden="true" className="size-4 text-nff-icon-brand" />
        <h2 className="nff-label-md text-foreground">Demo controls</h2>
        <span className="ml-auto rounded-full bg-nff-bg-warning-subtle px-2 py-0.5 nff-label-sm text-nff-text-warning">
          Dev
        </span>
        <button
          type="button"
          aria-label="Close demo controls"
          onClick={() => toggle(false)}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground nff-focus-ring"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
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
