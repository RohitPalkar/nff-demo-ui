import { useQuery } from '@tanstack/react-query'
import { SearchX, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Pager, paginate } from '@/components/cms/CmsParts'
import { EmptyState } from '@/components/nff/EmptyState'
import { ErrorState } from '@/components/nff/ErrorState'
import { StatusChip, type StatusTone } from '@/components/nff/StatusChip'
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
import { formatDate } from '@/lib/format'
import { stages } from '@/mocks/db'
import { getUsers, userStatusOverrides } from '@/services/cms'
import type { AccountStatus } from '@/types'

export const ACCOUNT_TONE: Record<AccountStatus, StatusTone> = {
  active: 'success',
  unverified: 'warning',
  deactivated: 'neutral',
  pending_deletion: 'error',
}

export const ACCOUNT_LABEL: Record<AccountStatus, string> = {
  active: 'Active',
  unverified: 'Unverified',
  deactivated: 'Deactivated',
  pending_deletion: 'Pending deletion',
}

function band(score: number) {
  return score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'
}

export function UsersPage() {
  const query = useQuery({ queryKey: ['cms', 'users'], queryFn: getUsers })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [stage, setStage] = useState('all')
  const [engagement, setEngagement] = useState('all')
  const [page, setPage] = useState(1)

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <span className="nff-visually-hidden">Loading users</span>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load users"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const overrides = userStatusOverrides()
  const people = query.data
    .filter((entry) => entry.role === 'practitioner')
    .map((entry) => ({ ...entry, status: overrides[entry.id] ?? entry.status }))
  const q = search.trim().toLowerCase()
  const filtered = people.filter(
    (entry) =>
      (q === '' ||
        entry.name.toLowerCase().includes(q) ||
        entry.email.toLowerCase().includes(q)) &&
      (status === 'all' || entry.status === status) &&
      (stage === 'all' || entry.currentStageId === stage) &&
      (engagement === 'all' || band(entry.engagementScore) === engagement),
  )
  const paged = paginate(filtered, page)

  function reset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Users" description={`${people.length} practitioners`} />

      {people.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users yet"
          description="Practitioners will appear here after they sign up."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <Input
              aria-label="Search users"
              placeholder="Search name or email"
              className="w-60"
              value={search}
              onChange={(event) => reset(setSearch)(event.target.value)}
            />
            <Select value={status} onValueChange={reset(setStatus)}>
              <SelectTrigger aria-label="Status" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                {Object.entries(ACCOUNT_LABEL).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stage} onValueChange={reset(setStage)}>
              <SelectTrigger aria-label="Current stage" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any stage</SelectItem>
                {stages.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    Stage {entry.number} · {entry.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={engagement} onValueChange={reset(setEngagement)}>
              <SelectTrigger aria-label="Engagement" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any engagement</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Last active</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.slice.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/cms/users/${entry.id}`}
                          className="text-nff-text-link hover:underline"
                        >
                          {entry.name}
                        </Link>
                      </TableCell>
                      <TableCell>{entry.email}</TableCell>
                      <TableCell>
                        <StatusChip tone={ACCOUNT_TONE[entry.status]} icon={Users}>
                          {ACCOUNT_LABEL[entry.status]}
                        </StatusChip>
                      </TableCell>
                      <TableCell>
                        {stages.find((s) => s.id === entry.currentStageId)?.title}
                      </TableCell>
                      <TableCell>{formatDate(entry.lastActiveAt)}</TableCell>
                      <TableCell>{entry.engagementScore}</TableCell>
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
