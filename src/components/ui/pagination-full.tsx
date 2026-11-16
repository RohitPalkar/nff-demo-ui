import * as React from "react"
import { cn } from "@/lib/utils"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react"

import { buttonVariants, type Button } from "@/components/ui/button"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size,
        }),
        className
      )}
      {...props}
    />
  )
}

interface PaginationNavLinkProps extends React.ComponentProps<typeof PaginationLink> {
  disabled?: boolean
}

function PaginationPrevious({
  className,
  disabled,
  ...props
}: PaginationNavLinkProps) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", disabled && "pointer-events-none opacity-50", className)}
      onClick={(e) => {
        if (disabled) e.preventDefault()
        props.onClick?.(e)
      }}
      aria-disabled={disabled}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">Previous</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  disabled,
  ...props
}: PaginationNavLinkProps) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", disabled && "pointer-events-none opacity-50", className)}
      onClick={(e) => {
        if (disabled) e.preventDefault()
        props.onClick?.(e)
      }}
      aria-disabled={disabled}
      {...props}
    >
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  )
}

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  showFirstLast?: boolean
  siblingCount?: number
}

/**
 * Full pagination component with page numbers, previous/next, and ellipsis.
 * Based on shadcn/ui pagination but with page number links.
 */
export function PaginationFull({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showFirstLast = true,
  siblingCount = 1,
}: PaginationProps) {
  const pages = React.useMemo(() => {
    if (totalPages <= 1) return [] as const

    const result: (number | "ellipsis")[] = []

    if (showFirstLast) {
      result.push(1)
    }

    let startPage = Math.max(2, currentPage - siblingCount)
    let endPage = Math.min(totalPages - (showFirstLast ? 1 : 0), currentPage + siblingCount)

    if (startPage > 2) {
      result.push("ellipsis")
    }

    for (let i = startPage; i <= endPage; i++) {
      result.push(i)
    }

    if (endPage < totalPages - (showFirstLast ? 1 : 0)) {
      result.push("ellipsis")
    }

    if (showFirstLast && totalPages > 1) {
      result.push(totalPages)
    }

    return result
  }, [currentPage, totalPages, siblingCount, showFirstLast])

  if (totalPages <= 1) return null

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault()
              if (currentPage > 1) onPageChange(currentPage - 1)
            }}
            disabled={currentPage === 1}
            aria-disabled={currentPage === 1}
          />
        </PaginationItem>

        {pages.map((page, index) =>
          page === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                isActive={page === currentPage}
                onClick={(e) => {
                  e.preventDefault()
                  onPageChange(page)
                }}
                aria-label={`Page ${page}`}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault()
              if (currentPage < totalPages) onPageChange(currentPage + 1)
            }}
            disabled={currentPage === totalPages}
            aria-disabled={currentPage === totalPages}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}