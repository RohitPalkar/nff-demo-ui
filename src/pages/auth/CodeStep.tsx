import { Loader2, MailCheck } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  CODE_LENGTH,
  CODE_TTL_MS,
  LOCK_MS,
  MAX_CODE_ATTEMPTS,
  RESEND_COOLDOWN_S,
  resendCode,
} from '@/services/auth'
import { demoCode } from '@/mocks/db'
import { AuthCard, FormAlert } from './AuthCard'
import { OtpInput } from './OtpInput'

/**
 * Step 2 of both sign-in and sign-up: enter the 6-digit code sent to the
 * email. It never submits on its own: signing in changes the page, so it
 * waits for the button (WCAG 2.2 AAA 3.2.5 Change on Request). Pasting or
 * autofilling the code is supported, so nothing has to be remembered or
 * retyped (3.3.8 / 3.3.9 Accessible Authentication).
 */
export function CodeStep({
  email,
  title = 'Check your email',
  submitLabel,
  onVerify,
  onChangeEmail,
  footer,
}: {
  email: string
  title?: string
  submitLabel: string
  /** Throws an Error with a user-facing message when the code is refused. */
  onVerify: (code: string) => Promise<void>
  onChangeEmail: () => void
  footer?: ReactNode
}) {
  const labelId = useId()
  const hintId = useId()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cooldown])

  async function verify(value = code) {
    if (busy) return
    if (value.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code from your email.`)
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await onVerify(value)
    } catch (e) {
      const failure = e as { code?: string; message?: string }
      setLocked(failure.code === 'too_many_attempts')
      setError(failure.message ?? 'Something went wrong. Please try again.')
      setCode('')
      setBusy(false)
      // The boxes were disabled while checking; put the cursor back in the first.
      window.requestAnimationFrame(() =>
        document.querySelector<HTMLInputElement>(`[aria-labelledby="${CSS.escape(labelId)}"] input`)?.focus(),
      )
    }
  }

  async function resend() {
    setError(null)
    try {
      await resendCode(email)
      setCode('')
      setNotice(`A new code is on its way to ${email}.`)
      setCooldown(RESEND_COOLDOWN_S)
    } catch (e) {
      setNotice(null)
      setError((e as Error).message)
    }
  }

  return (
    <AuthCard
      icon={<MailCheck className="size-5" />}
      title={title}
      description={
        <p>
          We sent a {CODE_LENGTH}-digit code to{' '}
          <strong className="font-medium text-foreground">{email}</strong>.{' '}
          <button
            type="button"
            onClick={onChangeEmail}
            className="rounded-sm font-medium text-nff-text-link underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Change
          </button>
        </p>
      }
      footer={footer}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void verify()
        }}
        className="flex flex-col gap-5"
      >
        <FormAlert message={error} />
        {notice && (
          <p role="status" className="rounded-md bg-[var(--nff-sage-50)] px-3 py-2 nff-body-sm text-nff-text-success">
            {notice}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <span id={labelId} className="nff-label-md text-foreground">
            Verification code
          </span>
          <OtpInput
            value={code}
            onChange={(value) => {
              setCode(value)
              if (error && !locked) setError(null)
            }}
            invalid={Boolean(error) && !locked}
            disabled={busy || locked}
            labelId={labelId}
            describedBy={hintId}
          />
          <p id={hintId} className="nff-caption text-muted-foreground">
            The code works for {CODE_TTL_MS / 60_000} minutes. After {MAX_CODE_ATTEMPTS} wrong tries,
            sign-in for this email pauses for {LOCK_MS / 60_000} minutes.
          </p>
        </div>
        <Button type="submit" className="h-12 rounded-full text-base" disabled={busy || locked}>
          {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {submitLabel}
        </Button>
        <p className="text-center nff-body-sm text-muted-foreground">
          Didn’t get it? Check spam, or{' '}
          {cooldown > 0 ? (
            <span aria-live="polite">resend in {cooldown}s</span>
          ) : (
            <button
              type="button"
              onClick={() => void resend()}
              disabled={locked}
              className="rounded-sm font-medium text-nff-text-link underline underline-offset-4 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              resend the code
            </button>
          )}
          .
        </p>
        <p className="text-center nff-caption text-muted-foreground">Demo code: {demoCode}</p>
      </form>
    </AuthCard>
  )
}
