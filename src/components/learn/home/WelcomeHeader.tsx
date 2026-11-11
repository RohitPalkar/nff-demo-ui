import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { HomeAction } from '@/services/learning/home'
import { PRIMARY_ACTION } from './homeStyles'

export function WelcomeHeader({
  firstName,
  intro,
  action,
}: {
  firstName: string
  intro: string
  action: HomeAction | null
}) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="nff-heading-h1 text-foreground">
          {firstName ? `Welcome, ${firstName}` : 'Welcome'}
        </h1>
        <p className="max-w-2xl nff-body-lg text-nff-text-secondary">{intro}</p>
      </div>
      {action && (
        <Link to={action.href} className={`${PRIMARY_ACTION} w-full sm:w-auto`}>
          {action.label}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      )}
    </header>
  )
}
