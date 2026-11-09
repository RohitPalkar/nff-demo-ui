import { forwardRef, useId, useState, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-nff-2 sm:p-8">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="nff-heading-h2 text-foreground">{title}</h1>
        {description && (
          <p className="nff-body-md text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
      {footer && (
        <div className="mt-6 border-t pt-4 text-center nff-body-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  )
}

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
