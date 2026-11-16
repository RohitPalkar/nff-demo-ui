import { LEARN_HOME } from '@/services/learning/routes'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Copy, Check } from 'lucide-react'
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
import { cn } from '@/lib/utils'

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

  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)

  async function copyEmail(email: string) {
    await navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  const demoAccounts = [
    { role: 'Practitioner', email: 'practitioner@nff.demo', description: 'Full library access' },
    { role: 'Editor', email: 'editor@nff.demo', description: 'CMS preview access' },
    { role: 'Super Admin', email: 'admin@nff.demo', description: 'Full CMS access' },
  ] as const

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
          We'll email you a 6-digit code. No password needed.
        </p>

        {/* Demo Accounts with Copy Buttons */}
        <div className="mt-6 p-4 rounded-xl bg-[var(--nff-sage-50)] border border-[var(--nff-sage-200)]">
          <p className="text-center nff-caption font-medium text-[var(--nff-forest-700)] mb-3">
            Demo accounts (password: <code className="bg-[var(--nff-sage-200)] px-1.5 py-0.5 rounded text-[var(--nff-forest-900)]">practice123</code>)
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => copyEmail(account.email)}
                className={cn(
                  'relative flex items-center justify-between gap-2 p-3 rounded-lg bg-white border border-[var(--nff-sage-200)]',
                  'hover:border-[var(--nff-sage-300)] hover:shadow-sm transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nff-forest-500)]'
                )}
              >
                <div className="flex flex-col min-w-0">
                  <span className="nff-caption font-medium text-[var(--nff-forest-900)]">{account.role}</span>
                  <span className="nff-caption text-[var(--nff-forest-700)] truncate font-mono text-sm">{account.email}</span>
                  <span className="nff-caption text-[var(--nff-sage-600)]">{account.description}</span>
                </div>
                {copiedEmail === account.email ? (
                  <Check className="size-5 text-[var(--nff-emerald-600)] flex-shrink-0" aria-hidden="true" />
                ) : (
                  <Copy className="size-5 text-[var(--nff-sage-500)] hover:text-[var(--nff-forest-700)] transition-colors flex-shrink-0" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </div>
      </form>
    </AuthCard>
  )
}
