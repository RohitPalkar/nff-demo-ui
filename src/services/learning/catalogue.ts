import { DEMO_PATHS, type DemoPathConfig } from '@/config/demoPaths'
import { content, stages } from '@/mocks/db'
import type {
  ContentItem,
  Lesson,
  LearningPath,
  Module,
  Resource,
  Stage,
} from '@/types'

/**
 * The migrated catalogue. Existing stages and content are the source data and
 * this file derives paths, modules, lessons and resources from them on demand,
 * so there is nothing to copy and nothing to drift. Calling the builder twice
 * gives the same ids, which makes the "migration" idempotent by construction.
 *
 * Not connected to the CMS: see docs/practitioner-foundation.md.
 */

export const MEADOW_JOURNEY_ID = 'path-meadow-journey'

export const moduleIdForStage = (stageId: string) => `module-${stageId}`
/**
 * Meadow Journey lesson ids are `lesson-{itemId}` (every saved record uses
 * them). Lessons of other paths reuse items, so their ids carry the path:
 * `lesson-{itemId}@{pathKey}`.
 */
export const lessonIdForItem = (itemId: string, pathKey?: string) =>
  pathKey ? `lesson-${itemId}@${pathKey}` : `lesson-${itemId}`

/** Reverse of `lessonIdForItem`; undefined if the id is not a lesson id. */
export function itemIdForLesson(lessonId: string): string | undefined {
  if (!lessonId.startsWith('lesson-')) return undefined
  return lessonId.slice('lesson-'.length).split('@')[0] || undefined
}

export function buildResource(item: ContentItem): Resource {
  const isReading = item.type === 'exploration'
  return {
    id: item.id,
    kind: isReading ? 'article' : 'audio',
    contentId: item.id,
    // Today every item needs an account for the full thing; visitors get an
    // excerpt (explorations) or the free preview (meditations).
    access: 'registered',
    status: item.published ? 'published' : 'draft',
    previewable: isReading
      ? true
      : item.preview && item.transcode === 'ready',
  }
}

function buildModule(stage: Stage): Module {
  return {
    id: moduleIdForStage(stage.id),
    pathId: MEADOW_JOURNEY_ID,
    order: stage.number,
    title: stage.title,
    summary: stage.description,
    intro: stage.intro,
    unlock: 'sequential',
    status: stage.published ? 'published' : 'draft',
    legacyStageId: stage.id,
  }
}

function buildLessons(stage: Stage): Lesson[] {
  return stage.itemIds.map((itemId, index) => {
    const item = content.find((entry) => entry.id === itemId)
    return {
      id: lessonIdForItem(itemId),
      moduleId: moduleIdForStage(stage.id),
      order: index + 1,
      kind: item?.type === 'meditation' ? 'audio' : 'reading',
      blocks: [{ id: `block-${itemId}`, type: 'resource', resourceId: itemId }],
      required: true,
      completion: 'manual',
    }
  })
}

/** Paths from `config/demoPaths.ts`: modules and lessons from item lists. */
function buildDemoPath(config: DemoPathConfig): Pick<LearningCatalogue, 'paths' | 'modules' | 'lessons'> {
  const pathId = `path-demo-${config.key}`
  const known = (itemId: string) => content.some((item) => item.id === itemId)
  const modules: Module[] = config.modules.map((entry, index) => ({
    id: `module-demo-${config.key}-${index + 1}`,
    pathId,
    order: index + 1,
    title: entry.title,
    summary: entry.summary,
    unlock: config.unlock,
    status: 'published',
  }))
  const lessons: Lesson[] = config.modules.flatMap((entry, index) =>
    entry.itemIds.filter(known).map((itemId, position) => {
      const item = content.find((candidate) => candidate.id === itemId)
      return {
        id: lessonIdForItem(itemId, config.key),
        moduleId: modules[index]!.id,
        order: position + 1,
        kind: item?.type === 'meditation' ? 'audio' : 'reading',
        blocks: [{ id: `block-${itemId}@${config.key}`, type: 'resource', resourceId: itemId }],
        required: true,
        completion: 'manual',
      } satisfies Lesson
    }),
  )
  return {
    paths: [
      { id: pathId, slug: config.slug, title: config.title, summary: config.summary, access: 'assigned', status: 'published' },
    ],
    modules,
    lessons,
  }
}

export interface LearningCatalogue {
  paths: LearningPath[]
  modules: Module[]
  lessons: Lesson[]
  resources: Resource[]
}

let cached: LearningCatalogue | null = null

export function getLearningCatalogue(): LearningCatalogue {
  if (cached) return cached
  const path: LearningPath = {
    id: MEADOW_JOURNEY_ID,
    slug: 'meadow-journey',
    title: 'Meadow Journey',
    summary: 'A staged practice, from arriving through to integration.',
    access: 'assigned',
    status: 'published',
  }
  const demos = DEMO_PATHS.map(buildDemoPath)
  cached = {
    // Meadow Journey first: the order paths are listed in when nothing else decides.
    paths: [path, ...demos.flatMap((demo) => demo.paths)],
    modules: [...stages.map(buildModule), ...demos.flatMap((demo) => demo.modules)],
    lessons: [...stages.flatMap(buildLessons), ...demos.flatMap((demo) => demo.lessons)],
    resources: content.map(buildResource),
  }
  return cached
}

/** For tests that change the mock content. */
export function resetLearningCatalogueCache() {
  cached = null
}

export function getPathBySlug(slug: string): LearningPath | undefined {
  return getLearningCatalogue().paths.find((path) => path.slug === slug)
}

/** Ids of every path except Meadow Journey come from config/demoPaths.ts. */
export const DEMO_PATH_IDS = DEMO_PATHS.map((config) => `path-demo-${config.key}`)

export function getPath(pathId: string): LearningPath | undefined {
  return getLearningCatalogue().paths.find((path) => path.id === pathId)
}

export function getModulesOf(pathId: string): Module[] {
  return getLearningCatalogue()
    .modules.filter((module) => module.pathId === pathId)
    .sort((a, b) => a.order - b.order)
}

export function getLessonsOf(moduleId: string): Lesson[] {
  return getLearningCatalogue()
    .lessons.filter((lesson) => lesson.moduleId === moduleId)
    .sort((a, b) => a.order - b.order)
}

export function getLesson(lessonId: string): Lesson | undefined {
  return getLearningCatalogue().lessons.find((lesson) => lesson.id === lessonId)
}

export function getModule(moduleId: string): Module | undefined {
  return getLearningCatalogue().modules.find((module) => module.id === moduleId)
}

export function getResource(resourceId: string): Resource | undefined {
  return getLearningCatalogue().resources.find(
    (resource) => resource.id === resourceId,
  )
}

export function getResourceIdsOf(lesson: Lesson): string[] {
  return lesson.blocks.flatMap((block) =>
    block.type === 'resource' ? [block.resourceId] : [],
  )
}

/** Paths that contain a lesson using this resource. Used by `assigned` access. */
export function getPathIdsContainingResource(resourceId: string): string[] {
  const { lessons, modules } = getLearningCatalogue()
  const pathIds = new Set<string>()
  for (const lesson of lessons) {
    if (!getResourceIdsOf(lesson).includes(resourceId)) continue
    const module = modules.find((entry) => entry.id === lesson.moduleId)
    if (module) pathIds.add(module.pathId)
  }
  return [...pathIds]
}
