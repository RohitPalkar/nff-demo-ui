import { AlertTriangle, Info, RotateCcw, ShieldAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ADMIN_STATUS, type AdminStatus, type AdminTone } from './adminStatus'
import { useReturnFocus } from './useReturnFocus'

const TONE: Record<AdminTone, string> = {
  success: 'border-nff-border-success bg-nff-bg-success-subtle text-nff-text-success',
  warning: 'border-nff-border-warning bg-nff-bg-warning-subtle text-nff-text-warning',
  error: 'border-nff-border-error bg-nff-bg-error-subtle text-nff-text-error',
  info: 'border-nff-border-info bg-nff-bg-info-subtle text-nff-text-info',
  neutral: 'border-[var(--admin-border)] bg-nff-bg-muted text-[var(--admin-text-muted)]',
}

/** A status as a word, an icon and a restrained tone. Never colour alone. */
export function StatusBadge({ status, children }: { status: AdminStatus; children?: ReactNode }) {
  const { label, tone, icon: Icon } = ADMIN_STATUS[status]
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-md border px-2 nff-label-sm', TONE[tone])} data-status={status}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {children ?? label}
    </span>
  )
}

/**
 * A short message in the flow of a page. `info` and `neutral` are quiet
 * (role="status"); `warning` and `error` are announced (role="alert").
 */
export function InlineNotice({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: AdminTone
  title?: string
  children: ReactNode
  action?: ReactNode
}) {
  const Icon: LucideIcon = tone === 'warning' || tone === 'error' ? AlertTriangle : Info
  return (
    <div
      role={tone === 'warning' || tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-lg border p-4', TONE[tone])}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="nff-label-md">{title}</p>}
        <div className="nff-body-sm">{children}</div>
        {action}
      </div>
    </div>
  )
}

/** Nothing here yet. Compact, on the page surface, with at most one action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--admin-border-strong)] bg-[var(--admin-surface)] px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-[var(--nff-sage-100)]">
        <Icon aria-hidden="true" className="size-5 text-[var(--nff-forest-700)]" />
      </span>
      <div className="flex max-w-prose flex-col gap-1">
        <h2 className="nff-label-lg text-[var(--admin-text)]">{title}</h2>
        <p className="nff-body-sm text-[var(--admin-text-muted)]">{description}</p>
      </div>
      {action}
    </div>
  )
}

/** Something failed. Announced, with a retry when one exists. */
export function ErrorState({
  title = 'We could not load this',
  description = 'Something went wrong. Please try again.',
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-nff-border-error bg-nff-bg-error-subtle p-4 text-nff-text-error">
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <div className="flex flex-col gap-0.5">
          <h2 className="nff-label-md">{title}</h2>
          <p className="nff-body-sm">{description}</p>
        </div>
      </div>
      {onRetry && (
        <Button type="button" size="sm" variant="outline" onClick={onRetry} className="bg-[var(--admin-surface)]">
          <RotateCcw aria-hidden="true" className="size-4" />
          Try again
        </Button>
      )}
    </div>
  )
}

/** Placeholder rows while data loads. Announced as busy. */
export function LoadingState({ label = 'Loading', rows = 4 }: { label?: string; rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
      <span className="nff-visually-hidden">{label}</span>
      <Skeleton className="h-8 w-56 rounded-md" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}

/**
 * The page-level "you may not be here" state. The URL is kept and the
 * explanation names the role; it links back to a place the account can go.
 */
export function AccessDeniedState({
  roleLabel,
  backTo = '/cms',
  backLabel = 'Back to the dashboard',
}: {
  roleLabel: string
  backTo?: string
  backLabel?: string
}) {
  return (
    <section role="alert" aria-labelledby="admin-denied-title" className="mx-auto mt-8 flex max-w-lg flex-col items-start gap-4 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
      <ShieldAlert aria-hidden="true" className="size-6 text-nff-text-warning" />
      <div className="flex flex-col gap-1.5">
        <h1 id="admin-denied-title" className="admin-section-title">
          You do not have access to this section
        </h1>
        <p className="nff-body-md text-[var(--admin-text-muted)]">
          Your role ({roleLabel}) does not include it. If you think it should, ask an admin.
        </p>
      </div>
      <Link to={backTo} className="nff-label-md text-nff-text-link underline underline-offset-4 nff-focus-ring">
        {backLabel}
      </Link>
    </section>
  )
}

/** A yes/no decision. Focus moves into the dialog and returns on close; Escape cancels. */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
}) {
  const returnFocus = useReturnFocus(open)
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onCloseAutoFocus={returnFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
