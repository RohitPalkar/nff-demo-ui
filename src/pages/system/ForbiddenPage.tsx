import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ForbiddenPage() {
  return (
    <div className="nff-content flex flex-col items-center py-20 text-center md:py-28">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-nff-bg-error-subtle text-nff-text-error"
      >
        <ShieldAlert className="size-6" />
      </span>
      <p className="mt-5 nff-overline text-nff-text-error">403</p>
      <h1 className="mt-2 nff-heading-h1 text-foreground">
        You do not have access to this page
      </h1>
      <p className="mt-3 max-w-md nff-body-lg text-muted-foreground">
        Your role does not include this area. If you think that is a mistake,
        contact an administrator.
      </p>
      <Button asChild className="mt-6 h-11">
        <Link to="/">Return home</Link>
      </Button>
    </div>
  )
}
