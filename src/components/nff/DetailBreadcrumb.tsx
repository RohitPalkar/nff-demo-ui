import { ChevronRight } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router-dom'

export interface DetailTrailItem {
  label: string
  to?: string
}

interface DetailBreadcrumbProps {
  trail: DetailTrailItem[]
  current: string
}

export function DetailBreadcrumb({ trail, current }: DetailBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5 nff-body-sm text-muted-foreground">
        {trail.map((item) => (
          <Fragment key={item.label}>
            <li className="min-w-0">
              {item.to ? (
                <Link
                  to={item.to}
                  className="rounded-sm hover:text-foreground nff-focus-ring"
                >
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3.5" />
            </li>
          </Fragment>
        ))}
        <li aria-current="page" className="line-clamp-1 text-foreground">
          {current}
        </li>
      </ol>
    </nav>
  )
}
