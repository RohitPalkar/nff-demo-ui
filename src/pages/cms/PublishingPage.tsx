import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Headphones, Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CellStack, DataTable, ErrorState, InlineNotice, LoadingState, type DataTableColumn } from '@/components/admin'
import { ContentStatusChip, PageHeader, ReadinessBadge, displayTitle, readinessOf } from '@/components/cms/CmsParts'
import { ReviewPanel, type Decision, type QueueRow } from '@/components/cms/ReviewPanel'
import { SOW_SCOPE } from '@/config/sowScope'
import { Button } from '@/components/ui/button'
import { attempt, usePermissions } from '@/features/auth/usePermissions'
import { formatDate } from '@/lib/format'
import {
  listAllCmsItems,
  ownerLabel,
  publishRevision,
  rejectRevision,
  setCmsStatus,
  workingCopy,
} from '@/services/cms'

type View = 'in_review' | 'scheduled' | 'published' | 'rejected'

const shownOf = (row: QueueRow) => (row.revision ? workingCopy(row.item) : row.item)

/** Which queue a row sits in. A pending revision sits beside its live item. */
function viewOf(row: QueueRow): View | null {
  if (row.revision) {
    const status = row.item.revision?.status
    return status === 'in_review' ? 'in_review' : status === 'rejected' ? 'rejected' : null
  }
  const status = row.item.status
  return status === 'in_review' || status === 'scheduled' || status === 'published' || status === 'rejected' ? status : null
}

const dateOf = (row: QueueRow) =>
  row.revision ? row.item.revision!.updatedAt : (row.item.status === 'scheduled' && row.item.scheduledFor) || row.item.updatedAt

