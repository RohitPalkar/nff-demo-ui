import { Eye } from 'lucide-react'
import { useLearnerMode } from '@/features/learn/useLearnerMode'

/** Quiet strip shown only to staff previewing the learner area. */
export function PreviewIndicator() {
  const { isPreview } = useLearnerMode()
  if (!isPreview) return null
  return (
    <div
      role="status"
      className="border-b border-nff-border-default bg-[var(--nff-sage-50)]"
    >
      <p className="mx-auto flex max-w-[1440px] items-center gap-2 px-4 py-1.5 nff-caption text-nff-text-secondary sm:px-6 lg:px-10">
        <Eye aria-hidden="true" className="size-3.5 shrink-0 text-nff-icon-brand" />
        <span>
          <strong className="font-medium text-foreground">Preview mode.</strong> Read-only: progress,
          activity and assignments are not recorded.
        </span>
      </p>
    </div>
  )
}
