import {
  AlertTriangle,
  AudioLines,
  CheckCircle2,
  FileText,
  ImageIcon,
  Loader2,
  UploadCloud,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AdminPageHeader, AdminPagination, StatusBadge } from '@/components/admin'
import type { StatusTone } from '@/components/nff/StatusChip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { checksFor, isLiveStatus, isRevisionStale, validateItem, type CmsItem, type CmsStatus } from '@/services/cms'
import type { TranscodeStatus } from '@/types'
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
  meta,
}: {
  title: string
  description?: string
  action?: ReactNode
  meta?: ReactNode
}) {
  return <AdminPageHeader title={title} description={description} actions={action} meta={meta} />
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
  icon: Icon,
}: {
  label: string
  value: string
  hint?: string
  /** What kind of data the value is. Shown as a small label. */
  source?: DataSourceKind
  /** A small brand-toned chip next to the label. Decorative. */
  icon?: LucideIcon
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <span className="flex items-center gap-2">
        {Icon && (
          <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--nff-sage-100)]">
            <Icon className="size-4 text-[var(--nff-forest-700)]" />
          </span>
        )}
        <span className="nff-caption text-muted-foreground">{label}</span>
      </span>
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

// Readiness --------------------------------------------------------------

export const TRANSCODE_META: Record<TranscodeStatus, { label: string; tone: StatusTone; icon: LucideIcon }> = {
  uploading: { label: 'Uploading', tone: 'info', icon: UploadCloud },
  validating: { label: 'Validating', tone: 'info', icon: Loader2 },
  transcoding: { label: 'Transcoding', tone: 'warning', icon: Loader2 },
  ready: { label: 'Ready', tone: 'success', icon: CheckCircle2 },
  failed: { label: 'Failed', tone: 'error', icon: AlertTriangle },
}

export interface ReadinessCheck {
  id: 'artwork' | 'audio' | 'metadata'
  label: string
  ok: boolean
  /** What is wrong, or what passed. One sentence. */
  detail: string
  icon: LucideIcon
}

/** The publishing checks that apply to this item (audio only for meditations), with reasons. */
export function readinessOf(item: CmsItem): ReadinessCheck[] {
  const checks = checksFor(item)
  const errors = Object.values(validateItem(item))
  return [
    { id: 'artwork', label: 'Artwork', ok: checks.artwork, detail: checks.artwork ? 'Artwork is attached.' : 'Add artwork.', icon: ImageIcon },
    ...(item.type === 'meditation'
      ? [
          {
            id: 'audio' as const,
            label: 'Audio',
            ok: checks.audio,
            detail: checks.audio ? 'Audio is transcoded and ready.' : `Audio is ${TRANSCODE_META[item.transcode].label.toLowerCase()}.`,
            icon: AudioLines,
          },
        ]
      : []),
    {
      id: 'metadata',
      label: 'Details',
      ok: checks.metadata,
      detail: checks.metadata ? 'Title, slug and summary are complete.' : errors.join(' '),
      icon: FileText,
    },
  ]
}

/**
 * One compact readiness signal for a table cell: "Ready", or what is missing.
 * Words and an icon, never colour alone.
 */
export function ReadinessBadge({ item }: { item: CmsItem }) {
  const checks = readinessOf(item)
  const missing = checks.filter((check) => !check.ok)
  const ready = missing.length === 0
  return (
    <span
      data-ready={ready}
      title={checks.map((check) => `${check.label}: ${check.ok ? 'OK' : check.detail}`).join('\n')}
      className={`inline-flex h-6 max-w-full items-center gap-1.5 rounded-md border px-2 nff-label-sm ${
        ready
          ? 'border-nff-border-success bg-nff-bg-success-subtle text-nff-text-success'
          : 'border-nff-border-warning bg-nff-bg-warning-subtle text-nff-text-warning'
      }`}
    >
      {ready ? <CheckCircle2 aria-hidden="true" className="size-3.5 shrink-0" /> : <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />}
      <span className="truncate">{ready ? 'Ready to publish' : `Needs ${missing.map((check) => check.label.toLowerCase()).join(', ')}`}</span>
    </span>
  )
}

