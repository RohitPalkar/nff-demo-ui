'use client'

import { cn } from '@/lib/utils'
import type { LearningStreak as LearningStreakType } from '@/services/learning/home'

interface LearningStreakProps {
  data: LearningStreakType
  /** Show the weekly activity dots */
  showWeeklyDots?: boolean
  /** Additional className */
  className?: string
}

/**
 * Learning streak visualization showing current streak, longest streak,
 * and a weekly activity indicator.
 */
export function LearningStreak({
  data,
  showWeeklyDots = true,
  className,
}: LearningStreakProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Current Streak */}
      <div className="flex items-baseline gap-2">
        <div className="flex items-center gap-1.5">
          <svg
            className="size-5 text-[var(--nff-amber-500)]"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
          </svg>
          <span className="nff-heading-h3 font-bold text-[var(--nff-forest-900)]">
            {data.currentStreak}
          </span>
        </div>
        <div>
          <p className="nff-label-md text-[var(--nff-forest-700)]">Day streak</p>
          <p className="nff-caption text-[var(--nff-slate-500)]">
            Longest: {data.longestStreak} days
          </p>
        </div>
      </div>

      {/* Weekly Activity Dots */}
      {showWeeklyDots && (
        <div className="flex items-center gap-2" role="img" aria-label="Weekly activity">
          {data.weeklyActiveDays.map((active, index) => (
            <span
              key={index}
              className={cn(
                'size-2.5 rounded-full transition-all',
                active ? 'bg-[var(--nff-forest-500)]' : 'bg-[var(--nff-sage-200)]'
              )}
              aria-label={active ? 'Active' : 'Inactive'}
            />
          ))}
        </div>
      )}

      {/* Last Active */}
      {data.lastActiveDate && (
        <p className="nff-caption text-[var(--nff-slate-500)]">
          Last active: {new Date(data.lastActiveDate).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </p>
      )}
    </div>
  )
}