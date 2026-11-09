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
import { content, events, stages, users } from '@/mocks/db'
import { mockApi } from '@/mocks/api'

export function EngagementDashboardPage() {
  const query = useQuery({
    queryKey: ['cms', 'engagement'],
    queryFn: () => mockApi(() => true),
  })
  const [stage, setStage] = useState('all')

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <span className="nff-visually-hidden">Loading engagement dashboard</span>
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load engagement data"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const people = users.filter(
    (entry) =>
      entry.role === 'practitioner' &&
      (stage === 'all' || entry.currentStageId === stage),
  )
  const avg = people.length
    ? Math.round(people.reduce((sum, entry) => sum + entry.engagementScore, 0) / people.length)
    : 0
  const completions = events.filter((event) => event.type === 'complete').length
  const plays = events.filter((event) => event.type === 'play').length

  const buckets = ['0-20', '21-40', '41-60', '61-80', '81-100'].map((label, index) => ({
    label,
    value: people.filter(
      (entry) =>
        entry.engagementScore > index * 20 - (index === 0 ? 1 : 0) &&
        entry.engagementScore <= (index + 1) * 20,
    ).length,
  }))
  const funnel = stages.map((entry) => ({
    label: `S${entry.number}`,
    value: users.filter(
      (person) =>
        person.role === 'practitioner' &&
        Number(person.currentStageId.replace('stage-', '')) >= entry.number,
    ).length,
  }))
  const weekly = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'].map((label, index) => ({
    label,
    value: 40 + ((index * 23) % 55),
  }))
  const top = content
    .filter((item) => item.published)
    .slice(0, 6)
    .map((item, index) => ({ title: item.title, type: item.type, plays: 320 - index * 41 }))

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Engagement"
        description="Rolled up nightly · scores weekly"
        action={
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger aria-label="Stage segment" className="w-48">
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
        }
      />

      {people.length === 0 ? (
        <p role="status" className="rounded-xl border bg-nff-bg-muted p-4 nff-body-sm">
          No data for this segment yet.
        </p>
      ) : (
        <>
          <section aria-label="Summary" className="grid gap-4 sm:grid-cols-5">
            <MetricCard label="Active practitioners" value={String(people.filter((p) => p.status === 'active').length)} />
            <MetricCard label="Completions" value={String(completions)} />
            <MetricCard label="Repeat plays" value={String(Math.round(plays * 0.4))} />
            <MetricCard label="Avg logins / week" value="3.4" />
            <MetricCard label="Avg engagement score" value={String(avg)} />
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="flex flex-col gap-2">
              <h2 className="nff-heading-h4">Score distribution</h2>
              <BarSeries label="Score distribution" data={buckets} />
            </section>
            <section className="flex flex-col gap-2">
              <h2 className="nff-heading-h4">Completions by stage</h2>
              <BarSeries label="Completions by stage" data={funnel} />
            </section>
            <section className="flex flex-col gap-2">
              <h2 className="nff-heading-h4">Weekly activity</h2>
              <BarSeries label="Weekly activity" data={weekly} />
            </section>
          </div>

          <section className="flex flex-col gap-2">
            <h2 className="nff-heading-h4">Top content</h2>
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Plays / reads</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top.map((row) => (
                    <TableRow key={row.title}>
                      <TableCell>{row.title}</TableCell>
                      <TableCell className="capitalize">{row.type}</TableCell>
                      <TableCell className="text-right">{row.plays}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
