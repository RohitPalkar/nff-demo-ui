import { useMutation } from '@tanstack/react-query'
import { Cookie } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { getStoredConsent, saveConsent } from '@/services/consent'
import type { ConsentRecord } from '@/types'

export function CookieBanner() {
  const [consent, setConsent] = useState<ConsentRecord | null>(() =>
    getStoredConsent(),
  )
  const [panelOpen, setPanelOpen] = useState(false)
  const [analytics, setAnalytics] = useState(
    () => getStoredConsent()?.analytics ?? false,
  )

  const mutation = useMutation({
    mutationFn: saveConsent,
    onSuccess: (record) => {
      setConsent(record)
      setPanelOpen(false)
      toast.success('Cookie preferences saved')
    },
    onError: () => {
      toast.error('We could not save your preferences. Please try again.')
    },
  })

  if (consent) return null

  const choose = (allowAnalytics: boolean) => {
    setAnalytics(allowAnalytics)
    mutation.mutate({ analytics: allowAnalytics })
  }

  return (
    <>
      <div
        role="region"
        aria-label="Cookie preferences"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-popover shadow-nff-2"
      >
        <div
          className={`nff-content flex flex-col gap-4 py-4 md:flex-row md:items-center ${
            import.meta.env.DEV ? 'md:pl-68' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-nff-bg-warning-subtle text-nff-text-warning"
            >
              <Cookie className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="nff-label-lg text-foreground">
                A choice about cookies
              </p>
              <p className="nff-body-sm text-muted-foreground">
                We use essential cookies to run the site and, with your
                permission, analytics to understand how it is used.{' '}
                <Link
                  to="/privacy"
                  className="text-nff-text-link-default hover:text-nff-text-link-hover nff-focus-ring"
                >
                  Read our cookie policy
                </Link>
                .
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row md:ml-auto">
            <Button
              variant="ghost"
              className="h-11"
              onClick={() => setPanelOpen(true)}
            >
              Customise
            </Button>
            <Button
              variant="outline"
              className="h-11"
              disabled={mutation.isPending}
              onClick={() => choose(false)}
            >
              Reject non-essential
            </Button>
            <Button
              className="h-11"
              disabled={mutation.isPending}
              onClick={() => choose(true)}
            >
              Accept all
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="nff-title-section">
              Cookie preferences
            </DialogTitle>
            <DialogDescription className="nff-body-md text-muted-foreground">
              Essential cookies keep the site working. Analytics cookies help us
              improve the practice, and are off unless you switch them on.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col divide-y">
            <div className="flex items-start justify-between gap-4 py-4">
              <div className="flex flex-col gap-1">
                <p className="nff-label-lg text-foreground">Essential</p>
                <p className="nff-body-sm text-muted-foreground">
                  Sign-in, security and your preferences. Always on.
                </p>
              </div>
              <Switch checked disabled aria-label="Essential cookies, always on" />
            </div>
            <div className="flex items-start justify-between gap-4 py-4">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="analytics-cookies"
                  className="nff-label-lg text-foreground"
                >
                  Analytics
                </label>
                <p className="nff-body-sm text-muted-foreground">
                  Aggregated page views and preview plays. No advertising.
                </p>
              </div>
              <Switch
                id="analytics-cookies"
                checked={analytics}
                onCheckedChange={setAnalytics}
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="h-11"
                onClick={() => choose(false)}
                disabled={mutation.isPending}
              >
                Reject all
              </Button>
              <Button
                variant="ghost"
                className="h-11"
                onClick={() => choose(true)}
                disabled={mutation.isPending}
              >
                Accept all
              </Button>
            </div>
            <Button
              className="h-11"
              onClick={() => mutation.mutate({ analytics })}
              disabled={mutation.isPending}
            >
              Save choices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
