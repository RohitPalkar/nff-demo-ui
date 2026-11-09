import { FLAGS } from '@/config/flags'
import { mockApi, readJson, writeJson } from '@/mocks/api'
import { userById } from '@/mocks/db'
import { getProgress } from '@/services/content'

export interface AccountProfile {
  displayName: string
  timeZone: string
}

export interface EmailPrefs {
  dailyEnabled: boolean
  deliveryHour: string
  types: Record<'daily' | 'milestones' | 'news', boolean>
  unsubscribedAll: boolean
}

export type ExportStatus =
  | { state: 'none' }
  | { state: 'pending'; requestedAt: number }
  | { state: 'ready'; requestedAt: number; expiresAt: number }

export interface DeletionState {
  scheduledFor: string
}

export const TIME_ZONES = [
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
]

const key = (userId: string, name: string) => `nff.account.${userId}.${name}`

export async function getProfile(userId: string): Promise<AccountProfile> {
  return mockApi(
    () =>
      readJson<AccountProfile>(key(userId, 'profile'), {
        displayName: userById.get(userId)?.name ?? '',
        timeZone: 'Europe/London',
      }),
    { allowError: true },
  )
}

export async function saveProfile(userId: string, profile: AccountProfile) {
  return mockApi(() => writeJson(key(userId, 'profile'), profile), {
    allowError: true,
  })
}

const DEFAULT_PREFS: EmailPrefs = {
  dailyEnabled: true,
  deliveryHour: '07:00',
  types: { daily: true, milestones: true, news: false },
  unsubscribedAll: false,
}

export async function getEmailPrefs(userId: string): Promise<EmailPrefs> {
  return mockApi(() => readJson(key(userId, 'email'), DEFAULT_PREFS), {
    allowError: true,
  })
}

export async function saveEmailPrefs(userId: string, prefs: EmailPrefs) {
  return mockApi(() => writeJson(key(userId, 'email'), prefs), {
    allowError: true,
  })
}

export async function unsubscribeWithToken(token: string) {
  return mockApi(
    () => {
      if (!token) throw new Error('This unsubscribe link is not valid.')
      return { unsubscribed: true as const }
    },
    { allowError: false },
  )
}

export function getExportStatus(userId: string): ExportStatus {
  const stored = readJson<ExportStatus>(key(userId, 'export'), { state: 'none' })
  if (stored.state === 'pending' && Date.now() - stored.requestedAt >= 5000) {
    const ready: ExportStatus = {
      state: 'ready',
      requestedAt: stored.requestedAt,
      expiresAt: stored.requestedAt + 7 * 24 * 3600 * 1000,
    }
    writeJson(key(userId, 'export'), ready)
    return ready
  }
  return stored
}

export function requestExport(userId: string): ExportStatus {
  const status: ExportStatus = { state: 'pending', requestedAt: Date.now() }
  writeJson(key(userId, 'export'), status)
  return status
}

export async function buildExportJson(userId: string): Promise<string> {
  const user = userById.get(userId)
  const progress = await getProgress(userId)
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      profile: {
        name: user?.name,
        email: user?.email,
        joinedAt: user?.joinedAt,
      },
      preferences: readJson(key(userId, 'email'), DEFAULT_PREFS),
      progress,
    },
    null,
    2,
  )
}

export function getDeletion(userId: string): DeletionState | null {
  return readJson<DeletionState | null>(key(userId, 'deletion'), null)
}

export async function requestDeletion(userId: string): Promise<DeletionState> {
  return mockApi(
    () => {
      const date = new Date(
        Date.now() + FLAGS.deletionGraceDays * 24 * 3600 * 1000,
      )
      const state = { scheduledFor: date.toISOString() }
      writeJson(key(userId, 'deletion'), state)
      return state
    },
    { allowError: true },
  )
}

export function cancelDeletion(userId: string) {
  writeJson(key(userId, 'deletion'), null)
}
