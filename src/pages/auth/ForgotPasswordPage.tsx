import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { requestPasswordReset } from '@/services/auth'
import { AuthCard, Field, FormAlert } from './AuthCard'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <AuthCard
        title="Check your email"
        description="If an account exists for that address, we have sent a reset code."
        footer={
          <Link to="/login" className="text-nff-text-link underline">
            Back to log in
          </Link>
        }
      >
        <Button asChild className="h-11 w-full">
          <Link to="/reset-password">Enter reset code</Link>
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email and we will send a reset code."
      footer={
        <Link to="/login" className="text-nff-text-link underline">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormAlert message={error} />
        <Field label="Email">
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          )}
        </Field>
        <Button type="submit" className="h-11" disabled={busy}>
          {busy && (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          )}
          Send reset link
        </Button>
      </form>
    </AuthCard>
  )
}
