import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  count?: number
  className?: string
  label?: string
}

export function LoadingState({
  count = 4,
  className,
  label = 'Loading content',
}: LoadingStateProps) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="nff-visually-hidden">{label}</span>
      <div
        className={cn(
          'grid gap-6 sm:grid-cols-2 lg:grid-cols-4',
          className,
        )}
      >
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="flex flex-col overflow-hidden rounded-lg border bg-card shadow-nff-1"
          >
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="flex flex-col gap-3 p-6">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-5 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="mt-2 h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
