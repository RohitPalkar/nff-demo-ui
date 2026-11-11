import { ArrowRight, Route } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HOME_CARD } from '@/components/learn/home/homeStyles'
import { ResourceCard } from '@/components/learn/home/ResourceCard'
import { cn } from '@/lib/utils'
import type { LibraryResource } from '@/services/learning/library'
import { pathHref } from '@/services/learning/routes'

/**
 * Below a resource opened from the Library: the assigned paths that use it,
 * and related resources. Each part is left out when it has nothing real.
 */
export function ResourceDetailSections({
  paths,
  related,
  relatedTitle = 'Related in the library',
}: {
  paths: { title: string; slug: string; module: string }[]
  related: LibraryResource[]
  relatedTitle?: string
}) {
  if (paths.length === 0 && related.length === 0) return null
  return (
    <div className="nff-content flex flex-col gap-10 border-t border-nff-border-default pb-16 pt-10">
      {paths.length > 0 && (
        <section aria-labelledby="resource-paths" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="resource-paths" className="nff-heading-h4 text-foreground">
              Also in your learning paths
            </h2>
            <p className="nff-body-sm text-nff-text-secondary">
              Completing it here counts in these paths too.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paths.map((path) => (
              <li key={path.slug}>
                <Link
                  to={pathHref(path.slug)}
                  className={cn(
                    HOME_CARD,
                    'group flex h-full items-center gap-3 p-4 transition-colors hover:border-[var(--nff-forest-800)] nff-focus-ring',
                  )}
                >
                  <Route aria-hidden="true" className="size-5 shrink-0 text-nff-text-brand" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="nff-label-md text-foreground group-hover:underline group-hover:underline-offset-4">
                      {path.title}
                    </span>
                    <span className="truncate nff-caption text-nff-text-secondary">{path.module}</span>
                  </span>
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-nff-text-secondary" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section aria-labelledby="resource-related" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="resource-related" className="nff-heading-h4 text-foreground">
              {relatedTitle}
            </h2>
            <p className="nff-body-sm text-nff-text-secondary">
              {related[0]!.item.type === 'meditation'
                ? 'More audio from the same stage, same category first.'
                : 'More articles, same category first.'}
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {related.map((resource) => (
              <li key={resource.item.id}>
                <ResourceCard resource={resource} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
