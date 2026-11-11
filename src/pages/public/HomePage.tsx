import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { ErrorState } from '@/components/nff/ErrorState'
import { HomeFeatured } from '@/components/nff/HomeFeatured'
import { HomeHero } from '@/components/nff/HomeHero'
import { HomeHowItWorks } from '@/components/nff/HomeHowItWorks'
import { HomeIntro } from '@/components/nff/HomeIntro'
import { HomeLibrary } from '@/components/nff/HomeLibrary'
import { HomeVideo } from '@/components/nff/HomeVideo'
import { LoadingState } from '@/components/nff/LoadingState'
import { AccountRegistrationCTA } from '@/components/nff/AccountRegistrationCTA'
import { Skeleton } from '@/components/ui/skeleton'
import { getHomeContent } from '@/services/content'

/** Placeholder for the data-driven sections; the hero never waits for data. */
function HomeSkeleton() {
  return (
    <div>
      <section className="nff-section-gap">
        <div className="nff-content flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-72" />
          </div>
          <LoadingState />
        </div>
      </section>
    </div>
  )
}

export function HomePage() {
  return (
    <div>
      <HomeHero />
      <HomeIntro />
      <HomeVideo />
      <HomeSections />
    </div>
  )
}

function HomeSections() {
  const [params, setParams] = useSearchParams()
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['home'],
    queryFn: getHomeContent,
  })

  if (isPending) return <HomeSkeleton />

  if (isError) {
    return (
      <div className="nff-content py-16 md:py-24">
        <ErrorState
          title="We could not load the home page"
          description="The library did not arrive. Check your connection and try again."
          onRetry={() => {
            void refetch()
          }}
        />
      </div>
    )
  }

  const tabs = data.tabs
  const requested = params.get('tab')
  const activeTab =
    tabs.find((tab) => tab.key === requested)?.key ??
    tabs[0]?.key ??
    'foundations'

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(params)
    next.set('tab', value)
    setParams(next, { replace: true })
  }

  return (
    <>
      <HomeLibrary
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <HomeFeatured items={data.featured} />

      <HomeHowItWorks />

      <AccountRegistrationCTA id="begin" />
    </>
  )
}
