import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, MoreHorizontal, Plus, Star } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CellStack, ConfirmationDialog, DataTable, ErrorState, LoadingState, type DataTableColumn } from '@/components/admin'
import { CATEGORY_OPTIONS, ContentStatusChip, PageHeader, ReadinessBadge, displayTitle } from '@/components/cms/CmsParts'
import { SOW_SCOPE } from '@/config/sowScope'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { attempt, usePermissions } from '@/features/auth/usePermissions'
import { formatDate } from '@/lib/format'
import { stages } from '@/mocks/db'
import { createCmsItem, duplicateCmsItem, listCmsItems, ownerLabel, setCmsStatus, type CmsItem } from '@/services/cms'

const STAGE_OPTIONS = stages.map((entry) => ({ value: entry.id, label: `Stage ${entry.number} · ${entry.title}` }))

export function ExplorationsListPage() {
  const [unpublishing, setUnpublishing] = useState<CmsItem | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const query = useQuery({ queryKey: ['cms', 'explorations'], queryFn: () => listCmsItems('exploration') })

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['cms'] })
  }

  function create() {
    let created: CmsItem | undefined
    if (!attempt(() => (created = createCmsItem('exploration')))) return
    refresh()
    navigate(`/cms/explorations/${created!.id}`)
  }

  if (query.isPending) return <LoadingState label="Loading explorations" rows={6} />
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load explorations"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
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
            <Link to={`/cms/explorations/${item.id}`} className="nff-target hover:underline nff-focus-ring">
              {displayTitle(item)}
              {item.featured && <Star aria-label="Featured on home" className="ml-1.5 inline size-3.5 fill-current text-nff-text-warning" />}
            </Link>
          }
          meta={<span className="capitalize">{item.category}</span>}
        />
      ),
    },
    {
      id: 'stage',
      header: 'Stage',
      sortValue: (item) => stages.find((entry) => entry.id === item.stageId)?.number ?? 99,
      cell: (item) => stages.find((entry) => entry.id === item.stageId)?.title ?? '—',
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
    { id: 'ready', header: 'Readiness', cell: (item) => <ReadinessBadge item={item} /> },
    ...(SOW_SCOPE.contentOwnership
      ? [{ id: 'owner', header: 'Owner', sortValue: (item: CmsItem) => ownerLabel(item), cell: (item: CmsItem) => ownerLabel(item) }]
      : []),
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
            <DropdownMenuItem onClick={() => navigate(`/cms/explorations/${item.id}`)}>Edit</DropdownMenuItem>
            <DropdownMenuItem disabled={!can('content.preview')} onClick={() => navigate(`/cms/preview/exploration/${item.id}`)}>
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!can('content.create')}
              onClick={() => {
                if (!attempt(() => duplicateCmsItem(item))) return
                refresh()
                toast.success('Duplicated as a draft.')
              }}
            >
              Duplicate
            </DropdownMenuItem>
            {can('content.unpublish') && item.status === 'published' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-nff-text-error"
                  onClick={() => setUnpublishing(item)}
                >
                  Unpublish
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Explorations"
        description="Written lessons: drafts, reviews and what is live."
        action={
          can('content.create') && (
            <Button className="h-10" onClick={create}>
              <Plus aria-hidden="true" className="size-4" />
              New exploration
            </Button>
          )
        }
      />
      <DataTable
        caption="Explorations"
        noun="exploration"
        rows={query.data}
        columns={columns}
        getRowId={(item) => item.id}
        initialSort={{ id: 'updated', direction: 'desc' }}
        views={[
          { id: 'all', label: 'All', predicate: () => true },
          { id: 'draft', label: 'Draft', predicate: (item) => item.status === 'draft' || item.status === 'rejected' },
          { id: 'in_review', label: 'In review', predicate: (item) => item.status === 'in_review' },
          { id: 'published', label: 'Published', predicate: (item) => item.status === 'published' },
          { id: 'scheduled', label: 'Scheduled', predicate: (item) => item.status === 'scheduled' },
        ]}
        search={{ placeholder: 'Search title or summary', text: (item) => [item.title, item.slug, item.excerpt] }}
        filters={[
          { id: 'stage', label: 'Stage', options: STAGE_OPTIONS, predicate: (item, value) => item.stageId === value },
          { id: 'category', label: 'Category', options: CATEGORY_OPTIONS, predicate: (item, value) => item.category === value },
          {
            id: 'featured',
            label: 'Featured',
            options: [
              { value: 'yes', label: 'Featured on home' },
              { value: 'no', label: 'Not featured' },
            ],
            predicate: (item, value) => item.featured === (value === 'yes'),
          },
        ]}
        empty={{
          icon: FileText,
          title: 'No explorations yet',
          description: 'Write your first exploration to start the library.',
          action: can('content.create') ? (
            <Button size="sm" onClick={create}>
              New exploration
            </Button>
          ) : undefined,
        }}
      />
      <ConfirmationDialog
        open={unpublishing !== null}
        onOpenChange={(open) => !open && setUnpublishing(null)}
        title={`Unpublish ${unpublishing ? displayTitle(unpublishing) : 'this exploration'}?`}
        description="Visitors and practitioners stop seeing it straight away. It stays in the CMS, and you can publish it again from the Review Queue."
        confirmLabel="Unpublish"
        onConfirm={() => {
          const item = unpublishing
          setUnpublishing(null)
          if (!item || !attempt(() => setCmsStatus(item.id, 'unpublished'))) return
          refresh()
          toast.success(`${displayTitle(item)} is unpublished.`)
        }}
      />
    </div>
  )
}
