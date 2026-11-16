import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Headphones, Lock, MoreHorizontal, Plus, Unlock } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CellStack, ConfirmationDialog, DataTable, ErrorState, LoadingState, type DataTableColumn } from '@/components/admin'
import { ContentStatusChip, MetricCard, PageHeader, TRANSCODE_META, displayTitle } from '@/components/cms/CmsParts'
import { StatusChip } from '@/components/nff/StatusChip'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { attempt, usePermissions } from '@/features/auth/usePermissions'
import { formatDate, formatDuration } from '@/lib/format'
import { stages } from '@/mocks/db'
import { createCmsItem, listCmsItems, saveCmsItem, setMeditationAccess, type CmsItem } from '@/services/cms'

const STAGE_OPTIONS = stages.map((entry) => ({ value: entry.id, label: `Stage ${entry.number} · ${entry.title}` }))

/**
 * The audio lock as a button: says the current state, and (for someone who
 * can change it) switches between free preview and members only.
 */
export function AccessToggle({ item, canChange, onChange }: { item: CmsItem; canChange: boolean; onChange: (preview: boolean) => void }) {
  const Icon = item.preview ? Unlock : Lock
  const label = item.preview ? 'Free preview' : 'Locked'
  if (!canChange) {
    return (
      <span className="inline-flex items-center gap-1.5 nff-body-sm">
        <Icon aria-hidden="true" className="size-4 text-[var(--admin-text-muted)]" />
        {label}
      </span>
    )
  }
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      aria-pressed={item.preview}
      aria-label={`${displayTitle(item)}: ${label}. ${item.preview ? 'Lock to members' : 'Make a free preview'}`}
      title={item.preview ? 'Visitors can listen without an account. Click to lock.' : 'Members only. Click to make a free preview.'}
      className={item.preview ? 'border-nff-border-success bg-nff-bg-success-subtle text-nff-text-success' : undefined}
      onClick={() => onChange(!item.preview)}
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </Button>
  )
}

