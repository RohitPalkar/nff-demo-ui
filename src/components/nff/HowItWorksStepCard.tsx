import { ArrowRight, type LucideIcon } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface HowItWorksStepCardProps {
  step: number
  icon: LucideIcon
  title: string
  description: string
  /** Optional link to the place this step happens. Without it the card is
   *  purely informational and has no hover or focus state. */
  action?: { to: string; label: string }
  /** Reveal delay for the card; the icon follows shortly after. */
  delayMs?: number
  className?: string
}

const delay = (ms: number) => ({ '--nff-delay': `${ms}ms` }) as CSSProperties

/**
 * One step of "How it works". Icon and step number, a short heading, a
 * description and an optional quiet link at the bottom. Between 768 and 1023
 * the card lays out in a row so a single column still uses the width.
 */
export function HowItWorksStepCard({
  step,
  icon: Icon,
  title,
  description,
  action,
  delayMs = 0,
  className,
}: HowItWorksStepCardProps) {
  return (
    <li
      className={cn(
        'nff-reveal-fade flex h-full flex-col gap-6 rounded-[var(--nff-radius-role-card-feature)] border border-nff-border-default bg-nff-bg-surface p-6 shadow-nff-1 md:max-lg:flex-row md:max-lg:gap-10 md:max-lg:p-8 lg:p-8',
        className,
      )}
      style={delay(delayMs)}
    >
      <div className="flex items-center gap-4 md:max-lg:w-36 md:max-lg:shrink-0 md:max-lg:flex-col md:max-lg:items-start">
        <span
          aria-hidden="true"
          className="nff-reveal-pop flex size-12 shrink-0 items-center justify-center rounded-full bg-nff-bg-tonal text-[var(--nff-forest-700)]"
          style={delay(delayMs + 150)}
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
        <span className="nff-overline text-nff-text-tertiary">
          Step {String(step).padStart(2, '0')}
        </span>
      </div>

      <div className="flex flex-1 flex-col">
        <h3 className="nff-title-section text-foreground">{title}</h3>
        <p className="mt-2 nff-body-md text-pretty text-nff-text-secondary">{description}</p>
        {action && (
          <div className="mt-auto pt-6">
            <Link
              to={action.to}
              className="group inline-flex min-h-11 items-center gap-1.5 rounded-sm nff-label-md text-nff-text-link-default underline decoration-transparent underline-offset-4 transition-colors duration-[var(--nff-duration-fast)] hover:decoration-current nff-focus-ring"
            >
              {action.label}
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-[var(--nff-duration-fast)] group-hover:translate-x-1"
              />
            </Link>
          </div>
        )}
      </div>
    </li>
  )
}
