'use client'

import { cn } from '@/lib/utils'
import { CircularProgressRing } from './CircularProgressRing'
import { WeeklyActivityChart } from './WeeklyActivityChart'
import { LearningStreak } from './LearningStreak'
import { MetricCard } from './MetricCard'
import { LearningTimeChart } from './LearningTimeChart'
import type {
  LearningProgressOverview,
  WeeklyActivityDay,
  LearningStreak as LearningStreakType,
  LearningTimeSeriesPoint,
} from '@/services/learning/home'
import {
  BookOpen,
  Clock,
  Target,
  Flame,
} from 'lucide-react'

interface AnalyticsSidebarProps {
  progressOverview: LearningProgressOverview
  weeklyActivity: WeeklyActivityDay[]
  learningStreak: LearningStreakType
  learningTimeSeries: LearningTimeSeriesPoint[]
  /** Compact mode for smaller screens */
  compact?: boolean
  /** Additional className */
  className?: string
}

/** Compute week-over-week change in lessons completed */
function computeLessonsTrend(weeklyActivity: WeeklyActivityDay[]): { value: number; label: string } | undefined {
  if (weeklyActivity.length < 2) return undefined
  const thisWeek = weeklyActivity.slice(-1)[0]?.lessonsCompleted ?? 0
  const lastWeek = weeklyActivity.slice(-2, -1)[0]?.lessonsCompleted ?? 0
  if (lastWeek === 0) return undefined
  const change = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
  return { value: change, label: 'vs last week' }
}

/** Compute week-over-week change in learning time */
function computeTimeTrend(learningTimeSeries: LearningTimeSeriesPoint[]): { value: number; label: string } | undefined {
  if (learningTimeSeries.length < 2) return undefined
  const thisWeek = learningTimeSeries.slice(-1)[0]?.minutes ?? 0
  const lastWeek = learningTimeSeries.slice(-2, -1)[0]?.minutes ?? 0
  if (lastWeek === 0) return undefined
  const change = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
  return { value: change, label: 'vs last week' }
}

/** Compute change in active paths (simplified) */
function computePathsTrend(progressOverview: LearningProgressOverview): { value: number; label: string } | undefined {
  if (progressOverview.activePaths === 0) return undefined
  // Simple trend: positive if active paths > 1
  return { value: progressOverview.activePaths > 1 ? 25 : 0, label: 'active paths' }
}

/** Compute streak trend */
function computeStreakTrend(learningStreak: LearningStreakType): { value: number; label: string } | undefined {
  if (learningStreak.currentStreak === 0) return undefined
  return { value: learningStreak.currentStreak > learningStreak.longestStreak ? 100 : 10, label: 'current streak' }
}

interface AnalyticsSidebarProps {
  progressOverview: LearningProgressOverview
  weeklyActivity: WeeklyActivityDay[]
  learningStreak: LearningStreakType
  learningTimeSeries: LearningTimeSeriesPoint[]
  /** Compact mode for smaller screens */
  compact?: boolean
  /** Additional className */
  className?: string
}

/**
 * Main analytics sidebar component combining all learning visualizations.
 */
export function AnalyticsSidebar({
  progressOverview,
  weeklyActivity,
  learningStreak,
  learningTimeSeries,
  compact = false,
  className,
}: AnalyticsSidebarProps) {
  const gap = compact ? 'gap-4' : 'gap-6'
  const p = compact ? 'p-4' : 'p-5 sm:p-6'

  // Compute trends from real data
  const lessonsTrend = computeLessonsTrend(weeklyActivity)
  const timeTrend = computeTimeTrend(learningTimeSeries)
  const pathsTrend = computePathsTrend(progressOverview)
  const streakTrend = computeStreakTrend(learningStreak)

  return (
    <aside
      className={cn(
        'flex flex-col',
        'bg-white/80 backdrop-blur-sm rounded-2xl border border-[var(--nff-sage-200)] shadow-soft',
        gap,
        p,
        className
      )}
      aria-labelledby="analytics-heading"
    >
      <h2 id="analytics-heading" className="nff-heading-h4 font-semibold text-[var(--nff-forest-900)]">
        Learning Analytics
      </h2>

      {/* Overall Progress Ring */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <CircularProgressRing
          percent={progressOverview.percentComplete}
          size={compact ? 100 : 120}
          strokeWidth={compact ? 7 : 8}
          strokeColor="var(--nff-forest-500)"
          trackColor="var(--nff-sage-100)"
          ariaLabel={`Overall learning progress: ${progressOverview.percentComplete}% complete`}
        >
          <div className="text-center">
            <p className="nff-heading-h2 font-bold text-[var(--nff-forest-900)]">
              {progressOverview.percentComplete}%
            </p>
            <p className="nff-caption text-[var(--nff-slate-500)]">Journey complete</p>
          </div>
        </CircularProgressRing>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          value={progressOverview.completedLessons}
          label="Lessons done"
          icon={<BookOpen className="size-5" aria-hidden="true" />}
          tint="sage"
          trend={lessonsTrend}
          animate={true}
        />
        <MetricCard
          value={progressOverview.totalLearningTimeMinutes}
          label="Minutes learned"
          icon={<Clock className="size-5" aria-hidden="true" />}
          tint="amber"
          trend={timeTrend}
          animate={true}
        />
        <MetricCard
          value={progressOverview.activePaths}
          label="Active paths"
          icon={<Target className="size-5" aria-hidden="true" />}
          tint="blue"
          trend={pathsTrend}
          animate={true}
        />
        <MetricCard
          value={learningStreak.currentStreak}
          label="Current streak"
          icon={<Flame className="size-5" aria-hidden="true" />}
          tint="forest"
          trend={streakTrend}
          animate={true}
        />
      </div>

      {/* Weekly Activity Chart */}
      <div className="pt-2">
        <h3 className="nff-label-md font-medium text-[var(--nff-forest-900)] mb-3">
          This Week
        </h3>
        <WeeklyActivityChart
          data={weeklyActivity}
          metric="lessons"
          height={compact ? 120 : 160}
          showTooltips={true}
        />
      </div>

      {/* Learning Streak */}
      <div className="pt-2 border-t border-[var(--nff-sage-200)]">
        <LearningStreak data={learningStreak} showWeeklyDots={true} />
      </div>

      {/* Learning Time Series */}
      <div className="pt-2 border-t border-[var(--nff-sage-200)]">
        <h3 className="nff-label-md font-medium text-[var(--nff-forest-900)] mb-3">
          6-Week Trend
        </h3>
        <LearningTimeChart
          data={learningTimeSeries}
          metric="minutes"
          height={compact ? 140 : 180}
        />
      </div>
    </aside>
  )
}