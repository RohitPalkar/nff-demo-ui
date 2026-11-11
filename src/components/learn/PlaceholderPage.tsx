import type { ReactNode } from 'react'

interface PlaceholderPageProps {
  title: string
  description: string
  children?: ReactNode
}

/**
 * Deliberate, temporary placeholder for a screen designed in a later phase.
 * Shows only real data (passed in as children) and says plainly what is
 * coming.
 */
export function PlaceholderPage({ title, description, children }: PlaceholderPageProps) {
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 sm:px-6 md:py-12 lg:px-10">
      <header className="flex flex-col gap-2">
        <h1 className="nff-heading-h1 text-foreground">{title}</h1>
        <p className="max-w-2xl nff-body-lg text-nff-text-secondary">{description}</p>
      </header>
      {children}
      <p className="max-w-2xl border-l-2 border-[var(--nff-sage-300)] pl-4 nff-body-sm text-nff-text-secondary">
        This screen is a temporary placeholder. Its full design arrives in a later phase.
      </p>
    </div>
  )
}
