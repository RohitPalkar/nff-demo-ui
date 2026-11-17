import { useQuery } from '@tanstack/react-query'
import { BookOpen, CheckCircle2, Eye } from 'lucide-react'
import { useState } from 'react'
import { HomeEmptyState, HomeSection, HomeSectionHeader } from '@/components/learn/home/homeParts'
import {
  ActivityTimeline,
  LearningHistory,
  PathProgressCard,
  ProgressOverview,
} from '@/components/learn/progress/ProgressParts'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { getAccessContext } from '@/services/learning/accessContext'
import { isPreviewRole } from '@/services/learning/previewRoles'
import { emptyStore, loadProgress } from '@/services/learning/progress'
import { buildProgressPage } from '@/services/learning/progressPage'
import { LEARN_LIBRARY, LEARN_MY_LEARNING } from '@/services/learning/routes'

const HISTORY_LIMIT = 8

/**
 * `/learn/progress`: what the learner has completed and where they are, from
 * their own record. The rules live in `services/learning/progressPage.ts`,
 * which uses the same services as Home and My Learning, so the numbers agree.
 */
export function LearnProgressPage() {
  const { user } = useAuth()
  const isPreview = isPreviewRole(user?.role)
  const [showAllHistory, setShowAllHistory] = useState(false)

  // Synchronous today (localStorage); a query so a backend can slot in.
  const query = useQuery({
    queryKey: ['learn-progress', user?.id],
    queryFn: () => {
      const ctx = getAccessContext(user, { surface: 'learn', withProgress: true })
      // Staff in preview never see a record, theirs or anyone's.
      const store = isPreview
        ? emptyStore(user!.id, new Date().toISOString())
        : (ctx.progress ?? loadProgress(user!.id))
      return buildProgressPage(ctx, store, { isPreview })
    },
    enabled: Boolean(user),
    staleTime: 0,
  })
  const data = query.data

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-8 sm:px-6 md:gap-12 md:py-12 lg:px-10">
      <header className="flex flex-col gap-2">
        <h1 className="nff-heading-h1 text-foreground">Your Progress</h1>
        <p className="max-w-2xl nff-body-lg text-nff-text-secondary">
          {isPreview
            ? 'How a practitioner sees their progress, shown here without anyone’s record.'
            : 'Where you are in each learning path, and the lessons you have completed.'}
        </p>
      </header>

      {isPreview && (
        <p
          role="note"
          className="flex items-start gap-3 rounded-lg border border-nff-border-default bg-nff-bg-surface p-4 nff-body-sm text-nff-text-secondary"
        >
          <Eye aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-nff-text-brand" />
          Preview mode. Progress belongs to each learner, so none is shown, and nothing you open here is
          recorded.
        </p>
      )}

      {query.isPending || !data ? (
        <div aria-busy="true" aria-label="Loading your progress" className="flex flex-col gap-6">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ) : (
        <>
          {!data.isPreview && data.paths.length > 0 && (
            <HomeSection id="progress-overview">
              <HomeSectionHeader
                id="progress-overview"
                title="Overview"
                description="Across your assigned learning paths. A lesson in more than one path is counted once."
              />
              <ProgressOverview overview={data.overview} />
            </HomeSection>
          )}

          <HomeSection id="progress-paths">
            <HomeSectionHeader
              id="progress-paths"
              title={data.isPreview ? 'Learning paths' : 'Your learning paths'}
              link={data.paths.length > 0 ? { label: 'My Learning', to: LEARN_MY_LEARNING } : undefined}
            />
            {data.paths.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {data.paths.map((entry) => (
                  <li key={entry.item.path.id}>
                    <PathProgressCard entry={entry} preview={data.isPreview} />
                  </li>
                ))}
              </ul>
            ) : (
              <HomeEmptyState
                icon={BookOpen}
                title="No learning assigned yet"
                description="When a learning path is assigned to you, your progress through it appears here."
                action={{ label: 'Browse the library', to: LEARN_LIBRARY }}
              />
            )}
          </HomeSection>

          {!data.isPreview && (
            // Wide list of completed lessons beside a narrow, sticky activity
            // timeline, so neither column leaves a large empty area.
            <div className="grid items-start gap-10 md:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:gap-10">
              <HomeSection id="progress-history">
                <HomeSectionHeader
                  id="progress-history"
                  title="Completed lessons"
                  description="Grouped by stage, or newest first."
                />
                {data.history.dated.length + data.history.undated.length > 0 ? (
                  <LearningHistory
                    dated={data.history.dated}
                    undated={data.history.undated}
                    limit={showAllHistory ? Number.MAX_SAFE_INTEGER : HISTORY_LIMIT}
                    onShowAll={() => setShowAllHistory(true)}
                  />
                ) : (
                  <HomeEmptyState
                    icon={CheckCircle2}
                    title="No completed lessons yet"
                    description="Lessons you mark complete are listed here."
                    action={{ label: 'Go to My Learning', to: LEARN_MY_LEARNING }}
                  />
                )}
              </HomeSection>

              <HomeSection
                id="progress-activity"
                className="rounded-lg border border-nff-border-default bg-nff-bg-surface p-5 lg:sticky lg:top-24"
              >
                <HomeSectionHeader
                  id="progress-activity"
                  title="Recent activity"
                  description="Lessons you started or completed, as they happened."
                />
                {data.timeline.length > 0 ? (
                  <ActivityTimeline events={data.timeline} />
                ) : (
                  <p className="nff-body-sm text-nff-text-secondary">
                    No activity recorded yet. When you start or complete a lesson, it appears here with the time it
                    happened.
                  </p>
                )}
              </HomeSection>
            </div>
          )}

          <section
            aria-labelledby="progress-about"
            className="flex max-w-3xl flex-col gap-2 border-l-2 border-[var(--nff-sage-300)] pl-4"
          >
            <h2 id="progress-about" className="nff-label-md text-foreground">
              How progress is counted
            </h2>
            <p className="nff-body-sm text-nff-text-secondary">
              A lesson counts once it is complete: an article when you mark it complete, audio when you reach the end. Completions made before dates were recorded show
              without one. Time spent is not shown: the audio in this demo is a placeholder, so listening time
              would not be real. Progress is saved in this browser only.
            </p>
          </section>
        </>
      )}
    </div>
  )
}
