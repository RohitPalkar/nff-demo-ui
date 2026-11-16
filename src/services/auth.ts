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

/*
 * One-time code sign-in (SOW v1.3 §3.2 #2, #3 and §3.3 #1). The same flow
 * serves practitioners and staff: an email address, then a 6-digit code sent
 * to it. No passwords and no social sign-in. In this demo every code is
 * `demoCode`; the rules are real: a code lasts CODE_TTL_MS, allows
 * MAX_CODE_ATTEMPTS tries, and too many wrong tries lock sign-in for that
 * address for LOCK_MS.
 */
const CHALLENGE_KEY = 'nff.otp-challenge'
const LOCKS_KEY = 'nff.otp-locks'

export const CODE_LENGTH = 6
export const CODE_TTL_MS = 10 * 60_000
export const MAX_CODE_ATTEMPTS = 5
export const LOCK_MS = 15 * 60_000
export const RESEND_COOLDOWN_S = 60

interface CodeChallenge {
  email: string
  sentAt: number
  attempts: number
}

function lockedUntil(email: string): number {
  if (email === 'locked@nff.demo') return Date.now() + LOCK_MS
  const until = readJson<Record<string, number>>(LOCKS_KEY, {})[email] ?? 0
  return until > Date.now() ? until : 0
}

function lockedError(until: number) {
  const minutes = Math.max(1, Math.ceil((until - Date.now()) / 60_000))
  return new ApiError(
    'too_many_attempts',
    `Too many attempts. Sign-in for this email is paused for ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    429,
  )
}

function startChallenge(email: string): number {
  writeJson(CHALLENGE_KEY, { email, sentAt: Date.now(), attempts: 0 } satisfies CodeChallenge)
  writeJson(RESEND_KEY, Date.now())
  return Date.now() + CODE_TTL_MS
}

function unavailable(user: User) {
  const status = effectiveStatus(user)
  return status === 'pending_deletion' || status === 'deactivated'
}

/** Step 1 of sign-in: email a code to an existing account. */
export async function requestSignInCode(email: string): Promise<{ email: string; expiresAt: number }> {
  return mockApi(() => {
    const normalised = email.trim().toLowerCase()
    const until = lockedUntil(normalised)
    if (until) throw lockedError(until)
    const user = userByEmail.get(normalised)
    if (!user) {
      throw new ApiError('no_account', 'We could not find an account for that email.', 404)
    }
    if (unavailable(user)) {
      throw new ApiError('account_unavailable', 'This account is not available. Contact support.', 403)
    }
    return { email: normalised, expiresAt: startChallenge(normalised) }
  })
}

/** Step 2: check the code. A right code also verifies an unverified email. */
export async function verifySignInCode(email: string, code: string): Promise<Session> {
  return mockApi(
    () => {
      const normalised = email.trim().toLowerCase()
      const until = lockedUntil(normalised)
      if (until) throw lockedError(until)
      const challenge = readJson<CodeChallenge | null>(CHALLENGE_KEY, null)
      if (!challenge || challenge.email !== normalised) {
        throw new ApiError('no_code', 'Request a new code to continue.', 400)
      }
      if (Date.now() - challenge.sentAt > CODE_TTL_MS) {
        throw new ApiError('expired_code', 'That code has expired. Request a new one.', 422)
      }
      if (code.trim() !== demoCode) {
        const attempts = challenge.attempts + 1
        if (attempts >= MAX_CODE_ATTEMPTS) {
          const locks = readJson<Record<string, number>>(LOCKS_KEY, {})
          writeJson(LOCKS_KEY, { ...locks, [normalised]: Date.now() + LOCK_MS })
          storageRemove(CHALLENGE_KEY)
          throw lockedError(Date.now() + LOCK_MS)
        }
        writeJson(CHALLENGE_KEY, { ...challenge, attempts })
        const left = MAX_CODE_ATTEMPTS - attempts
        throw new ApiError(
          'invalid_code',
          `That code is not right. ${left} ${left === 1 ? 'try' : 'tries'} left.`,
          422,
        )
      }
      const user = userByEmail.get(normalised)
      if (!user || unavailable(user)) {
        throw new ApiError('account_unavailable', 'This account is not available. Contact support.', 403)
      }
      if (!user.verified) {
        user.verified = true
        user.status = 'active'
      }
      storageRemove(CHALLENGE_KEY)
      return createSession(user)
    },
    { allowError: false },
  )
}

/** Send a fresh code to the same address, at most once a minute. */
export async function resendCode(email: string): Promise<{ nextAllowedAt: number }> {
  return mockApi(
    () => {
      const normalised = email.trim().toLowerCase()
      const last = readJson<number>(RESEND_KEY, 0)
      const now = Date.now()
      if (now - last < RESEND_COOLDOWN_S * 1000) {
        throw new ApiError('resend_limit', 'Please wait a moment before requesting another code.', 429)
      }
      const until = lockedUntil(normalised)
      if (until) throw lockedError(until)
      if (!userByEmail.has(normalised)) {
        throw new ApiError('no_code', 'Start again to request a code.', 400)
      }
      startChallenge(normalised)
      return { nextAllowedAt: now + RESEND_COOLDOWN_S * 1000 }
    },
    { allowError: false },
  )
}

/**
 * Password sign-in from before SOW v1.3. No screen uses it; kept for the
 * RBAC service tests that check deactivated accounts cannot sign in.
 */
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

/** SOW v1.3 §3.2 #1: an account is an email address; no password is set. */
export interface SignUpInput {
  name: string
  email: string
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
      startChallenge(email)
      return { email }
    },
    { allowError: true },
  )
}

/** Signs up's second step: the code sent to the pending sign-up address. */
export async function verifyEmail(code: string): Promise<Session> {
  const pending = readJson<{ email: string } | null>(PENDING_KEY, null)
  if (!pending) {
    return mockApi(() => {
      throw new ApiError('no_pending', 'No verification is in progress.', 400)
    })
  }
  const session = await verifySignInCode(pending.email, code)
  storageRemove(PENDING_KEY)
  return session
}

export async function resendVerification(): Promise<{ nextAllowedAt: number }> {
  const pending = readJson<{ email: string } | null>(PENDING_KEY, null)
  return resendCode(pending?.email ?? '')
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
