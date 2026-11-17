import { LEARN_HOME } from '@/services/learning/routes'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Mail } from 'lucide-react'
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

const DEMO_EMAILS = [
  { persona: 'Practitioner', email: 'practitioner@nff.demo' },
  { persona: 'Super admin', email: 'admin@nff.demo' },
] as const

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
    setValue,
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
        <p className="nff-body-lg text-[var(--nff-text-secondary)]">
          Welcome back. Enter your email and we&apos;ll send a one-time code.
        </p>
      }
      footer={<AuthHighlights heading="A little more about Meadow" />}
    >
      <form onSubmit={handleSubmit(sendCode)} noValidate className="flex flex-col gap-5">
        <FormAlert message={formError} />
        {noAccount && (
          <Link to="/signup" state={{ email: noAccount }} className={`-mt-1 w-fit nff-body-sm ${authLink}`}>
            Create an account with {noAccount}
          </Link>
        )}

        {/* Email Field */}
        <Field label="Email address" error={errors.email?.message}>
          {(props) => (
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[var(--nff-icon-secondary)] pointer-events-none"
                aria-hidden="true"
              />
              <Input
                {...props}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-12 rounded-xl pl-12 pr-4 text-base"
                {...register('email')}
              />
            </div>
          )}
        </Field>

        {/* Continue Button */}
        <Button type="submit" className="h-12 rounded-full text-base font-medium" disabled={isSubmitting}>
          {isSubmitting && <Loader2 aria-hidden="true" className="size-4 animate-spin mr-2" />}
          Continue
        </Button>

        {/* OTP Explanation */}
        <p className="text-center nff-body-sm text-[var(--nff-text-tertiary)]">
          We&apos;ll email you a 6-digit code. No password needed.
        </p>

        <section aria-labelledby="demo-heading" className="flex flex-col items-center gap-2 border-t border-[var(--nff-ivory-200)] pt-5 text-center">
          <p id="demo-heading" className="nff-body-sm text-[var(--nff-text-secondary)]">
            Trying the demo? Use one of these emails.
          </p>
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            {DEMO_EMAILS.map(({ persona, email }) => (
              <li key={email}>
                <button
                  type="button"
                  onClick={() => setValue('email', email, { shouldValidate: true })}
                  aria-label={`Use the ${persona} demo email, ${email}`}
                  className={`nff-body-sm ${authLink}`}
                >
                  {email}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </form>
    </AuthCard>
  )
}