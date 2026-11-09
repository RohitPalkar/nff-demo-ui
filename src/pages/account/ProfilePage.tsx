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
    <form onSubmit={save} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display-name">Display name</Label>
        <Input
          id="display-name"
          value={name}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'name-error' : undefined}
          onChange={(event) => setName(event.target.value)}
        />
        {error && (
          <p id="name-error" role="alert" className="nff-body-sm text-nff-text-error">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={user?.email ?? ''} readOnly disabled />
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
          Your daily email arrives at 7:00 in this time zone.
        </p>
      </div>

      <div className="sticky bottom-0 -mx-1 flex gap-3 border-t bg-background/95 p-3 backdrop-blur">
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
  )
}
