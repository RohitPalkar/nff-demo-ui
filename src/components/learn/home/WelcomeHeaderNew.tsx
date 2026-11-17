'use client'

import type { HomeAction } from '@/services/learning/home'

function getTimeBasedGreeting(firstName?: string): string {
  const hour = new Date().getHours()
  const name = firstName ? `${firstName}, ` : ''

  if (hour < 12) {
    return `${name}Good morning. A gentle start to your day.`
  } else if (hour < 17) {
    return `${name}Good afternoon. A moment to pause and breathe.`
  } else {
    return `${name}Good evening. Time to unwind and reflect.`
  }
}

export function WelcomeHeaderNew({
  firstName,
  action,
}: {
  firstName: string
  action: HomeAction | null
}) {
  const greeting = getTimeBasedGreeting(firstName)

  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5 text-[var(--nff-sage-500)]" aria-hidden="true">
            <path d="M12 2C8 4 4 8 4 8s4 4 8 4 8-4 8-8" />
            <path d="M12 8v6" />
            <path d="M8 10h8" />
          </svg>
          <h1 className="nff-heading-h1 text-foreground">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
          </h1>
        </div>
        <p className="max-w-2xl nff-body-lg text-[var(--nff-text-secondary)] text-pretty">
          {greeting}
        </p>
      </div>
      {action && (
        <a
          href={action.href}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--nff-forest-900)] text-[var(--nff-ivory-50)] nff-label-md font-medium transition-colors hover:bg-[var(--nff-forest-700)] nff-focus-ring"
        >
          {action.label}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      )}
    </header>
  )
}