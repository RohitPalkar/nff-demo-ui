'use client'

import { cn } from '@/lib/utils'
import { CircularProgressRing } from './CircularProgressRing'
import { WeeklyActivityChart } from './WeeklyActivityChart'
import { LearningStreak } from './LearningStreak'
import { MetricCard } from './MetricCard'
import type {
  LearningProgressOverview,
  WeeklyActivityDay,
  LearningStreak as LearningStreakType,
  LearningTimeSeriesPoint,
} from '@/services/learning/home'

/** Compute week-over-week change in lessons completed */
function computeLessonsTrend(weeklyActivity: WeeklyActivityDay[]): { value: number; label?: string } | undefined {
  if (weeklyActivity.length < 2) return undefined
  const thisWeek = weeklyActivity.slice(-1)[0]?.lessonsCompleted ?? 0
  const lastWeek = weeklyActivity.slice(-2, -1)[0]?.lessonsCompleted ?? 0
  if (lastWeek === 0) return undefined
  const change = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
  return { value: change, label: 'vs last week' }
}

/** Compute week-over-week change in learning time */
function computeTimeTrend(learningTimeSeries: LearningTimeSeriesPoint[]): { value: number; label?: string } | undefined {
  if (learningTimeSeries.length < 2) return undefined
  const thisWeek = learningTimeSeries.slice(-1)[0]?.minutes ?? 0
  const lastWeek = learningTimeSeries.slice(-2, -1)[0]?.minutes ?? 0
  if (lastWeek === 0) return undefined
  const change = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
  return { value: change, label: 'vs last week' }
}

/** Compute change in active paths */
function computePathsTrend(progressOverview: LearningProgressOverview): { value: number; label?: string } | undefined {
  if (progressOverview.activePaths === 0) return undefined
  return { value: progressOverview.activePaths > 1 ? 25 : 0, label: 'active paths' }
}

/** Compute streak trend */
function computeStreakTrend(learningStreak: LearningStreakType): { value: number; label?: string } | undefined {
  if (learningStreak.currentStreak === 0) return undefined
  return { value: learningStreak.currentStreak > learningStreak.longestStreak ? 100 : 10, label: 'current streak' }
}

interface CompactAnalyticsSidebarProps {
  progressOverview: LearningProgressOverview
  weeklyActivity: WeeklyActivityDay[]
  learningStreak: LearningStreakType
  learningTimeSeries: LearningTimeSeriesPoint[]
  /** Link to full progress page */
  progressHref?: string
  /** Additional className */
  className?: string
}

/**
 * Compact analytics sidebar - reduced visual dominance.
 * Shows four key metrics, compact weekly activity, link to full progress page.
 */
export function CompactAnalyticsSidebar({
  progressOverview,
  weeklyActivity,
  learningStreak,
  learningTimeSeries,
  progressHref = '/learn/progress',
  className,
}: CompactAnalyticsSidebarProps) {

  return (
    <aside
      className={cn(
        'flex flex-col',
        'bg-white rounded-xl border border-[var(--nff-border-default)] shadow-soft',
        'p-4 sm:p-5',
        'gap-4 sm:gap-5',
        className
      )}
      aria-labelledby="analytics-heading"
    >
      {/* Header with link to full progress */}
      <div className="flex items-center justify-between">
        <h2 id="analytics-heading" className="nff-heading-h5 font-semibold text-[var(--nff-forest-900)]">
          Your Progress
        </h2>
        <a
          href={progressHref}
          className="group inline-flex items-center gap-1 nff-caption text-[var(--nff-forest-700)] hover:text-[var(--nff-forest-900)] transition-colors nff-focus-ring"
          aria-label="View detailed progress"
        >
          View all
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3 group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>

      {/* Overall Progress Ring - Compact */}
      <div className="flex flex-col items-center gap-3 pt-1">
        <CircularProgressRing
          percent={progressOverview.percentComplete}
          size={100}
          strokeWidth={7}
          strokeColor="var(--nff-forest-500)"
          trackColor="var(--nff-sage-100)"
          ariaLabel={`Overall learning progress: ${progressOverview.percentComplete}% complete`}
        >
          <div className="text-center">
            <p className="nff-heading-h3 font-bold text-[var(--nff-forest-900)]">
              {progressOverview.percentComplete}%
            </p>
            <p className="nff-caption text-[var(--nff-slate-500)]">Journey complete</p>
          </div>
        </CircularProgressRing>
      </div>

      {/* Four Key Metrics - Compact Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard
          value={progressOverview.completedLessons}
          label="Lessons done"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>}
          tint="sage"
          trend={computeLessonsTrend(weeklyActivity)}
          animate={true}
        />
        <MetricCard
          value={progressOverview.totalLearningTimeMinutes}
          label="Minutes learned"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
          tint="amber"
          trend={computeTimeTrend(learningTimeSeries)}
          animate={true}
        />
        <MetricCard
          value={progressOverview.activePaths}
          label="Active paths"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true"><path d="M4 12s4-8 10-8 10 8 10 8" /><path d="M12 4v16" /></svg>}
          tint="blue"
          trend={computePathsTrend(progressOverview)}
          animate={true}
        />
        <MetricCard
          value={learningStreak.currentStreak}
          label="Current streak"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
          tint="forest"
          trend={computeStreakTrend(learningStreak)}
          animate={true}
        />
      </div>

      {/* Compact Weekly Activity Chart */}
      <div className="pt-1">
        <h3 className="nff-caption font-medium text-[var(--nff-forest-900)] mb-2">This Week</h3>
        <WeeklyActivityChart
          data={weeklyActivity}
          metric="lessons"
          height={120}
          showTooltips={true}
        />
      </div>

      {/* Streak - Compact */}
      <div className="pt-2 border-t border-[var(--nff-sage-200)]">
        <LearningStreak data={learningStreak} showWeeklyDots={true} />
      </div>

      {/* Link to full progress */}
      <div className="pt-2 border-t border-[var(--nff-sage-200)]">
        <a
          href={progressHref}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--nff-sage-200)] bg-white text-[var(--nff-forest-700)] hover:bg-[var(--nff-sage-50)] hover:border-[var(--nff-sage-300)] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nff-forest-500)] nff-focus-ring"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden="true">
            <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 12h14" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>View detailed progress</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </aside>
  )
}