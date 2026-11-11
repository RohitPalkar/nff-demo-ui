import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  PLAYBACK_SPEEDS,
  getPlaybackSpeed,
  savePlaybackSpeed,
} from '@/services/account'

/**
 * Only settings that are saved and change behaviour live here. Today that is
 * the playback speed. Time zone and email settings already have their own
 * pages and are linked, not duplicated.
 */
export function PreferencesPage() {
  const { user } = useAuth()
  const [speed, setSpeed] = useState(() => (user ? getPlaybackSpeed(user.id) : 1))

  function choose(value: string) {
    const next = Number(value)
    setSpeed(next)
    if (!user) return
    savePlaybackSpeed(user.id, next)
    toast.success(`Playback speed set to ${next}×.`)
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="listening-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="listening-heading" className="nff-heading-h3">Listening</h2>
          <p className="nff-body-sm text-muted-foreground">
            The speed meditations start at when you open them in your lessons.
            You can still change it while you listen.
          </p>
        </div>
        <RadioGroup
          value={String(speed)}
          onValueChange={choose}
          aria-label="Default playback speed"
          className="grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {PLAYBACK_SPEEDS.map((option) => (
            <Label
              key={option}
              htmlFor={`speed-${option}`}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-nff-border-default bg-nff-bg-surface px-3 has-[[data-state=checked]]:border-[var(--nff-forest-800)] has-[[data-state=checked]]:bg-nff-bg-selected"
            >
              <RadioGroupItem id={`speed-${option}`} value={String(option)} />
              {option}×
            </Label>
          ))}
        </RadioGroup>
      </section>

      <p className="nff-body-sm text-muted-foreground">
        Your time zone is in{' '}
        <Link to="/account/profile" className="text-nff-text-brand underline underline-offset-4">
          My Profile
        </Link>
        , and what we email you is in{' '}
        <Link to="/account/email" className="text-nff-text-brand underline underline-offset-4">
          Email Preferences
        </Link>
        .
      </p>
    </div>
  )
}
