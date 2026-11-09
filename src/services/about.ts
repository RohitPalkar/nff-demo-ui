import { ApiError, mockApi } from '@/mocks/api'
import { aboutPages } from '@/mocks/about'
import type { AboutPage } from '@/types'

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
