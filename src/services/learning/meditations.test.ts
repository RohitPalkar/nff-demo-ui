import { beforeEach, describe, expect, it } from 'vitest'
import { content } from '@/mocks/db'
import type { AccessContext } from '@/services/learning/access'
import { getAccessContext } from '@/services/learning/accessContext'
import { lessonIdForItem } from '@/services/learning/catalogue'
import {
  continueListening,
  filterMeditations,
  isPlayable,
  listMeditations,
  meditationCategories,
} from '@/services/learning/meditations'
import { featuredResources } from '@/services/learning/library'
import { PROGRESS_STORE_VERSION, type LearningProgressStore, type Meditation, type Role } from '@/types'

const learner = { id: 'u-demo', role: 'practitioner' as Role }
const NOW = '2026-11-10T09:00:00.000Z'
const meditations = content.filter((item): item is Meditation => item.type === 'meditation')
const ready = meditations.filter((item) => item.published && item.transcode === 'ready')

const store = (extra: Partial<LearningProgressStore> = {}): LearningProgressStore => ({
  version: PROGRESS_STORE_VERSION,
  userId: learner.id,
  lessons: {},
  media: {},
  activity: [],
  updatedAt: NOW,
  ...extra,
})
const ctx = (): AccessContext => getAccessContext(learner, { surface: 'learn' })
const list = (progress = store()) => listMeditations(ctx(), progress)

beforeEach(() => window.localStorage.clear())

describe('what Meditations lists', () => {
  it('lists every published meditation a learner may open, and no articles', () => {
    const entries = list()
    expect(entries).toHaveLength(meditations.filter((item) => item.published).length)
    expect(entries.every((entry) => entry.item.type === 'meditation' && entry.item.published)).toBe(true)
    expect(entries.every((entry) => entry.href === `/learn/meditations/${entry.item.slug}`)).toBe(true)
  })

  it('lists nothing for a visitor, and carries the listed length', () => {
    expect(listMeditations(getAccessContext(null, { surface: 'learn' }), store())).toEqual([])
    const entry = list()[0]!
    expect(entry.durationSec).toBe((entry.item as Meditation).durationSec)
  })

  it('marks processing audio, and treats it as not playable', () => {
    const entries = list()
    const processing = entries.filter((entry) => entry.state === 'processing')
    expect(processing.map((entry) => entry.item.id).sort()).toEqual(
      meditations.filter((item) => item.transcode === 'transcoding').map((item) => item.id).sort(),
    )
    expect(processing.every((entry) => !isPlayable(entry))).toBe(true)
  })

  it('marks a failed recording unavailable, never completed', () => {
    const target = ready[0]!
    const original = target.transcode
    ;(target as Meditation).transcode = 'failed'
    try {
      const done = store({ lessons: { [lessonIdForItem(target.id)]: { lessonId: lessonIdForItem(target.id), status: 'completed' } } })
      expect(list(done).find((entry) => entry.item.id === target.id)!.state).toBe('unavailable')
    } finally {
      ;(target as Meditation).transcode = original
    }
  })
})

describe('listening state comes from real records', () => {
  it('has no in-progress or completed meditation without records', () => {
    const entries = list()
    expect(entries.some((entry) => entry.state === 'in-progress' || entry.state === 'completed')).toBe(false)
    expect(continueListening(entries)).toEqual([])
  })

  it('reads in-progress from a saved position and completed from the lesson record', () => {
    const [a, b, c] = ready
    const progress = store({
      media: { [a!.id]: { resourceId: a!.id, kind: 'audio', positionSec: 95, updatedAt: '2026-11-09T10:00:00.000Z' } },
      lessons: { [lessonIdForItem(b!.id)]: { lessonId: lessonIdForItem(b!.id), status: 'completed' } },
    })
    const entries = list(progress)
    const byId = (id: string) => entries.find((entry) => entry.item.id === id)!
    expect(byId(a!.id)).toMatchObject({ state: 'in-progress', savedSec: 95 })
    expect(byId(b!.id).state).toBe('completed')
    expect(byId(c!.id).state).toBe('not-started')
  })

  it('lists Continue listening newest first and leaves out finished ones', () => {
    const [a, b, c] = ready
    const progress = store({
      media: {
        [a!.id]: { resourceId: a!.id, kind: 'audio', positionSec: 40, updatedAt: '2026-11-08T10:00:00.000Z' },
        [b!.id]: { resourceId: b!.id, kind: 'audio', positionSec: 60, updatedAt: '2026-11-09T10:00:00.000Z' },
        [c!.id]: { resourceId: c!.id, kind: 'audio', positionSec: 70, updatedAt: '2026-11-10T08:00:00.000Z' },
      },
      lessons: { [lessonIdForItem(c!.id)]: { lessonId: lessonIdForItem(c!.id), status: 'completed' } },
    })
    expect(continueListening(list(progress)).map((entry) => entry.item.id)).toEqual([b!.id, a!.id])
  })

  it('ignores a legacy composite media position saved against the same item', () => {
    const [a] = ready
    const progress = store({
      media: { [`${a!.id}#video`]: { resourceId: `${a!.id}#video`, kind: 'audio', positionSec: 50, updatedAt: NOW } },
    })
    expect(list(progress).find((entry) => entry.item.id === a!.id)!.state).toBe('not-started')
  })
})

describe('search, categories and readiness', () => {
  it('searches title and description, ignoring case', () => {
    const target = ready[0]!
    const word = target.title.split(' ')[0]!.toUpperCase()
    const found = filterMeditations(list(), { q: word })
    expect(found.some((entry) => entry.item.id === target.id)).toBe(true)
    expect(filterMeditations(list(), { q: 'qwertyuiop' })).toEqual([])
  })

  it('offers only categories with meditations, with counts that match', () => {
    const entries = list()
    const nav = meditationCategories(entries, {})
    expect(nav.all).toBe(entries.length)
    for (const entry of nav.categories) {
      expect(entry.count).toBe(filterMeditations(entries, { category: entry.category }).length)
    }
    expect(nav.categories.reduce((sum, entry) => sum + entry.count, 0)).toBe(nav.all)
  })

  it('"ready only" drops processing audio from results and counts', () => {
    const entries = list()
    const all = filterMeditations(entries, {})
    const playable = filterMeditations(entries, { readyOnly: true })
    expect(playable).toHaveLength(all.length - entries.filter((entry) => entry.state === 'processing').length)
    expect(meditationCategories(entries, { readyOnly: true }).all).toBe(playable.length)
  })

  it('features only flagged, playable meditations', () => {
    const featured = featuredResources(list().filter(isPlayable), 3)
    expect(featured.length).toBeGreaterThan(0)
    expect(featured.every((entry) => entry.item.featured && entry.state !== 'processing')).toBe(true)
  })
})
