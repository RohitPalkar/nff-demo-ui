import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { getStoredConsent, saveConsent } from '@/services/privacyChoices'
import type { ConsentRecord } from '@/types'

interface PrivacyChoicesPanelProps {
  onSaved?: (record: ConsentRecord) => void
}

export function PrivacyChoicesPanel({ onSaved }: PrivacyChoicesPanelProps) {
  const [analytics, setAnalytics] = useState(
    () => getStoredConsent()?.analytics ?? false,
  )

  const mutation = useMutation({
    mutationFn: saveConsent,
    onSuccess: (record, variables) => {
      setAnalytics(variables.analytics)
      toast.success('Cookie preferences saved')
      onSaved?.(record)
    },
    onError: () => {
      toast.error('We could not save your preferences. Please try again.')
    },
  })

  const busy = mutation.isPending

  return (
    <div className="flex flex-col gap-4">
      <p className="nff-body-sm text-muted-foreground">
        Read the{' '}
        <Link
          to="/privacy"
          className="text-nff-text-link-default underline hover:text-nff-text-link-hover nff-focus-ring"
        >
          cookie policy
        </Link>{' '}
        for the full list of cookies we use.
      </p>

      <div className="flex flex-col divide-y rounded-xl border bg-card">
        <div className="flex items-start justify-between gap-4 p-4">
          <div className="flex flex-col gap-1">
            <p id="essential-label" className="nff-label-lg text-foreground">
              Essential
            </p>
            <p className="nff-body-sm text-muted-foreground">
              Sign-in, security and your preferences. Always on.
            </p>
          </div>
          <Switch
            checked
            disabled
            aria-labelledby="essential-label"
            aria-describedby="essential-note"
          />
          <span id="essential-note" className="sr-only">
            Always on
          </span>
        </div>
        <div className="flex items-start justify-between gap-4 p-4">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="analytics-cookies"
              className="nff-label-lg text-foreground"
            >
              Analytics (GA4)
            </label>
            <p className="nff-body-sm text-muted-foreground">
              Aggregated page views and preview plays. No advertising.
            </p>
          </div>
          <Switch
            id="analytics-cookies"
            checked={analytics}
            disabled={busy}
            onCheckedChange={setAnalytics}
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="h-11"
            disabled={busy}
            onClick={() => mutation.mutate({ analytics: false })}
          >
            Reject all
          </Button>
          <Button
            variant="outline"
            className="h-11"
            disabled={busy}
            onClick={() => mutation.mutate({ analytics: true })}
          >
            Accept all
          </Button>
        </div>
        <Button
          className="h-11"
          disabled={busy}
          onClick={() => mutation.mutate({ analytics })}
        >
          {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Save choices
        </Button>
      </div>
    </div>
  )
}
