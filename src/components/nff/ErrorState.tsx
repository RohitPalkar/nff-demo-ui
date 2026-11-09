import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'We could not load this',
  description = 'Something went wrong at our end. Please try again in a moment.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-4 rounded-lg border border-nff-border-error bg-nff-bg-error-subtle p-6 text-nff-text-error"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div className="flex flex-col gap-1">
          <h3 className="nff-title-section">{title}</h3>
          <p className="nff-body-md">{description}</p>
        </div>
      </div>
      {onRetry && (
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            className="border-nff-border-error bg-nff-bg-surface text-nff-text-error hover:bg-nff-bg-surface-sunken"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Try again
          </Button>
        </div>
      )}
    </div>
  )
}
