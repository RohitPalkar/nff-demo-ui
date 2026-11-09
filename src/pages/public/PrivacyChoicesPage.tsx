import { CheckCircle2, Cookie } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PrivacyChoicesPanel } from '@/components/nff/PrivacyChoicesPanel'
import { DetailBreadcrumb } from '@/components/nff/DetailBreadcrumb'
import {
  CONSENT_EVENT,
  getConsentLedger,
  getStoredConsent,
} from '@/services/privacyChoices'
import type { ConsentRecord } from '@/types'

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PrivacyChoicesPage() {
  const [current, setCurrent] = useState<ConsentRecord | null>(getStoredConsent)
  const [ledger, setLedger] = useState<ConsentRecord[]>(getConsentLedger)
  const [updated, setUpdated] = useState(false)

  useEffect(() => {
    const onChange = () => {
      setCurrent(getStoredConsent())
      setLedger(getConsentLedger())
      setUpdated(true)
    }
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
  }, [])

  return (
    <div className="nff-content flex flex-col gap-8 py-8 md:py-12">
      <DetailBreadcrumb
        trail={[{ label: 'Home', to: '/' }]}
        current="Cookie preferences"
      />

      <header className="nff-reading flex flex-col gap-3">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-nff-bg-warning-subtle text-nff-text-warning"
        >
          <Cookie className="size-6" />
        </span>
        <h1 className="nff-heading-h1">Cookie preferences</h1>
        <p className="nff-body-lg text-nff-text-secondary">
          Essential cookies keep the site working. Analytics cookies help us
          improve the practice, and are off unless you switch them on. You can
          change your mind at any time.
        </p>
      </header>

      <div className="nff-reading flex flex-col gap-8">
        <section
          aria-label="Current choice"
          aria-live="polite"
          className="rounded-xl border bg-nff-bg-surface-sunken p-4"
        >
          {current ? (
            <p className="flex items-start gap-2 nff-body-md">
              {updated && (
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-nff-text-success"
                />
              )}
              <span>
                {updated ? 'Updated. ' : ''}Analytics are{' '}
                <strong>{current.analytics ? 'on' : 'off'}</strong>. Saved{' '}
                {when(current.updatedAt)} under policy version{' '}
                {current.policyVersion}.
              </span>
            </p>
          ) : (
            <p className="nff-body-md">
              You have not made a choice yet. Analytics stay off until you do.
            </p>
          )}
        </section>

        <PrivacyChoicesPanel />

        {ledger.length > 0 && (
          <section aria-labelledby="history" className="flex flex-col gap-3">
            <h2 id="history" className="nff-heading-h4">
              Your consent history
            </h2>
            <ul className="flex flex-col divide-y rounded-xl border bg-card">
              {ledger.slice(0, 5).map((record) => (
                <li
                  key={record.updatedAt}
                  className="flex flex-wrap justify-between gap-2 p-3 nff-body-sm"
                >
                  <span>Analytics {record.analytics ? 'on' : 'off'}</span>
                  <span className="text-muted-foreground">
                    {when(record.updatedAt)} · policy {record.policyVersion}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
