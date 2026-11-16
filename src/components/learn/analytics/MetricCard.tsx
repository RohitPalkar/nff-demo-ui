'use client'

import { cn } from '@/lib/utils'

interface MetricCardProps {
  /** The main numeric value */
  value: string | number
  /** Label describing the metric */
  label: string
  /** Icon component or element */
  icon?: React.ReactNode
  /** Background tint color */
  tint?: 'sage' | 'forest' | 'amber' | 'blue' | 'purple'
  /** Trend indicator */
  trend?: {
    value: number
    label?: string
  }
  /** Click handler */
  onClick?: () => void
  /** Additional className */
  className?: string
}

/**
 * Compact statistic card with icon, value, label, and optional trend.
 */
export function MetricCard({
  value,
  label,
  icon,
  tint = 'sage',
  trend,
  onClick,
  className,
}: MetricCardProps) {
  const tintClasses = {
    sage: 'bg-[var(--nff-sage-100)] text-[var(--nff-forest-700)]',
    forest: 'bg-[var(--nff-forest-100)] text-[var(--nff-forest-800)]',
    amber: 'bg-[var(--nff-amber-100)] text-[var(--nff-amber-800)]',
    blue: 'bg-[var(--nff-sky-100)] text-[var(--nff-sky-800)]',
    purple: 'bg-[var(--nff-violet-100)] text-[var(--nff-violet-800)]',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col gap-2 p-4 sm:p-5 rounded-2xl transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nff-forest-500)]',
        tintClasses[tint],
        onClick && 'cursor-pointer',
        className
      )}
      disabled={!onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="nff-caption uppercase tracking-wider opacity-80">{label}</p>
          <p className="mt-1 nff-heading-h3 font-bold text-[var(--nff-forest-900)] truncate">
            {value}
          </p>
          {trend && (
            <p className="mt-1.5 nff-caption font-medium text-[var(--nff-forest-600)] flex items-center gap-1">
              <span className={trend.value >= 0 ? 'text-[var(--nff-emerald-600)]' : 'text-[var(--nff-rose-600)]'}>
                {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}%
              </span>
              {trend.label && <span className="opacity-70">{trend.label}</span>}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'flex-shrink-0 size-12 rounded-xl flex items-center justify-center opacity-30',
              'hover:opacity-50 transition-opacity'
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
    </button>
  )
}