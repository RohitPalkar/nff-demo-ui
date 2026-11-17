import { useMemo } from 'react'
import { ContinueLearningCard } from '@/components/learn/home/ContinueLearningCard'
import { HomeEmptyState, HomeSection, HomeSectionHeader } from '@/components/learn/home/homeParts'
import { LearningPathCard } from '@/components/learn/home/LearningPathCard'
import { RecentLearningList, UpNextList } from '@/components/learn/home/LessonList'
import { ResourceCard } from '@/components/learn/home/ResourceCard'
import { WelcomeHeader } from '@/components/learn/home/WelcomeHeader'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePlayer } from '@/features/player/PlayerProvider'
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
  } = home

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-8 sm:px-6 md:gap-12 md:py-12 lg:px-10">
      <WelcomeHeader firstName={home.firstName} intro={home.intro} action={home.action} />

      {/* 1. Continue Learning - Prominent Featured Card */}
      {continueLearning && (
        <HomeSection id="home-continue">
          <HomeSectionHeader id="home-continue" title="Continue learning" />
          <ContinueLearningCard
            entry={continueLearning}
            nowPlaying={track?.id === continueLearning.item.id}
          />
        </HomeSection>
      )}

      {/* 2. My Learning Paths */}
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

      {/* Up Next */}
      {upNext.length > 0 && (
        <HomeSection id="home-up-next">
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

      {/* Recently Accessed */}
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

      {/* Explore the Library */}
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