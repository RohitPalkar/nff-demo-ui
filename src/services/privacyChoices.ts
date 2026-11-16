import { mockApi, readJson, writeJson } from '@/mocks/api'
import type { ConsentInput, ConsentRecord } from '@/types'

const CONSENT_KEY = 'nff.consent'
const LEDGER_KEY = 'nff.consent.ledger'
export const CONSENT_POLICY_VERSION = '2026-11-09'
export const CONSENT_EVENT = 'nff:consent-changed'

/**
 * Global Privacy Control (https://globalprivacycontrol.org). California
 * (CCPA/CPRA regulations §7025), Colorado, Connecticut and other US states
 * require a GPC signal to be honoured as an opt-out. With GPC on and no saved
 * choice, analytics stay off and the banner does not ask; a person can still
 * turn analytics on themselves on the cookie preferences page.
 */
export function hasGlobalPrivacyControl(): boolean {
  try {
    return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  } catch {
    return false
  }
}

export function getStoredConsent(): ConsentRecord | null {
  const saved = readJson<ConsentRecord | null>(CONSENT_KEY, null)
  if (saved) return saved
  if (hasGlobalPrivacyControl()) {
    return {
      essential: true,
      analytics: false,
      updatedAt: new Date(0).toISOString(),
      policyVersion: CONSENT_POLICY_VERSION,
      source: 'gpc',
    }
  }
  return null
}

/** Every saved choice, newest first (mock consent ledger). */
export function getConsentLedger(): ConsentRecord[] {
  return readJson<ConsentRecord[]>(LEDGER_KEY, [])
}

function logScriptState(record: ConsentRecord) {
  if (record.analytics) {
    console.info('[NFF] Analytics scripts enabled (consented).')
  } else {
    console.info('[NFF] Analytics scripts blocked until consent.')
  }
}

export async function saveConsent(
  input: ConsentInput,
): Promise<ConsentRecord> {
  return mockApi(() => {
    const record: ConsentRecord = {
      essential: true,
      analytics: input.analytics,
      updatedAt: new Date().toISOString(),
      policyVersion: CONSENT_POLICY_VERSION,
      source: 'user',
    }
    writeJson(CONSENT_KEY, record)
    writeJson(LEDGER_KEY, [record, ...getConsentLedger()].slice(0, 20))
    logScriptState(record)
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: record }))
    return record
  })
}
