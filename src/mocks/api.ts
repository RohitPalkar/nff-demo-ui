import type { Scenario } from '@/types'
import { getScenario } from './scenario'

const LATENCY_MIN_MS = 300
const LATENCY_MAX_MS = 800
const SLOW_LATENCY_MS = 2_400

export class ApiError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 500) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function latencyFor(scenario: Scenario) {
  if (scenario === 'slow') return SLOW_LATENCY_MS
  return (
    LATENCY_MIN_MS +
    Math.floor(Math.random() * (LATENCY_MAX_MS - LATENCY_MIN_MS))
  )
}

interface MockApiOptions {
  /** Set false when the endpoint returns a deliberate domain error instead. */
  allowError?: boolean
}

export async function mockApi<T>(
  compute: () => T,
  options: MockApiOptions = {},
): Promise<T> {
  const scenario = getScenario()
  await wait(latencyFor(scenario))

  if (scenario === 'error' && options.allowError !== false) {
    throw new ApiError(
      'server_error',
      'Something went wrong at our end. Please try again.',
    )
  }

  return compute()
}

export function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function storageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore storage failures in the demo.
  }
}

export function storageRemove(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore storage failures in the demo.
  }
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = storageGet(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown) {
  storageSet(key, JSON.stringify(value))
}
