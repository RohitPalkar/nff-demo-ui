import { SOW_SCOPE } from '@/config/sowScope'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Megaphone, Pause, Play, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { MetricCard, PageHeader } from '@/components/cms/CmsParts'
import { CellStack, DataTable, EmptyState } from '@/components/admin'
import { ErrorState } from '@/components/admin'
import { StatusChip, type StatusTone } from '@/components/nff/StatusChip'
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
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import { users } from '@/mocks/db'
import { attempt, usePermissions } from '@/features/auth/usePermissions'
import { getCampaigns, patchCampaign } from '@/services/cms'
import type { CampaignState } from '@/types'

const STATE_TONE: Record<CampaignState, StatusTone> = {
  running: 'success',
  paused: 'warning',
  scheduled: 'info',
  draft: 'neutral',
}

export function CampaignsPage() {
  const { can } = usePermissions()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['cms', 'campaigns'], queryFn: () => getCampaigns() })

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <span className="nff-visually-hidden">Loading campaigns</span>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load campaigns"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const campaigns = query.data
  const daily = campaigns.find((entry) => entry.name === 'Daily practice') ?? campaigns[0]
  const eligible = users.filter((entry) => entry.status === 'active').length

  function toggle(id: string, state: CampaignState) {
    const next = state === 'paused' ? 'running' : 'paused'
    if (!attempt(() => patchCampaign(id, { state: next }))) return
    void queryClient.invalidateQueries({ queryKey: ['cms', 'campaigns'] })
    toast.success(state === 'paused' ? 'Campaign resumed.' : 'Campaign paused.')
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Campaigns"
        action={
          // SOW v1.3: one daily campaign only. "New campaign" is offered only
          // to create that one campaign, unless additional campaigns are in scope.
          (SOW_SCOPE.additionalCampaigns || !daily) && (
            <Button className="h-10" disabled={!can('campaigns.manage')} onClick={() => navigate('/cms/campaigns/new')}>
              <Plus aria-hidden="true" className="size-4" />
              New campaign
            </Button>
          )
        }
      />

      {campaigns.length === 0 || !daily ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create a campaign to start the daily email."
        />
      ) : (
        <>
          {daily.failed > 0 && daily.state === 'running' && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-nff-border-warning bg-nff-bg-warning-subtle p-3 nff-body-sm text-nff-text-warning"
            >
              <AlertTriangle aria-hidden="true" className="size-4" />
              {daily.failed} sends from the last run went to the dead-letter queue.
            </p>
          )}

          <section
            aria-label="Daily campaign"
            className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="nff-heading-h4">{daily.name}</h2>
                <StatusChip tone={STATE_TONE[daily.state]} icon={Megaphone}>
                  <span className="capitalize">{daily.state}</span>
                </StatusChip>
              </div>
              <p className="nff-body-sm text-muted-foreground">
                Next send tonight at 07:00 (user local) · {eligible} eligible
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={!can('campaigns.manage') || (daily.state === 'paused' && !can('campaigns.send'))}>
                  {daily.state === 'paused' ? (
                    <Play aria-hidden="true" className="size-4" />
                  ) : (
                    <Pause aria-hidden="true" className="size-4" />
                  )}
                  {daily.state === 'paused' ? 'Resume' : 'Pause'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {daily.state === 'paused' ? 'Resume' : 'Pause'} {daily.name}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {daily.state === 'paused'
                      ? 'Sends will restart from the next scheduled run.'
                      : 'No emails will be sent until you resume.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => toggle(daily.id, daily.state)}>
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>

          <section aria-label="Last send" className="grid gap-4 sm:grid-cols-5">
            <MetricCard label="Sent" value={daily.sent.toLocaleString()} />
            <MetricCard label="Delivered" value={daily.delivered.toLocaleString()} />
            <MetricCard label="Bounced" value={String(daily.bounced)} />
            <MetricCard label="Complained" value={String(daily.complained)} />
            <MetricCard label="Failed" value={String(daily.failed)} />
          </section>

          <DataTable
            caption="Campaigns"
            noun="campaign"
            rows={campaigns}
            getRowId={(campaign) => campaign.id}
            columns={[
              {
                id: 'name',
                header: 'Name',
                primary: true,
                sortValue: (campaign) => campaign.name,
                cell: (campaign) => (
                  <CellStack
                    title={
                      <Link to={`/cms/campaigns/${campaign.id}`} className="nff-target hover:underline nff-focus-ring">
                        {campaign.name}
                      </Link>
                    }
                    meta={campaign.audience}
                  />
                ),
              },
              {
                id: 'state',
                header: 'State',
                sortValue: (campaign) => campaign.state,
                cell: (campaign) => (
                  <StatusChip tone={STATE_TONE[campaign.state]} icon={Megaphone}>
                    <span className="capitalize">{campaign.state}</span>
                  </StatusChip>
                ),
              },
              { id: 'schedule', header: 'Schedule', cell: (campaign) => campaign.schedule },
              {
                id: 'sent',
                header: 'Last send',
                align: 'end',
                sortValue: (campaign) => campaign.sent,
                cell: (campaign) => <span className="tabular-nums">{campaign.sent.toLocaleString()}</span>,
              },
              {
                id: 'last',
                header: 'Last run',
                sortValue: (campaign) => campaign.lastRunAt ?? '',
                cell: (campaign) => <span className="tabular-nums">{campaign.lastRunAt ? formatDate(campaign.lastRunAt) : '—'}</span>,
              },
              {
                id: 'actions',
                header: 'Actions',
                hideHeader: true,
                cell: (campaign) => (
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/cms/campaigns/${campaign.id}`} aria-label={`${can('campaigns.manage') ? 'Edit' : 'Open'} ${campaign.name}`}>
                      {can('campaigns.manage') ? 'Edit' : 'Open'}
                    </Link>
                  </Button>
                ),
              },
            ]}
            search={{ placeholder: 'Search campaigns', text: (campaign) => [campaign.name, campaign.audience] }}
            filters={[
              {
                id: 'state',
                label: 'State',
                options: (['running', 'paused', 'scheduled', 'draft'] as const).map((value) => ({
                  value,
                  label: value[0]!.toUpperCase() + value.slice(1),
                })),
                predicate: (campaign, value) => campaign.state === value,
              },
            ]}
            empty={{ icon: Megaphone, title: 'No campaigns yet', description: 'Create a campaign to start the daily email.' }}
          />
        </>
      )}
    </div>
  )
}
