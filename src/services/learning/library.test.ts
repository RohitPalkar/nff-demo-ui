import { beforeEach, describe, expect, it } from 'vitest'
import { content } from '@/mocks/db'
import type { AccessContext } from '@/services/learning/access'
import { getAccessContext } from '@/services/learning/accessContext'
import { getLearningCatalogue } from '@/services/learning/catalogue'
import {
  featuredResources,
  filterLibrary,
  LIBRARY_FORMATS,
  libraryCounts,
  libraryOutline,
  listLibraryResources,
  matchesSearch,
  parseCategory,
  parseFormat,
  parseLibrarySort,
  pathsUsingItem,
  relatedResources,
  sortLibrary,
} from '@/services/learning/library'
import type { Role } from '@/types'

const learnerCtx = () => getAccessContext({ id: 'u-demo', role: 'practitioner' as Role }, { surface: 'learn' })
const all = () => listLibraryResources(learnerCtx())

beforeEach(() => {
  window.localStorage.clear()
})

describe('what the Library lists', () => {
  it('lists every published item a learner may open, and nothing unpublished', () => {
    const resources = all()
    const published = content.filter((item) => item.published)
    expect(resources).toHaveLength(published.length)
    expect(resources.every((resource) => resource.item.published)).toBe(true)
    const hidden = content.find((item) => !item.published)
    if (hidden) expect(resources.some((resource) => resource.item.id === hidden.id)).toBe(false)
  })

  it('leaves out unpublished items for staff too, though they could preview them by URL', () => {
    const staff = listLibraryResources(
      getAccessContext({ id: 'u-editor', role: 'editor' as Role }, { surface: 'learn' }),
    )
    expect(staff.every((resource) => resource.item.published)).toBe(true)
  })

  it('lists nothing for a visitor, since every resource needs an account', () => {
    expect(listLibraryResources(getAccessContext(null, { surface: 'learn' }))).toEqual([])
  })

  it('respects a restricted resource: listed only with a grant', () => {
    const target = all()[0]!.item.id
    const { resources } = getLearningCatalogue()
    const restricted = resources.map((entry) =>
      entry.id === target ? { ...entry, access: 'restricted' as const } : entry,
    )
    const original = [...resources]
    resources.splice(0, resources.length, ...restricted)
    try {
      // No grant on the resource: hidden.
      const ctx: AccessContext = learnerCtx()
      expect(listLibraryResources(ctx).some((resource) => resource.item.id === target)).toBe(false)
      // A grant naming this learner: listed.
      resources.splice(
        0,
        resources.length,
        ...restricted.map((entry) => (entry.id === target ? { ...entry, grants: { userIds: ['u-demo'] } } : entry)),
      )
      expect(listLibraryResources(ctx).some((resource) => resource.item.id === target)).toBe(true)
    } finally {
      resources.splice(0, resources.length, ...original)
    }
  })

  it('describes each item from real fields only', () => {
    const article = all().find((resource) => resource.item.type === 'exploration')!
    expect(article.type).toBe('article')
    expect(article.href).toBe(`/learn/library/article/${article.item.slug}`)
    expect(article.durationMin).toBe(article.item.type === 'exploration' && article.item.readingTimeMin)

    const audio = all().find((resource) => resource.item.type === 'meditation')!
    expect(audio.type).toBe('audio')
    expect(audio.durationMin).toBe(audio.item.type === 'meditation' && Math.round(audio.item.durationSec / 60))
  })

  it('offers only the item\'s native article or audio format', () => {
    expect(LIBRARY_FORMATS).toEqual(['article', 'audio'])
    expect(all().every((resource) => resource.formats.length === 1)).toBe(true)
    expect(all().every((resource) => resource.formats[0] === resource.type)).toBe(true)
  })

  it('marks audio that is still processing', () => {
    const processing = all().filter((resource) => resource.availability === 'processing')
    expect(processing.length).toBeGreaterThan(0)
    expect(
      processing.every((resource) => resource.item.type === 'meditation' && resource.item.transcode !== 'ready'),
    ).toBe(true)
  })
})

describe('search', () => {
  it('matches title, description and category, ignoring case and word order', () => {
    const target = all().find((resource) => resource.item.type === 'exploration')!
    const word = target.item.title.split(' ').at(-1)!
    expect(matchesSearch(target, word.toUpperCase())).toBe(true)
    expect(matchesSearch(target, target.item.excerpt.split(' ').slice(0, 2).reverse().join(' '))).toBe(true)
    expect(matchesSearch(target, target.categoryLabel.toLowerCase())).toBe(true)
    expect(matchesSearch(target, 'zzzz-not-a-word')).toBe(false)
  })

  it('treats a blank query as no query', () => {
    expect(filterLibrary(all(), { q: '   ' })).toHaveLength(all().length)
  })

  it('returns nothing for a query that matches nothing', () => {
    expect(filterLibrary(all(), { q: 'qwertyuiop' })).toEqual([])
  })
})

