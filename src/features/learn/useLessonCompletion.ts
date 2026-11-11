import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useLearnerMode } from '@/features/learn/useLearnerMode'
import { getProgress, saveProgress } from '@/services/content'

/**
 * Completion of one or more items, through the one existing path
 * (`saveProgress`, which feeds the progress service). Completion is recorded
 * per item, so a lesson in any path that uses the item counts as done.
 *
 * Opening a lesson never completes it: only `complete()` does, and it does
 * nothing for staff in preview.
 */
export function useLessonCompletion(itemIds: string[]) {
  const { user } = useAuth()
  const { isPreview } = useLearnerMode()
  const queryClient = useQueryClient()
  const [justCompleted, setJustCompleted] = useState(false)

  const query = useQuery({
    queryKey: ['progress', user?.id],
    queryFn: () => getProgress(user!.id),
    enabled: Boolean(user),
  })
  const progress = query.data
  const completed = progress ? itemIds.every((id) => progress.completedItemIds.includes(id)) : false

  function complete() {
    if (!progress || !user || completed || isPreview) return
    saveProgress({
      ...progress,
      completedItemIds: [...new Set([...progress.completedItemIds, ...itemIds])],
      inProgressItemId: itemIds.includes(progress.inProgressItemId ?? '')
        ? undefined
        : progress.inProgressItemId,
    })
    setJustCompleted(true)
    void queryClient.invalidateQueries({ queryKey: ['progress'] })
    void queryClient.invalidateQueries({ queryKey: ['journey'] })
    void queryClient.invalidateQueries({ queryKey: ['stage'] })
  }

  return { ready: !query.isPending, completed, justCompleted, complete, isPreview, progress }
}
