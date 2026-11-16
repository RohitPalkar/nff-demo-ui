import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignUpPage } from '@/pages/auth/SignUpPage'
import { MAX_CODE_ATTEMPTS, requestSignInCode, verifySignInCode } from '@/services/auth'

const FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true }
const WAIT = { timeout: 4000 }

function renderAt(url: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[url]} future={FUTURE}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/learn" element={<p>Learn home</p>} />
          <Route path="/cms" element={<p>CMS home</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

async function typeCode(user: ReturnType<typeof userEvent.setup>, code: string, submit: string) {
  const group = await screen.findByRole('group', { name: 'Verification code' }, WAIT)
  await user.click(within(group).getByLabelText('Digit 1 of 6'))
  await user.keyboard(code)
  // No auto-submit (WCAG 3.2.5): the page changes only on the button.
  await user.click(screen.getByRole('button', { name: submit }))
}

// The Radix checkbox measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

beforeEach(() => window.localStorage.clear())
afterEach(cleanup)

describe('Log in with an email and one-time code (SOW v1.3 §3.2 #2)', () => {
  it('has no password field and no social sign-in', () => {
    renderAt('/login')
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(document.querySelector('input[type="password"]')).toBeNull()
    expect(screen.queryByText(/google|apple|facebook/i)).toBeNull()
  })

  it('sends a code, then signs a practitioner in to /learn', async () => {
    const user = userEvent.setup()
    renderAt('/login')
    await user.type(screen.getByLabelText('Email address'), 'practitioner@nff.demo')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('heading', { name: 'Check your email' }, WAIT)).toBeInTheDocument()
    expect(screen.getByText('practitioner@nff.demo')).toBeInTheDocument()
    await typeCode(user, '123456', 'Log in')
    expect(await screen.findByText('Learn home', {}, WAIT)).toBeInTheDocument()
  }, 15_000)

  it('sends staff to the CMS', async () => {
    const user = userEvent.setup()
    renderAt('/login')
    await user.type(screen.getByLabelText('Email address'), 'editor@nff.demo')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await typeCode(user, '123456', 'Log in')
    expect(await screen.findByText('CMS home', {}, WAIT)).toBeInTheDocument()
  }, 15_000)

  it('says how many tries are left after a wrong code', async () => {
    const user = userEvent.setup()
    renderAt('/login')
    await user.type(screen.getByLabelText('Email address'), 'practitioner@nff.demo')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await typeCode(user, '000000', 'Log in')
    expect(await screen.findByText(/4 tries left/, {}, WAIT)).toBeInTheDocument()
  }, 15_000)

  it('offers sign-up when no account has that email', async () => {
    const user = userEvent.setup()
    renderAt('/login')
    await user.type(screen.getByLabelText('Email address'), 'nobody@example.com')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(
      await screen.findByRole('link', { name: 'Create an account with nobody@example.com' }, WAIT),
    ).toBeInTheDocument()
  }, 15_000)
})

describe('Code security (SOW v1.3 §3.2 #3)', () => {
  it('locks sign-in for the address after too many wrong codes', async () => {
    await requestSignInCode('practitioner@nff.demo')
    for (let attempt = 1; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      await expect(verifySignInCode('practitioner@nff.demo', '000000')).rejects.toMatchObject({
        code: 'invalid_code',
      })
    }
    await expect(verifySignInCode('practitioner@nff.demo', '000000')).rejects.toMatchObject({
      code: 'too_many_attempts',
    })
    // Even the right code, and a new code, are refused while locked.
    await expect(requestSignInCode('practitioner@nff.demo')).rejects.toMatchObject({
      code: 'too_many_attempts',
    })
  }, 20_000)
})

describe('Sign up with an email and one-time code (SOW v1.3 §3.2 #1)', () => {
  it('asks for terms, then verifies the email with a code and signs in', async () => {
    const user = userEvent.setup()
    renderAt('/signup')
    expect(document.querySelector('input[type="password"]')).toBeNull()
    await user.type(screen.getByLabelText('Your name'), 'Sam Test')
    await user.type(screen.getByLabelText('Email address'), 'sam.test@example.com')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(
      await screen.findByText('Please accept the terms of use and privacy policy.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('heading', { name: 'Verify your email' }, WAIT)).toBeInTheDocument()
    await typeCode(user, '123456', 'Create account')
    expect(await screen.findByText('Learn home', {}, WAIT)).toBeInTheDocument()
  }, 15_000)
})
