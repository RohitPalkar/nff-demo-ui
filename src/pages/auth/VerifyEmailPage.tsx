import { LEARN_HOME } from '@/services/learning/routes'
import { Loader2, MailCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/AuthProvider'
import { readJson } from '@/mocks/api'
import { resendVerification, verifyEmail } from '@/services/auth'
import { AuthCard, Field, FormAlert } from './AuthCard'

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refresh } = useAuth()
  const email =
    (location.state as { email?: string } | null)?.email ??
    readJson<{ email: string } | null>('nff.pending-signup', null)?.email
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cooldown])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await verifyEmail(code)
      refresh()
      navigate(LEARN_HOME, { replace: true })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setError(null)
    try {
      await resendVerification()
      setNotice('A new code is on its way.')
      setCooldown(60)
    } catch (e) {
      setNotice(null)
      setError((e as Error).message)
    }
  }

  return (
    <AuthCard
      title="Check your inbox"
      description={
        email ? (
          <>
            We sent a 6-digit code to <strong>{email}</strong>.
          </>
        ) : (
          'We sent you a 6-digit code.'
        )
      }
      footer={
        <>
          <Link to="/signup" className="text-nff-text-link underline">
            Change email
          </Link>{' '}
          ·{' '}
          <Link to="/login" className="text-nff-text-link underline">
            Back to log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-nff-bg-brand-subtle text-nff-icon-brand"
        >
          <MailCheck className="size-6" />
        </span>
        <FormAlert message={error} />
        {notice && (
          <p role="status" className="nff-body-sm text-nff-text-success">
            {notice}
          </p>
        )}
        <Field label="Verification code">
          {(props) => (
            <Input
              {...props}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ''))
              }
              className="text-center tracking-[0.5em]"
            />
          )}
        </Field>
        <Button type="submit" className="h-11" disabled={busy}>
          {busy && (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          )}
          Verify email
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11"
          disabled={cooldown > 0}
          onClick={() => void resend()}
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </Button>
        <p className="nff-caption text-muted-foreground">Demo code: 123456</p>
      </form>
    </AuthCard>
  )
}
