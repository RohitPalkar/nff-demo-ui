import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ContentStatusChip, MetricCard, PageHeader } from '@/components/cms/CmsParts'
import { ErrorState } from '@/components/nff/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatDate } from '@/lib/format'
import { users } from '@/mocks/db'
import { listAllCmsItems, loadCampaigns } from '@/services/cms'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const ROLE_LABEL = {
  editor: 'Content editor',
  campaign: 'Campaign manager',
  admin: 'Super admin',
} as const

export function CmsOverviewPage() {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['cms', 'overview'],
    queryFn: listAllCmsItems,
  })

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load the overview"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const items = query.data
  const role = user?.role === 'campaign' || user?.role === 'admin' ? user.role : 'editor'
  const drafts = items.filter((item) => item.status === 'draft').length
  const review = items.filter((item) => item.status === 'in_review')
  const processing = items.filter(
    (item) =>
      item.type === 'meditation' &&
      (item.transcode === 'transcoding' || item.transcode === 'validating'),
  ).length
  const failed = items.filter(
    (item) => item.type === 'meditation' && item.transcode === 'failed',
  )
  const campaigns = loadCampaigns()
  const paused = campaigns.filter((campaign) => campaign.state === 'paused')
  const running = campaigns.find((campaign) => campaign.state === 'running')
  const rate = running
    ? `${Math.round((running.delivered / Math.max(1, running.sent)) * 100)}%`
    : '—'
  const activeUsers = users.filter((entry) => entry.status === 'active').length

  const cards =
    role === 'campaign'
      ? [
          { label: 'Next send', value: 'Tonight 07:00' },
          { label: 'Last-send delivery rate', value: rate },
          { label: 'Paused campaigns', value: String(paused.length) },
        ]
      : role === 'admin'
        ? [
            { label: 'Active users', value: String(activeUsers) },
            { label: 'Awaiting review', value: String(review.length) },
            { label: 'Engagement trend', value: '+4.2%', hint: 'vs last month' },
          ]
        : [
            { label: 'Drafts', value: String(drafts) },
            { label: 'In review', value: String(review.length) },
            { label: 'Processing', value: String(processing) },
          ]

  const alerts: string[] = []
  if (failed.length > 0)
    alerts.push(`${failed.length} meditation${failed.length > 1 ? 's' : ''} failed transcoding.`)
  if (paused.length > 0 && role !== 'editor')
    alerts.push(`${paused.length} campaign${paused.length > 1 ? 's are' : ' is'} paused.`)
  if (review.length > 0 && role !== 'campaign')
    alerts.push(`${review.length} item${review.length > 1 ? 's are' : ' is'} awaiting review.`)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${greeting()}, ${user?.name.split(' ')[0] ?? ''}`}
        description={ROLE_LABEL[role]}
      />

      {alerts.length > 0 && (
        <ul
          aria-label="Alerts"
          className="flex flex-col gap-2 rounded-xl border border-nff-border-warning bg-nff-bg-warning-subtle p-4"
        >
          {alerts.map((alert) => (
            <li
              key={alert}
              className="flex items-center gap-2 nff-body-sm text-nff-text-warning"
            >
              <AlertTriangle aria-hidden="true" className="size-4" />
              {alert}
            </li>
          ))}
        </ul>
      )}

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </section>

      {role !== 'campaign' && (
        <section aria-labelledby="tasks" className="flex flex-col gap-3">
          <h2 id="tasks" className="nff-heading-h3">
            My tasks
          </h2>
          {review.length === 0 ? (
            <p className="nff-body-sm text-muted-foreground">
              You have no tasks right now.
            </p>
          ) : (
            <ul className="flex flex-col divide-y rounded-xl border bg-card">
              {review.slice(0, 5).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3"
                >
                  <Link
                    to={`/cms/${item.type === 'exploration' ? 'explorations' : 'meditations'}/${item.id}`}
                    className="nff-label-lg text-nff-text-link hover:underline"
                  >
                    {item.title}
                  </Link>
                  <ContentStatusChip status={item.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-labelledby="activity" className="flex flex-col gap-3">
        <h2 id="activity" className="nff-heading-h3">
          Recent activity
        </h2>
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {[...items]
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .slice(0, 6)
            .map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <span className="nff-body-sm">
                  <strong>{item.owner}</strong> updated {item.title}
                </span>
                <span className="nff-caption text-muted-foreground">
                  {formatDate(item.updatedAt)}
                </span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  )
}
