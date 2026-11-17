'use client'

import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { UpNextLesson } from '@/services/learning/home'
import { Thumb } from './homeParts'

/** Compact lesson row for Up Next and Recently Accessed sections. */
function LessonRowNew({
  href,
  thumb,
  overline,
  title,
  meta,
  duration,
  type,
}: {
  href: string
  thumb: UpNextLesson['item']
  overline: string
  title: string
  meta: string
  duration?: string
  type?: 'article' | 'audio'
}) {
  return (
    <li>
      <Link
        to={href}
        className="group flex items-center gap-3 p-3 transition-colors hover:bg-[var(--nff-sage-50)] nff-focus-ring sm:gap-4 sm:p-4"
      >
        <Thumb item={thumb} className="size-12 shrink-0 rounded-sm" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate nff-caption text-[var(--nff-text-secondary)]">{overline}</p>
            {type && (
              <span className={cn(
                'rounded-sm px-1.5 py-0.5 nff-caption',
                type === 'audio' ? 'bg-[var(--nff-forest-100)] text-[var(--nff-forest-900)]' : 'bg-[var(--nff-sage-100)] text-[var(--nff-sage-800)]'
              )}>
                {type === 'audio' ? 'Audio' : 'Article'}
              </span>
            )}
          </div>
          <p className="line-clamp-2 nff-label-md text-foreground">{title}</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="nff-caption text-[var(--nff-text-secondary)]">{meta}</p>
            {duration && (
              <span className="nff-caption text-[var(--nff-text-secondary)] flex items-center gap-1">
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {duration}
              </span>
            )}
          </div>
        </div>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-[var(--nff-icon-secondary)] transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  )
}

export function UpNextListNew({ items }: { items: UpNextLesson[] }) {
  return (
    <ol className="rounded-lg border border-[var(--nff-border-default)] overflow-hidden bg-white" role="list" aria-label="Up next lessons">
      {items.map((entry) => {
        const isAudio = entry.kind === 'audio'
        const item = entry.item as { durationSec?: number; readingTimeMin?: number }
        const duration = isAudio
          ? `${Math.round((item.durationSec ?? 0) / 60)} min`
          : `${item.readingTimeMin ?? 0} min read`
        return (
          <LessonRowNew
            key={entry.lessonId}
            href={entry.href}
            thumb={entry.item}
            overline={entry.moduleLabel}
            title={entry.item.title}
            meta={entry.item.category} // Use category as meta instead of itemMeta
            duration={duration}
            type={isAudio ? 'audio' : 'article'}
          />
        )
      })}
    </ol>
  )
}