import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ContentCard } from '@/components/nff/ContentCard'
import type { Exploration, Meditation } from '@/types'

const exploration: Exploration = {
  id: 'exp-test',
  slug: 'what-is-nff',
  type: 'exploration',
  title: 'What is NeuroFelicitology?',
  excerpt: 'A calm introduction to the ideas behind the practice.',
  category: 'foundations',
  stageId: 'stage-1',
  artwork: { tone: 'brand', label: 'WH' },
  published: true,
  featured: false,
  updatedAt: '2026-11-09T00:00:00.000Z',
  readingTimeMin: 6,
  body: ['Paragraph one.'],
}

const meditation: Meditation = {
  id: 'med-test',
  slug: 'morning-grounding',
  type: 'meditation',
  title: 'Morning grounding',
  excerpt: 'A short practice to begin the day.',
  category: 'foundations',
  stageId: 'stage-1',
  artwork: { tone: 'accent', label: 'MO' },
  published: true,
  featured: false,
  updatedAt: '2026-11-09T00:00:00.000Z',
  durationSec: 720,
  preview: true,
  audioUrl: '/audio/mock-1.mp3',
  transcode: 'ready',
}

describe('ContentCard', () => {
  it('renders an exploration with its reading time and link', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ContentCard item={exploration} stageLabel="Stage 1 · Arriving" />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'What is NeuroFelicitology?' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Stage 1', { selector: 'span[aria-hidden="true"]' }),
    ).toBeInTheDocument()
    expect(screen.getByText('6 min read')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/explorations/what-is-nff',
    )
  })

  it('marks free meditations with a labelled preview chip', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ContentCard item={meditation} stageLabel="Stage 1 · Arriving" />
      </MemoryRouter>,
    )

    expect(screen.getByText('Free preview')).toBeInTheDocument()
    expect(screen.getByText('12 min')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/meditations/morning-grounding',
    )
  })

  it('shows a labelled lock state when content is locked', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ContentCard item={meditation} stageLabel="Stage 1 · Arriving" locked />
      </MemoryRouter>,
    )

    expect(screen.getByText('Locked')).toBeInTheDocument()
    expect(screen.getByText('Sign up to unlock')).toBeInTheDocument()
  })
})
