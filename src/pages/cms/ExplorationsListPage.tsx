import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, MoreHorizontal, Plus, SearchX } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ContentStatusChip,
  PageHeader,
  Pager,
  paginate,
} from '@/components/cms/CmsParts'
import { EmptyState } from '@/components/nff/EmptyState'
import { ErrorState } from '@/components/nff/ErrorState'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate } from '@/lib/format'
import { stages } from '@/mocks/db'
import {
  createCmsItem,
  duplicateCmsItem,
  listCmsItems,
  setCmsStatus,
  type CmsStatus,
} from '@/services/cms'

const TABS: Array<{ value: 'all' | CmsStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In review' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
]

export function ExplorationsListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['cms', 'explorations'],
    queryFn: () => listCmsItems('exploration'),
  })
  const [tab, setTab] = useState<'all' | CmsStatus>('all')
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('all')
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(1)

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['cms'] })
  }

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <span className="nff-visually-hidden">Loading explorations</span>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load explorations"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const all = query.data
  const filtered = all.filter(
    (item) =>
      (tab === 'all' || item.status === tab) &&
      (stage === 'all' || item.stageId === stage) &&
      (category === 'all' || item.category === category) &&
      item.title.toLowerCase().includes(search.trim().toLowerCase()),
  )
  const paged = paginate(filtered, page)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Explorations"
        description={`${all.length} in the library`}
        action={
          <Button
            className="h-10"
            onClick={() => {
              const item = createCmsItem('exploration')
              refresh()
              navigate(`/cms/explorations/${item.id}`)
            }}
          >
            <Plus aria-hidden="true" className="size-4" />
            New exploration
          </Button>
        }
      />

      {all.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No explorations yet"
          description="Write your first exploration to start the library."
        />
      ) : (
        <>
          <Tabs
            value={tab}
            onValueChange={(value) => {
              setTab(value as 'all' | CmsStatus)
              setPage(1)
            }}
          >
            <TabsList aria-label="Status">
              {TABS.map((entry) => (
                <TabsTrigger key={entry.value} value={entry.value}>
                  {entry.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap gap-3">
            <Input
              aria-label="Search explorations"
              placeholder="Search title"
              className="w-56"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
            <Select
              value={stage}
              onValueChange={(value) => {
                setStage(value)
                setPage(1)
              }}
            >
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
            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value)
                setPage(1)
              }}
            >
              <SelectTrigger aria-label="Category" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {['foundations', 'understand', 'contemplate', 'explore'].map(
                  (entry) => (
                    <SelectItem key={entry} value={entry} className="capitalize">
                      {entry}
                    </SelectItem>
                  ),
                )}
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
                    <TableHead>Category</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.slice.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-xs truncate font-medium">
                        <Link
                          to={`/cms/explorations/${item.id}`}
                          className="text-nff-text-link hover:underline"
                        >
                          {item.title || 'Untitled'}
                        </Link>
                      </TableCell>
                      <TableCell className="capitalize">{item.category}</TableCell>
                      <TableCell>
                        {stages.find((entry) => entry.id === item.stageId)?.title}
                      </TableCell>
                      <TableCell>
                        <ContentStatusChip status={item.status} />
                      </TableCell>
                      <TableCell>{item.owner}</TableCell>
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
                              onClick={() =>
                                navigate(`/cms/explorations/${item.id}`)
                              }
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/cms/preview/exploration/${item.id}`)
                              }
                            >
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                duplicateCmsItem(item)
                                refresh()
                                toast.success('Duplicated as a draft.')
                              }}
                            >
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={item.status !== 'published'}
                              onClick={() => {
                                setCmsStatus(item.id, 'unpublished')
                                refresh()
                                toast.success('Unpublished.')
                              }}
                            >
                              Unpublish
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
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
