import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

const TONE_CLASSES: Record<StatusTone, string> = {
  success:
    'border-nff-border-success bg-nff-bg-success-subtle text-nff-text-success',
  warning:
    'border-nff-border-warning bg-nff-bg-warning-subtle text-nff-text-warning',
  error: 'border-nff-border-error bg-nff-bg-error-subtle text-nff-text-error',
  info: 'border-nff-border-info bg-nff-bg-info-subtle text-nff-text-info',
  neutral:
    'border-nff-border-default bg-nff-bg-muted text-nff-text-secondary',
}

interface StatusChipProps {
  tone: StatusTone
  icon: LucideIcon
  children: ReactNode
  className?: string
}

export function StatusChip({
  tone,
  icon: Icon,
  children,
  className,
}: StatusChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 nff-label-sm',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span>{children}</span>
    </span>
  )
}
