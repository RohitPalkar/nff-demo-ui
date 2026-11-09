import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { BarSeries } from '@/components/cms/BarSeries'
import { MetricCard, PageHeader } from '@/components/cms/CmsParts'
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
import { content } from '@/mocks/db'
import { mockApi } from '@/mocks/api'

const FACTOR = { '7': 0.25, '30': 1, '90': 2.8 } as const
type Range = keyof typeof FACTOR

const PAGES = [
  ['/', 5120],
  ['/meditations', 2310],
  ['/explorations', 1980],
  ['/about/who-we-are', 740],
  ['/signup', 612],
] as const

const REFERRALS = [
  ['Search', 3120],
  ['Direct', 2410],
  ['Newsletter', 1190],
  ['Social', 640],
] as const

export function VisitorDashboardPage() {
  const query = useQuery({
    queryKey: ['cms', 'visitors'],
    queryFn: () => mockApi(() => true),
  })
  const [range, setRange] = useState<Range>('30')

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <span className="nff-visually-hidden">Loading visitor dashboard</span>
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }
  if (query.isError) {
    return (
      <ErrorState
        title="Analytics are unavailable"
        description="We could not reach GA4. Try again in a moment."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const f = FACTOR[range]
  const scale = (n: number) => Math.round(n * f)
  const trend = Array.from({ length: 10 }, (_, index) => ({
    label: String(index + 1),
    value: scale(180 + ((index * 37) % 90)),
  }))
  const tracks = content
    .filter((item) => item.type === 'meditation' && item.preview)
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Visitors"
        description="Source: GA4, consented visitors only"
        action={
          <Select value={range} onValueChange={(value) => setRange(value as Range)}>
            <SelectTrigger aria-label="Date range" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <p role="status" className="rounded-xl border bg-nff-bg-muted p-3 nff-caption text-muted-foreground">
        Numbers only include visitors who accepted analytics cookies.
      </p>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-4">
        <MetricCard label="Page views" value={scale(11240).toLocaleString()} />
        <MetricCard label="Preview plays" value={scale(2860).toLocaleString()} />
        <MetricCard label="Avg session" value="3m 12s" />
        <MetricCard label="Sign-ups from preview" value={scale(214).toLocaleString()} />
      </section>

      <section aria-labelledby="trend" className="flex flex-col gap-3">
        <h2 id="trend" className="nff-heading-h4">Page views over time</h2>
        <BarSeries label="Page views" data={trend} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {[
          ['Top pages', PAGES.map(([name, n]) => [name, scale(n)])],
          [
            'Top preview tracks',
            tracks.map((track, index) => [track.title, scale(900 - index * 140)]),
          ],
          ['Referral paths', REFERRALS.map(([name, n]) => [name, scale(n)])],
        ].map(([title, rows]) => (
          <section key={title as string} className="flex flex-col gap-2">
            <h2 className="nff-heading-h4">{title as string}</h2>
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows as Array<[string, number]>).map(([name, count]) => (
                    <TableRow key={name}>
                      <TableCell className="max-w-48 truncate">{name}</TableCell>
                      <TableCell className="text-right">{count.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
