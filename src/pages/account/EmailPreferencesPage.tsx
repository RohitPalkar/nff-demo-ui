import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Info } from 'lucide-react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/nff/ErrorState'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  getEmailPrefs,
  saveEmailPrefs,
  type EmailPrefs,
} from '@/services/account'

const TYPES: Array<{
  key: keyof EmailPrefs['types']
  label: string
  description: string
}> = [
  {
    key: 'daily',
    label: 'Daily practice email',
    description: 'One short note each morning with today’s practice.',
  },
  {
    key: 'milestones',
    label: 'Milestones',
    description: 'A word of encouragement when you finish a stage.',
  },
  {
    key: 'news',
    label: 'Occasional news',
    description: 'New explorations and meditations, a few times a year.',
  },
]

const HOURS = ['06:00', '07:00', '08:00', '12:00', '18:00', '21:00']

export function EmailPreferencesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['account', 'email', user?.id],
    queryFn: () => getEmailPrefs(user!.id),
    enabled: Boolean(user),
  })
  const [saving, setSaving] = useState(false)

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load your email preferences"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const prefs = query.data

  async function update(next: EmailPrefs, message = 'Preferences saved.') {
    setSaving(true)
    try {
      await saveEmailPrefs(user!.id, next)
      await queryClient.invalidateQueries({ queryKey: ['account', 'email'] })
      toast.success(message)
    } catch {
      toast.error('We could not save that change. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p
        role="note"
        className="flex items-start gap-3 rounded-lg border border-nff-border-default bg-nff-bg-surface p-4 nff-body-sm text-nff-text-secondary"
      >
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-nff-text-brand" />
        Email sending is not connected in this demo. Your choices are saved in this browser, but no emails
        are sent.
      </p>

      {prefs.unsubscribedAll && (
        <p
          role="status"
          className="rounded-lg border bg-nff-bg-muted p-4 nff-body-md"
        >
          You are unsubscribed from all emails. Turn the daily email back on to
          resume.
        </p>
      )}

      <section className="flex items-center justify-between gap-4 rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-1">
          <h2 id="daily-label" className="nff-heading-h4">
            Daily email
          </h2>
          <p className="nff-body-sm text-muted-foreground">
            A gentle prompt to practise, once a day.
          </p>
        </div>
        <Switch
          aria-labelledby="daily-label"
          checked={prefs.dailyEnabled && !prefs.unsubscribedAll}
          disabled={saving}
          onCheckedChange={(checked) =>
            void update({
              ...prefs,
              dailyEnabled: checked,
              unsubscribedAll: false,
            })
          }
        />
      </section>

      <div className="flex flex-col gap-1.5">
        <span id="hour-label" className="nff-label-md">
          Delivery time
        </span>
        <Select
          value={prefs.deliveryHour}
          onValueChange={(value) => void update({ ...prefs, deliveryHour: value })}
        >
          <SelectTrigger aria-labelledby="hour-label" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map((hour) => (
              <SelectItem key={hour} value={hour}>
                {hour}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ul className="flex flex-col divide-y rounded-lg border bg-card">
        {TYPES.map((type) => (
          <li
            key={type.key}
            className="flex items-center justify-between gap-4 p-4"
          >
            <div className="flex flex-col gap-0.5">
              <span id={`type-${type.key}`} className="nff-label-lg">
                {type.label}
              </span>
              <span className="nff-body-sm text-muted-foreground">
                {type.description}
              </span>
            </div>
            <Switch
              aria-labelledby={`type-${type.key}`}
              checked={prefs.types[type.key] && !prefs.unsubscribedAll}
              disabled={saving}
              onCheckedChange={(checked) =>
                void update({
                  ...prefs,
                  unsubscribedAll: false,
                  types: { ...prefs.types, [type.key]: checked },
                })
              }
            />
          </li>
        ))}
      </ul>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="h-11 w-fit">
            Unsubscribe from all emails
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsubscribe from all emails?</AlertDialogTitle>
            <AlertDialogDescription>
              You will stop receiving every Meadow email, including the daily
              practice note. You can turn them back on at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep emails</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                void update(
                  {
                    ...prefs,
                    dailyEnabled: false,
                    unsubscribedAll: true,
                    types: { daily: false, milestones: false, news: false },
                  },
                  'You are unsubscribed from all emails.',
                )
              }
            >
              Unsubscribe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
