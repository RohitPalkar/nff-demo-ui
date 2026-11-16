import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { MeditationsHeader } from '@/components/learn/meditations/MeditationsHeader'
import { HomeVideo } from '@/components/nff/HomeVideo'
import { SOW_SCOPE } from '@/config/sowScope'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/pages/auth/LoginPage'
import { LIBRARY_FORMATS, parseFormat } from '@/services/learning/library'
import { getContentVideo } from '@/services/learning/video'

/** The shipped build follows SOW v1.3: everything outside it is off. */
describe('SOW v1.3 scope', () => {
  it('ships with every out-of-scope feature switched off', () => {
    for (const [feature, on] of Object.entries(SOW_SCOPE)) {
      expect({ feature, on }).toEqual({ feature, on: false })
    }
  })

  it('has no video: no item video, no Video format, no landing section', () => {
    expect(getContentVideo('exp-1')).toBeUndefined()
    expect(LIBRARY_FORMATS).not.toContain('video')
    expect(parseFormat('video')).toBe('all')
    const { container } = render(<HomeVideo />)
    expect(container).toBeEmptyDOMElement()
  })

  it('has no search box on Practitioner meditations', () => {
    render(<MeditationsHeader query="" onSearch={() => undefined} />)
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/search/i)).not.toBeInTheDocument()
  })

  it('has no password reset link on sign-in', () => {
    render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
    expect(screen.queryByRole('link', { name: /forgot password/i })).not.toBeInTheDocument()
  })
})
