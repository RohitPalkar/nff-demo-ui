import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { CookiePolicyPage } from './CookiePolicyPage'
import { PrivacyPolicyPage } from './PrivacyPolicyPage'
import { TermsPage } from './TermsPage'

const FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true }
const renderPage = (page: React.ReactNode) =>
  render(<MemoryRouter future={FUTURE}>{page}</MemoryRouter>)

afterEach(cleanup)

describe.each([
  ['Privacy policy', <PrivacyPolicyPage key="p" />],
  ['Terms of use', <TermsPage key="t" />],
  ['Cookie policy', <CookiePolicyPage key="c" />],
])('%s', (title, page) => {
  it('has one h1, a dated header and a sample-text notice', () => {
    renderPage(page)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByText(/Last updated/)).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('Sample text for the demo.')
  })

  it('lists every section in "On this page", linked to its heading', () => {
    renderPage(page)
    const toc = screen.getByRole('navigation', { name: 'On this page' })
    for (const link of within(toc).getAllByRole('link')) {
      const id = link.getAttribute('href')!.slice(1)
      expect(document.getElementById(id)).not.toBeNull()
    }
  })

  it('links to the other legal pages', () => {
    renderPage(page)
    const related = screen.getByRole('complementary', { name: 'Related' })
    expect(within(related).getAllByRole('link').length).toBeGreaterThanOrEqual(3)
  })
})

describe('content specifics', () => {
  it('privacy policy covers the US rights and Global Privacy Control', () => {
    renderPage(<PrivacyPolicyPage />)
    expect(screen.getByRole('heading', { name: /Your rights/ })).toBeInTheDocument()
    expect(screen.getAllByText(/Global Privacy Control/).length).toBeGreaterThan(0)
    expect(screen.getByRole('table', { name: /Personal information we collect/ })).toBeInTheDocument()
  })

  it('terms point to US crisis lines', () => {
    renderPage(<TermsPage />)
    expect(screen.getByRole('link', { name: '988' })).toHaveAttribute('href', 'tel:988')
  })

  it('cookie policy tables have row and column headers', () => {
    renderPage(<CookiePolicyPage />)
    const table = screen.getByRole('table', { name: /Analytics cookies/ })
    expect(within(table).getAllByRole('columnheader')).toHaveLength(4)
    expect(within(table).getByRole('rowheader', { name: '_ga' })).toBeInTheDocument()
  })
})
