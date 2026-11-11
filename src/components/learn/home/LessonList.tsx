import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { RecentKind, RecentLesson, UpNextLesson } from '@/services/learning/home'
import { Thumb } from './homeParts'
import { HOME_CARD, itemMeta } from './homeStyles'

/** Compact lesson rows for the side column: up next and recently accessed. */
function LessonRow({
  href,
  thumb,
  overline,
  title,
  meta,
}: {
  href: string
  thumb: UpNextLesson['item']
  overline: string
  title: string
  meta: string
}) {
  return (
    <li>
      <Link
        to={href}
        className="group flex items-center gap-3 p-3 transition-colors hover:bg-[var(--nff-sage-50)] nff-focus-ring sm:gap-4 sm:p-4"
      >
        <Thumb item={thumb} className="size-14 shrink-0 rounded-sm" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate nff-caption text-nff-text-secondary">{overline}</p>
          <p className="line-clamp-2 nff-label-md text-foreground">{title}</p>
          <p className="nff-caption text-nff-text-secondary">{meta}</p>
        </div>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-nff-icon-secondary transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  )
}

const LIST = cn(HOME_CARD, 'divide-y divide-nff-border-default overflow-hidden')

export function UpNextList({ items }: { items: UpNextLesson[] }) {
  return (
    <ol className={LIST}>
      {items.map((entry) => (
        <LessonRow
          key={entry.lessonId}
          href={entry.href}
          thumb={entry.item}
          overline={entry.moduleLabel}
          title={entry.item.title}
          meta={itemMeta(entry.item)}
        />
      ))}
    </ol>
  )
}

const RECENT_VERB: Record<RecentKind, string> = {
  completed: 'Completed',
  started: 'Started',
  opened: 'Opened',
  listened: 'Listened',
  watched: 'Watched',
  read: 'Read',
}

export function RecentLearningList({ items }: { items: RecentLesson[] }) {
  return (
    <ul className={LIST}>
      {items.map((entry) => (
        <LessonRow
          key={entry.lessonId}
          href={entry.href}
          thumb={entry.item}
          overline={entry.moduleLabel}
          title={entry.item.title}
          meta={`${RECENT_VERB[entry.kind]} ${formatDate(entry.at)}`}
        />
      ))}
    </ul>
  )
}