export function MeditationsListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const query = useQuery({ queryKey: ['cms', 'meditations'], queryFn: () => listCmsItems('meditation') })
  const [bulk, setBulk] = useState<boolean | null>(null)
  const canLock = can('content.edit') && can('content.publish')

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['cms'] })
  }

  if (query.isPending) return <LoadingState label="Loading meditations" rows={6} />
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load meditations"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const all = query.data
  const count = (status: CmsItem['transcode'][]) => all.filter((item) => status.includes(item.transcode)).length
  const free = all.filter((item) => item.preview).length

  function setAccess(ids: string[], preview: boolean, label: string) {
    const flipped = all.filter((item) => ids.includes(item.id) && item.preview !== preview).map((item) => item.id)
    let changed = 0
    if (!attempt(() => (changed = setMeditationAccess(ids, preview)))) return
    refresh()
    if (changed === 0) {
      toast.success('Nothing to change.')
      return
    }
    // Who can listen is a publishing decision: offer a way straight back (WCAG 3.3.6).
    toast.success(label, {
      action: {
        label: 'Undo',
        onClick: () => {
          if (!attempt(() => setMeditationAccess(flipped, !preview))) return
          refresh()
          toast.success('Access restored.')
        },
      },
    })
  }

  function retry(item: CmsItem) {
    if (!attempt(() => saveCmsItem({ ...item, transcode: 'transcoding' }))) return
    refresh()
    toast.success('Transcoding restarted.')
  }

  function create() {
    let created: CmsItem | undefined
    if (!attempt(() => (created = createCmsItem('meditation')))) return
    refresh()
    navigate(`/cms/meditations/${created!.id}`)
  }

  const columns: Array<DataTableColumn<CmsItem>> = [
    {
      id: 'title',
      header: 'Title',
      primary: true,
      sortValue: (item) => displayTitle(item),
      cell: (item) => (
        <CellStack
          title={
            <Link to={`/cms/meditations/${item.id}`} className="nff-target hover:underline nff-focus-ring">
              {displayTitle(item)}
            </Link>
          }
          meta={stages.find((entry) => entry.id === item.stageId)?.title ?? 'No stage'}
        />
      ),
    },
    {
      id: 'duration',
      header: 'Length',
      sortValue: (item) => item.durationSec,
      cell: (item) => <span className="tabular-nums">{item.durationSec ? formatDuration(item.durationSec) : '—'}</span>,
    },
    {
      id: 'access',
      header: 'Access',
      sortValue: (item) => (item.preview ? 0 : 1),
      cell: (item) => (
        <AccessToggle
          item={item}
          canChange={canLock}
          onChange={(preview) =>
            setAccess([item.id], preview, preview ? `“${displayTitle(item)}” is now a free preview.` : `“${displayTitle(item)}” is now locked to members.`)
          }
        />
      ),
    },
    {
      id: 'audio',
      header: 'Audio',
      sortValue: (item) => TRANSCODE_META[item.transcode].label,
      cell: (item) => {
        const meta = TRANSCODE_META[item.transcode]
        return (
          <div className="flex items-center gap-2">
            <StatusChip tone={meta.tone} icon={meta.icon}>
              {meta.label}
            </StatusChip>
            {item.transcode === 'failed' && can('content.edit') && (
              <Button size="xs" variant="outline" onClick={() => retry(item)}>
                Retry
              </Button>
            )}
          </div>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (item) => item.status,
      cell: (item) => (
        <div className="flex flex-col items-end gap-0.5 md:items-start">
          <ContentStatusChip status={item.status} />
          {item.revision && <span className="nff-caption text-[var(--admin-text-muted)]">Revision {item.revision.status.replace('_', ' ')}</span>}
        </div>
      ),
    },
    {
      id: 'updated',
      header: 'Updated',
      sortValue: (item) => item.updatedAt,
      cell: (item) => <span className="tabular-nums">{formatDate(item.updatedAt)}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      hideHeader: true,
      cell: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${displayTitle(item)}`}>
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/cms/meditations/${item.id}`)}>Edit</DropdownMenuItem>
            <DropdownMenuItem disabled={!can('content.preview')} onClick={() => navigate(`/cms/preview/meditation/${item.id}`)}>
              Preview
            </DropdownMenuItem>
            {canLock && (
              <DropdownMenuItem
                onClick={() =>
                  setAccess([item.id], !item.preview, item.preview ? 'Locked to members.' : 'Now a free preview.')
                }
              >
                {item.preview ? 'Lock to members' : 'Make free preview'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Meditations"
        description="Audio tracks, their processing, and who can listen."
        action={
          can('content.create') && (
            <Button className="h-10" onClick={create}>
              <Plus aria-hidden="true" className="size-4" />
              New meditation
            </Button>
          )
        }
      />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Ready" value={String(count(['ready']))} />
        <MetricCard label="Processing" value={String(count(['uploading', 'validating', 'transcoding']))} />
        <MetricCard label="Failed" value={String(count(['failed']))} />
        <MetricCard label="Free previews" value={`${free} of ${all.length}`} hint="The rest are locked to members." />
      </section>

      <DataTable
        caption="Meditations"
        noun="meditation"
        rows={all}
        columns={columns}
        getRowId={(item) => item.id}
        initialSort={{ id: 'updated', direction: 'desc' }}
        views={[
          { id: 'all', label: 'All', predicate: () => true },
          { id: 'draft', label: 'Draft', predicate: (item) => item.status === 'draft' || item.status === 'rejected' },
          { id: 'in_review', label: 'In review', predicate: (item) => item.status === 'in_review' },
          { id: 'live', label: 'Live', predicate: (item) => item.status === 'published' || item.status === 'scheduled' },
        ]}
        search={{ placeholder: 'Search title', text: (item) => [item.title, item.slug, item.excerpt] }}
        filters={[
          { id: 'stage', label: 'Stage', options: STAGE_OPTIONS, predicate: (item, value) => item.stageId === value },
          {
            id: 'access',
            label: 'Access',
            options: [
              { value: 'free', label: 'Free preview' },
              { value: 'locked', label: 'Locked' },
            ],
            predicate: (item, value) => item.preview === (value === 'free'),
          },
          {
            id: 'audio',
            label: 'Audio',
            options: Object.entries(TRANSCODE_META).map(([value, meta]) => ({ value, label: meta.label })),
            predicate: (item, value) => item.transcode === value,
          },
        ]}
        actions={
          canLock && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-11">
                  <Lock aria-hidden="true" className="size-4" />
                  Access
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Every meditation</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setBulk(false)}>
                  <Lock aria-hidden="true" className="size-4" />
                  Lock all to members
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBulk(true)}>
                  <Unlock aria-hidden="true" className="size-4" />
                  Make all free previews
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
        empty={{
          icon: Headphones,
          title: 'No meditations yet',
          description: 'Upload your first track to start the audio library.',
          action: can('content.create') ? (
            <Button size="sm" onClick={create}>
              New meditation
            </Button>
          ) : undefined,
        }}
      />

      <ConfirmationDialog
        open={bulk !== null}
        onOpenChange={(open) => !open && setBulk(null)}
        title={bulk ? 'Make every meditation a free preview?' : 'Lock every meditation to members?'}
        description={
          bulk
            ? `Visitors will be able to listen to all ${all.length} tracks without an account. You can lock tracks again one by one.`
            : `Visitors will need an account to listen to any of the ${all.length} tracks. You can unlock tracks again one by one.`
        }
        confirmLabel={bulk ? 'Make all free' : 'Lock all'}
        onConfirm={() => {
          const preview = Boolean(bulk)
          setBulk(null)
          setAccess(
            all.map((item) => item.id),
            preview,
            preview ? 'Every meditation is now a free preview.' : 'Every meditation is now locked to members.',
          )
        }}
      />
    </div>
  )
}
