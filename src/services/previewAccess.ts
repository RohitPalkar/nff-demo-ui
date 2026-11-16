import { readJson } from '@/mocks/api'

/**
 * Audio lock: whether a meditation is a free preview (visitors can listen
 * without an account) or locked to members. Admins set it in the CMS
 * (Meditations list or editor); the public site reads it here, so the live
 * CMS value wins over the seed in `mocks/db`.
 *
 * The CMS stores edited items under this key (services/cms.ts). Only the live
 * record is read: a pending revision does not change what visitors get.
 */
export const CMS_ITEMS_KEY = 'nff.cms.items'

export function cmsPreviewSetting(id: string): boolean | undefined {
  const stored = readJson<Record<string, { preview?: unknown } | undefined>>(CMS_ITEMS_KEY, {})
  const value = stored[id]?.preview
  return typeof value === 'boolean' ? value : undefined
}

/** The item with the free-preview setting an admin saved, if any. Explorations pass through. */
export function withCmsPreview<T extends { id: string; type: string }>(item: T): T {
  if (item.type !== 'meditation') return item
  const preview = cmsPreviewSetting(item.id)
  return preview === undefined || (item as { preview?: boolean }).preview === preview ? item : { ...item, preview }
}
