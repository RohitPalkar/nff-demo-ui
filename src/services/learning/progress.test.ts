import { beforeEach, describe, expect, it } from 'vitest'
import { demoProgress } from '@/mocks/db'
import { getJourney, getProgress, saveProgress } from '@/services/content'
import {
  getLessonsOf,
  getModulesOf,
  lessonIdForItem,
  MEADOW_JOURNEY_ID,
} from '@/services/learning/catalogue'
import {
  legacyProgressKey,
  loadProgress,
  migrateLegacyProgress,
  moduleCompletion,
  pathCompletion,
  progressKey,
  recentActivity,
  recordMedia,
  recordReading,
  toLegacyProgress,
} from '@/services/learning/progress'
import type { Progress } from '@/types'

const NOW = new Date('2026-11-10T09:00:00.000Z')
const LATER = new Date('2026-11-11T09:00:00.000Z')

beforeEach(() => {
  window.localStorage.clear()
})

function legacyRecord(overrides: Partial<Progress> = {}): Progress {
  return {
    userId: 'u-legacy',
    completedItemIds: ['exp-1', 'exp-2', 'med-1'],
    inProgressItemId: 'med-2',
    positionsSec: { 'med-2': 145, 'med-9': 312 },
    updatedAt: '2026-10-01T08:00:00.000Z',
    ...overrides,
  }
}

describe('migration of a stored legacy record', () => {
  it('preserves completed ids (and order), the in-progress item and audio positions', () => {
    window.localStorage.setItem(
      legacyProgressKey('u-legacy'),
      JSON.stringify(legacyRecord()),
    )
    const store = loadProgress('u-legacy', NOW)
    const back = toLegacyProgress(store)

    expect(back.completedItemIds).toEqual(['exp-1', 'exp-2', 'med-1'])
    expect(back.inProgressItemId).toBe('med-2')
    expect(back.positionsSec).toEqual({ 'med-2': 145, 'med-9': 312 })
    expect(store.migratedFrom).toEqual({ source: 'legacy', at: NOW.toISOString() })
    expect(store.version).toBe(2)
  })

  it('drops legacy composite media ids instead of copying them back as audio', () => {
    const store = migrateLegacyProgress(
      legacyRecord({ positionsSec: { 'med-2': 145, 'med-1#video': 50 } }),
      'legacy',
      NOW,
    )
    expect(store.media['med-2']).toMatchObject({ kind: 'audio', positionSec: 145 })
    expect(store.media['med-1#video']).toBeUndefined()
    expect(toLegacyProgress(store).positionsSec).toEqual({ 'med-2': 145 })
  })

  it('writes meadow.progress.v2.{userId} and leaves the legacy key untouched', () => {
    const raw = JSON.stringify(legacyRecord())
    window.localStorage.setItem(legacyProgressKey('u-legacy'), raw)
    loadProgress('u-legacy', NOW)
    expect(window.localStorage.getItem(progressKey('u-legacy'))).not.toBeNull()
    expect(window.localStorage.getItem(legacyProgressKey('u-legacy'))).toBe(raw)
  })

  it('is idempotent: a second run changes nothing, even with a different clock', () => {
    window.localStorage.setItem(
      legacyProgressKey('u-legacy'),
      JSON.stringify(legacyRecord()),
    )
    const first = loadProgress('u-legacy', NOW)
    const firstRaw = window.localStorage.getItem(progressKey('u-legacy'))
    const second = loadProgress('u-legacy', LATER)
    expect(second).toEqual(first)
    expect(window.localStorage.getItem(progressKey('u-legacy'))).toBe(firstRaw)
  })

  it('never overwrites v2 data with a later change to the legacy key', () => {
    window.localStorage.setItem(
      legacyProgressKey('u-legacy'),
      JSON.stringify(legacyRecord()),
    )
    loadProgress('u-legacy', NOW)
    window.localStorage.setItem(
      legacyProgressKey('u-legacy'),
      JSON.stringify(legacyRecord({ completedItemIds: [] })),
    )
    expect(toLegacyProgress(loadProgress('u-legacy', LATER)).completedItemIds).toEqual(
      ['exp-1', 'exp-2', 'med-1'],
    )
  })

  it('does not fabricate history: no activity, completion dates or played time', () => {
    const store = migrateLegacyProgress(legacyRecord(), 'legacy', NOW)
    expect(store.activity).toEqual([])
    for (const lesson of Object.values(store.lessons)) {
      expect(lesson.completedAt).toBeUndefined()
      expect(lesson.lastOpenedAt).toBeUndefined()
      expect(lesson.reading).toBeUndefined()
    }
    for (const media of Object.values(store.media)) {
      expect(media.playedSec).toBeUndefined()
      expect(media.furthestSec).toBeUndefined()
      expect(media.completedAt).toBeUndefined()
    }
    expect(recentActivity(store)).toEqual([])
  })

  it('keeps ids it does not recognise rather than dropping them', () => {
    const store = migrateLegacyProgress(
      legacyRecord({ completedItemIds: ['gone-item'] }),
      'legacy',
      NOW,
    )
    expect(toLegacyProgress(store).completedItemIds).toEqual(['gone-item'])
  })
})

