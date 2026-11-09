import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Check,
  Compass,
  PlayCircle,
  Route,
  Sparkles,
  UserPlus,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ContentCard } from '@/components/nff/ContentCard'
import { EmptyState } from '@/components/nff/EmptyState'
import { ErrorState } from '@/components/nff/ErrorState'
import { LoadingState } from '@/components/nff/LoadingState'
import { SectionHeading } from '@/components/nff/SectionHeading'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BRAND } from '@/config/brand'
import { getHomeContent, getStageTitle } from '@/services/content'
import type { ContentItem, HomeTab } from '@/types'

const STEPS = [
  {
    icon: PlayCircle,
    title: 'Preview for free',
    description:
      'Try a guided meditation and read the opening explorations. No account needed.',
  },
  {
    icon: UserPlus,
    title: 'Create your free account',
    description:
      'Unlock the full library, keep your progress and choose your daily email.',
  },
  {
    icon: Route,
    title: 'Follow the stages',
    description:
      'Move through six gentle stages at your own pace. Each one opens the next.',
  },
]

const BENEFITS = [
  'The full library of explorations and meditations',
  'Progress that resumes on any device',
  'A daily email timed to your morning',
]

function CardGrid({ items, locked = false }: { items: ContentItem[]; locked?: boolean }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <ContentCard
          key={item.id}
          item={item}
          stageLabel={getStageTitle(item.stageId)}
          locked={locked}
        />
      ))}
    </div>
  )
}

