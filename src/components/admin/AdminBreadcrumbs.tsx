import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { Crumb } from '@/services/rbac/navigation'

/**
 * The trail for the current page, built from the route registry. The last
 * crumb is the current page. On small screens only the last two are shown.
 */
export function AdminBreadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          const hiddenOnSmall = index < crumbs.length - 2
          return (
            <li key={`${crumb.label}-${index}`} className={cn('flex min-w-0 items-center gap-1', hiddenOnSmall && 'max-sm:hidden')}>
              {index > 0 && (
                <ChevronRight aria-hidden="true" className={cn('size-3.5 shrink-0 text-[var(--admin-text-muted)]', index === crumbs.length - 2 && 'max-sm:hidden')} />
              )}
              {last ? (
                <span aria-current="page" className="truncate nff-label-md text-[var(--admin-text)]">
                  {crumb.label}
                </span>
              ) : crumb.href ? (
                <Link
                  to={crumb.href}
                  className="inline-flex min-h-6 items-center truncate nff-label-md text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:underline nff-focus-ring"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate nff-label-md text-[var(--admin-text-muted)]">{crumb.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