export function PublishingPage() {
  const { can } = usePermissions()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['cms', 'all'], queryFn: () => listAllCmsItems() })
  const [view, setView] = useState<View>('in_review')
  const [openKey, setOpenKey] = useState<string | null>(null)

  // Each action needs the permissions the workflow table asks for.
  const abilities = {
    approve: can('content.review') && can('content.approve') && can('content.publish'),
    schedule: can('content.review') && can('content.approve') && can('content.schedule'),
    reject: can('content.review') && can('content.reject'),
    unpublish: can('content.unpublish'),
  }
  const canAct = abilities.approve || abilities.schedule || abilities.reject

  const rows = useMemo<QueueRow[]>(() => {
    if (!query.data) return []
    return query.data
      .flatMap((item) => {
        const out: QueueRow[] = [{ key: item.id, item, revision: false }]
        if (item.revision) out.push({ key: `${item.id}-revision`, item, revision: true })
        return out
      })
      .filter((row) => viewOf(row) !== null)
  }, [query.data])

  if (query.isPending) return <LoadingState label="Loading the review queue" rows={6} />
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load the queue"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
  }

  // The drawer walks the current view in date order (oldest waiting first).
  const queue = rows
    .filter((row) => viewOf(row) === view)
    .sort((a, b) => dateOf(a).localeCompare(dateOf(b)))
  const index = queue.findIndex((row) => row.key === openKey)
  const open = index >= 0 ? queue[index]! : null

  function decide(row: QueueRow, decision: Decision, extra: { note?: string; when?: string }) {
    const id = row.item.id
    const run = () => {
      if (row.revision) {
        if (decision === 'publish') publishRevision(id)
        else if (decision === 'reject') rejectRevision(id, extra.note ?? '')
        return
      }
      if (decision === 'publish') setCmsStatus(id, 'published')
      else if (decision === 'schedule') setCmsStatus(id, 'scheduled', { scheduledFor: extra.when })
      else if (decision === 'reject') setCmsStatus(id, 'rejected', { rejectionNote: extra.note })
      else if (decision === 'unschedule') setCmsStatus(id, 'draft', { scheduledFor: undefined })
      else if (decision === 'unpublish') setCmsStatus(id, 'unpublished')
    }
    if (!attempt(run)) return
    const title = displayTitle(shownOf(row))
    toast.success(
      decision === 'publish'
        ? `Published “${title}”.`
        : decision === 'schedule'
          ? `Scheduled “${title}”.`
          : decision === 'reject'
            ? `Sent “${title}” back to the author.`
            : decision === 'unschedule'
              ? `“${title}” is back in draft.`
              : `Unpublished “${title}”.`,
    )
    // Move on to the next item in this queue, if there is one.
    const next = queue[index + 1] ?? null
    setOpenKey(next?.key ?? null)
    void queryClient.invalidateQueries({ queryKey: ['cms'] })
  }

  const columns: Array<DataTableColumn<QueueRow>> = [
    {
      id: 'title',
      header: 'Item',
      primary: true,
      sortValue: (row) => displayTitle(shownOf(row)),
      cell: (row) => {
        const Icon = row.item.type === 'meditation' ? Headphones : BookOpen
        return (
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--admin-surface-subtle)] text-[var(--admin-text-muted)]">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <CellStack
              title={
                <button
                  type="button"
                  className="nff-target max-w-full truncate text-left hover:underline nff-focus-ring"
                  onClick={() => setOpenKey(row.key)}
                >
                  {displayTitle(shownOf(row))}
                </button>
              }
              meta={
                <span className="capitalize">
                  {row.item.type}
                  {row.revision && ' · Revision of live content'}
                </span>
              }
            />
          </div>
        )
      },
    },
    {
      id: 'readiness',
      header: 'Readiness',
      sortValue: (row) => readinessOf(shownOf(row)).filter((check) => !check.ok).length,
      cell: (row) => <ReadinessBadge item={shownOf(row)} />,
    },
    ...(view !== 'in_review'
      ? [
          {
            id: 'status',
            header: 'Status',
            cell: (row: QueueRow) => <ContentStatusChip status={row.revision ? row.item.revision!.status === 'rejected' ? 'rejected' : 'in_review' : row.item.status} />,
          },
        ]
      : []),
    ...(SOW_SCOPE.contentOwnership
      ? [{ id: 'owner', header: 'Owner', sortValue: (row: QueueRow) => ownerLabel(row.item), cell: (row: QueueRow) => ownerLabel(row.item) }]
      : []),
    {
      id: 'date',
      header: view === 'scheduled' ? 'Goes live' : view === 'in_review' ? 'Submitted' : 'Updated',
      sortValue: dateOf,
      cell: (row) => <span className="tabular-nums">{formatDate(dateOf(row))}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      hideHeader: true,
      cell: (row) => (
        <Button
          size="sm"
          variant={canAct && view === 'in_review' ? 'default' : 'outline'}
          aria-label={`Review ${displayTitle(shownOf(row))}`}
          data-review-key={row.key}
          onClick={() => setOpenKey(row.key)}
        >
          {canAct && view !== 'rejected' ? 'Review' : 'Open'}
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Review Queue" description="Check submitted content, then publish, schedule or send it back." />

      {!canAct && (
        <InlineNotice tone="info">
          You can follow the review status of your content here. Approving, rejecting and publishing are done by an admin.
        </InlineNotice>
      )}

      <DataTable
        caption="Review queue"
        noun="item"
        rows={rows}
        columns={columns}
        getRowId={(row) => row.key}
        views={[
          { id: 'in_review', label: 'Awaiting review', predicate: (row) => viewOf(row) === 'in_review' },
          { id: 'scheduled', label: 'Scheduled', predicate: (row) => viewOf(row) === 'scheduled' },
          { id: 'published', label: 'Published', predicate: (row) => viewOf(row) === 'published' },
          { id: 'rejected', label: 'Sent back', predicate: (row) => viewOf(row) === 'rejected' },
        ]}
        view={view}
        onViewChange={(next) => setView(next as View)}
        initialSort={{ id: 'date', direction: 'asc' }}
        search={{ placeholder: 'Search title', text: (row) => [shownOf(row).title, shownOf(row).excerpt] }}
        filters={[
          {
            id: 'type',
            label: 'Type',
            options: [
              { value: 'exploration', label: 'Explorations' },
              { value: 'meditation', label: 'Meditations' },
            ],
            predicate: (row, value) => row.item.type === value,
          },
          {
            id: 'readiness',
            label: 'Readiness',
            options: [
              { value: 'ready', label: 'Ready to publish' },
              { value: 'blocked', label: 'Needs work' },
            ],
            predicate: (row, value) => readinessOf(shownOf(row)).every((check) => check.ok) === (value === 'ready'),
          },
          {
            id: 'kind',
            label: 'Kind',
            options: [
              { value: 'new', label: 'New content' },
              { value: 'revision', label: 'Revisions of live content' },
            ],
            predicate: (row, value) => row.revision === (value === 'revision'),
          },
        ]}
        selectedId={openKey}
        empty={{ icon: Inbox, title: 'Nothing to review', description: 'Items appear here when an author submits them for review.' }}
      />

      <ReviewPanel
        row={open}
        position={index + 1}
        total={queue.length}
        can={abilities}
        onPrevious={index > 0 ? () => setOpenKey(queue[index - 1]!.key) : undefined}
        onNext={index >= 0 && index < queue.length - 1 ? () => setOpenKey(queue[index + 1]!.key) : undefined}
        onClose={() => setOpenKey(null)}
        onDecide={decide}
      />
    </div>
  )
}
