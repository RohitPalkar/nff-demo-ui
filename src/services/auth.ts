import {
  ApiError,
  mockApi,
  readJson,
  storageRemove,
  writeJson,
} from '@/mocks/api'
import { addMockUser, demoCode, userByEmail } from '@/mocks/db'
import { effectiveRole, effectiveStatus } from '@/services/rbac/roleResolution'
import type { Role, Session, SessionUser, User } from '@/types'

const SESSION_KEY = 'nff.session'
const PENDING_KEY = 'nff.pending-signup'
const RESEND_KEY = 'nff.resend-at'

const DEMO_PASSWORD = 'practice123'

// `admin@nff.demo` is the designated Super admin (see rbac/roleResolution.ts);
// `ops.admin@nff.demo` is an ordinary Admin.
const ROLE_EMAILS: Record<Exclude<Role, 'visitor'>, string> = {
  practitioner: 'practitioner@nff.demo',
  editor: 'editor@nff.demo',
  campaign: 'campaign@nff.demo',
  admin: 'ops.admin@nff.demo',
  super_admin: 'admin@nff.demo',
}

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    // The role the permission engine uses: legacy records, bootstrap rule and
    // role assignments are resolved in one place.
    role: effectiveRole(user),
    verified: user.verified,
  }
}

function createSession(user: User): Session {
  const session: Session = {
    token: `mock-${user.id}-${Date.now()}`,
    user: toSessionUser(user),
  }
  writeJson(SESSION_KEY, session)
  return session
}

export function getStoredSession(): Session | null {
  const session = readJson<Session | null>(SESSION_KEY, null)
  if (!session) return null
  const user = userByEmail.get(session.user.email.toLowerCase())
  if (!user) return null
  // Deactivated accounts lose their session, whatever is stored in the browser.
  const status = effectiveStatus(user)
  if (status === 'deactivated' || status === 'pending_deletion') return null
  return { ...session, user: toSessionUser(user) }
}

export function clearSession() {
  storageRemove(SESSION_KEY)
}

export async function login(
  email: string,
  password: string,
): Promise<Session> {
  return mockApi(
    () => {
      const normalised = email.trim().toLowerCase()
      if (normalised === 'locked@nff.demo') {
        throw new ApiError(
          'too_many_attempts',
          'Too many attempts. Try again in 15 minutes.',
          429,
        )
      }
      const user = userByEmail.get(normalised)
      if (!user || password.length < 8) {
        throw new ApiError(
          'invalid_credentials',
          'That email and password combination did not work.',
          401,
        )
      }
      if (!user.verified) {
        throw new ApiError(
          'unverified',
          'Please verify your email before signing in.',
          403,
        )
      }
      const status = effectiveStatus(user)
      if (status === 'pending_deletion' || status === 'deactivated') {
        throw new ApiError(
          'account_unavailable',
          'This account is not available. Contact support.',
          403,
        )
      }
      return createSession(user)
    },
    { allowError: false },
  )
}

export interface SignUpInput {
  name: string
  email: string
  password: string
  acceptedTerms: boolean
}

export async function signUp(input: SignUpInput): Promise<{ email: string }> {
  return mockApi(
    () => {
      const email = input.email.trim().toLowerCase()
      if (userByEmail.has(email)) {
        throw new ApiError(
          'email_registered',
          'An account with that email already exists.',
          409,
        )
      }
      if (!input.acceptedTerms) {
        throw new ApiError(
          'terms_required',
          'Please accept the terms and privacy notice.',
          422,
        )
      }
      const first = input.name.trim().split(' ')[0] ?? 'New'
      const user: User = {
        id: `u-signup-${Date.now()}`,
        name: input.name.trim(),
        email,
        role: 'practitioner',
        status: 'unverified',
        verified: false,
        currentStageId: 'stage-1',
        joinedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        engagementScore: 0,
        minutesListened: 0,
      }
      void first
      addMockUser(user)
      writeJson(PENDING_KEY, { email })
      return { email }
    },
    { allowError: true },
  )
}

export async function verifyEmail(code: string): Promise<Session> {
  return mockApi(
    () => {
      const pending = readJson<{ email: string } | null>(PENDING_KEY, null)
      if (!pending) {
        throw new ApiError('no_pending', 'No verification is in progress.', 400)
      }
      if (code.trim() !== demoCode) {
        throw new ApiError(
          'invalid_code',
          'That code is not right. Check your inbox and try again.',
          422,
        )
      }
      const user = userByEmail.get(pending.email)
      if (!user) {
        throw new ApiError('no_pending', 'No verification is in progress.', 400)
      }
      user.verified = true
      user.status = 'active'
      storageRemove(PENDING_KEY)
      return createSession(user)
    },
    { allowError: false },
  )
}

export async function resendVerification(): Promise<{ nextAllowedAt: number }> {
  return mockApi(
    () => {
      const last = readJson<number>(RESEND_KEY, 0)
      const now = Date.now()
      if (now - last < 60_000) {
        throw new ApiError(
          'resend_limit',
          'Please wait a moment before requesting another code.',
          429,
        )
      }
      writeJson(RESEND_KEY, now)
      return { nextAllowedAt: now + 60_000 }
    },
    { allowError: false },
  )
}

export async function requestPasswordReset(
  _email: string,
): Promise<{ sent: true }> {
  return mockApi(
    () => ({ sent: true }),
    { allowError: true },
  )
}

export async function resetPassword(
  code: string,
  _password: string,
): Promise<{ reset: true }> {
  return mockApi(
    () => {
      if (code.trim() !== demoCode) {
        throw new ApiError(
          'expired_code',
          'That code has expired. Request a new one.',
          422,
        )
      }
      return { reset: true as const }
    },
    { allowError: false },
  )
}

export function switchRole(role: Role): Session | null {
  if (role === 'visitor') {
    clearSession()
    return null
  }
  const user = userByEmail.get(ROLE_EMAILS[role])
  if (!user) return null
  return createSession(user)
}

export { DEMO_PASSWORD }
