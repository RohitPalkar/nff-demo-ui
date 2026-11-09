import { ApiError, mockApi, readJson, writeJson } from '@/mocks/api'
import {
  content,
  contentById,
  demoProgress,
  progressByUser,
  stages,
} from '@/mocks/db'
import { getScenario } from '@/mocks/scenario'
import type {
  Category,
  CatalogueResult,
  ContentItem,
  ContentType,
  HomeContent,
  HomeTab,
  Journey,
  Progress,
  Stage,
  StageProgressStatus,
  StageWithProgress,
  UnderstandTopic,
} from '@/types'

const TAB_COPY: Record<
  Category,
  { label: string; description: string }
> = {
  foundations: {
    label: 'Foundations',
    description:
      'The ideas behind the practice, and a simple way to begin today.',
  },
  understand: {
    label: 'Understand',
    description:
      'Two lenses on the mind and on wellbeing, explained without overclaiming.',
  },
  contemplate: {
    label: 'Contemplate',
    description:
      'Short reflections to sit with, and questions worth returning to.',
  },
  explore: {
    label: 'Explore',
    description:
      'Practice out in the world — walking, listening, resting and noticing.',
  },
}

function publishedContent() {
  return content.filter((item) => item.published)
}

function takeMix(category: Category, topic?: UnderstandTopic): ContentItem[] {
  const pool = publishedContent().filter(
    (item) =>
      item.category === category &&
      (topic === undefined || item.understandTopic === topic),
  )
  const explorations = pool
    .filter((item) => item.type === 'exploration')
    .slice(0, 2)
  const meditations = pool
    .filter((item) => item.type === 'meditation')
    .slice(0, 2)
  return [...explorations, ...meditations]
}

function buildTab(category: Category): HomeTab {
  const copy = TAB_COPY[category]
  const tab: HomeTab = {
    key: category,
    label: copy.label,
    description: copy.description,
    items: takeMix(category),
  }

  if (category === 'understand') {
    tab.subTabs = [
      { key: 'mind', label: 'The mind', items: takeMix(category, 'mind') },
      {
        key: 'wellbeing',
        label: 'Wellbeing',
        items: takeMix(category, 'wellbeing'),
      },
    ]
  }

  return tab
}

export async function getHomeContent(): Promise<HomeContent> {
  return mockApi(() => {
    if (getScenario() === 'empty') {
      return {
        tabs: (['foundations', 'understand', 'contemplate', 'explore'] as Category[]).map(
          (category) => ({
            ...buildTab(category),
            items: [],
            subTabs: category === 'understand'
              ? [
                  { key: 'mind', label: 'The mind', items: [] },
                  { key: 'wellbeing', label: 'Wellbeing', items: [] },
                ]
              : undefined,
          }),
        ),
        featured: [],
      }
    }

    const featured =
      getScenario() === 'no-featured'
        ? []
        : publishedContent()
            .filter((item) => item.featured)
            .slice(0, 6)

    return {
      tabs: (['foundations', 'understand', 'contemplate', 'explore'] as Category[]).map(
        buildTab,
      ),
      featured,
    }
  })
}

export function getStageTitle(stageId: string): string {
  const stage = stages.find((entry) => entry.id === stageId)
  return stage ? `Stage ${stage.number} · ${stage.title}` : 'Unplaced'
}

export function getStage(stageId: string): Stage | undefined {
  return stages.find((stage) => stage.id === stageId)
}

export async function getCatalogue(
  type: ContentType,
  category?: Category,
): Promise<CatalogueResult> {
  return mockApi(() => {
    if (getScenario() === 'empty') {
      return { items: [], total: 0 }
    }
    const items = publishedContent()
      .filter((item) => item.type === type)
      .filter((item) => (category ? item.category === category : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return { items, total: items.length }
  })
}

export async function getContentBySlug(
  type: ContentType,
  slug: string,
): Promise<ContentItem> {
  return mockApi(
    () => {
      const item = content.find(
        (entry) => entry.type === type && entry.slug === slug,
      )
      if (!item) {
        throw new ApiError('not_found', 'We could not find that page.', 404)
      }
      if (!item.published) {
        throw new ApiError(
          'unpublished',
          'This content is not published yet.',
          404,
        )
      }
      return item
    },
    { allowError: false },
  )
}

export function getItemById(id: string): ContentItem | undefined {
  return contentById.get(id)
}

function stageStatus(
  stage: Stage,
  completed: Set<string>,
  previousComplete: boolean,
): StageProgressStatus {
  const done = stage.itemIds.filter((id) => completed.has(id)).length
  if (stage.itemIds.length > 0 && done === stage.itemIds.length) {
    return 'completed'
  }
  if (done > 0) return 'in_progress'
  if (previousComplete) return 'available'
  return 'locked'
}

export async function getJourney(userId: string): Promise<Journey> {
  return mockApi(() => {
    const stored = readJson<Progress | null>(`nff.progress.${userId}`, null)
    const progress =
      stored ??
      progressByUser.find((entry) => entry.userId === userId) ??
      (userId === demoProgress.userId ? demoProgress : undefined) ?? {
        userId,
        completedItemIds: [],
        positionsSec: {},
        updatedAt: new Date().toISOString(),
      }

    const completed = new Set(progress.completedItemIds)
    const forceLocked = getScenario() === 'locked-stage'
    let previousComplete = true

    const stagesWithProgress: StageWithProgress[] = stages.map((stage, index) => {
      const done = stage.itemIds.filter((id) => completed.has(id)).length
      const status = forceLocked && index > 1
        ? 'locked'
        : stageStatus(stage, completed, previousComplete)
      previousComplete = status === 'completed'
      return {
        ...stage,
        status,
        completedCount: done,
        itemCount: stage.itemIds.length,
      }
    })

    const totalItems = stages.reduce(
      (sum, stage) => sum + stage.itemIds.length,
      0,
    )
    const completedItems = stages.reduce(
      (sum, stage) =>
        sum + stage.itemIds.filter((id) => completed.has(id)).length,
      0,
    )
    const overallPercent =
      totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100)
    const stagesCompleted = stagesWithProgress.filter(
      (stage) => stage.status === 'completed',
    ).length

    const currentStage =
      stagesWithProgress.find(
        (stage) =>
          stage.status === 'in_progress' || stage.status === 'available',
      ) ??
      stagesWithProgress.find((stage) => stage.status === 'locked') ??
      stagesWithProgress[0]

    const nextItemId = currentStage
      ? currentStage.itemIds.find((id) => !completed.has(id))
      : undefined
    const nextItem = nextItemId ? contentById.get(nextItemId) : undefined

    return {
      overallPercent,
      stagesCompleted,
      totalStages: stages.length,
      continueItem:
        currentStage && nextItem
          ? { item: nextItem, stage: currentStage }
          : undefined,
      stages: stagesWithProgress,
    }
  })
}

export async function getProgress(userId: string): Promise<Progress> {
  const stored = readJson<Progress | null>(`nff.progress.${userId}`, null)
  return (
    stored ??
    progressByUser.find((entry) => entry.userId === userId) ?? {
      userId,
      completedItemIds: [],
      positionsSec: {},
      updatedAt: new Date().toISOString(),
    }
  )
}

export function saveProgress(progress: Progress) {
  writeJson(`nff.progress.${progress.userId}`, {
    ...progress,
    updatedAt: new Date().toISOString(),
  })
}
