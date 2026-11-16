import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CellStack, DataTable, ErrorState, Initials, LoadingState, type DataTableColumn } from '@/components/admin'
import { PageHeader } from '@/components/cms/CmsParts'
import { StatusChip, type StatusTone } from '@/components/nff/StatusChip'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { stages } from '@/mocks/db'
import { getUsers, userStatusOverrides } from '@/services/cms'
import type { AccountStatus, User } from '@/types'

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

const BAND_LABEL = { high: 'High', medium: 'Medium', low: 'Low' } as const

/** The score as a number with a small bar; the band in words for screen readers. */
function Score({ value }: { value: number }) {
  const level = band(value)
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-7 text-right tabular-nums">{value}</span>
      <span aria-hidden="true" className="hidden h-1.5 w-16 overflow-hidden rounded-sm bg-nff-bg-muted sm:block">
        <span
          className={`block h-full ${level === 'high' ? 'bg-nff-text-success' : level === 'medium' ? 'bg-nff-text-warning' : 'bg-[var(--admin-border-strong)]'}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </span>
      <span className="sr-only">{BAND_LABEL[level]} engagement</span>
    </span>
  )
}

export function UsersPage() {
  const query = useQuery({ queryKey: ['cms', 'users'], queryFn: () => getUsers() })

  if (query.isPending) return <LoadingState label="Loading practitioners" rows={8} />
  if (query.isError) {
    return (
      <ErrorState title="We could not load practitioners" description="Check your connection and try again." onRetry={() => void query.refetch()} />
    )
  }

  const overrides = userStatusOverrides()
  const people = query.data
    .filter((entry) => entry.role === 'practitioner')
    .map((entry) => ({ ...entry, status: overrides[entry.id] ?? entry.status }))
  const stageOf = (person: User) => stages.find((entry) => entry.id === person.currentStageId)

  const columns: Array<DataTableColumn<User>> = [
    {
      id: 'name',
      header: 'Practitioner',
      primary: true,
      sortValue: (person) => person.name,
      cell: (person) => (
        <div className="flex items-center gap-3">
          <Initials name={person.name} />
          <CellStack
            title={
              <Link to={`/cms/users/${person.id}`} className="nff-target hover:underline nff-focus-ring">
                {person.name}
              </Link>
            }
            meta={person.email}
          />
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (person) => ACCOUNT_LABEL[person.status],
      cell: (person) => (
        <StatusChip tone={ACCOUNT_TONE[person.status]} icon={Users}>
          {ACCOUNT_LABEL[person.status]}
        </StatusChip>
      ),
    },
    {
      id: 'stage',
      header: 'Stage',
      sortValue: (person) => stageOf(person)?.number ?? 99,
      cell: (person) => {
        const stage = stageOf(person)
        return stage ? `${stage.number} · ${stage.title}` : '—'
      },
    },
    {
      id: 'last',
      header: 'Last active',
      sortValue: (person) => person.lastActiveAt,
      cell: (person) => <span className="tabular-nums">{formatDate(person.lastActiveAt)}</span>,
    },
    {
      id: 'score',
      header: 'Engagement',
      sortValue: (person) => person.engagementScore,
      cell: (person) => <Score value={person.engagementScore} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      hideHeader: true,
      cell: (person) => (
        <Button asChild size="sm" variant="outline">
          <Link to={`/cms/users/${person.id}`} aria-label={`Open ${person.name}`}>
            Open
          </Link>
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Practitioners" description="Learner accounts, where they are in the curriculum, and how engaged they are." />
      <DataTable
        caption="Practitioners"
        noun="practitioner"
        rows={people}
        columns={columns}
        getRowId={(person) => person.id}
        initialSort={{ id: 'name', direction: 'asc' }}
        search={{ placeholder: 'Search name or email', text: (person) => [person.name, person.email] }}
        filters={[
          {
            id: 'status',
            label: 'Status',
            options: Object.entries(ACCOUNT_LABEL).map(([value, label]) => ({ value, label })),
            predicate: (person, value) => person.status === value,
          },
          {
            id: 'stage',
            label: 'Stage',
            options: stages.map((entry) => ({ value: entry.id, label: `Stage ${entry.number} · ${entry.title}` })),
            predicate: (person, value) => person.currentStageId === value,
          },
          {
            id: 'engagement',
            label: 'Engagement',
            options: [
              { value: 'high', label: 'High (70+)' },
              { value: 'medium', label: 'Medium (40–69)' },
              { value: 'low', label: 'Low (under 40)' },
            ],
            predicate: (person, value) => band(person.engagementScore) === value,
          },
        ]}
        empty={{ icon: Users, title: 'No practitioners yet', description: 'Practitioners will appear here after they sign up.' }}
      />
    </div>
  )
}
