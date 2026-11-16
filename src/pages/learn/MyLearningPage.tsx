import { useQuery } from '@tanstack/react-query'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { useSearchParams } from 'react-router-dom'
import { HomeEmptyState } from '@/components/learn/home/homeParts'
import { HOME_CARD } from '@/components/learn/home/homeStyles'
import { LearningCard } from '@/components/learn/my-learning/LearningCard'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { getAccessContext } from '@/services/learning/accessContext'
import {
  MY_LEARNING_SORTS,
  SORT_LABEL,
  buildMyLearning,
  countByTab,
  filterByTab,
  parseSort,
  parseTab,
  sortLearning,
  type MyLearningTab,
} from '@/services/learning/myLearning'
import { isPreviewRole } from '@/services/learning/previewRoles'
import { loadProgress } from '@/services/learning/progress'
import { LEARN_LIBRARY } from '@/services/learning/routes'

const TAB_LABEL: Record<MyLearningTab, string> = {
  all: 'All Learning',
  'in-progress': 'In Progress',
  'not-started': 'Not Started',
  completed: 'Completed',
}

const EMPTY: Record<MyLearningTab, { title: string; description: string }> = {
  all: {
    title: 'Nothing assigned yet',
    description:
      'When a learning path is assigned to you it will appear here. Until then, the library is open to you.',
  },
  'in-progress': {
    title: 'Nothing in progress',
    description: 'Learning you have started but not finished will appear here.',
  },
  'not-started': {
    title: 'Nothing waiting to start',
    description: 'Everything assigned to you has been started.',
  },
  completed: {
    title: 'Nothing completed yet',
    description: 'A learning path appears here once every one of its lessons is complete.',
  },
}

/**
 * `/learn/my-learning`. One list from real assignments and progress
 * (`services/learning/myLearning.ts`); the tabs and sort are views of it,
 * kept in the URL (`?tab=`, `?sort=`) so they survive reloads and links.
 */
export function MyLearningPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = parseTab(params.get('tab'))
  const sort = parseSort(params.get('sort'))

  // Synchronous today (localStorage); a query so a backend can slot in.
  const query = useQuery({
    queryKey: ['my-learning', user?.id],
    queryFn: () => {
      const ctx = getAccessContext(user, { surface: 'learn', withProgress: true })
      const store = ctx.progress ?? loadProgress(user!.id)
      return buildMyLearning(ctx, store, { isPreview: isPreviewRole(user?.role) })
    },
    enabled: Boolean(user),
    staleTime: 0,
  })

  const update = (key: 'tab' | 'sort', value: string, fallback: string) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value === fallback) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )
  }

  const data = query.data
  const counts = data ? countByTab(data.items) : null
  const visible = data ? sortLearning(filterByTab(data.items, tab), sort) : []

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 sm:px-6 md:py-12 lg:px-10">
      <header className="flex flex-col gap-2">
        <h1 className="nff-heading-h1 text-foreground">My Learning</h1>
        <p className="max-w-2xl nff-body-lg text-nff-text-secondary">
          The learning paths assigned to you, and how far you are in each.
        </p>
      </header>

      <TabsPrimitive.Root
        value={tab}
        onValueChange={(value) => update('tab', value, 'all')}
        className="flex flex-col gap-6"
      >
        <div className="-mx-4 overflow-x-auto overflow-y-hidden border-b border-nff-border-default px-4 sm:mx-0 sm:px-0">
          <TabsPrimitive.List aria-label="Filter learning by status" className="flex min-w-max gap-6">
            {(Object.keys(TAB_LABEL) as MyLearningTab[]).map((key) => (
              <TabsPrimitive.Trigger
                key={key}
                value={key}
                className={cn(
                  '-mb-px flex h-11 items-center gap-2 border-b-2 border-transparent nff-label-md text-nff-text-secondary transition-colors hover:text-foreground nff-focus-ring',
                  'data-[state=active]:border-[var(--nff-forest-900)] data-[state=active]:text-foreground',
                )}
              >
                {TAB_LABEL[key]}
                {counts && (
                  <span className="rounded-sm bg-[var(--nff-sage-100)] px-1.5 nff-caption text-[var(--nff-forest-900)]">
                    {counts[key]}
                  </span>
                )}
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>
        </div>

        {(Object.keys(TAB_LABEL) as MyLearningTab[]).map((key) => (
          <TabsPrimitive.Content key={key} value={key} className="flex flex-col gap-5 focus-visible:outline-none">
            {key !== tab ? null : query.isPending || !data ? (
              <div aria-busy="true" aria-label="Loading your learning" className="flex flex-col gap-4">
                <Skeleton className="h-52 w-full rounded-md" />
                <Skeleton className="h-52 w-full rounded-md" />
              </div>
            ) : (
              <>
                {visible.length > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="nff-body-sm text-nff-text-secondary" aria-live="polite">
                      {visible.length} learning paths
                    </p>
                    <label className="flex items-center gap-2 nff-label-md text-nff-text-secondary">
                      Sort by
                      <select
                        value={sort}
                        onChange={(event) => update('sort', event.target.value, 'recent')}
                        className="h-10 rounded-md border border-nff-border-strong bg-nff-bg-surface px-3 nff-body-sm text-foreground nff-focus-ring"
                      >
                        {MY_LEARNING_SORTS.map((option) => (
                          <option key={option} value={option}>
                            {SORT_LABEL[option]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                {visible.length > 0 ? (
                  <ul className="flex flex-col gap-4 lg:gap-5">
                    {visible.map((item) => (
                      <li key={item.path.id}>
                        <LearningCard item={item} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <HomeEmptyState
                    title={EMPTY[key].title}
                    description={EMPTY[key].description}
                    action={
                      key === 'all'
                        ? { label: 'Browse the library', to: LEARN_LIBRARY }
                        : data.items.length > 0
                          ? { label: 'View all learning', to: '/learn/my-learning' }
                          : { label: 'Browse the library', to: LEARN_LIBRARY }
                    }
                  />
                )}
              </>
            )}
          </TabsPrimitive.Content>
        ))}
      </TabsPrimitive.Root>

      {data && data.withdrawn.length > 0 && (
        <section aria-labelledby="withdrawn-heading" className="flex flex-col gap-3">
          <h2 id="withdrawn-heading" className="nff-heading-h4 text-foreground">
            No longer assigned
          </h2>
          <ul className={cn(HOME_CARD, 'divide-y divide-nff-border-default')}>
            {data.withdrawn.map((entry) => (
              <li key={entry.path.id} className="flex flex-col gap-1 p-4 sm:p-5">
                <p className="nff-label-md text-foreground">{entry.path.title}</p>
                <p className="nff-body-sm text-nff-text-secondary">
                  {entry.withdrawnAt ? `Withdrawn ${formatDate(entry.withdrawnAt)}. ` : 'Withdrawn. '}
                  You can no longer open it. Your progress is kept in case it is assigned again.
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data?.isPreview && (
        <p className="max-w-2xl border-l-2 border-[var(--nff-sage-300)] pl-4 nff-body-sm text-nff-text-secondary">
          Preview: you are seeing the paths a practitioner could be assigned. Nothing you open is recorded.
        </p>
      )}
    </div>
  )
}
