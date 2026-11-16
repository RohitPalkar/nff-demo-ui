import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/nff/ErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { getProfile, saveProfile, TIME_ZONES } from '@/services/account'

export function ProfilePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['account', 'profile', user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: Boolean(user),
  })
  const [name, setName] = useState('')
  const [timeZone, setTimeZone] = useState('Europe/London')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (query.data) {
      setName(query.data.displayName)
      setTimeZone(query.data.timeZone)
    }
  }, [query.data])

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }
  if (query.isError) {
    return (
      <ErrorState
        title="We could not load your profile"
        description="Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const dirty =
    name !== query.data.displayName || timeZone !== query.data.timeZone

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (name.trim().length < 2) {
      setError('Enter a display name of at least 2 characters.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await saveProfile(user!.id, { displayName: name.trim(), timeZone })
      await queryClient.invalidateQueries({ queryKey: ['account', 'profile'] })
      toast.success('Profile saved.')
    } catch {
      toast.error('We could not save your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section
        aria-labelledby="account-summary"
        className="flex items-center gap-4 rounded-lg border border-nff-border-default bg-nff-bg-surface p-5"
      >
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--nff-forest-800)] nff-label-md text-[var(--nff-ivory-50)]"
        >
          {initialsOf(user?.name ?? '')}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="account-summary" className="truncate nff-heading-h4 text-foreground">
            {user?.name}
          </h2>
          <p className="truncate nff-body-sm text-nff-text-secondary">{user?.email}</p>
          <p className="nff-caption text-nff-text-secondary">
            {ROLE_LABEL[user?.role ?? 'practitioner'] ?? 'Member'} ·{' '}
            {user?.verified ? 'Email verified' : 'Email not verified'}
          </p>
        </div>
      </section>

      <form onSubmit={save} noValidate aria-labelledby="profile-heading" className="grid gap-6 lg:grid-cols-2 lg:gap-x-8">
        <h2 id="profile-heading" className="nff-heading-h3 lg:col-span-2">Profile details</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={name}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'name-error name-help' : 'name-help'}
            onChange={(event) => setName(event.target.value)}
          />
          <p id="name-help" className="nff-caption text-muted-foreground">
            Saved to your profile. Your greeting and menu still use the name on your sign-in account.
          </p>
          {error && (
            <p id="name-error" role="alert" className="nff-body-sm text-nff-text-error">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email ?? ''} readOnly disabled aria-describedby="email-help" />
          <p id="email-help" className="nff-caption text-muted-foreground">
            Your sign-in email. It cannot be changed here.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="timezone">Time zone</Label>
          <Select value={timeZone} onValueChange={setTimeZone}>
            <SelectTrigger id="timezone" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_ZONES.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="nff-caption text-muted-foreground">
            Saved to your profile. Nothing in Meadow uses it yet.
          </p>
        </div>

        <div className="sticky bottom-0 -mx-1 flex gap-3 border-t bg-background/95 p-3 backdrop-blur lg:col-span-2">
          <Button type="submit" className="h-11" disabled={!dirty || saving}>
            {saving && (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            )}
            Save changes
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={!dirty}
            onClick={() => {
              setName(query.data.displayName)
              setTimeZone(query.data.timeZone)
              setError(null)
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

const ROLE_LABEL: Record<string, string> = {
  practitioner: 'Practitioner',
  editor: 'Editor · staff',
  campaign: 'Campaigns · staff',
  admin: 'Administrator · staff',
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}
