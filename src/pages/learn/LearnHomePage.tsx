import { useMemo } from 'react'
import { ContinueLearningCard } from '@/components/learn/home/ContinueLearningCard'
import { HomeEmptyState, HomeSection, HomeSectionHeader } from '@/components/learn/home/homeParts'
import { LearningPathCard } from '@/components/learn/home/LearningPathCard'
import { RecentLearningList, UpNextList } from '@/components/learn/home/LessonList'
import { ResourceCard } from '@/components/learn/home/ResourceCard'
import { WelcomeHeader } from '@/components/learn/home/WelcomeHeader'
import { AnalyticsSidebar } from '@/components/learn/analytics'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePlayer } from '@/features/player/PlayerProvider'
import { cn } from '@/lib/utils'
import { getAccessContext } from '@/services/learning/accessContext'
import { buildLearnerHome } from '@/services/learning/home'
import { loadProgress } from '@/services/learning/progress'
import { LEARN_MY_LEARNING } from '@/services/learning/routes'

/**
 * Practitioner Home. All rules (what to resume, what to suggest, what counts)
 * live in `services/learning/home.ts`; this page only lays them out. Sections
 * with no real data are left out or show an empty state.
 */
/** Paths shown on Home; the rest are one click away in My Learning. */
const HOME_PATH_LIMIT = 3

export function LearnHomePage() {
  const { user } = useAuth()
  const { track } = usePlayer()

  const home = useMemo(() => {
    if (!user) return null
    const ctx = getAccessContext(user, { surface: 'learn', withProgress: true })
    return buildLearnerHome(user, ctx, ctx.progress ?? loadProgress(user.id))
  }, [user])

  if (!home) return null
  const {
    continueLearning,
    assigned,
    upNext,
    recent,
    explore,
    isPreview,
    progressOverview,
    weeklyActivity,
    learningStreak,
    learningTimeSeries,
  } = home

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-8 sm:px-6 md:gap-12 md:py-12 lg:px-10">
      <WelcomeHeader firstName={home.firstName} intro={home.intro} action={home.action} />

      <div className="grid gap-10 md:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Main Content Column */}
        <div className="flex min-w-0 flex-col gap-10 md:gap-12">
          {continueLearning && (
            <HomeSection id="home-continue">
              <HomeSectionHeader id="home-continue" title="Continue learning" />
              <ContinueLearningCard
                entry={continueLearning}
                nowPlaying={track?.id === continueLearning.item.id}
              />
            </HomeSection>
          )}

          <HomeSection id="home-assigned">
            <HomeSectionHeader
              id="home-assigned"
              title={isPreview ? 'Learning paths' : 'My assigned learning'}
              description={
                assigned.length > HOME_PATH_LIMIT
                  ? `Showing ${HOME_PATH_LIMIT} of ${assigned.length}, the ones in progress first.`
                  : undefined
              }
              link={
                assigned.length > 0
                  ? {
                      label: assigned.length > HOME_PATH_LIMIT ? `View all ${assigned.length}` : 'My Learning',
                      to: LEARN_MY_LEARNING,
                    }
                  : undefined
              }
            />
            {assigned.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {assigned.slice(0, HOME_PATH_LIMIT).map((entry) => (
                  <li key={entry.path.id}>
                    <LearningPathCard entry={entry} />
                  </li>
                ))}
              </ul>
            ) : (
              <HomeEmptyState
                title="Nothing assigned yet"
                description="When a learning path is assigned to you, it will appear here."
                action={{ label: 'Browse the library', to: home.libraryHref }}
              />
            )}
          </HomeSection>

          {(upNext.length > 0 || !isPreview) && (
            <div
              className={cn(
                'grid min-w-0 gap-10 lg:grid-cols-1 lg:gap-12',
                upNext.length > 0 && !isPreview && 'md:grid-cols-2 md:gap-6',
              )}
            >
              {upNext.length > 0 && (
                <HomeSection id="home-up-next" className="rounded-2xl bg-[var(--nff-bg-brand-subtle)] p-6 sm:p-8">
                  <HomeSectionHeader
                    id="home-up-next"
                    title="Up next"
                    description={
                      assigned.length > 1
                        ? 'Your next lessons across all paths, in order.'
                        : 'The next lessons you have not finished, in path order.'
                    }
                  />
                  <UpNextList items={upNext} />
                </HomeSection>
              )}

              {!isPreview && (
                <HomeSection id="home-recent">
                  <HomeSectionHeader id="home-recent" title="Recently accessed" />
                  {recent.length > 0 ? (
                    <RecentLearningList items={recent} />
                  ) : (
                    <HomeEmptyState
                      title="Nothing yet"
                      description="Lessons you start or finish will be listed here."
                    />
                  )}
                </HomeSection>
              )}
            </div>
          )}
        </div>

        {/* Analytics Sidebar */}
        <aside className="lg:self-start lg:sticky lg:top-24">
          <AnalyticsSidebar
            progressOverview={progressOverview}
            weeklyActivity={weeklyActivity}
            learningStreak={learningStreak}
            learningTimeSeries={learningTimeSeries}
          />
        </aside>
      </div>

      <HomeSection id="home-explore">
        <HomeSectionHeader
          id="home-explore"
          title="Explore the library"
          description="Featured articles and audio you can open any time."
          link={{ label: 'Browse the library', to: home.libraryHref }}
        />
        {explore.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {explore.map((resource) => (
              <li key={resource.item.id}>
                <ResourceCard resource={resource} />
              </li>
            ))}
          </ul>
        ) : (
          <HomeEmptyState
            title="Nothing featured right now"
            description="Everything you can open is in the library."
            action={{ label: 'Browse the library', to: home.libraryHref }}
          />
        )}
      </HomeSection>
    </div>
  )
}
