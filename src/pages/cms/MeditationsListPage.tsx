import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  Headphones,
  Loader2,
  MoreHorizontal,
  Plus,
  SearchX,
  UploadCloud,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { attempt, usePermissions } from '@/features/auth/usePermissions'
import {
  ContentStatusChip,
  MetricCard,
  PageHeader,
  Pager,
  paginate,
} from '@/components/cms/CmsParts'
import { EmptyState } from '@/components/admin'
import { ErrorState } from '@/components/admin'
import { StatusChip, type StatusTone } from '@/components/nff/StatusChip'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate, formatDuration } from '@/lib/format'
import { stages } from '@/mocks/db'
import {
  createCmsItem,
  listCmsItems,
  saveCmsItem,
  type CmsItem,
} from '@/services/cms'
import type { TranscodeStatus } from '@/types'

export const TRANSCODE_META: Record<
  TranscodeStatus,
  { label: string; tone: StatusTone; icon: typeof Loader2 }
> = {
  uploading: { label: 'Uploading', tone: 'info', icon: UploadCloud },
  validating: { label: 'Validating', tone: 'info', icon: Loader2 },
  transcoding: { label: 'Transcoding', tone: 'warning', icon: Loader2 },
  ready: { label: 'Ready', tone: 'success', icon: CheckCircle2 },
  failed: { label: 'Failed', tone: 'error', icon: AlertTriangle },
}

export function MeditationsListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const query = useQuery({
    queryKey: ['cms', 'meditations'],
    queryFn: () => listCmsItems('meditation'),
  })
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('all')
  const [preview, setPreview] = useState('all')
  const [transcode, setTranscode] = useState('all')
  const [publish, setPublish] = useState('all')
  const [page, setPage] = useState(1)

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['cms'] })
  }

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <span className="nff-visually-hidden">Loading meditations</span>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }
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
  const count = (status: TranscodeStatus[]) =>
    all.filter((item) => status.includes(item.transcode)).length

  const filtered = all.filter(
    (item) =>
      item.title.toLowerCase().includes(search.trim().toLowerCase()) &&
      (stage === 'all' || item.stageId === stage) &&
      (preview === 'all' || String(item.preview) === preview) &&
      (transcode === 'all' || item.transcode === transcode) &&
      (publish === 'all' || item.status === publish),
  )
  const paged = paginate(filtered, page)

  function reset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  function retry(item: CmsItem) {
    saveCmsItem({ ...item, transcode: 'transcoding' })
    refresh()
    toast.success('Transcoding restarted.')
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Meditations"
        description={`${all.length} tracks`}
        action={
          <Button
            className="h-10"
            disabled={!can('content.create')}
            onClick={() => {
              let created: ReturnType<typeof createCmsItem> | undefined
              if (!attempt(() => (created = createCmsItem('meditation')))) return
              refresh()
              navigate(`/cms/meditations/${created!.id}`)
            }}
          >
            <Plus aria-hidden="true" className="size-4" />
            Upload meditation
          </Button>
        }
      />

      <section aria-label="Processing summary" className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Ready" value={String(count(['ready']))} />
        <MetricCard
          label="Processing"
          value={String(count(['uploading', 'validating', 'transcoding']))}
        />
        <MetricCard label="Failed" value={String(count(['failed']))} />
      </section>

      {all.length === 0 ? (
        <EmptyState
          icon={Headphones}
          title="No meditations yet"
          description="Upload your first track to start the audio library."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <Input
              aria-label="Search meditations"
              placeholder="Search title"
              className="w-56"
              value={search}
              onChange={(event) => reset(setSearch)(event.target.value)}
            />
            <Select value={stage} onValueChange={reset(setStage)}>
              <SelectTrigger aria-label="Stage" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {stages.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    Stage {entry.number} · {entry.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={preview} onValueChange={reset(setPreview)}>
              <SelectTrigger aria-label="Preview" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any preview</SelectItem>
                <SelectItem value="true">Free preview</SelectItem>
                <SelectItem value="false">Members only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={transcode} onValueChange={reset(setTranscode)}>
              <SelectTrigger aria-label="Transcode status" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any transcode</SelectItem>
                {Object.entries(TRANSCODE_META).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={publish} onValueChange={reset(setPublish)}>
              <SelectTrigger aria-label="Publish status" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any publish status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_review">In review</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No results"
              description="Try a different filter or clear the search."
            />
          ) : (
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead>Transcode</TableHead>
                    <TableHead>Publish</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.slice.map((item) => {
                    const meta = TRANSCODE_META[item.transcode]
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="max-w-xs truncate font-medium">
                          <Link
                            to={`/cms/meditations/${item.id}`}
                            className="text-nff-text-link hover:underline"
                          >
                            {item.title || 'Untitled'}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {stages.find((entry) => entry.id === item.stageId)?.title}
                        </TableCell>
                        <TableCell>
                          {item.durationSec ? formatDuration(item.durationSec) : '—'}
                        </TableCell>
                        <TableCell>{item.preview ? 'Free preview' : '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusChip tone={meta.tone} icon={meta.icon}>
                              {meta.label}
                            </StatusChip>
                            {item.transcode === 'failed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => retry(item)}
                              >
                                Retry
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ContentStatusChip status={item.status} />
                          {item.revision && (
                            <span className="block nff-caption text-muted-foreground">
                              Revision: {item.revision.status.replace('_', ' ')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(item.updatedAt)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Actions for ${item.title}`}
                              >
                                <MoreHorizontal aria-hidden="true" className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => navigate(`/cms/meditations/${item.id}`)}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/cms/preview/meditation/${item.id}`)
                                }
                              >
                                Preview
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <Pager page={paged.page} pages={paged.pages} onPage={setPage} />
        </>
      )}
    </div>
  )
}
