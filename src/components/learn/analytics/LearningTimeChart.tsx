'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import type { LearningTimeSeriesPoint } from '@/services/learning/home'

interface LearningTimeChartProps {
  data: LearningTimeSeriesPoint[]
  /** Metric to display: 'minutes' | 'lessons' */
  metric?: 'minutes' | 'lessons'
  /** Height in pixels */
  height?: number
  /** Additional className */
  className?: string
}

interface TooltipPayload {
  value: number
  name: string
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[]; metric?: string }) {
  if (!active || !payload || !payload[0]) return null
  const value = payload[0].value
  return (
    <div className="px-2 py-1.5 text-xs font-medium text-white bg-[var(--nff-forest-900)] rounded shadow-lg">
      {value} {payload[0].name === 'minutes' ? 'min' : 'lessons'}
    </div>
  )
}

/**
 * Area chart showing learning time across recent weeks.
 * Uses soft green gradient fill with minimal styling.
 * Respects prefers-reduced-motion.
 */
export function LearningTimeChart({
  data,
  metric = 'minutes',
  height = 180,
  className,
}: LearningTimeChartProps) {
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
    const timer = setTimeout(() => setAnimated(true), 300)
    return () => clearTimeout(timer)
  }, [prefersReducedMotion])

  const formattedData = data.map((d) => ({
    week: d.week,
    value: metric === 'minutes' ? d.minutes : d.lessons,
  }))

  const maxValue = Math.max(...formattedData.map((d) => d.value), 1)

  return (
    <div
      className={cn('w-full', className)}
      role="img"
      aria-label={metric === 'minutes' ? 'Learning time over 6 weeks' : 'Lessons completed over 6 weeks'}
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="learning-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--nff-forest-400)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--nff-forest-400)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--nff-sage-200)"
            vertical={false}
            horizontal={true}
          />
          <XAxis
            dataKey="week"
            tick={{ fill: 'var(--nff-slate-500)', fontSize: 11, fontFamily: 'inherit' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: 'var(--nff-slate-500)', fontSize: 11, fontFamily: 'inherit' }}
            axisLine={false}
            tickLine={false}
            domain={[0, Math.max(maxValue * 1.3, 10)]}
            tickCount={4}
            tickFormatter={(value) => (value === 0 ? '0' : String(Math.round(value)))}
          />
          <Tooltip content={<CustomTooltip metric={metric} />} wrapperStyle={{ pointerEvents: 'none' }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--nff-forest-500)"
            strokeWidth={2}
            fillOpacity={animated ? 1 : 0}
            fill="url(#learning-gradient)"
            animationDuration={prefersReducedMotion ? 0 : 800}
            animationEasing="ease-out"
            isAnimationActive={!prefersReducedMotion}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}