describe('seeded demo progress', () => {
  it('migrates the demo user exactly as seeded', () => {
    const store = loadProgress(demoProgress.userId, NOW)
    const back = toLegacyProgress(store)
    expect(back.completedItemIds).toEqual(demoProgress.completedItemIds)
    expect(back.inProgressItemId).toBe(demoProgress.inProgressItemId)
    expect(back.positionsSec).toEqual(demoProgress.positionsSec)
    expect(store.migratedFrom?.source).toBe('seed')
  })

  it('gives the same journey the old code did: stage 1 done, stage 2 in progress, rest locked', async () => {
    const journey = await getJourney(demoProgress.userId)
    expect(journey.stages[0]?.status).toBe('completed')
    expect(journey.stages[1]?.status).toBe('in_progress')
    expect(journey.stages.slice(2).every((stage) => stage.status === 'locked')).toBe(
      true,
    )
    expect(journey.continueItem?.stage.id).toBe('stage-2')
  })

  it('starts a brand-new user empty, with no invented progress', () => {
    const store = loadProgress('u-new-person', NOW)
    expect(store.lessons).toEqual({})
    expect(store.media).toEqual({})
    expect(store.activity).toEqual([])
    expect(store.migratedFrom?.source).toBe('empty')
  })
})

describe('legacy adapters used by existing screens', () => {
  it('round-trips a save through getProgress', async () => {
    const before = await getProgress(demoProgress.userId)
    saveProgress({
      ...before,
      completedItemIds: [...before.completedItemIds, 'exp-99'],
      positionsSec: { ...before.positionsSec, 'med-5': 60 },
    })
    const after = await getProgress(demoProgress.userId)
    expect(after.completedItemIds).toEqual([...before.completedItemIds, 'exp-99'])
    expect(after.positionsSec['med-5']).toBe(60)
    expect(after.inProgressItemId).toBe(before.inProgressItemId)
  })

  it('records only real events: a new completion gets one activity entry', async () => {
    const before = await getProgress(demoProgress.userId)
    saveProgress({
      ...before,
      completedItemIds: [...before.completedItemIds, 'exp-99'],
    })
    const store = loadProgress(demoProgress.userId)
    expect(store.activity).toHaveLength(1)
    expect(store.activity[0]).toMatchObject({
      type: 'completed',
      lessonId: lessonIdForItem('exp-99'),
    })
    expect(store.lessons[lessonIdForItem('exp-99')]?.completedAt).toBeDefined()
    // Older completions stay undated: their date was never recorded.
    expect(store.lessons[lessonIdForItem(before.completedItemIds[0]!)]?.completedAt).toBeUndefined()
  })

  it('a position-only save records no activity', async () => {
    const before = await getProgress(demoProgress.userId)
    saveProgress({ ...before, positionsSec: { ...before.positionsSec, 'med-5': 30 } })
    expect(loadProgress(demoProgress.userId).activity).toEqual([])
  })
})

