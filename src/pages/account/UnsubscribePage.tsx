import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, MailX } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState } from '@/components/nff/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { unsubscribeWithToken } from '@/services/account'

export function UnsubscribePage() {
  const { token = '' } = useParams()
  const query = useQuery({
    queryKey: ['unsubscribe', token],
    queryFn: () => unsubscribeWithToken(token),
    retry: false,
  })

  return (
    <div className="nff-content py-16">
      <div className="mx-auto flex max-w-md flex-col items-start gap-4">
        {query.isPending && (
          <div aria-busy="true" className="flex w-full flex-col gap-3">
            <span className="nff-visually-hidden">Unsubscribing</span>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-full" />
          </div>
        )}
        {query.isError && (
          <ErrorState
            title="This unsubscribe link did not work"
            description="It may have expired. Log in to manage your email preferences instead."
            onRetry={() => void query.refetch()}
          />
        )}
        {query.isSuccess && (
          <>
            <CheckCircle2
              aria-hidden="true"
              className="size-10 text-nff-text-success"
            />
            <h1 className="nff-heading-h2">You are unsubscribed</h1>
            <p className="nff-body-md text-muted-foreground">
              You will no longer receive Meadow emails. If this was a mistake you
              can turn them back on from your account settings.
            </p>
            <div className="flex gap-3">
              <Button asChild className="h-11">
                <Link to="/account/email">
                  <MailX aria-hidden="true" className="size-4" />
                  Manage email preferences
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11">
                <Link to="/">Back to home</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
