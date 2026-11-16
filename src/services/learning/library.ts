import { content } from '@/mocks/db'
import { CATEGORY_COPY } from '@/services/content'
import type { Category, ContentItem } from '@/types'
import { canAccessResource, isFull, type AccessContext } from './access'
import { getLearningCatalogue } from './catalogue'
import type { LessonOutline } from './outline'
import { LEARN_LIBRARY, libraryHref, type LibraryType } from './routes'

/**
 * The Practitioner Library, as data. One list of real catalogue records the
 * viewer may open, and pure functions over it for search, category, format,
 * sort, featured and related. Pages only present the result.
 *
 * Discoverable = the item is published, its Resource is published, and
 * `canAccessResource` gives full access on the learner surface. Unpublished
 * items are left out for everyone, staff included, even though staff could
 * open them by URL in preview.
 */

export type LibraryFormat = 'article' | 'audio'
export const LIBRARY_FORMATS: readonly LibraryFormat[] = ['article', 'audio']

export const FORMAT_LABEL: Record<LibraryFormat, string> = {
  article: 'Article',
  audio: 'Audio',
}

export const LIBRARY_SORTS = ['updated', 'title', 'shortest', 'longest'] as const
export type LibrarySort = (typeof LIBRARY_SORTS)[number]

export const LIBRARY_SORT_LABEL: Record<LibrarySort, string> = {
  updated: 'Recently updated',
  title: 'Title A–Z',
  shortest: 'Shortest first',
  longest: 'Longest first',
}

const TOPIC_LABEL = { mind: 'Mind', wellbeing: 'Wellbeing' } as const

export interface LibraryResource {
  item: ContentItem
  /** Route segment for `/learn/library/:type/:slug`. */
  type: LibraryType
  href: string
  category: Category
  categoryLabel: string
  topicLabel?: string
  /** The format the item offers. */
  formats: LibraryFormat[]
  /** Reading time or audio length, in minutes. */
  durationMin: number
  /** 'processing': published, but its audio is not ready to play yet. */
  availability: 'ready' | 'processing'
  /** Lower-cased text the search matches against. */
  searchText: string
}

export interface LibraryQuery {
  q?: string
  category?: Category | 'all'
  format?: LibraryFormat | 'all'
}

function toResource(item: ContentItem): LibraryResource {
  const type = item.type === 'meditation' ? 'audio' : 'article'
  const topicLabel = item.understandTopic ? TOPIC_LABEL[item.understandTopic] : undefined
  const categoryLabel = CATEGORY_COPY[item.category].label
  return {
    item,
    type,
    href: libraryHref(type, item.slug),
    category: item.category,
    categoryLabel,
    ...(topicLabel ? { topicLabel } : {}),
    formats: [type],
    durationMin:
      item.type === 'meditation' ? Math.round(item.durationSec / 60) : item.readingTimeMin,
    availability:
      item.type === 'meditation' && item.transcode !== 'ready' ? 'processing' : 'ready',
    searchText: [item.title, item.excerpt, categoryLabel, topicLabel ?? '']
      .join(' ')
      .toLowerCase(),
  }
}

/** Everything the viewer may discover, in catalogue order. */
export function listLibraryResources(ctx: AccessContext): LibraryResource[] {
  const { resources } = getLearningCatalogue()
  return content
    .filter((item) => {
      if (!item.published) return false
      const resource = resources.find((entry) => entry.id === item.id)
      return resource?.status === 'published' && isFull(canAccessResource(ctx, resource))
    })
    .map(toResource)
}

/** Case-insensitive; every word must match somewhere in the searchable text. */
export function matchesSearch(resource: LibraryResource, q: string): boolean {
  const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean)
  return words.every((word) => resource.searchText.includes(word))
}

export function filterLibrary<T extends LibraryResource>(
  resources: T[],
  { q = '', category = 'all', format = 'all' }: LibraryQuery,
): T[] {
  return resources.filter(
    (resource) =>
      (category === 'all' || resource.category === category) &&
      (format === 'all' || resource.formats.includes(format)) &&
      matchesSearch(resource, q),
  )
}

/** Ties fall back to title, then id, so the order never jumps. */
export function sortLibrary<T extends LibraryResource>(resources: T[], sort: LibrarySort): T[] {
  const byTitle = (a: T, b: T) =>
    a.item.title.localeCompare(b.item.title) || a.item.id.localeCompare(b.item.id)
  const compare: Record<LibrarySort, (a: T, b: T) => number> = {
    updated: (a, b) => b.item.updatedAt.localeCompare(a.item.updatedAt) || byTitle(a, b),
    title: byTitle,
    shortest: (a, b) => a.durationMin - b.durationMin || byTitle(a, b),
    longest: (a, b) => b.durationMin - a.durationMin || byTitle(a, b),
  }
  return [...resources].sort(compare[sort])
}

