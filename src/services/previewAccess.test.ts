import { beforeEach, describe, expect, it } from 'vitest'
import { content } from '@/mocks/db'
import { getCatalogue, getContentDetail } from '@/services/content'
import { buildResource } from '@/services/learning/catalogue'
import { setMeditationAccess } from '@/services/cms'

const ADMIN = { id: 'u-ops', role: 'admin' } as const
const EDITOR = { id: 'u-editor', role: 'editor' } as const

const published = content.filter((item) => item.type === 'meditation' && item.published)
const free = published.find((item) => item.type === 'meditation' && item.preview)!
const locked = published.find((item) => item.type === 'meditation' && !item.preview)!

beforeEach(() => localStorage.clear())

describe('audio lock (free preview) set from the CMS', () => {
  it('an Admin locks and unlocks tracks, and the public site follows', async () => {
    expect(setMeditationAccess([free.id], false, ADMIN)).toBe(1)
    expect(setMeditationAccess([locked.id], true, ADMIN)).toBe(1)

    const { items } = await getCatalogue('meditation')
    expect(items.find((item) => item.id === free.id)).toMatchObject({ preview: false })
    expect(items.find((item) => item.id === locked.id)).toMatchObject({ preview: true })
    const detail = await getContentDetail('meditation', free.slug)
    expect(detail.item).toMatchObject({ preview: false })
    expect(buildResource(free).previewable).toBe(false)
  })

  it('locks every track at once, and reports how many changed', async () => {
    const ids = published.map((item) => item.id)
    const changed = setMeditationAccess(ids, false, ADMIN)
    expect(changed).toBe(published.filter((item) => item.type === 'meditation' && item.preview).length)
    const { items } = await getCatalogue('meditation')
    expect(items.every((item) => item.type !== 'meditation' || !item.preview)).toBe(true)
    expect(setMeditationAccess(ids, false, ADMIN)).toBe(0)
  })

  it('is a publishing decision: an Editor cannot change it directly', async () => {
    expect(() => setMeditationAccess([free.id], false, EDITOR)).toThrow()
    const { items } = await getCatalogue('meditation')
    expect(items.find((item) => item.id === free.id)).toMatchObject({ preview: true })
  })
})
