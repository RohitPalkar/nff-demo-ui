import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  claimMedia,
  getActiveMedia,
  releaseMedia,
  resetMediaClaims,
} from './mediaExclusive'

beforeEach(resetMediaClaims)

describe('mediaExclusive', () => {
  it('pauses the previous holder when another audio claims the slot', () => {
    const pauseFirst = vi.fn()
    const pauseSecond = vi.fn()
    claimMedia({ id: 'audio:first', kind: 'audio', pause: pauseFirst })
    claimMedia({ id: 'audio:second', kind: 'audio', pause: pauseSecond })
    expect(pauseFirst).toHaveBeenCalledTimes(1)
    expect(pauseSecond).not.toHaveBeenCalled()
    expect(getActiveMedia()?.id).toBe('audio:second')
    expect(getActiveMedia()?.kind).toBe('audio')
  })

  it('does not pause a holder that claims again', () => {
    const pause = vi.fn()
    claimMedia({ id: 'audio:track', kind: 'audio', pause })
    claimMedia({ id: 'audio:track', kind: 'audio', pause })
    expect(pause).not.toHaveBeenCalled()
  })

  it('a pause event from the old holder cannot release the new one', () => {
    claimMedia({
      id: 'audio:first',
      kind: 'audio',
      pause: () => releaseMedia('audio:first'),
    })
    claimMedia({ id: 'audio:second', kind: 'audio', pause: vi.fn() })
    expect(getActiveMedia()?.id).toBe('audio:second')
  })

  it('release only clears the matching holder', () => {
    claimMedia({ id: 'audio:track', kind: 'audio', pause: vi.fn() })
    releaseMedia('audio:other')
    expect(getActiveMedia()?.id).toBe('audio:track')
    releaseMedia('audio:track')
    expect(getActiveMedia()).toBeNull()
  })
})
