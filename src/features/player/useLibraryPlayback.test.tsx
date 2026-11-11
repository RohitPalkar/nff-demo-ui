import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { PlayerProvider } from '@/features/player/PlayerProvider'
import { useLibraryPlayback } from '@/features/player/useLibraryPlayback'
import { content } from '@/mocks/db'
import type { Meditation } from '@/types'

const meditations = content.filter(
  (item): item is Meditation => item.type === 'meditation' && item.published,
)
const freePreview = meditations.find((m) => m.preview && m.transcode === 'ready')!
const membersOnly = meditations.find((m) => !m.preview && m.transcode === 'ready')!
const notReady = meditations.find((m) => m.transcode !== 'ready')

function signIn(email: string, role: string, id: string) {
  window.localStorage.setItem(
    'nff.session',
    JSON.stringify({
      token: 'test',
      user: { id, name: 'Test', email, role, verified: true },
    }),
  )
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <PlayerProvider>{children}</PlayerProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('public audio playback compatibility', () => {
  it('fixtures cover the cases', () => {
    expect(freePreview).toBeDefined()
    expect(membersOnly).toBeDefined()
  })

  it('visitors: free previews only, as a preview', () => {
    const { result } = renderHook(() => useLibraryPlayback(), { wrapper })
    expect(result.current.isPreview).toBe(true)
    expect(result.current.canPlay(freePreview)).toBe(true)
    expect(result.current.canPlay(membersOnly)).toBe(false)
    if (notReady) expect(result.current.canPlay(notReady)).toBe(false)
  })

  it('visitors can start a free preview from a card', () => {
    const { result } = renderHook(() => useLibraryPlayback(), { wrapper })
    act(() => result.current.toggle(freePreview))
    expect(result.current.state(freePreview.id)).toBe('playing')
    act(() => result.current.toggle(freePreview))
    expect(result.current.state(freePreview.id)).toBe('paused')
    act(() => result.current.stopPreview())
    expect(result.current.state(freePreview.id)).toBe('idle')
  })

  it('practitioners: every ready track plays in full through the global player', () => {
    signIn('practitioner@nff.demo', 'practitioner', 'u-demo')
    const { result } = renderHook(() => useLibraryPlayback(), { wrapper })
    expect(result.current.isPreview).toBe(false)
    expect(result.current.canPlay(freePreview)).toBe(true)
    expect(result.current.canPlay(membersOnly)).toBe(true)
    if (notReady) expect(result.current.canPlay(notReady)).toBe(false)

    act(() => result.current.toggle(membersOnly))
    expect(result.current.state(membersOnly.id)).toBe('playing')
  })

  it('editors on the public site still get previews only, as before', () => {
    signIn('editor@nff.demo', 'editor', 'u-editor')
    const { result } = renderHook(() => useLibraryPlayback(), { wrapper })
    expect(result.current.isPreview).toBe(true)
    expect(result.current.canPlay(membersOnly)).toBe(false)
    expect(result.current.canPlay(freePreview)).toBe(true)
  })
})
