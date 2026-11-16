'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { WeeklyActivityDay } from '@/services/learning/home'

interface WeeklyActivityChartProps {
  data: WeeklyActivityDay[]
  /** Metric to display: 'lessons' | 'minutes' */
  metric?: 'lessons' | 'minutes'
  /** Height in pixels */
  height?: number
  /** Show tooltips on hover */
  showTooltips?: boolean
  /** Additional className */
  className?: string
}

/**
 * A seven-day bar chart showing daily learning activity.
 * Bars animate on mount and reveal values on hover.
 * Respects prefers-reduced-motion.
 */
export function WeeklyActivityChart({
  data,
  metric = 'lessons',
  height = 160,
  showTooltips = true,
  className,
}: WeeklyActivityChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [animated, setAnimated] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimated(true)
      return
    }
    // Staggered animation
    const timer = setTimeout(() => setAnimated(true), 200)
    return () => clearTimeout(timer)
  }, [prefersReducedMotion])

  const values = data.map((d) => (metric === 'lessons' ? d.lessonsCompleted : d.minutesListened))
  const maxValue = Math.max(...values, 1)

  return (
    <div
      className={cn('relative w-full', className)}
      role="img"
      aria-label={`Weekly learning activity: ${metric === 'lessons' ? 'lessons completed' : 'minutes listened'}`}
    >
      <div
        className="flex items-end justify-between gap-1 h-full"
        style={{ height }}
        onMouseLeave={() => showTooltips && setHoveredIndex(null)}
      >
        {data.map((day, index) => {
          const value = metric === 'lessons' ? day.lessonsCompleted : day.minutesListened
          const barHeightPercent = Math.max((value / maxValue) * 100, value > 0 ? 8 : 0)

          return (
            <div
              key={day.date}
              className="relative flex-1 flex flex-col items-center gap-1.5"
              onMouseEnter={() => showTooltips && setHoveredIndex(index)}
              onMouseLeave={() => showTooltips && setHoveredIndex(null)}
            >
              {/* Tooltip */}
              {showTooltips && hoveredIndex === index && value > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs font-medium text-white bg-[var(--nff-forest-900)] rounded shadow-lg whitespace-nowrap z-10 animate-in fade-in-150">
                  {value} {metric === 'lessons' ? (value === 1 ? 'lesson' : 'lessons') : 'min'}
                </div>
              )}

              {/* Bar */}
              <div
                className={cn(
                  'relative w-full flex items-end',
                  day.isToday && 'bar-today'
                )}
                style={{ height: '100%' }}
              >
                <div
                  className={cn(
                    'w-full rounded-t transition-all duration-700 ease-out',
                    animated ? 'h-full' : 'h-0',
                    day.isToday && 'bg-[var(--nff-forest-500)]',
                    !day.isToday && 'bg-[var(--nff-sage-300)]',
                    'hover:bg-[var(--nff-forest-400)]'
                  )}
                  style={{
                    height: animated ? `${barHeightPercent}%` : '0%',
                    transitionDelay: prefersReducedMotion
                      ? '0ms'
                      : `${index * 80}ms`,
                  }}
                />
              </div>

              {/* Day label */}
              <span
                className={cn(
                  'nff-caption font-medium transition-colors',
                  day.isToday ? 'text-[var(--nff-forest-700)]' : 'text-[var(--nff-slate-500)]'
                )}
              >
                {day.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}