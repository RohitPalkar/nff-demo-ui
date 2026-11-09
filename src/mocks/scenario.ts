import type { Scenario } from '@/types'

const STORAGE_KEY = 'nff.scenario'

const SCENARIOS: Scenario[] = [
  'default',
  'empty',
  'error',
  'slow',
  'no-featured',
  'locked-stage',
  'token-expired',
  'transcode-failed',
]

function isScenario(value: string | null): value is Scenario {
  return value !== null && (SCENARIOS as string[]).includes(value)
}

function read(): Scenario {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isScenario(stored) ? stored : 'default'
  } catch {
    return 'default'
  }
}

let current: Scenario = typeof window === 'undefined' ? 'default' : read()
const listeners = new Set<() => void>()

export function getScenario(): Scenario {
  return current
}

export function setScenario(next: Scenario) {
  current = next
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // localStorage may be unavailable; in-memory value still applies.
  }
  listeners.forEach((listener) => listener())
}

export function subscribeScenario(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const scenarioOptions = SCENARIOS
