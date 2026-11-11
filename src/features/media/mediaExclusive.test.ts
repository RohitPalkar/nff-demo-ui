import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  claimMedia,
  getActiveMedia,
  releaseMedia,
  resetMediaClaims,
} from './mediaExclusive'

beforeEach(resetMediaClaims)

describe('mediaExclusive', () => {
  it('pauses the previous holder when another media claims the slot', () => {
    const pauseAudio = vi.fn()
    const pauseVideo = vi.fn()
    claimMedia({ id: 'audio:a', kind: 'audio', pause: pauseAudio })
    claimMedia({ id: 'video:v', kind: 'video', pause: pauseVideo })
    expect(pauseAudio).toHaveBeenCalledTimes(1)
    expect(pauseVideo).not.toHaveBeenCalled()
    expect(getActiveMedia()?.id).toBe('video:v')
  })

  it('does not pause a holder that claims again', () => {
    const pause = vi.fn()
    claimMedia({ id: 'video:v', kind: 'video', pause })
    claimMedia({ id: 'video:v', kind: 'video', pause })
    expect(pause).not.toHaveBeenCalled()
  })

  it('a pause event from the old holder cannot release the new one', () => {
    claimMedia({
      id: 'audio:a',
      kind: 'audio',
      pause: () => releaseMedia('audio:a'),
    })
    claimMedia({ id: 'video:v', kind: 'video', pause: vi.fn() })
    expect(getActiveMedia()?.id).toBe('video:v')
  })

  it('release only clears the matching holder', () => {
    claimMedia({ id: 'video:v', kind: 'video', pause: vi.fn() })
    releaseMedia('audio:a')
    expect(getActiveMedia()?.id).toBe('video:v')
    releaseMedia('video:v')
    expect(getActiveMedia()).toBeNull()
  })
})
