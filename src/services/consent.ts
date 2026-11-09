import { mockApi, readJson, writeJson } from '@/mocks/api'
import type { ConsentInput, ConsentRecord } from '@/types'

const CONSENT_KEY = 'nff.consent'
export const CONSENT_POLICY_VERSION = '2026-11-09'

export function getStoredConsent(): ConsentRecord | null {
  return readJson<ConsentRecord | null>(CONSENT_KEY, null)
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
    }
    writeJson(CONSENT_KEY, record)
    logScriptState(record)
    return record
  })
}
