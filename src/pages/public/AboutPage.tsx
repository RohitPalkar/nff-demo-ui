import { useQuery } from '@tanstack/react-query'
import { FileQuestion } from 'lucide-react'
import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AccountRegistrationCTA } from '@/components/nff/AccountRegistrationCTA'
import { AboutHero } from '@/components/nff/about/AboutHero'
import { AboutPractice } from '@/components/nff/about/AboutPractice'
import { AboutBrandStatement } from '@/components/nff/about/AboutBrandStatement'
import { AboutWhyMeadow } from '@/components/nff/about/AboutWhyMeadow'
import { AboutPeople } from '@/components/nff/about/AboutPeople'
import { AboutWhatWeDo } from '@/components/nff/about/AboutWhatWeDoNew'
import { AboutHowWeDoIt } from '@/components/nff/about/AboutHowWeDoItNew'
import { AboutCta } from '@/components/nff/about/AboutCta'
import { DetailBreadcrumb } from '@/components/nff/DetailBreadcrumb'
import { ErrorState } from '@/components/nff/ErrorState'
import { UnavailableState } from '@/components/nff/UnavailableState'
import { Skeleton } from '@/components/ui/skeleton'
import { ABOUT_TOPICS, getAboutContent } from '@/services/about'

const TRAIL = [{ label: 'Home', to: '/' }]

function AboutSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="px-2 sm:px-3">
      <div className="mx-auto max-w-[1440px] px-6 pt-6 sm:px-10 md:pt-8 lg:px-14">
        <span className="nff-visually-hidden">Loading page</span>
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-10 pt-12 md:pt-16 lg:grid-cols-2 lg:pt-20">
          <div className="flex flex-col gap-5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-16 w-full max-w-md" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-3/5" />
          </div>
        </div>
        <Skeleton className="mt-12 aspect-[4/3] w-full rounded-[24px] sm:aspect-[16/9] md:mt-16 lg:aspect-[12/5]" />
      </div>
    </div>
  )
}

/**
 * About (S-WEB-04): one continuous page — Who we are, What we do, How we do
 * it — then the registration panel. `/about` opens at the top; the older
 * `/about/:slug` links (footer, home intro) open the same page at that part.
 * `?image=missing` previews the image fallbacks.
 */
export function AboutPage() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const forceMissingImage = params.get('image') === 'missing'
  const knownSlug = !slug || ABOUT_TOPICS.some((topic) => topic.slug === slug)

  const query = useQuery({
    queryKey: ['about', 'all'],
    queryFn: getAboutContent,
    enabled: knownSlug,
  })
  const ready = Boolean(query.data)

  // Arriving on /about/<part>: open at that part. Otherwise start at the top.
  useEffect(() => {
    if (!ready) return
    const target = slug && slug !== ABOUT_TOPICS[0]?.slug ? document.getElementById(slug) : null
    if (target) target.scrollIntoView({ block: 'start' })
    else window.scrollTo({ top: 0 })
  }, [ready, slug])

  if (!knownSlug) {
    return (
      <UnavailableState
        icon={FileQuestion}
        title="We could not find that page"
        description="The link may be broken, or the page may have moved. Start from the beginning of the About section."
        trail={TRAIL}
        backTo="/about"
        backLabel="Back to About"
      />
    )
  }

  if (query.isPending) return <AboutSkeleton />

  if (query.isError || !query.data) {
    return (
      <div>
        <div className="nff-content pt-6 md:pt-8">
          <DetailBreadcrumb trail={TRAIL} current="About" />
        </div>
        <div className="nff-content py-16">
          <h1 className="sr-only">Page unavailable</h1>
          <div className="nff-reading mx-auto">
            <ErrorState
              title="We could not load this page"
              description="The page did not arrive. Check your connection and try again."
              onRetry={() => {
                void query.refetch()
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  const { pages, stages } = query.data
  const [who, what, how] = ABOUT_TOPICS.map((topic) =>
    pages.find((page) => page.slug === topic.slug),
  )

  return (
    <div>
      {who && (
        <>
          <AboutHero page={who} forceMissingImage={forceMissingImage} />
          {/* "A practice, not a promise" section */}
          {who.sections[0] && (
            <AboutPractice section={who.sections[0]} />
          )}
          {/* Brand statement / pull quote */}
          <AboutBrandStatement section={who.sections[0]} />
          {/* Why Meadow section */}
          {who.sections[1] && (
            <AboutWhyMeadow section={who.sections[1]} eyebrow={who.title} />
          )}
          {/* The People Behind It */}
          {who.sections[2] && (
            <AboutPeople section={who.sections[2]} eyebrow={who.title} />
          )}
        </>
      )}
      {what && <AboutWhatWeDo page={what} />}
      {how && (
        <AboutHowWeDoIt page={how} stages={stages} forceMissingImage={forceMissingImage} />
      )}
      <AboutCta />
      <AccountRegistrationCTA />
    </div>
  )
}
