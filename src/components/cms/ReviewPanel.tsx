import { CalendarClock, ChevronLeft, ChevronRight, ExternalLink, Eye, Send, Undo2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { InlineNotice } from '@/components/admin'
import {
  ContentStatusChip,
  ReadinessChecklist,
  ReviewFeedback,
  RevisionFields,
  TRANSCODE_META,
  displayTitle,
  readinessOf,
} from '@/components/cms/CmsParts'
import { SOW_SCOPE } from '@/config/sowScope'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { formatDate, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import { stages } from '@/mocks/db'
import { isRevisionStale, ownerLabel, workingCopy, type CmsItem } from '@/services/cms'

export interface QueueRow {
  key: string
  item: CmsItem
  /** A pending revision of live content, not the item itself. */
  revision: boolean
}

export type Decision = 'publish' | 'schedule' | 'reject' | 'unschedule' | 'unpublish'

export interface ReviewAbilities {
  approve: boolean
  schedule: boolean
  reject: boolean
  unpublish: boolean
}

const DECISION: Record<Decision, { label: string; hint: string; icon: typeof Upload; tone?: 'danger' }> = {
  publish: { label: 'Publish now', hint: 'Practitioners see it straight away.', icon: Upload },
  schedule: { label: 'Schedule', hint: 'Publish automatically at a set time.', icon: CalendarClock },
  reject: { label: 'Send back', hint: 'Return it to the author with feedback.', icon: Undo2, tone: 'danger' },
  unschedule: { label: 'Cancel schedule', hint: 'Move it back to draft. It will not go live.', icon: Undo2, tone: 'danger' },
  unpublish: { label: 'Unpublish', hint: 'Take it offline. Practitioners lose access.', icon: Undo2, tone: 'danger' },
}

/** The decisions that make sense for where this row is in the workflow. */
export function decisionsFor(row: QueueRow): Decision[] {
  if (row.revision) return row.item.revision?.status === 'in_review' ? ['publish', 'reject'] : []
  switch (row.item.status) {
    case 'in_review':
      return ['publish', 'schedule', 'reject']
    case 'scheduled':
      return ['publish', 'unschedule']
    case 'published':
      return ['unpublish']
    default:
      return []
  }
}

const allowed = (decision: Decision, can: ReviewAbilities) =>
  decision === 'publish' ? can.approve : decision === 'schedule' ? can.schedule : decision === 'reject' ? can.reject : can.unpublish

/** Local time for a datetime-local input. */
const toLocalInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)

/**
 * The review drawer: what the item is, whether it is ready, and one decision
 * at a time. The primary button says exactly what will happen. Sending back
 * needs feedback, scheduling needs a future time, and publishing waits for
 * the checks. Previous/next move through the current queue.
 */
export function ReviewPanel({
  row,
  position,
  total,
  can,
  onPrevious,
  onNext,
  onClose,
  onDecide,
}: {
  row: QueueRow | null
  position: number
  total: number
  can: ReviewAbilities
  onPrevious?: () => void
  onNext?: () => void
  onClose: () => void
  onDecide: (row: QueueRow, decision: Decision, extra: { note?: string; when?: string }) => void
}) {
  // The sheet opens from state, not from a Radix trigger, so return focus by
  // hand: to the Review button of the item last shown, or, if a decision took
  // it out of this view, to the first remaining one (WCAG 2.4.3).
  const lastKey = useRef<string | null>(null)
  useEffect(() => {
    if (row) lastKey.current = row.key
  }, [row])
  return (
    <Sheet open={Boolean(row)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl"
        // Start on the item's title, not on Previous/Next: Enter must not skip
        // the item being reviewed. Moving between items lands on the title too.
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          document.getElementById('review-title')?.focus()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          const target =
            document.querySelector<HTMLElement>(`[data-review-key="${lastKey.current}"]`) ??
            document.querySelector<HTMLElement>('[data-review-key]') ??
            document.getElementById('admin-main')
          target?.focus()
        }}
      >
        {row && (
          <PanelBody
            key={row.key}
            row={row}
            position={position}
            total={total}
            can={can}
            onPrevious={onPrevious}
            onNext={onNext}
            onDecide={onDecide}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function PanelBody({
  row,
  position,
  total,
  can,
  onPrevious,
  onNext,
  onDecide,
}: {
  row: QueueRow
  position: number
  total: number
  can: ReviewAbilities
  onPrevious?: () => void
  onNext?: () => void
  onDecide: (row: QueueRow, decision: Decision, extra: { note?: string; when?: string }) => void
}) {
  const { item, revision } = row
  const shown = revision ? workingCopy(item) : item
  const options = decisionsFor(row)
  const usable = options.filter((decision) => allowed(decision, can))
  // Nothing is preselected: publishing, scheduling and sending back are each a
  // deliberate choice, then a second press that names the outcome (WCAG 3.3.6).
  const [decision, setDecision] = useState<Decision | null>(null)
  const [note, setNote] = useState('')
  // This body remounts for each item. If moving to it dropped focus onto the
  // sheet itself, put it on the new item's title so a reader hears which item
  // they are on (WCAG 2.4.3).
  useEffect(() => {
    const active = document.activeElement
    if (!active || active === document.body || active.getAttribute('role') === 'dialog') document.getElementById('review-title')?.focus()
  }, [])
  const [when, setWhen] = useState('')
  const checks = readinessOf(shown)
  const ready = checks.every((check) => check.ok)
  const stage = stages.find((entry) => entry.id === shown.stageId)
  const editHref = `/cms/${item.type === 'meditation' ? 'meditations' : 'explorations'}/${item.id}`
  const previewHref = `/cms/preview/${item.type}/${item.id}`
  const paragraphs = shown.body.split(/\n{2,}/).filter(Boolean)
  const words = shown.body.split(/\s+/).filter(Boolean).length
  const rejectionNote = revision ? item.revision?.rejectionNote : item.rejectionNote
  const wasRejected = revision ? item.revision?.status === 'rejected' : item.status === 'rejected'

  const minWhen = toLocalInput(new Date(Date.now() + 5 * 60_000))
  const needsReady = decision === 'publish' || decision === 'schedule'
  const blockedReason =
    !decision
      ? null
      : needsReady && !ready
        ? 'Fix the failed checks before publishing.'
        : decision === 'schedule' && !when
          ? 'Pick a date and time.'
          : decision === 'schedule' && new Date(when).getTime() <= Date.now()
            ? 'Pick a time in the future.'
            : decision === 'reject' && note.trim().length < 10
              ? 'Tell the author what to change (at least 10 characters).'
              : null

  const primaryLabel =
    decision === 'schedule' && when
      ? `Schedule for ${new Date(when).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
      : decision === 'reject'
        ? 'Send back to author'
        : decision === 'publish'
          ? revision
            ? 'Approve revision'
            : 'Approve and publish'
          : decision
            ? DECISION[decision].label
            : ''

  return (
    <div className="flex min-h-full flex-col">
      <SheetHeader className="gap-2 border-b border-[var(--admin-border)] p-4 pr-12 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 nff-caption text-[var(--admin-text-muted)]">
          <span className="capitalize">{item.type}</span>
          {revision && <span>· Revision of live content</span>}
          {total > 1 && (
            <span className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-11" aria-label="Previous item" disabled={!onPrevious} onClick={onPrevious}>
                <ChevronLeft aria-hidden="true" className="size-4" />
              </Button>
              <span className="tabular-nums">
                {position} of {total}
              </span>
              <Button variant="ghost" size="icon" className="size-11" aria-label="Next item" disabled={!onNext} onClick={onNext}>
                <ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </span>
          )}
        </div>
        <SheetTitle id="review-title" tabIndex={-1} className="admin-section-title outline-none focus-visible:ring-2 focus-visible:ring-ring">{displayTitle(shown)}</SheetTitle>
        <SheetDescription className="flex flex-wrap items-center gap-2">
          <ContentStatusChip status={revision ? 'in_review' : item.status} />
          <span>
            Updated {formatDate(revision ? item.revision!.updatedAt : item.updatedAt)}
            {item.scheduledFor && item.status === 'scheduled' && ` · Goes live ${formatDate(item.scheduledFor)}`}
            {SOW_SCOPE.contentOwnership && ` · Owner ${ownerLabel(item)}`}
          </span>
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 p-4 sm:px-6">
        {wasRejected && <ReviewFeedback note={rejectionNote} />}
        {revision && (
          <section aria-labelledby="review-changes" className="flex flex-col gap-2">
            <h3 id="review-changes" className="nff-label-lg">
              Proposed changes
            </h3>
            <p className="nff-body-sm text-[var(--admin-text-muted)]">
              The live version stays as it is until you approve this revision.
              {isRevisionStale(item) && ' The live version has changed since this revision was started: approving replaces those fields.'}
            </p>
            <RevisionFields item={item} />
          </section>
        )}

        <section aria-labelledby="review-content" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 id="review-content" className="nff-label-lg">
              Content
            </h3>
            <div className="flex gap-1">
              <Button asChild size="sm" variant="ghost">
                <Link to={previewHref}>
                  <Eye aria-hidden="true" className="size-4" />
                  Preview
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link to={editHref}>
                  <ExternalLink aria-hidden="true" className="size-4" />
                  Open editor
                </Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
            {shown.excerpt ? (
              <p className="nff-body-md">{shown.excerpt}</p>
            ) : (
              <p className="nff-body-sm text-[var(--admin-text-muted)]">No summary yet.</p>
            )}
            {item.type === 'exploration' && paragraphs[0] && (
              <p className="line-clamp-4 nff-body-sm text-[var(--admin-text-muted)]">{paragraphs[0]}</p>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[var(--admin-border)] pt-3 nff-body-sm sm:grid-cols-4">
              <Fact label="Stage" value={stage ? `${stage.number} · ${stage.title}` : 'None'} />
              <Fact label="Category" value={<span className="capitalize">{shown.category}</span>} />
              {item.type === 'meditation' ? (
                <>
                  <Fact label="Length" value={shown.durationSec ? formatDuration(shown.durationSec) : '—'} />
                  <Fact label="Audio" value={TRANSCODE_META[shown.transcode].label} />
                </>
              ) : (
                <>
                  <Fact label="Words" value={words.toLocaleString()} />
                  <Fact label="Slug" value={shown.slug || '—'} />
                </>
              )}
            </dl>
          </div>
        </section>

        <section aria-labelledby="review-checks" className="flex flex-col gap-2">
          <h3 id="review-checks" className="nff-label-lg">
            Checks
          </h3>
          <ReadinessChecklist item={shown} fixHref={editHref} />
        </section>

        {options.length > 0 && usable.length === 0 && (
          <InlineNotice tone="info">You can follow this item here. Approving, scheduling and sending back are done by an admin.</InlineNotice>
        )}

        {usable.length > 0 && (
          <section aria-labelledby="review-decision" className="flex flex-col gap-3">
            <h3 id="review-decision" className="nff-label-lg">
              Decision
            </h3>
            <div role="radiogroup" aria-labelledby="review-decision" className="grid gap-2 sm:grid-cols-3">
              {usable.map((entry) => {
                const meta = DECISION[entry]
                const selected = decision === entry
                return (
                  <button
                    key={entry}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setDecision(entry)}
                    className={cn(
                      'flex flex-col items-start gap-1 rounded-lg border p-3 text-left nff-focus-ring',
                      selected
                        ? meta.tone === 'danger'
                          ? 'border-nff-border-error bg-nff-bg-error-subtle'
                          : 'border-[var(--admin-primary)] bg-[var(--admin-nav-active-bg)]'
                        : 'border-[var(--admin-border)] bg-[var(--admin-surface)] hover:border-[var(--admin-border-strong)]',
                    )}
                  >
                    <span className="flex items-center gap-2 nff-label-md">
                      <meta.icon aria-hidden="true" className="size-4" />
                      {meta.label}
                    </span>
                    <span className="nff-caption text-[var(--admin-text-muted)]">{meta.hint}</span>
                  </button>
                )
              })}
            </div>

            {decision === 'schedule' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="schedule-at">Publish on</Label>
                <Input
                  id="schedule-at"
                  type="datetime-local"
                  min={minWhen}
                  value={when}
                  onChange={(event) => setWhen(event.target.value)}
                  className="sm:w-72"
                />
              </div>
            )}
            {decision === 'reject' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="review-comment">Feedback for the author</Label>
                <Textarea
                  id="review-comment"
                  rows={4}
                  placeholder="What should change before this can be published?"
                  aria-describedby={blockedReason ? 'review-blocked' : undefined}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
            )}
            {blockedReason && (
              <p id="review-blocked" role="status" className="nff-caption text-[var(--admin-text-muted)]">
                {blockedReason}
              </p>
            )}
          </section>
        )}
      </div>

      {usable.length > 0 && (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 sm:px-6">
          {!decision && <p className="mr-auto nff-body-sm text-[var(--admin-text-muted)]">Choose a decision above.</p>}
          <Button
            variant={decision && DECISION[decision].tone === 'danger' ? 'destructive' : 'default'}
            disabled={!decision || Boolean(blockedReason)}
            aria-describedby={blockedReason ? 'review-blocked' : undefined}
            onClick={() =>
              decision &&
              onDecide(row, decision, {
                ...(decision === 'reject' ? { note: note.trim() } : {}),
                ...(decision === 'schedule' ? { when: new Date(when).toISOString() } : {}),
              })
            }
          >
            <Send aria-hidden="true" className="size-4" />
            {primaryLabel || 'Confirm decision'}
          </Button>
        </div>
      )}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="nff-caption text-[var(--admin-text-muted)]">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  )
}
