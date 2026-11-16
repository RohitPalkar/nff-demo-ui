'use client'

import { useEffect, useRef, useState } from 'react'
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
  /** Whether to animate the value on mount */
  animate?: boolean
  /** Animation duration in ms */
  animationDuration?: number
  /** Additional className */
  className?: string
}

/**
 * Compact statistic card with icon, value, label, optional trend, and animated counter.
 */
export function MetricCard({
  value,
  label,
  icon,
  tint = 'sage',
  trend,
  onClick,
  animate = true,
  animationDuration = 1000,
  className,
}: MetricCardProps) {
  const shouldAnimate = animate
  const tintClasses = {
    sage: 'bg-[var(--nff-sage-100)] text-[var(--nff-forest-700)]',
    forest: 'bg-[var(--nff-forest-100)] text-[var(--nff-forest-800)]',
    amber: 'bg-[var(--nff-amber-100)] text-[var(--nff-amber-800)]',
    blue: 'bg-[var(--nff-sky-100)] text-[var(--nff-sky-800)]',
    purple: 'bg-[var(--nff-violet-100)] text-[var(--nff-violet-800)]',
  }

  const [displayValue, setDisplayValue] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const prefersReducedMotion = useRef(false)

  const numericValue = typeof value === 'string' ? parseInt(value.replace(/,/g, ''), 10) : value

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.current = mediaQuery.matches
    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (!shouldAnimate || prefersReducedMotion.current) {
      setDisplayValue(numericValue)
      return
    }

    const startTime = performance.now()
    const duration = animationDuration

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.floor(numericValue * eased))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, shouldAnimate, animationDuration])

  const formatValue = (val: number) => {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K'
    return val.toLocaleString()
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      className={cn(
        'relative flex flex-col gap-2 p-4 sm:p-5 rounded-2xl transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nff-forest-500)]',
        'active:scale-[0.98] active:transition-none',
        tintClasses[tint],
        onClick && 'cursor-pointer',
        isHovered && 'shadow-lg',
        isPressed && 'scale-[0.98]',
        className
      )}
      disabled={!onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="nff-caption uppercase tracking-wider opacity-80">{label}</p>
          <p className="mt-1 nff-heading-h3 font-bold text-[var(--nff-forest-900)] truncate">
            {formatValue(displayValue)}
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
              'hover:opacity-50 transition-opacity',
              'hover:scale-110 transition-transform duration-200'
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