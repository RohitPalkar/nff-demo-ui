import { LEARN_HOME } from '@/services/learning/routes'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthProvider'
import { readJson } from '@/mocks/api'
import { verifyEmail } from '@/services/auth'
import { cn } from '@/lib/utils'
import { AuthCard } from './AuthCard'
import { CodeStep } from './CodeStep'

/**
 * Direct link to the sign-up code step (for example from the verification
 * email). Sign-up itself shows the same step in place.
 */
export function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refresh } = useAuth()
  const email =
    (location.state as { email?: string } | null)?.email ??
    readJson<{ email: string } | null>('nff.pending-signup', null)?.email

  if (!email) {
    return (
      <AuthCard
        title="No sign-up in progress"
        description={<p>Start again to get a new code.</p>}
      >
        <Link to="/signup" className={cn(buttonVariants(), 'h-12 w-full rounded-full text-base')}>
          Create an account
        </Link>
      </AuthCard>
    )
  }

  return (
    <CodeStep
      email={email}
      title="Verify your email"
      submitLabel="Create account"
      onChangeEmail={() => navigate('/signup', { state: { email } })}
      onVerify={async (code) => {
        await verifyEmail(code)
        refresh()
        navigate(LEARN_HOME, { replace: true })
      }}
    />
  )
}
