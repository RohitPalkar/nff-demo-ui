import type { LearningProgressStore } from '@/types'
import type { AccessContext } from './access'
import { lessonIdForItem } from './catalogue'
import {
  filterLibrary,
  libraryCounts,
  listLibraryResources,
  type LibraryResource,
} from './library'
import { meditationHref } from './routes'
import type { Category } from '@/types'

/**
 * Meditations: the audio items of the Library, as their own destination. The
 * same access rules apply (`listLibraryResources`, so unpublished and
 * unopenable items never appear), and there is no second list to drift.
 *
 * States come from real records only. "Saved position" is where the player
 * last saved; the demo player advances on a timer over placeholder audio, so
 * it is a place to resume from, not listening time. Lengths are the
 * catalogue's listed lengths, not measured from a file.
 */

export type ListeningState = 'not-started' | 'in-progress' | 'completed' | 'processing' | 'unavailable'

export interface MeditationEntry extends LibraryResource {
  state: ListeningState
  /** The catalogue's listed length in seconds (not measured from the audio file). */
  durationSec: number
  /** Where the player last saved, in seconds. Only when in progress. */
  savedSec?: number
  /** When the position was saved (for ordering "Continue listening"). */
  savedAt?: string
}

export interface MeditationQuery {
  q?: string
  category?: Category | 'all'
  /** Hide recordings that cannot be played yet. */
  readyOnly?: boolean
}

export function listMeditations(ctx: AccessContext, store: LearningProgressStore): MeditationEntry[] {
  return listLibraryResources(ctx)
    .filter((resource) => resource.item.type === 'meditation')
    .map((resource): MeditationEntry => {
      const item = resource.item
      const base = {
        ...resource,
        href: meditationHref(item.slug),
        durationSec: item.type === 'meditation' ? item.durationSec : 0,
      }
      if (item.type !== 'meditation' || item.transcode === 'failed') {
        return { ...base, state: 'unavailable' }
      }
      if (item.transcode !== 'ready') return { ...base, state: 'processing' }
      if (store.lessons[lessonIdForItem(item.id)]?.status === 'completed') {
        return { ...base, state: 'completed' }
      }
      const media = store.media[item.id]
      if (media && media.positionSec > 0 && media.updatedAt) {
        return {
          ...base,
          state: 'in-progress',
          savedSec: Math.min(media.positionSec, item.durationSec),
          savedAt: media.updatedAt,
        }
      }
      return { ...base, state: 'not-started' }
    })
}

/** Playable now: not processing and not failed. */
export const isPlayable = (entry: MeditationEntry) =>
  entry.state !== 'processing' && entry.state !== 'unavailable'

/** Meditations with a real saved position, newest first. */
export function continueListening(entries: MeditationEntry[], limit = 3): MeditationEntry[] {
  return entries
    .filter((entry) => entry.state === 'in-progress')
    .sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? '') || a.item.id.localeCompare(b.item.id))
    .slice(0, limit)
}

export function filterMeditations(entries: MeditationEntry[], query: MeditationQuery): MeditationEntry[] {
  const ready = query.readyOnly ? entries.filter(isPlayable) : entries
  return filterLibrary(ready, { q: query.q ?? '', category: query.category ?? 'all' })
}

/** Category choices with counts that match what choosing each would show. */
export function meditationCategories(entries: MeditationEntry[], query: MeditationQuery) {
  const base = query.readyOnly ? entries.filter(isPlayable) : entries
  const counts = libraryCounts(base, { q: query.q ?? '' })
  return {
    all: counts.all,
    categories: counts.categories.filter((entry) =>
      entries.some((candidate) => candidate.category === entry.category),
    ),
  }
}
