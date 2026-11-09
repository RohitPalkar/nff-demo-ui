import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { signUp } from '@/services/auth'
import { AuthCard, Field, FormAlert, PasswordInput } from './AuthCard'

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name.'),
  email: z.string().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .regex(/[A-Za-z]/, 'Include a letter.')
    .regex(/\d/, 'Include a number.'),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'Please accept the terms and privacy notice.' }),
  }),
})
type Values = z.infer<typeof schema>

export function SignUpPage() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  })
  const accepted = watch('acceptedTerms') === true

  async function onSubmit(values: Values) {
    setFormError(null)
    try {
      await signUp(values)
      navigate('/verify-email', { state: { email: values.email } })
    } catch (error) {
      setFormError(
        (error as Error).message ?? 'Something went wrong. Please try again.',
      )
    }
  }

  return (
    <AuthCard
      title="Create your free account"
      description="Full library, saved progress and one gentle email a day."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-nff-text-link underline">
            Log in
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <FormAlert message={formError} />
        <Field label="Name" error={errors.name?.message}>
          {(props) => (
            <Input {...props} autoComplete="name" {...register('name')} />
          )}
        </Field>
        <Field label="Email" error={errors.email?.message}>
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="email"
              {...register('email')}
            />
          )}
        </Field>
        <Field label="Password" error={errors.password?.message}>
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              {...register('password')}
            />
          )}
        </Field>
        <p className="nff-caption text-muted-foreground">
          At least 8 characters, with a letter and a number.
        </p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={accepted}
              onCheckedChange={(checked) =>
                setValue('acceptedTerms', (checked === true) as true, {
                  shouldValidate: true,
                })
              }
              aria-describedby="terms-error"
            />
            <label htmlFor="terms" className="nff-body-sm">
              I accept the{' '}
              <Link to="/terms" className="text-nff-text-link underline">
                terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-nff-text-link underline">
                privacy notice
              </Link>
              .
            </label>
          </div>
          {errors.acceptedTerms && (
            <p
              id="terms-error"
              role="alert"
              className="nff-body-sm text-nff-text-error"
            >
              {errors.acceptedTerms.message}
            </p>
          )}
        </div>
        <Button type="submit" className="h-11" disabled={isSubmitting}>
          {isSubmitting && (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          )}
          Create account
        </Button>
      </form>
    </AuthCard>
  )
}
