import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LegacyRedirect } from '@/app/LegacyRedirect'

const FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true }

function Where() {
  const { pathname, search, hash } = useLocation()
  return <p data-testid="where">{pathname + search + hash}</p>
}

function go(url: string) {
  cleanup()
  render(
    <MemoryRouter initialEntries={[url]} future={FUTURE}>
      <Routes>
        <Route path="/journey" element={<LegacyRedirect />} />
        <Route path="/my-journey" element={<LegacyRedirect />} />
        <Route path="/journey/stages/:stageId" element={<LegacyRedirect />} />
        <Route path="/journey/stages/:stageId/read/:contentId" element={<LegacyRedirect />} />
        <Route path="/journey/stages/:stageId/listen/:contentId" element={<LegacyRedirect />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
  return screen.getByTestId('where').textContent
}

describe('legacy practitioner redirects', () => {
  it('sends every old route to its /learn home', () => {
    expect(go('/journey')).toBe('/learn')
    expect(go('/my-journey')).toBe('/learn/progress')
  })

  it('maps stage, reading and listening deep links', () => {
    expect(go('/journey/stages/stage-3')).toBe(
      '/learn/paths/meadow-journey?module=module-stage-3',
    )
    expect(go('/journey/stages/stage-2/read/exp-7')).toBe(
      '/learn/paths/meadow-journey/lessons/lesson-exp-7',
    )
    expect(go('/journey/stages/stage-2/listen/med-4')).toBe(
      '/learn/paths/meadow-journey/lessons/lesson-med-4',
    )
  })

  it('keeps query parameters and the hash', () => {
    expect(go('/journey?ref=email&utm=daily#top')).toBe('/learn?ref=email&utm=daily#top')
    expect(go('/journey/stages/stage-3?x=1#a')).toBe(
      '/learn/paths/meadow-journey?module=module-stage-3&x=1#a',
    )
  })
})
