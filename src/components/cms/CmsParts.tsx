import type { ReactNode } from 'react'
import { AdminPageHeader, AdminPagination, StatusBadge } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { isLiveStatus, isRevisionStale, type CmsItem, type CmsStatus } from '@/services/cms'
import {
  DATA_SOURCE_DESCRIPTION,
  DATA_SOURCE_LABEL,
  type DataSourceKind,
} from '@/services/dataSources'

/** The Admin page header (components/admin). Kept under this name for the existing pages. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return <AdminPageHeader title={title} description={description} actions={action} />
}

export function ContentStatusChip({ status }: { status: CmsStatus }) {
  return <StatusBadge status={status} />
}

/**
 * A small label saying what kind of data a figure is. Text, not colour alone.
 */
export function DataSourceBadge({ kind }: { kind: DataSourceKind }) {
  return (
    <span
      title={DATA_SOURCE_DESCRIPTION[kind]}
      className="inline-flex w-fit items-center rounded-md border border-[var(--admin-border)] px-2 py-0.5 nff-label-sm text-[var(--admin-text-muted)]"
      data-source={kind}
    >
      {DATA_SOURCE_LABEL[kind]}
    </span>
  )
}

/** A sentence-length notice about where a screen's data comes from. */
export function DataSourceNotice({
  kind,
  children,
}: {
  kind: DataSourceKind
  children: ReactNode
}) {
  return (
    <p
      role="status"
      data-source={kind}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 nff-body-sm text-[var(--admin-text-muted)]"
    >
      <DataSourceBadge kind={kind} />
      <span>{children}</span>
    </p>
  )
}

/** What a reviewer said when sending content back, so the author can act on it. */
export function ReviewFeedback({ note }: { note?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col gap-1 rounded-xl border border-nff-border-error bg-nff-bg-error-subtle p-4"
    >
      <p className="nff-label-md text-nff-text-error">Sent back by a reviewer</p>
      <p className="nff-body-sm text-foreground">
        {note?.trim() ? note : 'No feedback was left. Ask the reviewer what to change.'}
      </p>
    </div>
  )
}

/**
 * Shown to an author editing live content. The live version is untouched:
 * their edits are a revision that goes through review.
 */
export function RevisionNotice({
  item,
  canSubmit,
  onSubmit,
  onDiscard,
}: {
  item: CmsItem
  canSubmit: boolean
  onSubmit: () => void
  onDiscard: () => void
}) {
  if (!isLiveStatus(item.status)) return null
  const revision = item.revision
  const text = !revision
    ? 'This is live. Your edits are saved as a draft revision; the live version stays as it is until an admin approves your revision.'
    : revision.status === 'in_review'
      ? 'Your revision is in review. The live version is unchanged. Editing it again takes it back to a draft.'
      : revision.status === 'rejected'
        ? 'Your revision was sent back. The live version is unchanged. Edit it and submit it again.'
        : 'You have a draft revision. The live version is unchanged until an admin approves it.'
  return (
    <div role="status" className="flex flex-col gap-2 rounded-xl border bg-nff-bg-muted p-4">
      <p className="nff-body-sm">{text}</p>
      {revision?.rejectionNote && revision.status !== 'in_review' && (
        <ReviewFeedback note={revision.rejectionNote} />
      )}
      {revision && revision.status !== 'in_review' && (
        <div className="flex flex-wrap gap-2">
          {canSubmit && (
            <Button size="sm" onClick={onSubmit}>
              Submit revision for review
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onDiscard}>
            Discard revision
          </Button>
        </div>
      )}
    </div>
  )
}

const FIELD_LABEL: Record<string, string> = {
  slug: 'Slug',
  title: 'Title',
  excerpt: 'Excerpt',
  body: 'Body',
  category: 'Category',
  stageId: 'Stage',
  featured: 'Featured',
  seoTitle: 'SEO title',
  seoDescription: 'SEO description',
  preview: 'Free preview',
  transcode: 'Audio status',
  durationSec: 'Duration (seconds)',
}

const show = (value: unknown) =>
  value === undefined || value === '' ? '(empty)' : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)

/**
 * The fields a pending revision changes, each with the proposed value and the
 * live one. A plain list, not a diff.
 */
export function RevisionFields({ item }: { item: CmsItem }) {
  const fields = Object.entries(item.revision?.fields ?? {})
  if (fields.length === 0) return <p className="nff-body-sm text-muted-foreground">No fields differ from the live version.</p>
  return (
    <dl className="flex flex-col gap-3">
      {fields.map(([key, proposed]) => (
        <div key={key} className="flex flex-col gap-1">
          <dt className="nff-label-sm">{FIELD_LABEL[key] ?? key}</dt>
          <dd className="flex flex-col gap-1 nff-body-sm">
            <span className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md border bg-card p-2">
              <span className="nff-caption text-muted-foreground">Proposed: </span>
              {show(proposed)}
            </span>
            <span className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md border bg-nff-bg-muted p-2">
              <span className="nff-caption text-muted-foreground">Live now: </span>
              {show((item as unknown as Record<string, unknown>)[key])}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Shown to Admin and Super admin on a live record that has a pending
 * revision. Nothing here changes the revision: it only warns and lets the
 * reviewer read it before editing the live version.
 */
export function PendingRevisionWarning({ item }: { item: CmsItem }) {
  if (!item.revision || !isLiveStatus(item.status)) return null
  const labels = Object.keys(item.revision.fields).map((key) => FIELD_LABEL[key] ?? key)
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-xl border border-nff-border-warning bg-nff-bg-warning-subtle p-4">
      <p className="nff-label-md text-nff-text-warning">This live item has a pending revision</p>
      <p className="nff-body-sm text-foreground">
        An editor has a {item.revision.status.replace('_', ' ')} revision changing: {labels.join(', ') || 'nothing'}.
        You are editing the live version. Saving here does not discard the revision, but approving it later would
        replace those fields.
        {isRevisionStale(item) && ' The live version has changed since the revision was started.'}
      </p>
      <details className="nff-body-sm">
        <summary className="cursor-pointer nff-label-md text-nff-text-link underline underline-offset-4 nff-focus-ring">
          Inspect the pending revision
        </summary>
        <div className="pt-3">
          <RevisionFields item={item} />
        </div>
      </details>
    </div>
  )
}

export function MetricCard({
  label,
  value,
  hint,
  source,
}: {
  label: string
  value: string
  hint?: string
  /** What kind of data the value is. Shown as a small label. */
  source?: DataSourceKind
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <span className="nff-caption text-muted-foreground">{label}</span>
      <span className="nff-data-metric tabular-nums">{value}</span>
      {hint && <span className="nff-caption text-muted-foreground">{hint}</span>}
      {source && <DataSourceBadge kind={source} />}
    </div>
  )
}

export function Pager(props: { page: number; pages: number; onPage: (page: number) => void }) {
  return <AdminPagination {...props} />
}

export function paginate<T>(items: T[], page: number, size = 10) {
  const pages = Math.max(1, Math.ceil(items.length / size))
  const safe = Math.min(page, pages)
  return { pages, page: safe, slice: items.slice((safe - 1) * size, safe * size) }
}
