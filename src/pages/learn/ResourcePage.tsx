import { Headphones, Video } from 'lucide-react'
import { useLayoutEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { AccessDeniedState } from '@/components/learn/AccessDeniedState'
import { ResourceDetailSections } from '@/components/learn/library/ResourceDetailSections'
import { UnavailableState } from '@/components/nff/UnavailableState'
import { useAuth } from '@/features/auth/AuthProvider'
import { content } from '@/mocks/db'
import { AudioLesson } from '@/components/learn/lesson/AudioLesson'
import { ReadingLesson } from '@/components/learn/lesson/ReadingLesson'
import { canAccessResource, isFull } from '@/services/learning/access'
import { getAccessContext } from '@/services/learning/accessContext'
import { getResource } from '@/services/learning/catalogue'
import {
  listLibraryResources,
  pathsUsingItem,
  relatedResources,
} from '@/services/learning/library'
import { LEARN_LIBRARY } from '@/services/learning/routes'

const TYPE_TO_CONTENT = { article: 'exploration', audio: 'meditation' } as const
const BACK = { backTo: LEARN_LIBRARY, backLabel: 'Back to Library' }
const TRAIL = [{ label: 'Library', to: LEARN_LIBRARY }]

/**
 * `/learn/library/:type/:slug`: a library resource, opened inside the shell.
 * Access is checked here, on the direct route, whatever linked to it. The
 * article reader and audio player are the same screens lessons use, with
 * Library navigation instead of a path's.
 */
export function ResourcePage() {
  const { type = '', slug = '' } = useParams()
  const { user } = useAuth()

  // Start each resource at the top, not at the Library's scroll position. A
  // layout effect, so a video returning from the mini-player (which scrolls
  // itself into view in a later, passive effect) still wins.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [type, slug])

  const contentType = TYPE_TO_CONTENT[type as keyof typeof TYPE_TO_CONTENT]
  const item = contentType
    ? content.find((entry) => entry.type === contentType && entry.slug === slug)
    : undefined

  const context = useMemo(() => {
    if (!item) return null
    const ctx = getAccessContext(user, { surface: 'learn' })
    const resource = getResource(item.id)
    const decision = resource ? canAccessResource(ctx, resource) : undefined
    if (!decision || !isFull(decision)) return { denied: decision?.reason ?? 'not-found' } as const
    const library = listLibraryResources(ctx)
    return {
      denied: undefined,
      paths: pathsUsingItem(ctx, item.id),
      related: relatedResources(library, item),
    } as const
  }, [item, user])

  if (type === 'video' || type === 'mixed') {
    return (
      <UnavailableState
        icon={Video}
        title="This is not available yet"
        description="Video and mixed-media resources are coming. Nothing is missing on your side."
        trail={TRAIL}
        {...BACK}
      />
    )
  }

  if (!item || !context) return <AccessDeniedState reason="not-found" {...BACK} />
  if (context.denied) return <AccessDeniedState reason={context.denied} {...BACK} />

  if (item.type === 'meditation' && item.transcode !== 'ready') {
    const failed = item.transcode === 'failed'
    return (
      <UnavailableState
        icon={Headphones}
        title={failed ? 'This audio is unavailable' : 'This audio is not ready yet'}
        description={
          failed
            ? 'We could not prepare the audio for this track. Browse another resource in the meantime.'
            : 'The audio is still being prepared. Try again in a few minutes, or browse another resource.'
        }
        trail={TRAIL}
        {...BACK}
      />
    )
  }

  return (
    <>
      {item.type === 'exploration' ? (
        <ReadingLesson key={item.id} item={item} data={null} />
      ) : (
        <AudioLesson key={item.id} item={item} data={null} />
      )}
      <ResourceDetailSections paths={context.paths} related={context.related} />
    </>
  )
}
