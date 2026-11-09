import { useQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import { useState } from 'react'
import { MetricCard, PageHeader } from '@/components/cms/CmsParts'
import { EmptyState } from '@/components/nff/EmptyState'
import { ErrorState } from '@/components/nff/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FLAGS } from '@/config/flags'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatDate } from '@/lib/format'
import { campaigns, userById } from '@/mocks/db'
import { getDelivery } from '@/services/cms'

type Tab = 'sends' | 'bounces' | 'complaints' | 'suppression'

function mask(email: string) {
  const [local = '', domain = ''] = email.split('@')
  return `${local[0] ?? ''}***@${domain}`
}

export function DeliveryPage() {
  const { user } = useAuth()
  const query = useQuery({ queryKey: ['cms', 'delivery'], queryFn: getDelivery })
  const [range, setRange] = useState('30')
  const [campaign, setCampaign] = useState('all')
  const [tab, setTab] = useState<Tab>('sends')

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <span className="nff-visually-hidden">Loading delivery reports</span>
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load delivery reports"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const since = Date.now() - Number(range) * 86_400_000
  const logs = query.data.filter(
    (log) =>
      new Date(log.at).getTime() >= since &&
      (campaign === 'all' || log.campaignId === campaign),
  )
  const count = (status: string) => logs.filter((log) => log.status === status).length
  const total = logs.length
  const pct = (n: number) => (total === 0 ? '0%' : `${((n / total) * 100).toFixed(1)}%`)
  const masked = user?.role === 'campaign' && FLAGS.recipientDetailMasked

  const perDay = new Map<string, number>()
  logs.forEach((log) => {
    const day = log.at.slice(0, 10)
    perDay.set(day, (perDay.get(day) ?? 0) + 1)
  })
  const series = [...perDay.entries()].sort().slice(-14)
  const peak = Math.max(1, ...series.map(([, value]) => value))

  const rows = logs.filter((log) =>
    tab === 'sends'
      ? true
      : tab === 'bounces'
        ? log.status === 'bounced'
        : tab === 'complaints'
          ? log.status === 'complained'
          : log.status === 'bounced' || log.status === 'complained',
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Delivery reports" />
      <p
        role="status"
        className="rounded-xl border bg-nff-bg-muted p-3 nff-caption text-muted-foreground"
      >
        Provider feedback can arrive up to 24 hours late.
      </p>

      <div className="flex flex-wrap gap-3">
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger aria-label="Date range" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
        <Select value={campaign} onValueChange={setCampaign}>
          <SelectTrigger aria-label="Campaign" className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All campaigns</SelectItem>
            {campaigns.map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                {entry.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No data for this selection"
          description="Try a longer date range or a different campaign."
        />
      ) : (
        <>
          <section aria-label="Summary" className="grid gap-4 sm:grid-cols-5">
            <MetricCard label="Sent" value={String(total)} />
            <MetricCard
              label="Delivered"
              value={pct(count('delivered') + count('sent'))}
            />
            <MetricCard label="Bounced" value={pct(count('bounced'))} />
            <MetricCard label="Complained" value={pct(count('complained'))} />
            <MetricCard label="Failed" value={String(count('failed'))} />
          </section>

          <section aria-labelledby="trend" className="flex flex-col gap-3">
            <h2 id="trend" className="nff-heading-h4">
              Daily sends
            </h2>
            <ol
              aria-label="Daily sends"
              className="flex h-36 items-end gap-2 rounded-xl border bg-card p-4"
            >
              {series.map(([day, value]) => (
                <li
                  key={day}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                  title={`${day}: ${value}`}
                >
                  <div
                    className="w-full rounded-t bg-primary"
                    style={{ height: `${(value / peak) * 100}%` }}
                  />
                  <span className="nff-caption text-muted-foreground">
                    {day.slice(8)}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
            <TabsList aria-label="Report">
              <TabsTrigger value="sends">Sends</TabsTrigger>
              <TabsTrigger value="bounces">Bounces</TabsTrigger>
              <TabsTrigger value="complaints">Complaints</TabsTrigger>
              <TabsTrigger value="suppression">Suppression list</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 15).map((log) => {
                  const email = userById.get(log.userId)?.email ?? 'unknown@example.com'
                  return (
                    <TableRow key={log.id}>
                      <TableCell>{masked ? mask(email) : email}</TableCell>
                      <TableCell>
                        {campaigns.find((entry) => entry.id === log.campaignId)?.name}
                      </TableCell>
                      <TableCell className="capitalize">{log.status}</TableCell>
                      <TableCell>{formatDate(log.at)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
