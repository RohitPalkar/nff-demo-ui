import { beforeEach, describe, expect, it } from 'vitest'
import { saveProgress, getProgress } from '@/services/content'
import {
  assignmentsForUser,
  listAssignments,
  startEnrolment,
  getEnrolment,
} from '@/services/learning/assignments'
import { getAccessContext } from '@/services/learning/accessContext'
import { MEADOW_JOURNEY_ID } from '@/services/learning/catalogue'
import {
  loadProgress,
  progressKey,
  recordActivity,
  recordMedia,
  recordReading,
} from '@/services/learning/progress'

const EDITOR = 'u-editor'
const ADMIN = 'u-admin'

beforeEach(() => {
  window.localStorage.clear()
})

describe('staff preview is read-only at the service layer', () => {
  it.each([EDITOR, ADMIN])('writes no progress, activity or assignments for %s', async (id) => {
    const before = await getProgress(id)
    saveProgress({ ...before, completedItemIds: [...before.completedItemIds, 'exp-99'] })
    recordActivity(id, 'opened', { lessonId: 'lesson-exp-1' })
    recordReading(id, 'lesson-exp-1', 50)
    recordMedia(id, 'med-1', { kind: 'audio', positionSec: 10, playedDeltaSec: 10 })
    getAccessContext({ id, role: id === EDITOR ? 'editor' : 'admin' }, { surface: 'learn', withProgress: true })

    expect(window.localStorage.getItem(progressKey(id))).toBeNull()
    expect(loadProgress(id).activity).toEqual([])
    expect(listAssignments()).toEqual([])
    expect(assignmentsForUser(id)).toEqual([])
    expect(startEnrolment(id, MEADOW_JOURNEY_ID)).toBeNull()
    expect(getEnrolment(id, MEADOW_JOURNEY_ID)).toBeUndefined()
  })

  it('still writes for a practitioner', async () => {
    const before = await getProgress('u-demo')
    saveProgress({ ...before, completedItemIds: [...before.completedItemIds, 'exp-99'] })
    expect(window.localStorage.getItem(progressKey('u-demo'))).not.toBeNull()
  })
})
