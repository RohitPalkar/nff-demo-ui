import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'

const TITLES: Record<string, string> = {
  about: 'About',
  explorations: 'Explorations',
  meditations: 'Meditations',
  login: 'Log in',
  signup: 'Create your account',
  'verify-email': 'Verify your email',
  'forgot-password': 'Forgot password',
  'reset-password': 'Reset password',
  journey: 'Your journey',
  'my-journey': 'My journey',
  account: 'Account settings',
  privacy: 'Privacy',
  terms: 'Terms',
  accessibility: 'Accessibility',
  'cookie-preferences': 'Cookie preferences',
  unsubscribe: 'Unsubscribe',
}

interface ComingSoonPageProps {
  title?: string
}

export function ComingSoonPage({ title }: ComingSoonPageProps) {
  const location = useLocation()
  const firstSegment = location.pathname.split('/').filter(Boolean)[0] ?? ''
  const heading = title ?? TITLES[firstSegment] ?? 'This screen'

  return (
    <div className="nff-content py-16 md:py-24">
      <div className="nff-reading mx-auto flex flex-col items-start gap-5">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-nff-bg-brand-subtle text-nff-text-brand"
        >
          <Wrench className="size-5" />
        </span>
        <p className="nff-overline text-nff-text-brand">In the build queue</p>
        <h1 className="nff-heading-h1 text-foreground">{heading}</h1>
        <p className="nff-body-lg text-muted-foreground">
          This screen is specified in <code className="nff-mono-code">docs/screens.md</code>{' '}
          and will be built in a later task. The shell, tokens and mock data are
          already in place.
        </p>
        <Button asChild className="h-11">
          <Link to="/">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to home
          </Link>
        </Button>
      </div>
    </div>
  )
}
