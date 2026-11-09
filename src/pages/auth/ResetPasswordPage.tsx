import { CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { resetPassword } from '@/services/auth'
import { AuthCard, Field, FormAlert, PasswordInput } from './AuthCard'

export function ResetPasswordPage() {
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      setError('Use at least 8 characters, with a letter and a number.')
      return
    }
    if (password !== confirm) {
      setError('The passwords do not match.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await resetPassword(code, password)
      setDone(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AuthCard
        title="Password updated"
        description="You can now log in with your new password."
      >
        <div className="flex flex-col items-start gap-4">
          <CheckCircle2
            aria-hidden="true"
            className="size-10 text-nff-text-success"
          />
          <Button asChild className="h-11 w-full">
            <Link to="/login">Log in</Link>
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Set a new password"
      description="Enter the code from your email and choose a new password."
      footer={
        <Link to="/login" className="text-nff-text-link underline">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormAlert message={error} />
        <Field label="Reset code">
          {(props) => (
            <Input
              {...props}
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ''))
              }
            />
          )}
        </Field>
        <Field label="New password">
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </Field>
        <Field label="Confirm password">
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          )}
        </Field>
        <Button type="submit" className="h-11" disabled={busy}>
          {busy && (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          )}
          Save password
        </Button>
        <p className="nff-caption text-muted-foreground">Demo code: 123456</p>
      </form>
    </AuthCard>
  )
}
