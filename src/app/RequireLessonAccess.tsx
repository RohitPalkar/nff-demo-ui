import { useMemo, type ReactNode } from 'react'
import { AccessDeniedState } from '@/components/learn/AccessDeniedState'
import { useAuth } from '@/features/auth/AuthProvider'
import { canAccessLesson, isFull } from '@/services/learning/access'
import { getAccessContext } from '@/services/learning/accessContext'
import { getLesson, getModule, getPath } from '@/services/learning/catalogue'
import { moduleHref, pathHref } from '@/services/learning/routes'

/**
 * Route-level access check for a lesson. Runs the central `canAccess` rules
 * before the page renders, so a locked stage or an unassigned path is closed
 * even when someone types the URL directly. Denial is shown in the app, never
 * as a redirect to the public website.
 *
 * Mock, client-side enforcement: see services/learning/access.ts.
 */
export function RequireLessonAccess({
  lessonId,
  children,
}: {
  lessonId: string
  children: ReactNode
}) {
  const { user } = useAuth()

  const outcome = useMemo(() => {
    const lesson = getLesson(lessonId)
    if (!lesson) return null
    const ctx = getAccessContext(user, { surface: 'learn', withProgress: true })
    return { lesson, decision: canAccessLesson(ctx, lesson) }
  }, [user, lessonId])

  if (!outcome) return <AccessDeniedState reason="not-found" backTo={pathHref()} backLabel="Back to Meadow Journey" />

  if (!isFull(outcome.decision)) {
    const module = getModule(outcome.lesson.moduleId)
    const path = module ? getPath(module.pathId) : undefined
    const stageId = module?.legacyStageId
    const locked = outcome.decision.reason === 'locked-module'
    return (
      <AccessDeniedState
        reason={outcome.decision.reason}
        backTo={locked && stageId ? moduleHref(stageId) : pathHref(path?.slug)}
        backLabel={locked && stageId ? 'Back to stage' : `Back to ${path?.title ?? 'Meadow Journey'}`}
        unit={stageId ? 'stage' : 'module'}
      />
    )
  }

  return <>{children}</>
}
