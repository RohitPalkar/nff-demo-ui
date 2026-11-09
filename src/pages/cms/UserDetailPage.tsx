import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { MetricCard } from '@/components/cms/CmsParts'
import { ErrorState } from '@/components/nff/ErrorState'
import { StatusChip } from '@/components/nff/StatusChip'
import { UnavailableState } from '@/components/nff/UnavailableState'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate } from '@/lib/format'
import { emailLogs, progressByUser, stages } from '@/mocks/db'
import { getUser, setUserStatus, userStatusOverrides } from '@/services/cms'
import type { AccountStatus } from '@/types'
import { ACCOUNT_LABEL, ACCOUNT_TONE } from './UsersPage'

export function UserDetailPage() {
  const { id = '' } = useParams()
  const query = useQuery({ queryKey: ['cms', 'user', id], queryFn: () => getUser(id) })
  const [override, setOverride] = useState<AccountStatus | null>(
    () => userStatusOverrides()[id] ?? null,
  )

  if (query.isPending) {
    return <Skeleton className="h-64 rounded-xl" aria-busy="true" />
  }
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load this user"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
  }
  const person = query.data
  if (!person) {
    return (
      <UnavailableState
        icon={Users}
        title="We could not find that user"
        description="They may have been removed."
        trail={[{ label: 'CMS', to: '/cms' }]}
        backTo="/cms/users"
        backLabel="Back to users"
      />
    )
  }

  const status = override ?? person.status
  const progress = progressByUser.find((entry) => entry.userId === person.id)
  const completed = new Set(progress?.completedItemIds ?? [])
  const emails = emailLogs.filter((log) => log.userId === person.id).slice(0, 8)
  const deactivated = status === 'deactivated'

  function toggle() {
    const next: AccountStatus = deactivated ? 'active' : 'deactivated'
    setUserStatus(person!.id, next)
    setOverride(next)
    toast.success(deactivated ? 'User reactivated.' : 'User deactivated.')
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="nff-heading-h2">{person.name}</h1>
          <p className="nff-body-sm text-muted-foreground">{person.email}</p>
        </div>
        <StatusChip tone={ACCOUNT_TONE[status]} icon={Users}>
          {ACCOUNT_LABEL[status]}
        </StatusChip>
        {status !== 'pending_deletion' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">{deactivated ? 'Reactivate' : 'Deactivate'}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {deactivated ? 'Reactivate' : 'Deactivate'} {person.name}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {deactivated
                    ? 'They will be able to sign in again.'
                    : 'They will be signed out and unable to log in until reactivated.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={toggle}>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </header>

      {status === 'pending_deletion' && (
        <p role="status" className="rounded-xl border border-nff-border-error bg-nff-bg-error-subtle p-3 nff-body-sm text-nff-text-error">
          This account is pending deletion.
        </p>
      )}

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-4">
        <MetricCard label="Joined" value={formatDate(person.joinedAt)} />
        <MetricCard label="Last active" value={formatDate(person.lastActiveAt)} />
        <MetricCard label="Minutes listened" value={person.minutesListened.toLocaleString()} />
        <MetricCard label="Engagement score" value={String(person.engagementScore)} />
      </section>

      <Tabs defaultValue="profile">
        <TabsList aria-label="User sections">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="email">Email history</TabsTrigger>
          <TabsTrigger value="privacy">Consent &amp; privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="pt-4">
          <dl className="grid max-w-md gap-2 nff-body-sm">
            <div className="flex justify-between"><dt>Role</dt><dd className="capitalize">{person.role}</dd></div>
            <div className="flex justify-between">
              <dt>Current stage</dt>
              <dd>{stages.find((s) => s.id === person.currentStageId)?.title}</dd>
            </div>
            <div className="flex justify-between"><dt>Verified</dt><dd>{person.verified ? 'Yes' : 'No'}</dd></div>
          </dl>
        </TabsContent>

        <TabsContent value="progress" className="flex flex-col gap-3 pt-4">
          {completed.size === 0 && (
            <p className="nff-body-sm text-muted-foreground">No activity recorded yet.</p>
          )}
          {stages.map((stage) => {
            const done = stage.itemIds.filter((item) => completed.has(item)).length
            const percent = stage.itemIds.length ? Math.round((done / stage.itemIds.length) * 100) : 0
            return (
              <div key={stage.id} className="flex items-center gap-4">
                <span className="w-40 nff-label-md">
                  {stage.number}. {stage.title}
                </span>
                <Progress value={percent} aria-label={`${stage.title} progress`} className="flex-1" />
                <span className="w-10 text-right nff-caption">{percent}%</span>
              </div>
            )
          })}
        </TabsContent>

        <TabsContent value="email" className="pt-4">
          {emails.length === 0 ? (
            <p className="nff-body-sm text-muted-foreground">No emails sent to this user.</p>
          ) : (
            <ul className="flex max-w-lg flex-col divide-y rounded-xl border bg-card">
              {emails.map((log) => (
                <li key={log.id} className="flex justify-between p-3 nff-body-sm">
                  <span className="capitalize">{log.status}</span>
                  <span className="text-muted-foreground">{formatDate(log.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="privacy" className="pt-4">
          <p className="nff-body-sm text-muted-foreground">
            Analytics consent granted. No open export or deletion requests.
          </p>
        </TabsContent>
      </Tabs>
      <Link to="/cms/users" className="w-fit nff-body-sm text-nff-text-link hover:underline">
        Back to users
      </Link>
    </div>
  )
}
