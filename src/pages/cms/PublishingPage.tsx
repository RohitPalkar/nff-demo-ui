import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Inbox, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ContentStatusChip, PageHeader, ReviewFeedback, RevisionFields } from '@/components/cms/CmsParts'
import { EmptyState } from '@/components/admin'
import { ErrorState } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { attempt, usePermissions } from '@/features/auth/usePermissions'
import { formatDate } from '@/lib/format'
import {
  checksFor,
  isRevisionStale,
  listAllCmsItems,
  ownerLabel,
  publishRevision,
  rejectRevision,
  setCmsStatus,
  workingCopy,
  type CmsItem,
} from '@/services/cms'

type Tab = 'in_review' | 'scheduled' | 'published' | 'rejected'

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'in_review', label: 'Awaiting review' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Recently published' },
  { value: 'rejected', label: 'Rejected' },
]

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 nff-caption ${ok ? 'text-nff-text-success' : 'text-nff-text-error'}`}
    >
      {ok ? (
        <CheckCircle2 aria-hidden="true" className="size-3.5" />
      ) : (
        <XCircle aria-hidden="true" className="size-3.5" />
      )}
      {label}
    </span>
  )
}

export function PublishingPage() {
  const { can } = usePermissions()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['cms', 'all'], queryFn: () => listAllCmsItems() })
  const [tab, setTab] = useState<Tab>('in_review')
  const [pick, setPick] = useState<{ item: CmsItem; revision: boolean } | null>(null)
  const selected = pick?.item ?? null
  const isRevision = pick?.revision ?? false
  const [comment, setComment] = useState('')
  const [when, setWhen] = useState('')

  // Each action needs the permissions the workflow table asks for.
  const canApprove = can('content.review') && can('content.approve') && can('content.publish')
  const canSchedule = can('content.review') && can('content.approve') && can('content.schedule')
  const canReject = can('content.review') && can('content.reject')
  const canAct = canApprove || canSchedule || canReject

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <span className="nff-visually-hidden">Loading publishing queue</span>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load the queue"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
  }

  // Edits to live content wait here as revisions, beside the items themselves.
  const rows = query.data.flatMap((item) => {
    const out: Array<{ item: CmsItem; revision: boolean }> = []
    if (item.status === tab) out.push({ item, revision: false })
    const pending = item.revision?.status
    if ((tab === 'in_review' && pending === 'in_review') || (tab === 'rejected' && pending === 'rejected')) {
      out.push({ item, revision: true })
    }
    return out
  })

  function act(
    status: CmsItem['status'],
    message: string,
    extra: Partial<CmsItem> = {},
  ) {
    if (!selected) return
    const run = () => {
      if (!isRevision) return setCmsStatus(selected.id, status, extra)
      // A revision is approved or rejected; the live version is never moved.
      return status === 'rejected'
        ? rejectRevision(selected.id, extra.rejectionNote ?? '')
        : publishRevision(selected.id)
    }
    if (!attempt(run)) return
    void queryClient.invalidateQueries({ queryKey: ['cms'] })
    toast.success(message)
    setPick(null)
    setComment('')
    setWhen('')
  }

  const shown = selected ? (isRevision ? workingCopy(selected) : selected) : null
  const checks = shown ? checksFor(shown) : null
  const blocked = checks ? !(checks.artwork && checks.audio && checks.metadata) : false

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Review Queue" description="Review and release content." />

      {!canAct && (
        <p
          role="status"
          className="rounded-xl border bg-nff-bg-muted p-4 nff-body-sm"
        >
          You can follow the review status of your content here. Approving, rejecting and publishing are done by an admin.
        </p>
      )}

      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList aria-label="Queue">
          {TABS.map((entry) => (
            <TabsTrigger key={entry.value} value={entry.value}>
              {entry.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nothing here"
          description="Items will appear in this queue as they move through review."
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Checks</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 12).map(({ item, revision }) => {
                const c = checksFor(revision ? workingCopy(item) : item)
                return (
                  <TableRow key={`${item.id}${revision ? '-revision' : ''}`}>
                    <TableCell className="max-w-xs truncate font-medium">
                      {revision ? workingCopy(item).title : item.title}
                      {revision && (
                        <span className="block nff-caption text-muted-foreground">
                          Revision of live content
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">{item.type}</TableCell>
                    <TableCell>{ownerLabel(item)}</TableCell>
                    <TableCell>
                      {formatDate(item.scheduledFor ?? item.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <Check ok={c.artwork} label="Artwork" />
                        <Check ok={c.audio} label="Audio ready" />
                        <Check ok={c.metadata} label="Metadata" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setPick({ item, revision })}>
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setPick(null)}>
        <SheetContent>
          {selected && checks && (
            <>
              <SheetHeader>
                <SheetTitle>{shown!.title}</SheetTitle>
                <SheetDescription>
                  Owner: {ownerLabel(selected)} · {formatDate(isRevision ? selected.revision!.updatedAt : selected.updatedAt)}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 pb-4">
                {isRevision ? (
                  <div role="status" className="flex flex-col gap-3">
                    <p className="nff-body-sm">
                      A revision of live content. The live version stays as it is until you approve this.
                      {isRevisionStale(selected) && ' The live version has changed since this revision was started: approving replaces those fields.'}
                    </p>
                    <RevisionFields item={selected} />
                  </div>
                ) : (
                  <ContentStatusChip status={selected.status} />
                )}
                {!isRevision && selected.status === 'rejected' && <ReviewFeedback note={selected.rejectionNote} />}
                {isRevision && selected.revision!.status === 'rejected' && (
                  <ReviewFeedback note={selected.revision!.rejectionNote} />
                )}
                <ul aria-label="Checklist" className="flex flex-col gap-1">
                  <li><Check ok={checks.artwork} label="Artwork present" /></li>
                  <li><Check ok={checks.audio} label="Audio ready" /></li>
                  <li><Check ok={checks.metadata} label="Metadata complete" /></li>
                </ul>
                {blocked && (
                  <p role="alert" className="nff-body-sm text-nff-text-error">
                    Fix the failed checks before publishing.
                  </p>
                )}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="review-comment">Comment</Label>
                  <Textarea
                    id="review-comment"
                    rows={3}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="schedule-at">Schedule for</Label>
                  <Input
                    id="schedule-at"
                    type="datetime-local"
                    value={when}
                    onChange={(event) => setWhen(event.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!canApprove || blocked}
                    onClick={() => act('published', 'Approved and published.')}
                  >
                    Approve and publish
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!canSchedule || blocked || !when || isRevision}
                    onClick={() =>
                      act('scheduled', 'Scheduled.', {
                        scheduledFor: new Date(when).toISOString(),
                      })
                    }
                  >
                    Schedule
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={!canReject}
                    onClick={() =>
                      act('rejected', 'Rejected.', { rejectionNote: comment })
                    }
                  >
                    Reject
                  </Button>
                </div>
                {!canAct && (
                  <p className="nff-caption text-muted-foreground">
                    Only an admin can approve, reject or publish.
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
