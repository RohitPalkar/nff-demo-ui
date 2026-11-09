import { useMutation } from '@tanstack/react-query'
import { Cookie } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { CookiePreferencesPanel } from '@/components/nff/CookiePreferencesPanel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  CONSENT_EVENT,
  getStoredConsent,
  saveConsent,
} from '@/services/consent'
import type { ConsentRecord } from '@/types'

const DESCRIPTION =
  'Essential cookies keep the site working. Analytics cookies help us improve the practice, and are off unless you switch them on.'

function useIsMobile() {
  const query = '(max-width: 767px)'
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.(query).matches,
  )
  useEffect(() => {
    const list = window.matchMedia?.(query)
    if (!list) return
    const update = () => setMobile(list.matches)
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [])
  return Boolean(mobile)
}

export function CookieBanner() {
  const [consent, setConsent] = useState<ConsentRecord | null>(() =>
    getStoredConsent(),
  )
  const [panelOpen, setPanelOpen] = useState(false)
  const mobile = useIsMobile()
  const { pathname } = useLocation()

  // Hide when consent is saved anywhere else, e.g. the preferences page.
  useEffect(() => {
    const onChange = (event: Event) => {
      setConsent((event as CustomEvent<ConsentRecord>).detail)
    }
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
  }, [])

  const mutation = useMutation({
    mutationFn: saveConsent,
    onSuccess: () => toast.success('Cookie preferences saved'),
    onError: () =>
      toast.error('We could not save your preferences. Please try again.'),
  })

  if (consent || pathname === '/cookie-preferences') return null

  const panel = <CookiePreferencesPanel onSaved={() => setPanelOpen(false)} />

  return (
    <>
      <div
        role="region"
        aria-label="Cookie preferences"
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-popover shadow-nff-2"
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
              onClick={() => mutation.mutate({ analytics: false })}
            >
              Reject non-essential
            </Button>
            <Button
              className="h-11"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ analytics: true })}
            >
              Accept all
            </Button>
          </div>
        </div>
      </div>

      {mobile ? (
        <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
          <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Cookie preferences</SheetTitle>
              <SheetDescription>{DESCRIPTION}</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">{panel}</div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="nff-title-section">
                Cookie preferences
              </DialogTitle>
              <DialogDescription className="nff-body-md text-muted-foreground">
                {DESCRIPTION}
              </DialogDescription>
            </DialogHeader>
            {panel}
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