/** The full checklist, for a review panel or an editor sidebar. */
export function ReadinessChecklist({ item, fixHref }: { item: CmsItem; fixHref?: string }) {
  const checks = readinessOf(item)
  return (
    <ul aria-label="Publishing checks" className="flex flex-col divide-y divide-[var(--admin-border)] rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)]">
      {checks.map((check) => (
        <li key={check.id} className="flex items-start gap-3 p-3">
          <span
            className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ${
              check.ok ? 'bg-nff-bg-success-subtle text-nff-text-success' : 'bg-nff-bg-warning-subtle text-nff-text-warning'
            }`}
          >
            <check.icon aria-hidden="true" className="size-3.5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="nff-label-md">
              {check.label}
              <span className="sr-only">{check.ok ? ': passed' : ': needs attention'}</span>
            </span>
            <span className="nff-caption text-[var(--admin-text-muted)]">{check.detail}</span>
          </div>
          {check.ok ? (
            <CheckCircle2 aria-hidden="true" className="mt-1 size-4 shrink-0 text-nff-text-success" />
          ) : fixHref ? (
            <Link to={fixHref} className="nff-target nff-focus-ring mt-0.5 shrink-0 nff-label-sm text-nff-text-link underline-offset-4 hover:underline">
              Fix
            </Link>
          ) : (
            <XCircle aria-hidden="true" className="mt-1 size-4 shrink-0 text-nff-text-warning" />
          )}
        </li>
      ))}
    </ul>
  )
}

/** "Untitled exploration" for items saved before they had a title. */
export const displayTitle = (item: { title: string; type: CmsItem['type'] }) =>
  item.title.trim() || `Untitled ${item.type}`

/** A sticky bar at the bottom of the working area for unsaved changes and page actions. */
export function ActionBar({ status, children }: { status?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  // Publish the bar's height so toasts sit above it and never cover Save
  // (WCAG 2.4.12 Focus Not Obscured). The bar can wrap to two rows on phones.
  useEffect(() => {
    const bar = ref.current
    if (!bar) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--admin-action-bar-h', `${Math.ceil(bar.getBoundingClientRect().height)}px`)
    update()
    root.setAttribute('data-action-bar', '')
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
    observer?.observe(bar)
    return () => {
      observer?.disconnect()
      root.removeAttribute('data-action-bar')
      root.style.removeProperty('--admin-action-bar-h')
    }
  }, [])
  return (
    <div ref={ref} className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--admin-border)] bg-[var(--admin-surface)]/95 backdrop-blur lg:left-[var(--nff-layout-admin-sidebar)]">
      <div className="mx-auto flex w-full max-w-[var(--admin-content-max)] flex-wrap items-center justify-between gap-3 px-[var(--admin-gutter)] py-3">
        <div role="status" className="min-w-0 nff-body-sm text-[var(--admin-text-muted)]">
          {status}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
      </div>
    </div>
  )
}

/** A titled panel in the editor. */
export function EditorCard({ title, description, action, children, className }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  const id = `card-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <section aria-labelledby={id} className={cn('flex flex-col gap-4 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id={id} className="nff-label-lg">
            {title}
          </h2>
          {description && <p className="nff-caption text-[var(--admin-text-muted)]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/**
 * After a row moves, keep focus on its arrow. If that arrow is now disabled
 * (the row reached the top or bottom), use the other arrow, so focus never
 * falls back to the page.
 */
export function refocusMoved(key: string, direction: 'up' | 'down') {
  const run = () => {
    const pick = (to: string) => document.querySelector<HTMLButtonElement>(`[data-move="${key}:${to}"]`)
    const same = pick(direction)
    ;(same && !same.disabled ? same : pick(direction === 'up' ? 'down' : 'up'))?.focus()
  }
  if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(run)
  else setTimeout(run, 0)
}

/** A field's error, linked to the input with `aria-describedby={id}`. */
export function FieldError({ id, message }: { id?: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="nff-body-sm text-nff-text-error">
      {message}
    </p>
  ) : null
}

/**
 * One line naming every field that needs fixing, in the page's own labels,
 * for the toast that blocks a save or publish (WCAG 3.3.1 / 3.3.3).
 */
export function describeErrors(errors: Record<string, string>, labels: Record<string, string>) {
  const names = Object.keys(errors).map((key) => labels[key] ?? key)
  if (names.length === 0) return ''
  return names.length === 1 ? `Fix ${names[0]} first: ${errors[Object.keys(errors)[0]!]}` : `Fix these fields first: ${names.join(', ')}.`
}


export const CATEGORY_OPTIONS = ['foundations', 'understand', 'contemplate', 'explore'].map((value) => ({
  value,
  label: value[0]!.toUpperCase() + value.slice(1),
}))
