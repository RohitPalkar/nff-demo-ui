'use client'

import { cn } from '@/lib/utils'

/**
 * Subtle botanical illustrations for the Meadow dashboard.
 * These add 15% playful personality while maintaining 85% calm editorial design.
 */

/** Growing plant metaphor for progress - shows stages of growth */
export function GrowthPlant({ stage = 0, className, size = 'md' }: {
  stage?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizes = {
    sm: { pot: 'w-6 h-4', stem: 'h-8', leaf: 'w-3 h-3', sprout: 'w-2 h-2' },
    md: { pot: 'w-8 h-5', stem: 'h-12', leaf: 'w-4 h-4', sprout: 'w-2.5 h-2.5' },
    lg: { pot: 'w-10 h-6', stem: 'h-16', leaf: 'w-5 h-5', sprout: 'w-3 h-3' },
  }
  const s = sizes[size]

  return (
    <div className={cn('flex flex-col items-center', className)} aria-hidden="true">
      {/* Leaves/sprouts based on growth stage */}
      <div className="flex flex-col items-center gap-1">
        {stage >= 3 && (
          <div className="flex gap-1">
            <div className={cn('rounded-full bg-[var(--nff-sage-500)]', s.leaf)} />
            <div className={cn('rounded-full bg-[var(--nff-sage-500)]', s.leaf)} />
          </div>
        )}
        {stage >= 2 && (
          <div className="flex gap-1">
            <div className={cn('rounded-full bg-[var(--nff-sage-400)]', s.leaf)} />
            <div className={cn('rounded-full bg-[var(--nff-sage-400)]', s.leaf)} />
          </div>
        )}
        {stage >= 1 && (
          <div className="flex gap-1">
            <div className={cn('rounded-full bg-[var(--nff-sage-300)]', s.sprout)} />
            <div className={cn('rounded-full bg-[var(--nff-sage-300)]', s.sprout)} />
          </div>
        )}
        <div className={cn('rounded-t-none rounded-b-lg bg-[var(--nff-forest-800)]', s.pot)} />
      </div>
    </div>
  )
}

/** Gentle blooming flower for milestones */
export function BloomingFlower({ bloomed = false, size = 'md' }: {
  bloomed?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizes = {
    sm: { petal: 'w-2 h-3', center: 'w-2 h-2' },
    md: { petal: 'w-3 h-4', center: 'w-2.5 h-2.5' },
    lg: { petal: 'w-4 h-5', center: 'w-3 h-3' },
  }
  const s = sizes[size]

  return (
    <div className="flex items-center justify-center" aria-hidden="true">
      <div className={cn(
        'flex gap-0.5 transition-all duration-500 ease-out',
        bloomed ? 'scale-100 opacity-100' : 'scale-50 opacity-0 rotate-45'
      )}>
        {/* Petals */}
        <div className={cn('rounded-full bg-[var(--nff-sage-300)]', s.petal)} />
        <div className={cn('rounded-full bg-[var(--nff-sage-400)]', s.petal)} />
        <div className={cn('rounded-full bg-[var(--nff-sage-300)]', s.petal)} />
        <div className={cn('rounded-full bg-[var(--nff-sage-400)]', s.petal)} />
        <div className={cn('rounded-full bg-[var(--nff-sage-300)]', s.petal)} />
        {/* Center */}
        <div className={cn('rounded-full bg-[var(--nff-amber-400)]', s.center)} />
      </div>
    </div>
  )
}

/** Floating leaf for subtle ambient motion */
export function FloatingLeaf({ delay = 0, className, size = 'md' }: {
  delay?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizes = {
    sm: 'w-3 h-2',
    md: 'w-4 h-3',
    lg: 'w-5 h-4',
  }

  return (
    <div
      className={cn(
        'absolute rounded-full bg-[var(--nff-sage-300)]/30 opacity-50',
        'animate-float-gentle',
        sizes[size],
        className
      )}
      style={{ animationDelay: `${delay}s` }}
      aria-hidden="true"
    />
  )
}

/** Sprout for empty states and new beginnings */
export function Sprout({ className }: {
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center', className)} aria-hidden="true">
      <div className="rounded-full bg-[var(--nff-sage-400)] w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
      <div className="rounded-full bg-[var(--nff-sage-400)] w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 mx-1" />
      <div className="rounded-b-lg bg-[var(--nff-forest-800)] w-6 h-3 md:w-8 md:h-4 lg:w-10 lg:h-5" />
    </div>
  )
}

/** Leaf divider for section separation */
export function LeafDivider({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 my-8', className)} aria-hidden="true">
      <div className="w-12 h-px bg-[var(--nff-border-default)]" />
      <svg viewBox="0 0 24 16" className="w-6 h-4 text-[var(--nff-sage-400)]" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M12 2C8 4 4 8 4 8s4 4 8 4 8-4 8-8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 8v6" strokeLinecap="round" />
        <path d="M8 10h8" strokeLinecap="round" />
      </svg>
      <div className="w-12 h-px bg-[var(--nff-border-default)]" />
    </div>
  )
}

/** Milestone badge with growth metaphor */
export function MilestoneBadge({ milestone, earned = false, className }: {
  milestone: 'first-lesson' | 'first-path' | 'week-streak' | 'month-streak' | '10-lessons' | '50-lessons'
  earned?: boolean
  className?: string
}) {
  const icons = {
    'first-lesson': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true">
        <path d="M12 2C8 4 4 8 4 8s4 4 8 4 8-4 8-8" />
        <path d="M12 8v6" />
        <path d="M8 10h8" />
      </svg>
    ),
    'first-path': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true">
        <path d="M4 12s4-8 10-8 10 8 10 8" />
        <path d="M12 4v16" />
      </svg>
    ),
    'week-streak': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    'month-streak': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    '10-lessons': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true">
        <path d="M12 2C8 4 4 8 4 8s4 4 8 4 8-4 8-8" />
        <path d="M12 8v6" />
        <path d="M8 10h8" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    '50-lessons': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true">
        <path d="M12 2C8 4 4 8 4 8s4 4 8 4 8-4 8-8" />
        <path d="M12 8v6" />
        <path d="M8 10h8" />
        <path d="M12 8a4 4 0 0 1 4 4" />
      </svg>
    ),
  }

  return (
    <div className={cn(
      'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all duration-300',
      earned
        ? 'bg-[var(--nff-forest-100)] text-[var(--nff-forest-900)] border border-[var(--nff-forest-300)]'
        : 'bg-[var(--nff-sage-100)] text-[var(--nff-sage-600)] border border-[var(--nff-sage-200)] opacity-60',
      className
    )}>
      <span aria-hidden="true">{icons[milestone]}</span>
      <span className="nff-label-sm font-medium">{milestone.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
    </div>
  )
}