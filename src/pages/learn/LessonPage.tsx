import { useQuery } from '@tanstack/react-query'
import { FileQuestion } from 'lucide-react'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { RequireLessonAccess } from '@/app/RequireLessonAccess'
import { AccessDeniedState } from '@/components/learn/AccessDeniedState'
import { AudioLesson } from '@/components/learn/lesson/AudioLesson'
import { BlockLesson } from '@/components/learn/lesson/BlockLesson'
import { ReadingLesson } from '@/components/learn/lesson/ReadingLesson'
import { UnavailableState } from '@/components/nff/UnavailableState'
import { useAuth } from '@/features/auth/AuthProvider'
import { content } from '@/mocks/db'
import { getProgress } from '@/services/content'
import { getAccessContext } from '@/services/learning/accessContext'
import { getLearningCatalogue, getLesson, getModule, itemIdForLesson } from '@/services/learning/catalogue'
import { buildLessonPage } from '@/services/learning/lessonView'
import { isPreviewRole } from '@/services/learning/previewRoles'
import { loadProgress } from '@/services/learning/progress'
import { LEARN_HOME, pathHref } from '@/services/learning/routes'

/**
 * `/learn/paths/:pathSlug/lessons/:lessonId`: one lesson, for every path
 * (Meadow Journey included). Access is checked first by `RequireLessonAccess`.
 * The lesson screen follows the lesson's format; previous/next and the
 * curriculum come from `buildLessonPage`, which recomputes when progress
 * changes so completing a lesson updates what comes next.
 */
export function LessonPage() {
  const { pathSlug = '', lessonId = '' } = useParams()
  const { user } = useAuth()
  const path = getLearningCatalogue().paths.find((entry) => entry.slug === pathSlug)
  const lesson = getLesson(lessonId)
  const module = lesson ? getModule(lesson.moduleId) : undefined
  const itemId = itemIdForLesson(lessonId)

  // Shares the reader's progress query, so a completion refreshes this view.
  const progressQuery = useQuery({
    queryKey: ['progress', user?.id],
    queryFn: () => getProgress(user!.id),
    enabled: Boolean(user),
  })
  const stamp = progressQuery.dataUpdatedAt

  const data = useMemo(() => {
    if (!path) return null
    const ctx = getAccessContext(user, { surface: 'learn', withProgress: true })
    return buildLessonPage(ctx, ctx.progress ?? loadProgress(user?.id ?? ''), path, lessonId, {
      isPreview: isPreviewRole(user?.role),
    })
    // `stamp` makes this recompute when saved progress changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, path, lessonId, stamp])

  if (!path || !lesson || !module || module.pathId !== path.id || !itemId) {
    return <AccessDeniedState reason="not-found" backTo={pathHref()} backLabel="Back to Meadow Journey" />
  }

  const item = content.find((entry) => entry.id === itemId)
  const view = (() => {
    if (!data || !item) return null
    if (lesson.kind === 'reading' && item.type === 'exploration') {
      return <ReadingLesson key={lessonId} item={item} data={data} />
    }
    if (lesson.kind === 'audio' && item.type === 'meditation') {
      return <AudioLesson key={lessonId} item={item} data={data} />
    }
    if (lesson.kind === 'video' || lesson.kind === 'mixed') {
      return <BlockLesson key={lessonId} lesson={lesson} data={data} />
    }
    return null
  })()

  return (
    <RequireLessonAccess lessonId={lessonId}>
      {view ?? (
        <UnavailableState
          icon={FileQuestion}
          title="This lesson is not available"
          description="We could not load it. Nothing is missing on your side."
          trail={[{ label: 'Learn', to: LEARN_HOME }]}
          backTo={pathHref(path.slug)}
          backLabel={`Back to ${path.title}`}
        />
      )}
    </RequireLessonAccess>
  )
}
