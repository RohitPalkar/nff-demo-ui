import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CurriculumSection } from '@/components/learn/path/CurriculumSection'
import { LearningPathHeader, LearningPathProgress } from '@/components/learn/path/PathHeader'
import { useAuth } from '@/features/auth/AuthProvider'
import { getAccessContext } from '@/services/learning/accessContext'
import { buildPathPage } from '@/services/learning/pathPage'
import { loadProgress } from '@/services/learning/progress'
import { isPreviewRole } from '@/services/learning/previewRoles'
import type { LearningPath } from '@/types'

/**
 * `/learn/paths/:pathSlug`, for every path including Meadow Journey. All
 * rules (progress, next lesson, locks, lesson access) come from
 * `services/learning/pathPage.ts`; this page lays them out. The curriculum
 * opens on the module the learner is in, or on `?module=` when a link names one.
 */
export function PathOverviewPage({ path }: { path: LearningPath }) {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const requested = params.get('module')

  const data = useMemo(() => {
    const ctx = getAccessContext(user, { surface: 'learn', withProgress: true })
    return buildPathPage(ctx, ctx.progress ?? loadProgress(user?.id ?? ''), path, {
      isPreview: isPreviewRole(user?.role),
    })
  }, [user, path])

  const [open, setOpen] = useState<string[]>(() =>
    requested && data.modules.some((module) => module.id === requested) ? [requested] : data.defaultOpen,
  )

  const reviewCurriculum = () => {
    const heading = document.getElementById('curriculum-heading')
    heading?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    heading?.focus({ preventScroll: true })
  }

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-8 px-4 py-8 sm:px-6 md:gap-10 md:py-12 lg:px-10">
      <LearningPathHeader data={data} />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
        <div className="lg:order-last lg:sticky lg:top-[calc(var(--nff-layout-header-height,64px)+24px)]">
          <LearningPathProgress data={data} onReview={reviewCurriculum} />
        </div>
        <CurriculumSection modules={data.modules} open={open} onOpenChange={setOpen} />
      </div>
    </div>
  )
}
