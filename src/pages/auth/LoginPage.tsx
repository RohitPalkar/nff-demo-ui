import { LEARN_HOME } from '@/services/learning/routes'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ChevronDown, Mail, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/AuthProvider'
import { requestSignInCode } from '@/services/auth'
import { AuthCard, Field, FormAlert, authLink } from './AuthCard'
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
  const [demoExpanded, setDemoExpanded] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: state?.email ?? '' },
  })

  const demoAccounts = [
    { role: 'Practitioner', email: 'practitioner@nff.demo', description: 'Full library access' },
    { role: 'Super Admin', email: 'admin@nff.demo', description: 'Full CMS access' },
  ] as const

  async function autofillAndLogin(email: string) {
    // Set the email in the form and submit
    const form = document.querySelector('form')
    if (form) {
      // Set the email input value
      const emailInput = form.querySelector('input[type="email"]') as HTMLInputElement
      if (emailInput) {
        emailInput.value = email
        // Trigger change event so react-hook-form picks it up
        emailInput.dispatchEvent(new Event('input', { bubbles: true }))
        emailInput.dispatchEvent(new Event('change', { bubbles: true }))
      }
      // Submit the form
      form.requestSubmit()
    }
  }

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

        {/* Demo Accounts - Collapsible Section */}
        <section aria-labelledby="demo-heading" className="border-t border-[var(--nff-border-default)] pt-5">
          <button
            type="button"
            onClick={() => setDemoExpanded(!demoExpanded)}
            className={cn(
              'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl',
              'bg-[var(--nff-sage-50)] border border-[var(--nff-sage-200)]',
              'hover:bg-[var(--nff-sage-100)] hover:border-[var(--nff-sage-300)]',
              'transition-all duration-200 nff-focus-ring'
            )}
            aria-expanded={demoExpanded}
            aria-controls="demo-accounts"
          >
            <div className="flex items-center gap-3">
              <ChevronDown
                className={cn(
                  'size-5 text-[var(--nff-icon-secondary)] transition-transform duration-200',
                  demoExpanded && 'rotate-180'
                )}
                aria-hidden="true"
              />
              <div className="flex-1 text-left">
                <p className="nff-label-md font-medium text-[var(--nff-forest-900)]">
                  Explore with a demo account
                </p>
                <p className="nff-caption text-[var(--nff-text-secondary)]">
                  Try Meadow using one of our sample accounts
                </p>
              </div>
            </div>
            <span className="nff-caption text-[var(--nff-text-tertiary)]">
              {demoExpanded ? 'Hide' : 'Show'} options
            </span>
          </button>

          {/* Expanded Demo Accounts */}
          <div
            id="demo-accounts"
            role="region"
            aria-labelledby="demo-heading"
            className={cn(
              'overflow-hidden transition-all duration-300 ease-[var(--nff-easing-standard)]',
              demoExpanded ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'
            )}
          >
            <div className="space-y-3" style={{ minHeight: demoExpanded ? 'auto' : 0 }}>
              {/* Demo Account Cards */}
              <div className="grid gap-3 sm:grid-cols-2" role="list">
                {demoAccounts.map((account, index) => (
                  <article
                    key={account.email}
                    role="listitem"
                    className={cn(
                      'relative flex flex-col gap-2 p-4 rounded-xl',
                      'bg-white border border-[var(--nff-sage-200)]',
                      'hover:border-[var(--nff-sage-300)] hover:shadow-sm',
                      'transition-all duration-200',
                      'focus-within:ring-2 focus-within:ring-[var(--nff-forest-500)]'
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex flex-col gap-1.5">
                      <span className="nff-caption font-semibold text-[var(--nff-forest-900)] uppercase tracking-wide">
                        {account.role}
                      </span>
                      <span className="nff-body-sm font-mono text-[var(--nff-forest-800)] break-all">
                        {account.email}
                      </span>
                      <span className="nff-caption text-[var(--nff-text-secondary)]">
                        {account.description}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        'mt-2 inline-flex items-center justify-center gap-2 px-3 py-2',
                        'rounded-lg border border-[var(--nff-sage-200)]',
                        'bg-[var(--nff-sage-50)] text-[var(--nff-forest-700)]',
                        'hover:bg-[var(--nff-sage-100)] hover:border-[var(--nff-sage-300)]',
                        'text-sm font-medium transition-all duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nff-forest-500)]'
                      )}
                      onClick={() => autofillAndLogin(account.email)}
                      aria-label={`Use ${account.role} demo account`}
                    >
                      <ArrowRight className="size-4" aria-hidden="true" />
                      <span>Use this account</span>
                    </button>
                  </article>
                ))}
              </div>
              <p className="mt-3 text-center nff-caption text-[var(--nff-text-tertiary)]">
                Demo credentials are provided for testing purposes only.
              </p>
            </div>
          </div>
        </section>
      </form>
    </AuthCard>
  )
}