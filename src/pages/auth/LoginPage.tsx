import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/AuthProvider'
import { DEMO_PASSWORD } from '@/services/auth'
import { AuthCard, Field, FormAlert, PasswordInput } from './AuthCard'

const schema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})
type Values = z.infer<typeof schema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const [unverified, setUnverified] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const from =
    (location.state as { from?: string } | null)?.from ?? undefined

  async function onSubmit(values: Values) {
    setFormError(null)
    setUnverified(false)
    try {
      const user = await login(values.email, values.password)
      const fallback = user.role === 'practitioner' ? '/journey' : '/cms'
      navigate(from ?? fallback, { replace: true })
    } catch (error) {
      const e = error as { code?: string; message?: string }
      if (e.code === 'unverified') setUnverified(true)
      setFormError(e.message ?? 'Something went wrong. Please try again.')
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      description="Log in to pick up where you left off."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="text-nff-text-link underline">
            Create a free account
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
        {unverified && (
          <Link to="/verify-email" className="nff-body-sm text-nff-text-link underline">
            Go to email verification
          </Link>
        )}
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
              autoComplete="current-password"
              {...register('password')}
            />
          )}
        </Field>
        <Link
          to="/forgot-password"
          className="w-fit nff-body-sm text-nff-text-link underline"
        >
          Forgot password?
        </Link>
        <Button type="submit" className="h-11" disabled={isSubmitting}>
          {isSubmitting && (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          )}
          Log in
        </Button>
        <p className="nff-caption text-muted-foreground">
          Demo: practitioner@nff.demo / {DEMO_PASSWORD}
        </p>
      </form>
    </AuthCard>
  )
}
