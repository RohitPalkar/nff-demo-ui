import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HOME_CARD, SECONDARY_ACTION } from '@/components/learn/home/homeStyles'

/** In-app state for a lesson whose media cannot be played yet. */
export function LessonNotice({
  icon: Icon,
  title,
  description,
  backTo,
  backLabel,
}: {
  icon: LucideIcon
  title: string
  description: string
  backTo: string
  backLabel: string
}) {
  return (
    <div className={`${HOME_CARD} mx-auto my-10 flex max-w-xl flex-col items-start gap-4 p-6`}>
      <Icon aria-hidden="true" className="size-6 text-nff-text-secondary" />
      <div className="flex flex-col gap-1">
        <p role="status" className="nff-heading-h4 text-foreground">{title}</p>
        <p className="nff-body-sm text-nff-text-secondary">{description}</p>
      </div>
      <Link to={backTo} className={SECONDARY_ACTION}>{backLabel}</Link>
    </div>
  )
}
