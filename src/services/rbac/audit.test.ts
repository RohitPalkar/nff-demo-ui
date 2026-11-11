import { beforeEach, describe, expect, it } from 'vitest'
import { emitAuditEvent, listAuditEvents, sanitizeMetadata } from './audit'

beforeEach(() => localStorage.clear())

describe('audit metadata', () => {
  it('drops sensitive keys and anything that is not a small primitive', () => {
    expect(
      sanitizeMetadata({
        status: 'published',
        count: 3,
        flag: true,
        email: 'a@b.co',
        displayName: 'Maya',
        password: 'x',
        note: 'free text',
        nested: { a: 1 },
        list: [1],
      }),
    ).toEqual({ status: 'published', count: 3, flag: true })
  })

  it('truncates long values and returns nothing for empty input', () => {
    expect((sanitizeMetadata({ ref: 'x'.repeat(500) }) as Record<string, string>).ref.length).toBeLessThan(200)
    expect(sanitizeMetadata({ email: 'a@b.co' })).toBeUndefined()
    expect(sanitizeMetadata(null)).toBeUndefined()
  })
})

describe('audit store', () => {
  it('stores events oldest first with an id and a timestamp, capped at 200', () => {
    for (let i = 0; i < 210; i++) {
      emitAuditEvent({ actorId: 'a', action: 'content.publish', resourceType: 'content', resourceId: `r${i}`, outcome: 'success' })
    }
    const events = listAuditEvents()
    expect(events).toHaveLength(200)
    expect(events[0]!.resourceId).toBe('r10')
    expect(events.at(-1)!.resourceId).toBe('r209')
    expect(new Set(events.map((event) => event.id)).size).toBe(200)
  })
})