/**
 * Counts for the controls, each with the other filters applied, so a number
 * next to a choice is exactly what choosing it would show.
 */
export function libraryCounts(resources: LibraryResource[], query: LibraryQuery) {
  const categories = (Object.keys(CATEGORY_COPY) as Category[]).map((category) => ({
    category,
    label: CATEGORY_COPY[category].label,
    count: filterLibrary(resources, { ...query, category }).length,
  }))
  const formats = LIBRARY_FORMATS.map((format) => ({
    format,
    label: FORMAT_LABEL[format],
    count: filterLibrary(resources, { ...query, format }).length,
  }))
  return {
    all: filterLibrary(resources, { ...query, category: 'all' }).length,
    allFormats: filterLibrary(resources, { ...query, format: 'all' }).length,
    // Only what has content: a category or format with nothing published is
    // not offered at all.
    categories: categories.filter((entry) =>
      resources.some((resource) => resource.category === entry.category),
    ),
    formats: formats.filter((entry) =>
      resources.some((resource) => resource.formats.includes(entry.format)),
    ),
  }
}

/** Items marked `featured` in the catalogue, playable, newest first. */
export function featuredResources<T extends LibraryResource>(resources: T[], limit = 3): T[] {
  return sortLibrary(
    resources.filter((resource) => resource.item.featured && resource.availability === 'ready'),
    'updated',
  ).slice(0, limit)
}

/**
 * The public site's rule, applied to what this viewer may open: the same kind
 * of item (and, for audio, the same stage), same category first, newest first.
 */
export function relatedResources(
  resources: LibraryResource[],
  item: ContentItem,
  limit = 3,
): LibraryResource[] {
  return resources
    .filter(
      (resource) =>
        resource.item.id !== item.id &&
        resource.item.type === item.type &&
        resource.availability === 'ready' &&
        (item.type !== 'meditation' || resource.item.stageId === item.stageId),
    )
    .sort(
      (a, b) =>
        Number(b.category === item.category) - Number(a.category === item.category) ||
        b.item.updatedAt.localeCompare(a.item.updatedAt) ||
        a.item.id.localeCompare(b.item.id),
    )
    .slice(0, limit)
}

export function parseCategory(value: string | null): Category | 'all' {
  return value && Object.hasOwn(CATEGORY_COPY, value) ? (value as Category) : 'all'
}

export function parseFormat(value: string | null): LibraryFormat | 'all' {
  return LIBRARY_FORMATS.includes(value as LibraryFormat) ? (value as LibraryFormat) : 'all'
}

export function parseLibrarySort(value: string | null): LibrarySort {
  return LIBRARY_SORTS.includes(value as LibrarySort) ? (value as LibrarySort) : 'updated'
}

/** Paths (that the viewer may open) which use this item, for the detail page. */
export function pathsUsingItem(ctx: AccessContext, itemId: string) {
  const { lessons, modules, paths } = getLearningCatalogue()
  const found = new Map<string, { title: string; slug: string; module: string }>()
  for (const lesson of lessons) {
    if (!lesson.blocks.some((block) => block.type === 'resource' && block.resourceId === itemId)) continue
    const module = modules.find((entry) => entry.id === lesson.moduleId)
    const path = module && paths.find((entry) => entry.id === module.pathId)
    if (!module || !path || found.has(path.id)) continue
    if (!ctx.assignments.some((entry) => entry.pathId === path.id && entry.status === 'active')) continue
    found.set(path.id, { title: path.title, slug: path.slug, module: module.title })
  }
  return [...found.values()]
}

/**
 * Navigation for an item opened from the Library: back to the Library, no
 * lesson counter and no previous/next, since it is not inside a path here.
 */
export function libraryOutline(item: ContentItem): LessonOutline {
  const categoryLabel = CATEGORY_COPY[item.category].label
  return {
    pathTitle: categoryLabel,
    overline: `Library · ${categoryLabel}`,
    backHref: LEARN_LIBRARY,
    backLabel: 'Library',
  }
}

/** Finds a discoverable item by its Library route; undefined when not listed. */
export function findLibraryResource(resources: LibraryResource[], type: string, slug: string) {
  return resources.find((resource) => resource.type === type && resource.item.slug === slug)
}
