import { ApiError, mockApi } from '@/mocks/api'
import { aboutPages } from '@/mocks/about'
import { stages } from '@/mocks/db'
import type { AboutPage, Stage } from '@/types'

export { ABOUT_TOPICS } from '@/mocks/about'

export async function getAboutPage(slug: string): Promise<AboutPage> {
  return mockApi(() => {
    const page = aboutPages.find((entry) => entry.slug === slug)
    if (!page) {
      throw new ApiError('not_found', 'We could not find that page.', 404)
    }
    return page
  })
}

export interface AboutContent {
  /** Who we are, What we do and How we do it, in that order. */
  pages: AboutPage[]
  /** The six journey stages, in order, for the How we do it section. */
  stages: Array<Pick<Stage, 'id' | 'number' | 'title' | 'description'>>
}

/** Everything the single About page shows, in one request. */
export async function getAboutContent(): Promise<AboutContent> {
  return mockApi(() => ({
    pages: aboutPages,
    stages: [...stages]
      .sort((a, b) => a.number - b.number)
      .map(({ id, number, title, description }) => ({ id, number, title, description })),
  }))
}
