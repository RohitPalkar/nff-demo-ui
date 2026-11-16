'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface CircularProgressRingProps {
  /** Progress percentage (0-100) */
  percent: number
  /** Size in pixels */
  size?: number
  /** Stroke width in pixels */
  strokeWidth?: number
  /** Progress color */
  strokeColor?: string
  /** Track color */
  trackColor?: string
  /** Show percentage label in center */
  showLabel?: boolean
  /** Custom label content */
  label?: React.ReactNode
  /** Custom children for center content (overrides label) */
  children?: React.ReactNode
  /** Animation duration in ms */
  animationDuration?: number
  /** Accessible label */
  ariaLabel?: string
  /** Additional className */
  className?: string
}

/**
 * An animated circular progress ring using SVG.
 * Respects prefers-reduced-motion.
 */
export function CircularProgressRing({
  percent,
  size = 120,
  strokeWidth = 8,
  strokeColor = 'var(--nff-forest-600)',
  trackColor = 'var(--nff-sage-100)',
  showLabel = true,
  label,
  children,
  animationDuration = 1000,
  ariaLabel = 'Learning progress',
  className,
}: CircularProgressRingProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const svgRef = useRef<SVGCircleElement>(null)

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
      setAnimatedPercent(percent)
      return
    }

    let start = 0
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / animationDuration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedPercent(start + (percent - start) * eased)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [percent, animationDuration])

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedPercent / 100) * circumference

  return (
    <div
      className={cn('inline-flex flex-col items-center', className)}
      role="img"
      aria-label={ariaLabel}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          className="transition-colors duration-300"
        />
        {/* Progress */}
        <circle
          ref={svgRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            transition: prefersReducedMotion ? 'none' : undefined,
          }}
        />
      </svg>

      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {children ?? label ?? (
            <span className="text-2xl font-bold text-[var(--nff-forest-900)]">
              {Math.round(animatedPercent)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}