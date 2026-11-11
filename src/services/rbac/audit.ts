import { readJson, writeJson } from '@/mocks/api'

/**
 * Audit event contract and a minimal mock store. There is no audit screen
 * yet and no history: events are recorded only when an operation really
 * happens (or is really refused) from now on.
 *
 * Storage: the browser's localStorage under `nff.audit.events.v1`, capped to
 * the newest 200. It is editable by anyone with the browser, so it is NOT a
 * tamper-proof audit trail. A real one must be written server-side.
 *
 * Where events should be emitted (the operations that call `emitAuditEvent`
 * today are marked ✓):
 *   ✓ content status changes (submit, approve, reject, publish, schedule,
 *     unpublish), creation, duplication; ✗ content deletion (no delete exists)
 *   ✓ role changes and team removal; ✗ invitations (not delivered)
 *   ✓ user account status changes
 *   ✓ curriculum changes
 *   ✓ score configuration
 *   ✓ campaign changes
 *   ✗ assignment changes (the guarded wrappers emit; the raw functions do not)
 * Saving a draft is deliberately not audited: it happens every few seconds.
 */

export type AuditOutcome = 'success' | 'denied' | 'failure'

export type AuditResourceType =
  | 'content'
  | 'stage'
  | 'user'
  | 'team_member'
  | 'score_settings'
  | 'campaign'
  | 'assignment'
  | 'group'

export interface AuditEvent {
  id: string
  actorId: string
  /** `domain.action`, e.g. `content.publish`, `team.roles.assign`. */
  action: string
  resourceType: AuditResourceType
  resourceId: string
  /** ISO timestamp. */
  at: string
  outcome: AuditOutcome
  metadata?: Record<string, string | number | boolean | null>
}

export type AuditEventInput = Omit<AuditEvent, 'id' | 'at'> & { at?: string }

const KEY = 'nff.audit.events.v1'
const CAP = 200
const MAX_STRING = 120

/** Keys whose values are never recorded, whatever they hold. */
const SENSITIVE_KEY = /pass(word)?|secret|token|email|e-?mail|name|phone|address|body|note|comment|key|card/i

/**
 * Keeps only small primitive values under non-sensitive keys, so personal
 * data and free text cannot leak into the trail by accident. Record ids and
 * statuses instead of names and content.
 */
export function sanitizeMetadata(metadata: unknown): AuditEvent['metadata'] {
  if (typeof metadata !== 'object' || metadata === null) return undefined
  const clean: Record<string, string | number | boolean | null> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEY.test(key)) continue
    if (value === null || typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value
    } else if (typeof value === 'string') {
      clean[key] = value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value
    }
  }
  return Object.keys(clean).length > 0 ? clean : undefined
}

let counter = 0
const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `evt-${crypto.randomUUID()}`
    : `evt-${Date.now()}-${++counter}`

export function emitAuditEvent(input: AuditEventInput): AuditEvent {
  const metadata = sanitizeMetadata(input.metadata)
  const event: AuditEvent = {
    id: newId(),
    actorId: input.actorId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    at: input.at ?? new Date().toISOString(),
    outcome: input.outcome,
    ...(metadata ? { metadata } : {}),
  }
  try {
    writeJson(KEY, [...readJson<AuditEvent[]>(KEY, []), event].slice(-CAP))
  } catch {
    // Auditing must never break the operation it describes.
  }
  return event
}

/** Oldest first. Empty until something real happens. */
export const listAuditEvents = (): AuditEvent[] => readJson<AuditEvent[]>(KEY, [])

export const AUDIT_EVENTS_KEY = KEY
