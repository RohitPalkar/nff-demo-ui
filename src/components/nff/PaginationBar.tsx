import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface PaginationBarProps {
  page: number
  totalPages: number
  hrefForPage: (page: number) => string
  label?: string
}

export function PaginationBar({
  page,
  totalPages,
  hrefForPage,
  label = 'Pagination',
}: PaginationBarProps) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)

  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Button asChild variant="outline" className="h-11 gap-1 px-3">
          <Link to={hrefForPage(page - 1)} aria-label="Previous page">
            <ChevronLeft aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Previous</span>
          </Link>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled
          className="h-11 gap-1 px-3"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
      )}

      <p className="nff-label-md text-muted-foreground sm:hidden">
        Page {page} of {totalPages}
      </p>

      <ul className="hidden items-center gap-1 sm:flex">
        {pages.map((pageNumber) => (
          <li key={pageNumber}>
            {pageNumber === page ? (
              <Button
                type="button"
                aria-current="page"
                className="h-11 min-w-11 px-3"
              >
                {pageNumber}
              </Button>
            ) : (
              <Button
                asChild
                variant="ghost"
                className="h-11 min-w-11 px-3"
              >
                <Link
                  to={hrefForPage(pageNumber)}
                  aria-label={`Page ${pageNumber}`}
                >
                  {pageNumber}
                </Link>
              </Button>
            )}
          </li>
        ))}
      </ul>

      {page < totalPages ? (
        <Button asChild variant="outline" className="h-11 gap-1 px-3">
          <Link to={hrefForPage(page + 1)} aria-label="Next page">
            <span className="hidden sm:inline">Next</span>
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled
          className="h-11 gap-1 px-3"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      )}
    </nav>
  )
}