describe('filters and counts', () => {
  it('filters by category and format together', () => {
    const result = filterLibrary(all(), { category: 'foundations', format: 'audio' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((resource) => resource.category === 'foundations' && resource.item.type === 'meditation')).toBe(true)
  })

  it('does not treat unsupported media formats as filters', () => {
    expect(parseFormat('video')).toBe('all')
    expect(parseFormat('mixed')).toBe('all')
  })

  it('counts each choice with the other filters applied', () => {
    const resources = all()
    const counts = libraryCounts(resources, { format: 'article' })
    for (const entry of counts.categories) {
      expect(entry.count).toBe(filterLibrary(resources, { format: 'article', category: entry.category }).length)
    }
    expect(counts.all).toBe(filterLibrary(resources, { format: 'article' }).length)
    expect(counts.categories.reduce((sum, entry) => sum + entry.count, 0)).toBe(counts.all)
  })

  it('offers only categories and formats that have content', () => {
    const onlyArticles = all().filter((resource) => resource.item.type === 'exploration')
    const counts = libraryCounts(onlyArticles, {})
    expect(counts.formats.map((entry) => entry.format)).toEqual(['article'])
  })

  it('reads URL values safely', () => {
    expect(parseCategory('contemplate')).toBe('contemplate')
    expect(parseCategory('nope')).toBe('all')
    expect(parseCategory('toString')).toBe('all')
    expect(parseFormat(null)).toBe('all')
    expect(parseLibrarySort('longest')).toBe('longest')
    expect(parseLibrarySort('popular')).toBe('updated')
  })
})

describe('sorting', () => {
  it('sorts by title, update date and duration, with stable ties', () => {
    const resources = all()
    const titles = sortLibrary(resources, 'title').map((resource) => resource.item.title)
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)))

    const updated = sortLibrary(resources, 'updated').map((resource) => resource.item.updatedAt)
    expect(updated).toEqual([...updated].sort().reverse())

    const shortest = sortLibrary(resources, 'shortest').map((resource) => resource.durationMin)
    expect(shortest).toEqual([...shortest].sort((a, b) => a - b))
    const longest = sortLibrary(resources, 'longest').map((resource) => resource.durationMin)
    expect(longest).toEqual([...longest].sort((a, b) => b - a))
  })

  it('does not change the list it was given', () => {
    const resources = all()
    const before = resources.map((resource) => resource.item.id)
    sortLibrary(resources, 'title')
    expect(resources.map((resource) => resource.item.id)).toEqual(before)
  })
})

describe('featured and related', () => {
  it('features only items flagged featured in the catalogue and ready to open', () => {
    const featured = featuredResources(all())
    expect(featured).toHaveLength(3)
    expect(featured.every((resource) => resource.item.featured && resource.availability === 'ready')).toBe(true)
  })

  it('features nothing when nothing is flagged', () => {
    const unflagged = all().map((resource) => ({ ...resource, item: { ...resource.item, featured: false } }))
    expect(featuredResources(unflagged)).toEqual([])
  })

  it('relates items of the same kind, same category first, never the item itself', () => {
    const resources = all()
    const article = resources.find((resource) => resource.item.type === 'exploration')!.item
    const related = relatedResources(resources, article)
    expect(related).toHaveLength(3)
    expect(related.every((resource) => resource.item.type === 'exploration' && resource.item.id !== article.id)).toBe(true)
    expect(related[0]!.category).toBe(article.category)

    const audio = resources.find((resource) => resource.item.type === 'meditation')!.item
    const relatedAudio = relatedResources(resources, audio)
    expect(relatedAudio.every((resource) => resource.item.stageId === audio.stageId)).toBe(true)
    expect(relatedAudio.every((resource) => resource.availability === 'ready')).toBe(true)
  })
})

describe('detail helpers', () => {
  it('gives a Library item its own navigation, with no lesson counter', () => {
    const resource = all()[0]!
    expect(libraryOutline(resource.item)).toEqual({
      pathTitle: resource.categoryLabel,
      overline: `Library · ${resource.categoryLabel}`,
      backHref: '/learn/library',
      backLabel: 'Library',
    })
  })

  it('names the assigned paths that use an item, and none for staff', () => {
    const ctx = learnerCtx()
    const names = pathsUsingItem(ctx, 'exp-14').map((entry) => entry.title)
    expect(names).toContain('Meadow Journey')
    expect(names).toContain('Rest and sleep')
    expect(pathsUsingItem(getAccessContext({ id: 'u-editor', role: 'editor' as Role }, { surface: 'learn' }), 'exp-14')).toEqual([])
  })
})
