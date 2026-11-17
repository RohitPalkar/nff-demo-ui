'use client'

import { useMemo } from 'react'
import { FeaturedResumeCard } from '@/components/learn/home/FeaturedResumeCard'
import { HomeEmptyState, HomeSection, HomeSectionHeader, LeafDivider } from '@/components/learn/home/homeParts'
import { LearningPathCardNew } from '@/components/learn/home/LearningPathCardNew'
import { UpNextListNew } from '@/components/learn/home/UpNextListNew'
import { ResourceCardNew } from '@/components/learn/home/ResourceCardNew'
import { WelcomeHeaderNew } from '@/components/learn/home/WelcomeHeaderNew'
import { CompactAnalyticsSidebar } from '@/components/learn/analytics/CompactAnalyticsSidebar'
import { useAuth } from '@/features/auth/AuthProvider'
import { usePlayer } from '@/features/player/PlayerProvider'
import { formatDate } from '@/lib/format'
import { getAccessContext } from '@/services/learning/accessContext'
import { buildLearnerHome } from '@/services/learning/home'
import { loadProgress } from '@/services/learning/progress'
import { LEARN_MY_LEARNING, LEARN_LIBRARY } from '@/services/learning/routes'

/**
 * Practitioner Home - Redesigned.
 * Hierarchy:
 * 1. Welcome - compact greeting with contextual subtitle
 * 2. Continue Learning - prominent featured resume card
 * 3. My Learning Paths - compact path cards with progress
 * 4. Up Next - three recommended lessons
 * 5. Explore Library - three curated resources with browse action
 * 6. Recently Accessed - only if provides unique value
 *
 * Layout: 8/4 column split on desktop, single column on mobile.
 * Primary learning action above the fold.
 * Calm, editorial design with subtle botanical personality.
 */
const HOME_PATH_LIMIT = 3

export function LearnHomePageNew() {
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

  // Filter explore to avoid duplicates with continueLearning/upNext
  const continueIds = new Set(continueLearning ? [continueLearning.item.id] : [])
  const upNextIds = new Set(upNext.map((u) => u.item.id))
  const filteredExplore = explore.filter((r) => !continueIds.has(r.item.id) && !upNextIds.has(r.item.id)).slice(0, 3)

  // Only show recently accessed if it provides unique info not in continue/upNext
  const uniqueRecent = recent.filter((r) => !continueIds.has(r.item.id) && !upNextIds.has(r.item.id))
  const showRecent = !isPreview && uniqueRecent.length > 0

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 py-6 sm:px-6 md:gap-10 md:py-8 lg:px-8">
      {/* Welcome Section - Compact greeting */}
      <WelcomeHeaderNew firstName={home.firstName} action={home.action} />

      <div className="grid gap-8 md:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main Content Column - 8 columns */}
        <div className="flex min-w-0 flex-col gap-8 md:gap-10">
          {/* 1. Continue Learning - Prominent Featured Card */}
          {continueLearning && (
            <HomeSection id="home-continue">
              <HomeSectionHeader id="home-continue" title="Continue learning" />
              <FeaturedResumeCard
                entry={continueLearning}
                nowPlaying={track?.id === continueLearning.item.id}
              />
            </HomeSection>
          )}

          {/* 2. My Learning Paths - Compact Cards */}
          <HomeSection id="home-assigned">
            <HomeSectionHeader
              id="home-assigned"
              title={isPreview ? 'Learning paths' : 'My learning paths'}
              description={
                assigned.length > HOME_PATH_LIMIT
                  ? `Showing ${HOME_PATH_LIMIT} of ${assigned.length}, active paths first.`
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
              <ul className="flex flex-col gap-3">
                {assigned.slice(0, HOME_PATH_LIMIT).map((entry) => (
                  <li key={entry.path.id}>
                    <LearningPathCardNew entry={entry} />
                  </li>
                ))}
              </ul>
            ) : (
              <HomeEmptyState
                title="No learning paths yet"
                description="When a learning path is assigned to you, it will appear here."
                action={{ label: 'Browse the library', to: home.libraryHref }}
              />
            )}
          </HomeSection>

          {/* 3. Up Next - Three Recommended Lessons */}
          {upNext.length > 0 && (
            <HomeSection id="home-up-next">
              <HomeSectionHeader
                id="home-up-next"
                title="Up next"
                description={
                  assigned.length > 1
                    ? 'Your next lessons across active paths, in order.'
                    : 'The next lessons waiting for you.'
                }
              />
              <UpNextListNew items={upNext} />
            </HomeSection>
          )}

          {/* 4. Recently Accessed - Only if unique value */}
          {showRecent && (
            <HomeSection id="home-recent">
              <HomeSectionHeader id="home-recent" title="Recently accessed" />
              <ul className="rounded-lg border border-[var(--nff-border-default)] overflow-hidden bg-white" role="list">
                {uniqueRecent.slice(0, 3).map((entry) => (
                  <li key={entry.lessonId}>
                    <a
                      href={entry.href}
                      className="flex items-center gap-3 p-3 transition-colors hover:bg-[var(--nff-sage-50)]"
                    >
                      <div className="size-12 shrink-0 rounded-sm bg-[var(--nff-sage-100)]" aria-hidden="true" />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="nff-caption text-[var(--nff-text-secondary)]">{entry.moduleLabel}</p>
                        <p className="nff-label-md text-foreground line-clamp-1">{entry.item.title}</p>
                        <p className="nff-caption text-[var(--nff-text-secondary)]">
                          {entry.kind === 'completed' ? 'Completed' : entry.kind === 'listened' ? 'Listened' : 'Opened'} {formatDate(entry.at)}
                        </p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </HomeSection>
          )}

          {/* Botanical divider between main sections */}
          <LeafDivider />
        </div>

        {/* Sidebar - 4 columns - Compact Analytics */}
        <aside className="lg:self-start lg:sticky lg:top-24">
          <CompactAnalyticsSidebar
            progressOverview={progressOverview}
            weeklyActivity={weeklyActivity}
            learningStreak={learningStreak}
            learningTimeSeries={learningTimeSeries}
            progressHref="/learn/progress"
          />
        </aside>
      </div>

      {/* 5. Explore the Library - Three Curated Resources */}
      <HomeSection id="home-explore">
        <HomeSectionHeader
          id="home-explore"
          title="Explore the library"
          description="Featured articles and audio you can open any time."
          link={{ label: 'Browse library', to: LEARN_LIBRARY }}
        />
        {filteredExplore.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {filteredExplore.map((resource) => (
              <li key={resource.item.id}>
                <ResourceCardNew resource={resource} />
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

      {/* Warm closing note */}
      <div className="text-center py-8">
        <p className="nff-body-sm text-[var(--nff-text-tertiary)] max-w-xl mx-auto">
          There&apos;s no rush. Your practice waits for you, whenever you&apos;re ready.
        </p>
      </div>
    </div>
  )
}