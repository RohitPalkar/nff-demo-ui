import { forwardRef, useId, useState, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * The one card every sign-in and sign-up step sits in: centred heading, a
 * short line under it (often the switch to the other flow), the form, and
 * optional extras below a divider.
 */
export function AuthCard({
  title,
  description,
  icon,
  children,
  footer,
}: {
  title: string
  description?: ReactNode
  icon?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="w-full max-w-[440px] rounded-3xl border border-[var(--nff-ivory-200)] bg-[var(--nff-color-bg-surface)] px-6 py-8 shadow-[0_24px_60px_-28px_rgba(31,42,32,0.35)] sm:px-9 sm:py-10">
      <div className="mb-7 flex flex-col items-center gap-2 text-center">
        {icon && (
          <span
            aria-hidden="true"
            className="mb-2 flex size-12 items-center justify-center rounded-full bg-[var(--nff-sage-100)] text-[var(--nff-forest-800)]"
          >
            {icon}
          </span>
        )}
        <h1 className="nff-heading-h2 text-foreground">{title}</h1>
        {description && (
          <div className="nff-body-md text-muted-foreground">{description}</div>
        )}
      </div>
      {children}
      {footer && (
        <div className="mt-8 border-t border-[var(--nff-ivory-200)] pt-6">{footer}</div>
      )}
    </div>
  )
}

/** Link style used inside auth copy. */
export const authLink =
  'rounded-sm font-medium text-nff-text-link underline underline-offset-4 hover:text-[var(--nff-forest-950)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: (props: {
    id: string
    'aria-invalid': boolean
    'aria-describedby'?: string
  }) => ReactNode
}) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': error ? errorId : undefined,
      })}
      {error && (
        <p id={errorId} role="alert" className="nff-body-sm text-nff-text-error">
          {error}
        </p>
      )}
    </div>
  )
}

export const PasswordInput = forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof Input>
>(function PasswordInput(props, ref) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        type={shown ? 'text' : 'password'}
        className="pr-12"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 size-9"
        aria-label={shown ? 'Hide password' : 'Show password'}
        onClick={() => setShown((value) => !value)}
      >
        {shown ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )}
      </Button>
    </div>
  )
})

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded-md border border-nff-border-error bg-nff-bg-error-subtle px-3 py-2 nff-body-sm text-nff-text-error"
    >
      {message}
    </p>
  )
}
