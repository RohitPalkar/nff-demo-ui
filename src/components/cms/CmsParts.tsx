import {
  CheckCircle2,
  Clock,
  FileEdit,
  Eye,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { StatusChip, type StatusTone } from '@/components/nff/StatusChip'
import { Button } from '@/components/ui/button'
import { STATUS_LABEL, type CmsStatus } from '@/services/cms'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div className="flex flex-col gap-1">
        <h1 className="nff-heading-h2 text-foreground">{title}</h1>
        {description && (
          <p className="nff-body-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </header>
  )
}

const STATUS_META: Record<CmsStatus, { tone: StatusTone; icon: LucideIcon }> = {
  draft: { tone: 'neutral', icon: FileEdit },
  in_review: { tone: 'warning', icon: Eye },
  scheduled: { tone: 'info', icon: Clock },
  published: { tone: 'success', icon: CheckCircle2 },
  unpublished: { tone: 'neutral', icon: XCircle },
  rejected: { tone: 'error', icon: XCircle },
}

export function ContentStatusChip({ status }: { status: CmsStatus }) {
  const meta = STATUS_META[status]
  return (
    <StatusChip tone={meta.tone} icon={meta.icon}>
      {STATUS_LABEL[status]}
    </StatusChip>
  )
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <span className="nff-caption text-muted-foreground">{label}</span>
      <span className="nff-heading-h2">{value}</span>
      {hint && <span className="nff-caption text-muted-foreground">{hint}</span>}
    </div>
  )
}

export function Pager({
  page,
  pages,
  onPage,
}: {
  page: number
  pages: number
  onPage: (page: number) => void
}) {
  if (pages <= 1) return null
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between pt-2"
    >
      <span className="nff-caption text-muted-foreground">
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  )
}

export function paginate<T>(items: T[], page: number, size = 10) {
  const pages = Math.max(1, Math.ceil(items.length / size))
  const safe = Math.min(page, pages)
  return { pages, page: safe, slice: items.slice((safe - 1) * size, safe * size) }
}
