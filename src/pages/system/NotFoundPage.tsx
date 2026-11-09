import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="nff-content flex flex-col items-center py-20 text-center md:py-28">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-nff-bg-brand-subtle text-nff-text-brand"
      >
        <Compass className="size-6" />
      </span>
      <p className="mt-5 nff-overline text-nff-text-brand">404</p>
      <h1 className="mt-2 nff-heading-h1 text-foreground">
        We could not find that page
      </h1>
      <p className="mt-3 max-w-md nff-body-lg text-muted-foreground">
        The link may be old, or the page may have moved. The practice is still
        here.
      </p>
      <Button asChild className="mt-6 h-11">
        <Link to="/">Return home</Link>
      </Button>
    </div>
  )
}
