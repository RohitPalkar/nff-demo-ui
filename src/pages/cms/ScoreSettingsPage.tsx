import { ArrowRight, History } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DataSourceNotice, PageHeader } from '@/components/cms/CmsParts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { attempt, usePermissions } from '@/features/auth/usePermissions'
import { formatDate } from '@/lib/format'
import {
  loadScoreWeights,
  saveScoreWeights,
  scoreLog,
  type ScoreLogEntry,
  type ScoreWeights,
} from '@/services/cms'

const LABELS: Record<keyof ScoreWeights, string> = {
  loginRecency: 'Login recency',
  minutesListened: 'Minutes listened',
  completion: 'Completion',
  progression: 'Progression',
  email: 'Email engagement',
}

const WEIGHT_KEYS = Object.keys(LABELS) as Array<keyof ScoreWeights>

function changesFrom(entry: ScoreLogEntry) {
  const previous = entry.previousWeights
  if (!previous) return []
  return WEIGHT_KEYS.flatMap((key) => {
    const from = previous[key]
    const to = entry.weights[key]
    return from === to ? [] : [{ key, label: LABELS[key], from, to }]
  })
}

export function ScoreSettingsPage() {
  const { can } = usePermissions()
  const [weights, setWeights] = useState<ScoreWeights>(loadScoreWeights)
  const [log, setLog] = useState(scoreLog)

  if (!can('insights.scores.configure')) {
    return (
      <p role="alert" className="rounded-xl border p-4 nff-body-md">
        You do not have permission to change score weights.
      </p>
    )
  }

  const total = Object.values(weights).reduce((sum, value) => sum + value, 0)
  const valid = total === 100

  function set(key: keyof ScoreWeights, value: number) {
    const clean = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0
    setWeights((current) => ({ ...current, [key]: clean }))
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <PageHeader
        title="Score Settings"
        description="Weights must add up to 100."
        action={
          <Button
            disabled={!valid}
            onClick={() => {
              if (!attempt(() => saveScoreWeights(weights))) return
              setLog(scoreLog())
              toast.success('Weights saved. Scores are not recalculated automatically in this prototype.')
            }}
          >
            Save
          </Button>
        }
      />

      <DataSourceNotice kind="unavailable">
        These weights are stored, but nothing calculates engagement scores from them yet. The scores shown in
        Users and Engagement are seeded demo values and do not change when you save.
      </DataSourceNotice>
      <section className="flex flex-col gap-5 rounded-xl border bg-card p-5">
        {(Object.keys(LABELS) as Array<keyof ScoreWeights>).map((key) => (
          <div key={key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={`w-${key}`} className="nff-label-md">
                {LABELS[key]}
              </label>
              <Input
                id={`w-${key}`}
                type="number"
                min={0}
                max={100}
                value={weights[key]}
                onChange={(event) => set(key, Number(event.target.value))}
                className="w-20"
              />
            </div>
            <Slider
              aria-label={`${LABELS[key]} weight`}
              min={0}
              max={100}
              step={1}
              value={[weights[key]]}
              onValueChange={([value]) => set(key, value ?? 0)}
            />
          </div>
        ))}
      </section>

      <section aria-label="Total" className="flex flex-col gap-2">
        <div className="flex justify-between nff-label-md">
          <span>Total</span>
          <span className={valid ? 'text-nff-text-success' : 'text-nff-text-error'}>
            {total} / 100
          </span>
        </div>
        <Progress value={Math.min(total, 100)} aria-label="Total weight" />
        {!valid && (
          <p role="alert" className="nff-body-sm text-nff-text-error">
            Adjust the weights so they add up to exactly 100.
          </p>
        )}
      </section>

      <section aria-labelledby="changes" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <History aria-hidden="true" className="size-4 text-[var(--admin-text-muted)]" />
              <h2 id="changes" className="nff-heading-h4">
                Change log
              </h2>
            </div>
            <p className="nff-body-sm text-[var(--admin-text-muted)]">
              Saved weighting snapshots, newest first. Seeded demo history is included.
            </p>
          </div>
          <span className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1 nff-label-sm text-[var(--admin-text-muted)]">
            {log.length} {log.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        {log.length === 0 ? (
          <p className="nff-body-sm text-muted-foreground">No changes yet.</p>
        ) : (
          <ol className="overflow-hidden rounded-xl border bg-card">
            {log.map((entry, index) => {
              const changes = changesFrom(entry)
              const entryTotal = Object.values(entry.weights).reduce((sum, value) => sum + value, 0)
              return (
                <li
                  key={`${entry.at}-${index}`}
                  className="grid gap-3 border-b p-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start"
                >
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="nff-label-md">Weighting updated</span>
                      <span className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-2 py-0.5 nff-caption text-[var(--admin-text-muted)]">
                        Total {entryTotal} / 100
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 nff-body-sm text-[var(--admin-text-muted)]">
                      <time dateTime={entry.at}>{formatDate(entry.at)}</time>
                      <span aria-hidden="true">·</span>
                      <span>Saved by {entry.actorName ?? 'Super admin'}</span>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-2 lg:justify-end">
                    {changes.length > 0 ? (
                      changes.map((change) => (
                        <span
                          key={change.key}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-2.5 py-1.5 nff-caption"
                        >
                          <span className="font-medium text-[var(--admin-text)]">{change.label}</span>
                          <span className="tabular-nums text-[var(--admin-text-muted)]">{change.from}</span>
                          <ArrowRight aria-hidden="true" className="size-3 text-[var(--admin-text-muted)]" />
                          <span className="font-medium tabular-nums text-[var(--admin-text)]">{change.to}</span>
                        </span>
                      ))
                    ) : (
                      <span className="nff-body-sm text-[var(--admin-text-muted)]">Initial configuration recorded.</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
