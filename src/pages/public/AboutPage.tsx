import { useQuery } from '@tanstack/react-query'
import { ArrowRight, FileQuestion, ImageOff } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { DetailBreadcrumb } from '@/components/nff/DetailBreadcrumb'
import { ErrorState } from '@/components/nff/ErrorState'
import { UnavailableState } from '@/components/nff/UnavailableState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import { ABOUT_TOPICS, getAboutPage } from '@/services/about'
import type { AboutImage } from '@/types'

const TRAIL = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about/who-we-are' },
]

function AboutFigure({
  image,
  unavailable = false,
}: {
  image: AboutImage
  unavailable?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const showFallback = failed || unavailable

  return (
    <figure className="flex flex-col gap-3">
      {showFallback ? (
        <div
          role="img"
          aria-label="Image unavailable"
          className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border bg-nff-bg-muted text-muted-foreground"
        >
          <ImageOff aria-hidden="true" className="size-6" />
          <span className="nff-body-sm">Image unavailable</span>
        </div>
      ) : (
        <img
          src={image.src}
          alt={image.alt}
          width={1200}
          height={675}
          loading="lazy"
          onError={() => setFailed(true)}
          className="aspect-[16/9] w-full rounded-xl border object-cover"
        />
      )}
      <figcaption className="nff-caption text-muted-foreground">
        {image.caption}
      </figcaption>
    </figure>
  )
}

function AboutNav({ active }: { active: string }) {
  return (
    <nav aria-label="About topics">
      <ul className="flex w-full max-w-full gap-1 overflow-x-auto rounded-lg border bg-nff-bg-muted p-1 sm:w-fit">
        {ABOUT_TOPICS.map((topic) => {
          const isActive = active === topic.slug
          return (
            <li key={topic.slug} className="min-w-0 flex-1 sm:flex-none">
              <Link
                to={`/about/${topic.slug}`}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 w-full items-center justify-center rounded-md px-2 nff-label-md whitespace-nowrap transition-colors nff-focus-ring sm:px-4',
                  isActive
                    ? 'bg-background text-foreground shadow-nff-1'
                    : 'text-muted-foreground hover:bg-nff-bg-hover hover:text-foreground',
                )}
              >
                {topic.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function AboutSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="nff-content pt-6 md:pt-8">
        <span className="nff-visually-hidden">Loading page</span>
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="nff-content py-10 md:py-14">
        <div className="nff-reading flex flex-col gap-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-12 w-full max-w-sm" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      </div>
      <div className="nff-content pb-16">
        <div className="nff-reading mx-auto flex flex-col gap-6">
          <Skeleton className="aspect-[16/9] w-full rounded-xl" />
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function AboutPage() {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  const forceMissingImage = params.get('image') === 'missing'

  const query = useQuery({
    queryKey: ['about', slug],
    queryFn: () => getAboutPage(slug),
    enabled: slug.length > 0,
  })

  if (query.isPending) return <AboutSkeleton />

  if (query.isError) {
    const code = (query.error as { code?: string } | null)?.code
    if (code === 'not_found') {
      return (
        <UnavailableState
          icon={FileQuestion}
          title="We could not find that page"
          description="The link may be broken, or the page may have moved. Start from the beginning of the About section."
          trail={TRAIL}
          backTo="/about/who-we-are"
          backLabel="Back to About"
        />
      )
    }

    return (
      <div>
        <div className="nff-content pt-6 md:pt-8">
          <DetailBreadcrumb trail={TRAIL} current="Unavailable" />
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

  if (!query.data) {
    return (
      <UnavailableState
        icon={FileQuestion}
        title="We could not find that page"
        description="The link may be broken, or the page may have moved. Start from the beginning of the About section."
        trail={TRAIL}
        backTo="/about/who-we-are"
        backLabel="Back to About"
      />
    )
  }

  const page = query.data
  const topicIndex = ABOUT_TOPICS.findIndex(
    (topic) => topic.slug === page.slug,
  )
  const nextTopic = ABOUT_TOPICS[(topicIndex + 1) % ABOUT_TOPICS.length]!
  const image = forceMissingImage
    ? { ...page.image, src: '/images/about/missing.svg' }
    : page.image

  return (
    <div>
      <section className="border-b bg-nff-bg-surface-sunken">
        <div className="nff-content pt-6 md:pt-8">
          <DetailBreadcrumb trail={TRAIL} current={page.title} />
        </div>
        <div className="nff-content py-10 md:py-14">
          <div className="nff-reading flex flex-col gap-4">
            <p className="nff-overline text-nff-text-brand">{page.eyebrow}</p>
            <h1 className="nff-heading-h1 text-foreground">{page.title}</h1>
            <p className="nff-reading-lead text-nff-text-secondary">
              {page.lead}
            </p>
            <p className="nff-caption text-muted-foreground">
              Updated {formatDate(page.updatedAt)}
            </p>
          </div>
        </div>
        <div className="nff-content pb-6">
          <AboutNav active={page.slug} />
        </div>
      </section>

      <article className="nff-content py-12 md:py-16">
        <div className="nff-reading mx-auto flex flex-col gap-10">
          <AboutFigure
            key={image.src}
            image={image}
            unavailable={forceMissingImage}
          />

          {page.sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-4">
              <h2 className="nff-heading-h2 text-foreground">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="nff-reading-body text-nff-text-secondary"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>

      <section
        aria-labelledby="next-topic-heading"
        className="border-t bg-nff-bg-surface-sunken nff-section-gap"
      >
        <div className="nff-content">
          <div className="nff-reading mx-auto flex flex-col gap-6">
            <p id="next-topic-heading" className="nff-overline text-nff-text-brand">
              Next topic
            </p>
            <Link
              to={`/about/${nextTopic.slug}`}
              className="group flex items-start justify-between gap-4 rounded-xl border bg-card p-6 shadow-nff-1 transition-shadow duration-150 hover:shadow-nff-2 nff-focus-ring"
            >
              <div className="flex flex-col gap-1">
                <span className="nff-heading-h3 text-foreground">
                  {nextTopic.label}
                </span>
                <span className="nff-body-sm text-muted-foreground">
                  Continue the About section.
                </span>
              </div>
              <ArrowRight
                aria-hidden="true"
                className="mt-1 size-5 shrink-0 text-nff-icon-brand transition-transform duration-150 group-hover:translate-x-0.5"
              />
            </Link>
            <div>
              <Button asChild className="h-11">
                <Link to="/explorations">
                  Explore the library
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
