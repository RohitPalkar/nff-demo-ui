import { LEARN_HOME } from '@/services/learning/routes'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/AuthProvider'
import { requestSignInCode } from '@/services/auth'
import { AuthCard, Field, FormAlert, authLink } from './AuthCard'
import { AuthHighlights } from './AuthHighlights'
import { CodeStep } from './CodeStep'

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
})
type Values = z.infer<typeof schema>

/**
 * Log in with an email address and a one-time code (SOW v1.3 §3.2 #2 and
 * §3.3 #1). Practitioners and staff use the same screen; staff land in the
 * CMS. No passwords and no social sign-in in this phase.
 */
export function LoginPage() {
  const { signInWithCode } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { from?: string; email?: string } | null
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [noAccount, setNoAccount] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: state?.email ?? '' },
  })

  async function sendCode(values: Values) {
    setFormError(null)
    setNoAccount(null)
    try {
      const { email } = await requestSignInCode(values.email)
      setSentTo(email)
    } catch (error) {
      const e = error as { code?: string; message?: string }
      if (e.code === 'no_account') setNoAccount(values.email.trim())
      setFormError(e.message ?? 'Something went wrong. Please try again.')
    }
  }

  if (sentTo) {
    return (
      <CodeStep
        email={sentTo}
        submitLabel="Log in"
        onChangeEmail={() => setSentTo(null)}
        onVerify={async (code) => {
          const user = await signInWithCode(sentTo, code)
          const fallback = user.role === 'practitioner' ? LEARN_HOME : '/cms'
          navigate(state?.from ?? fallback, { replace: true })
        }}
      />
    )
  }

  return (
    <AuthCard
      title="Log in"
      description={
        <p>
          New to Meadow?{' '}
          <Link to="/signup" state={{ email: getValues('email') }} className={authLink}>
            Create a free account
          </Link>
        </p>
      }
      footer={<AuthHighlights heading="Pick up where you left off" />}
    >
      <form onSubmit={handleSubmit(sendCode)} noValidate className="flex flex-col gap-4">
        <FormAlert message={formError} />
        {noAccount && (
          <Link to="/signup" state={{ email: noAccount }} className={`-mt-1 w-fit nff-body-sm ${authLink}`}>
            Create an account with {noAccount}
          </Link>
        )}
        <Field label="Email address" error={errors.email?.message}>
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="h-12 rounded-xl px-4 text-base md:text-base"
              {...register('email')}
            />
          )}
        </Field>
        <Button type="submit" className="h-12 rounded-full text-base" disabled={isSubmitting}>
          {isSubmitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Continue
        </Button>
        <p className="text-center nff-body-sm text-muted-foreground">
          We’ll email you a 6-digit code. No password needed.
        </p>
        <p className="text-center nff-caption text-muted-foreground">
          Demo: practitioner@nff.demo, editor@nff.demo or admin@nff.demo (super admin)
        </p>
      </form>
    </AuthCard>
  )
}
