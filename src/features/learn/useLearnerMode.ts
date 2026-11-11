import { useAuth } from '@/features/auth/AuthProvider'
import { isPreviewRole } from '@/services/learning/previewRoles'

/**
 * Whether the signed-in person is a practitioner or staff previewing the
 * learner area. Preview is read-only; the services enforce that too.
 */
export function useLearnerMode() {
  const { user } = useAuth()
  return { isPreview: isPreviewRole(user?.role) }
}