function TabPanel({ tab }: { tab: HomeTab }) {
  if (tab.subTabs && tab.subTabs.length > 0) {
    return (
      <Tabs defaultValue={tab.subTabs[0]?.key} className="gap-6">
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-nff-bg-muted p-1">
          {tab.subTabs.map((subTab) => (
            <TabsTrigger
              key={subTab.key}
              value={subTab.key}
              className="min-h-11 px-4 nff-label-md"
            >
              {subTab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tab.subTabs.map((subTab) => (
          <TabsContent key={subTab.key} value={subTab.key} className="mt-6">
            {subTab.items.length > 0 ? (
              <CardGrid items={subTab.items} />
            ) : (
              <EmptyState
                icon={Sparkles}
                title="Nothing here just yet"
                description="New content is on its way. Try another tab, or begin with a free preview."
                action={
                  <Button asChild className="h-11">
                    <Link to="/meditations">Browse meditations</Link>
                  </Button>
                }
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    )
  }

  return tab.items.length > 0 ? (
    <CardGrid items={tab.items} />
  ) : (
    <EmptyState
      icon={Sparkles}
      title="Nothing here just yet"
      description="New content is on its way. Try another tab, or begin with a free preview."
      action={
        <Button asChild className="h-11">
          <Link to="/meditations">Browse meditations</Link>
        </Button>
      }
    />
  )
}

function HomeSkeleton() {
  return (
    <div>
      <section className="border-b bg-nff-bg-brand-subtle">
        <div className="nff-content grid gap-10 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-24">
          <div className="flex flex-col gap-5">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-14 w-full max-w-xl" />
            <Skeleton className="h-14 w-4/5 max-w-lg" />
            <Skeleton className="mt-2 h-6 w-full max-w-lg" />
            <div className="flex gap-3">
              <Skeleton className="h-13 w-56 rounded-md" />
              <Skeleton className="h-13 w-40 rounded-md" />
            </div>
          </div>
          <Skeleton className="hidden aspect-[4/3] rounded-xl md:block" />
        </div>
      </section>
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
    <div>
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden border-b bg-nff-bg-brand-subtle"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-40 size-[32rem] rounded-full bg-nff-bg-brand-subtle-hover blur-3xl"
        />
        <div className="nff-content relative grid gap-12 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-24">
          <div className="flex flex-col gap-6">
            <p className="nff-overline text-nff-text-brand">
              A staged practice
            </p>
            <h1
              id="hero-heading"
              className="nff-display max-w-2xl text-foreground"
            >
              A gentler way to understand your mind.
            </h1>
            <p className="nff-reading-lead max-w-xl text-nff-text-secondary">
              {BRAND.productName} brings together short explorations and guided
              meditations in six unhurried stages — so the practice fits into a
              real life, not the other way round.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="h-[var(--nff-control-height-lg)] px-6 nff-label-lg"
              >
                <Link to="/meditations">
                  Start a free meditation
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-[var(--nff-control-height-lg)] border-nff-border-strong bg-nff-bg-surface px-6 nff-label-lg"
              >
                <a href="#how-it-works">How it works</a>
              </Button>
            </div>
            <p className="nff-body-sm text-muted-foreground">
              Free previews · No card needed · Cancel anytime
            </p>
          </div>

          <div aria-hidden="true" className="relative hidden md:block">
            <div className="rounded-xl border bg-card p-5 shadow-nff-2">
              <div className="flex items-center justify-between">
                <span className="nff-overline text-muted-foreground">
                  Your journey
                </span>
                <span className="rounded-full bg-nff-bg-success-subtle px-2.5 py-1 nff-label-sm text-nff-text-success">
                  In progress
                </span>
              </div>
              <p className="mt-4 nff-heading-h3 text-foreground">
                Stage 2 · Attention
              </p>
              <p className="mt-1 nff-body-sm text-muted-foreground">
                3 of 7 practices complete
              </p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-nff-bg-muted">
                <div className="h-full w-[42%] rounded-full bg-nff-bg-brand-default" />
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-lg bg-nff-bg-surface-sunken p-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-nff-bg-brand-default text-nff-text-on-brand">
                  <PlayCircle className="size-5" />
                </span>
                <div className="flex flex-col">
                  <span className="nff-label-md text-foreground">
                    Breath and steady attention
                  </span>
                  <span className="nff-caption text-muted-foreground">
                    Meditation · 12 min
                  </span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 flex items-center gap-2 rounded-lg border bg-card px-4 py-3 shadow-nff-1">
              <Compass className="size-4 text-nff-icon-brand" />
              <span className="nff-label-md text-foreground">
                Six gentle stages
              </span>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="mission-heading" className="nff-content py-16 md:py-24">
        <div className="nff-reading mx-auto flex flex-col gap-4">
          <h2 id="mission-heading" className="nff-heading-h2 text-foreground">
            Not another productivity habit
          </h2>
          <p className="nff-reading-body text-nff-text-secondary">
            {BRAND.productName} is a curriculum, not a feed. Each stage builds
            on the last, mixing something to read with something to practise.
            There is no streak to protect and nothing to win — only a steadier
            way of meeting each day.
          </p>
          <Link
            to="/about/who-we-are"
            className="inline-flex w-fit items-center gap-1.5 nff-label-lg text-nff-text-link-default hover:text-nff-text-link-hover nff-focus-ring"
          >
            More about us
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>

      <section
        id="learn"
        aria-labelledby="learn-heading"
        className="border-y bg-nff-bg-surface-sunken nff-section-gap"
      >
        <div className="nff-content flex flex-col gap-8">
          <SectionHeading
            id="learn-heading"
            eyebrow="The library"
            title="Where would you like to begin?"
            description="Four doors into the same practice. Start anywhere, then follow the stages when you are ready."
            action={
              <Button asChild variant="outline" className="h-11">
                <Link to="/explorations">
                  Browse everything
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            }
          />

          <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-6">
            <TabsList className="h-auto flex-wrap justify-start gap-1 bg-nff-bg-muted p-1">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="min-h-11 px-4 nff-label-md"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map((tab) => (
              <TabsContent key={tab.key} value={tab.key} className="mt-2 flex flex-col gap-6">
                <p className="nff-body-lg max-w-2xl text-muted-foreground">
                  {tab.description}
                </p>
                <TabPanel tab={tab} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {data.featured.length > 0 && (
        <section
          aria-labelledby="featured-heading"
          className="nff-section-gap"
        >
          <div className="nff-content flex flex-col gap-8">
            <SectionHeading
              id="featured-heading"
              eyebrow="Chosen for you"
              title="Featured this week"
              description="A few pieces our editors keep returning to."
              action={
                <Button asChild variant="ghost" className="h-11">
                  <Link to="/explorations">
                    See all explorations
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </Button>
              }
            />
            <CardGrid items={data.featured} />
          </div>
        </section>
      )}

      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        className="border-y bg-nff-bg-surface-sunken nff-section-gap"
      >
        <div className="nff-content flex flex-col gap-10">
          <SectionHeading
            id="how-heading"
            eyebrow="How it works"
            title="Three steps, then your own pace"
            description="The first minute is free. The rest is yours to take slowly."
          />
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex flex-col gap-4 rounded-lg border bg-card p-6 shadow-nff-1"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-10 items-center justify-center rounded-full bg-nff-bg-brand-subtle text-nff-text-brand"
                  >
                    <step.icon className="size-5" />
                  </span>
                  <span className="nff-label-sm text-muted-foreground">
                    Step {index + 1}
                  </span>
                </div>
                <h3 className="nff-title-section text-foreground">
                  {step.title}
                </h3>
                <p className="nff-body-md text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="signup-heading" className="nff-content py-16 md:py-24">
        <div className="overflow-hidden rounded-xl border bg-nff-bg-brand-default px-6 py-10 text-nff-text-on-brand md:px-12 md:py-14">
          <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div className="flex flex-col gap-4">
              <p className="nff-overline opacity-80">Begin today</p>
              <h2 id="signup-heading" className="nff-heading-h2">
                The whole library, at your own pace
              </h2>
              <ul className="mt-2 flex flex-col gap-2">
                {BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 nff-body-md">
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <Button
                asChild
                className="h-[var(--nff-control-height-lg)] bg-nff-bg-surface px-6 nff-label-lg text-nff-text-brand hover:bg-nff-bg-surface-raised"
              >
                <Link to="/signup">
                  Create your free account
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
              <p className="nff-body-sm opacity-80">
                Already practising?{' '}
                <Link
                  to="/login"
                  className="underline underline-offset-4 nff-focus-ring"
                >
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
