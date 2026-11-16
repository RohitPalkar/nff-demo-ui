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
  type ScoreWeights,
} from '@/services/cms'

const LABELS: Record<keyof ScoreWeights, string> = {
  loginRecency: 'Login recency',
  minutesListened: 'Minutes listened',
  completion: 'Completion',
  progression: 'Progression',
  email: 'Email engagement',
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

      <section aria-labelledby="changes" className="flex flex-col gap-2">
        <h2 id="changes" className="nff-heading-h4">
          Change log
        </h2>
        {log.length === 0 ? (
          <p className="nff-body-sm text-muted-foreground">No changes yet.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border bg-card">
            {log.map((entry) => (
              <li key={entry.at} className="flex justify-between gap-3 p-3 nff-body-sm">
                <span>
                  {Object.entries(entry.weights)
                    .map(([key, value]) => `${LABELS[key as keyof ScoreWeights]} ${value}`)
                    .join(' · ')}
                </span>
                <span className="text-muted-foreground">{formatDate(entry.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
