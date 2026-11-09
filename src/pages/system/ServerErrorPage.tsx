import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { ServerCrash } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ServerErrorPage() {
  const error = useRouteError()
  const isNotFound = isRouteErrorResponse(error) && error.status === 404

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-nff-bg-error-subtle text-nff-text-error"
      >
        <ServerCrash className="size-6" />
      </span>
      <p className="mt-5 nff-overline text-nff-text-error">
        {isNotFound ? '404' : '500'}
      </p>
      <h1 className="mt-2 nff-heading-h1 text-foreground">
        {isNotFound ? 'Page not found' : 'Something went wrong'}
      </h1>
      <p className="mt-3 max-w-md nff-body-lg text-muted-foreground">
        {isNotFound
          ? 'The page you asked for is not here.'
          : 'An unexpected error interrupted the page. Reloading usually helps.'}
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild className="h-11">
          <Link to="/">Return home</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => window.location.reload()}
        >
          Reload page
        </Button>
      </div>
    </div>
  )
}