describe('new progress records', () => {
  it('stores reading activity', () => {
    const store = recordReading('u-r', 'lesson-exp-1', 63.4, NOW)
    expect(store.lessons['lesson-exp-1']?.reading).toEqual({
      scrollPct: 63,
      lastReadAt: NOW.toISOString(),
    })
  })

  it('accumulates played time only from reported deltas', () => {
    recordMedia('u-m', 'med-1', { kind: 'audio', positionSec: 30, playedDeltaSec: 30 }, NOW)
    const store = recordMedia(
      'u-m',
      'med-1',
      { kind: 'audio', positionSec: 50, playedDeltaSec: 20 },
      LATER,
    )
    expect(store.media['med-1']).toMatchObject({
      positionSec: 50,
      furthestSec: 50,
      playedSec: 50,
    })
  })

  it('does not persist unsupported media kinds or legacy composite ids', () => {
    const unsupportedKind = recordMedia(
      'u-v',
      'vid-1',
      { kind: 'video' as unknown as 'audio', positionSec: 12 },
      NOW,
    )
    expect(unsupportedKind.media['vid-1']).toBeUndefined()

    const compositeId = recordMedia(
      'u-v',
      'vid-1#video',
      { kind: 'audio', positionSec: 12 },
      NOW,
    )
    expect(compositeId.media['vid-1#video']).toBeUndefined()
  })

  it('cleans unsupported records from an existing v2 store without changing its version', () => {
    window.localStorage.setItem(
      progressKey('u-clean'),
      JSON.stringify({
        version: 2,
        userId: 'u-clean',
        lessons: {},
        media: {
          'med-1#video': {
            resourceId: 'med-1#video',
            kind: 'audio',
            positionSec: 50,
            updatedAt: NOW.toISOString(),
          },
          'med-2': {
            resourceId: 'med-2',
            kind: 'video',
            positionSec: 20,
            updatedAt: NOW.toISOString(),
          },
          'med-3': {
            resourceId: 'med-3',
            kind: 'audio',
            positionSec: 10,
            updatedAt: NOW.toISOString(),
          },
        },
        activity: [],
        updatedAt: NOW.toISOString(),
      }),
    )

    const store = loadProgress('u-clean', LATER)
    expect(store.version).toBe(2)
    expect(store.media).toEqual({
      'med-3': {
        resourceId: 'med-3',
        kind: 'audio',
        positionSec: 10,
        updatedAt: NOW.toISOString(),
      },
    })
    const persisted = JSON.parse(window.localStorage.getItem(progressKey('u-clean')) ?? '{}')
    expect(persisted.version).toBe(2)
    expect(Object.keys(persisted.media)).toEqual(['med-3'])
  })
})

describe('derived module and path completion', () => {
  it('derives from lesson completion and never from stored percentages', () => {
    const modules = getModulesOf(MEADOW_JOURNEY_ID)
    const first = modules[0]!
    const itemIds = getLessonsOf(first.id).flatMap((lesson) =>
      lesson.blocks.flatMap((block) =>
        block.type === 'resource' ? [block.resourceId] : [],
      ),
    )
    const half = itemIds.slice(0, Math.floor(itemIds.length / 2))
    const store = migrateLegacyProgress(
      legacyRecord({ completedItemIds: half, inProgressItemId: undefined, positionsSec: {} }),
      'legacy',
      NOW,
    )
    const summary = moduleCompletion(first, store)
    expect(summary.requiredCompleted).toBe(half.length)
    expect(summary.complete).toBe(false)

    const full = migrateLegacyProgress(
      legacyRecord({ completedItemIds: itemIds, inProgressItemId: undefined, positionsSec: {} }),
      'legacy',
      NOW,
    )
    expect(moduleCompletion(first, full).complete).toBe(true)
    const path = pathCompletion(MEADOW_JOURNEY_ID, full)
    expect(path.complete).toBe(false)
    expect(path.modules).toHaveLength(6)
    expect(path.percent).toBe(
      Math.round((itemIds.length / path.requiredTotal) * 100),
    )
  })
})
