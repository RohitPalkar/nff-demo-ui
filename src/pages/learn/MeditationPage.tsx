import { useLayoutEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { AccessDeniedState } from '@/components/learn/AccessDeniedState'
import { AudioLesson } from '@/components/learn/lesson/AudioLesson'
import { ResourceDetailSections } from '@/components/learn/library/ResourceDetailSections'
import { useAuth } from '@/features/auth/AuthProvider'
import { content } from '@/mocks/db'
import { canAccessResource, isFull } from '@/services/learning/access'
import { getAccessContext } from '@/services/learning/accessContext'
import { getResource } from '@/services/learning/catalogue'
import { pathsUsingItem, relatedResources } from '@/services/learning/library'
import { listMeditations } from '@/services/learning/meditations'
import { loadProgress } from '@/services/learning/progress'
import { LEARN_MEDITATIONS } from '@/services/learning/routes'

const BACK = { backTo: LEARN_MEDITATIONS, backLabel: 'Back to Meditations' }

/**
 * `/learn/meditations/:slug`: one meditation, listened to inside Meditations.
 * The same audio screen and the same single player as lessons and the
 * Library; access is checked here with `canAccessResource`, so a direct URL
 * cannot open anything the learner could not open elsewhere. Opening a
 * meditation never assigns a path or records a completion.
 */
export function MeditationPage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  const item = content.find((entry) => entry.type === 'meditation' && entry.slug === slug)

  const context = useMemo(() => {
    if (!item) return null
    const ctx = getAccessContext(user, { surface: 'learn', withProgress: true })
    const resource = getResource(item.id)
    const decision = resource ? canAccessResource(ctx, resource) : undefined
    if (!decision || !isFull(decision)) return { denied: decision?.reason ?? 'not-found' } as const
    const entries = listMeditations(ctx, ctx.progress ?? loadProgress(user?.id ?? ''))
    return {
      denied: undefined,
      paths: pathsUsingItem(ctx, item.id),
      related: relatedResources(entries, item),
    } as const
  }, [item, user])

  if (!item || item.type !== 'meditation' || !context) return <AccessDeniedState reason="not-found" {...BACK} />
  if (context.denied) return <AccessDeniedState reason={context.denied} {...BACK} />

  return (
    <>
      <AudioLesson key={item.id} item={item} data={null} back={{ href: LEARN_MEDITATIONS, label: 'Meditations' }} />
      <ResourceDetailSections paths={context.paths} related={context.related} relatedTitle="More meditations" />
    </>
  )
}
