import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Clock3,
  FileClock,
  Loader2,
  Mail,
  PauseCircle,
  Percent,
  Sunrise,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  ContentStatusChip,
  DataSourceBadge,
  MetricCard,
  PageHeader,
} from '@/components/cms/CmsParts'
import { ErrorState } from '@/components/admin'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePermissions } from '@/features/auth/usePermissions'
import { formatDate } from '@/lib/format'
import { users } from '@/mocks/db'
import type { DataSourceKind } from '@/services/dataSources'
import { listAllCmsItems, loadCampaigns, ownerLabel } from '@/services/cms'
import { getRoleLabel } from '@/services/rbac/roles'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function CmsOverviewPage() {
  const { user } = useAuth()
  const { can } = usePermissions()
  const canSeeContent = can('content.view')
  // A campaign manager has no content permission, so nothing is requested for them.
  const query = useQuery({
    queryKey: ['cms', 'overview'],
    queryFn: () => listAllCmsItems(),
    enabled: canSeeContent,
  })

  if (canSeeContent && query.isPending) {
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
  if (canSeeContent && query.isError) {
    return (
      <ErrorState
        title="We could not load the overview"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const items = query.data ?? []
  // The flavour of the page follows what the person can do, not their role name.
  const view = can('practitioners.view')
    ? 'admin'
    : !canSeeContent && can('campaigns.view')
      ? 'campaign'
      : 'editor'
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

  // Every figure here comes from seeded records (plus changes made in this
  // browser), so each says so. There is no engagement source, so that card
  // shows no value rather than the invented figure it used to.
  const cards: Array<{ label: string; value: string; hint?: string; source: DataSourceKind; icon: LucideIcon }> =
    view === 'campaign'
      ? [
          { label: 'Next send', value: 'Tonight 07:00', hint: 'Example schedule; nothing is sent', source: 'demo', icon: Mail },
          { label: 'Last-send delivery rate', value: rate, source: 'demo', icon: Percent },
          { label: 'Paused campaigns', value: String(paused.length), source: 'demo', icon: PauseCircle },
        ]
      : view === 'admin'
        ? [
            { label: 'Active users', value: String(activeUsers), source: 'demo', icon: Users },
            { label: 'Awaiting review', value: String(review.length), source: 'demo', icon: Clock3 },
            { label: 'Engagement trend', value: '—', hint: 'No analytics source is connected', source: 'unavailable', icon: TrendingUp },
          ]
        : [
            { label: 'Drafts', value: String(drafts), source: 'demo', icon: FileClock },
            { label: 'In review', value: String(review.length), source: 'demo', icon: Clock3 },
            { label: 'Processing', value: String(processing), source: 'demo', icon: Loader2 },
          ]

  const alerts: string[] = []
  if (failed.length > 0 && canSeeContent)
    alerts.push(`${failed.length} meditation${failed.length > 1 ? 's' : ''} failed transcoding.`)
  if (paused.length > 0 && can('campaigns.view'))
    alerts.push(`${paused.length} campaign${paused.length > 1 ? 's are' : ' is'} paused.`)
  if (review.length > 0 && canSeeContent)
    alerts.push(`${review.length} item${review.length > 1 ? 's are' : ' is'} awaiting review.`)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${greeting()}, ${user?.name.split(' ')[0] ?? ''}`}
        description={getRoleLabel(user?.role)}
        meta={
          <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--nff-sage-100)]">
            <Sunrise className="size-4 text-[var(--nff-forest-700)]" />
          </span>
        }
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

      {canSeeContent && (
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

      {canSeeContent && (
        <section aria-labelledby="activity" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="activity" className="nff-heading-h3">
              Recent activity
            </h2>
            <DataSourceBadge kind="demo" />
          </div>
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
                    <strong>{item.title || 'Untitled'}</strong> updated · {ownerLabel(item)}
                  </span>
                  <span className="nff-caption text-muted-foreground">
                    {formatDate(item.updatedAt)}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  )
}
