import { LEARN_HOME } from '@/services/learning/routes'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/AuthProvider'
import { signUp, verifyEmail } from '@/services/auth'
import { AuthCard, Field, FormAlert, authLink } from './AuthCard'
import { AuthHighlights } from './AuthHighlights'
import { CodeStep } from './CodeStep'

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name.'),
  email: z.string().trim().email('Enter a valid email address.'),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'Please accept the terms of use and privacy policy.' }),
  }),
})
type Values = z.infer<typeof schema>

/**
 * Create an account with a name and email address; a one-time code sent to
 * that address verifies it (SOW v1.3 §3.2 #1). No password is set.
 */
export function SignUpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refresh } = useAuth()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [registered, setRegistered] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: (location.state as { email?: string } | null)?.email ?? '',
    },
  })
  const accepted = watch('acceptedTerms') === true

  async function onSubmit(values: Values) {
    setFormError(null)
    setRegistered(null)
    try {
      const { email } = await signUp(values)
      setSentTo(email)
    } catch (error) {
      const e = error as { code?: string; message?: string }
      if (e.code === 'email_registered') setRegistered(values.email.trim())
      setFormError(e.message ?? 'Something went wrong. Please try again.')
    }
  }

  if (sentTo) {
    return (
      <CodeStep
        email={sentTo}
        title="Verify your email"
        submitLabel="Create account"
        onChangeEmail={() => setSentTo(null)}
        onVerify={async (code) => {
          await verifyEmail(code)
          refresh()
          navigate(LEARN_HOME, { replace: true })
        }}
      />
    )
  }

  return (
    <AuthCard
      title="Create your account"
      description={
        <p>
          Already have an account?{' '}
          <Link to="/login" className={authLink}>
            Log in
          </Link>
        </p>
      }
      footer={<AuthHighlights heading="With your account" />}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <FormAlert message={formError} />
        {registered && (
          <Link to="/login" state={{ email: registered }} className={`-mt-1 w-fit nff-body-sm ${authLink}`}>
            Log in as {registered}
          </Link>
        )}
        <Field label="Your name" error={errors.name?.message}>
          {(props) => (
            <Input
              {...props}
              autoComplete="name"
              className="h-12 rounded-xl px-4 text-base md:text-base"
              {...register('name')}
            />
          )}
        </Field>
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
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              className="mt-0.5"
              checked={accepted}
              onCheckedChange={(checked) =>
                setValue('acceptedTerms', (checked === true) as true, { shouldValidate: true })
              }
              aria-invalid={Boolean(errors.acceptedTerms)}
              aria-describedby={errors.acceptedTerms ? 'terms-error' : undefined}
            />
            <label htmlFor="terms" className="nff-body-sm text-muted-foreground">
              I agree to the{' '}
              <Link to="/terms" className={authLink}>
                terms of use
              </Link>{' '}
              and have read the{' '}
              <Link to="/privacy" className={authLink}>
                privacy policy
              </Link>
              .
            </label>
          </div>
          {errors.acceptedTerms && (
            <p id="terms-error" role="alert" className="nff-body-sm text-nff-text-error">
              {errors.acceptedTerms.message}
            </p>
          )}
        </div>
        <Button type="submit" className="h-12 rounded-full text-base" disabled={isSubmitting}>
          {isSubmitting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Continue
        </Button>
        <p className="text-center nff-body-sm text-muted-foreground">
          We’ll email you a 6-digit code to confirm it’s you. No password needed.
        </p>
      </form>
    </AuthCard>
  )
}
