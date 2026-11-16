import { formatDuration, formatReadingTime } from '@/lib/format'
import type { ContentItem } from '@/types'

/** Shared class strings and labels for the Practitioner Home. */

/** Practitioner card: 12px radius (the card role), restrained border, white surface. */
export const HOME_CARD =
  'rounded-lg border border-nff-border-default bg-nff-bg-surface'

export const PRIMARY_ACTION =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--nff-forest-900)] px-5 nff-label-md text-[var(--nff-ivory-50)] transition-colors hover:bg-[var(--nff-forest-700)] nff-focus-ring'

export const SECONDARY_ACTION =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-nff-border-strong bg-nff-bg-surface px-5 nff-label-md text-foreground transition-colors hover:border-[var(--nff-forest-800)] nff-focus-ring'

/** "Article · 6 min read" or "Audio · 12 min". */
export function itemMeta(item: ContentItem) {
  return item.type === 'meditation'
    ? `Audio · ${formatDuration(item.durationSec)}`
    : `Article · ${formatReadingTime(item.readingTimeMin)}`
}
