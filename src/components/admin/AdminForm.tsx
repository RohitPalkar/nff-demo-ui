import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'

/**
 * Form patterns. Controls are the existing `ui` ones (Input, Select,
 * Textarea, Checkbox, Switch); these add the structure around them.
 */

/** A titled group of fields. */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <fieldset aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <legend id={id} className="admin-section-title float-left w-full text-[var(--admin-text)]">
          {title}
        </legend>
        {description && <p className="clear-both nff-body-sm text-[var(--admin-text-muted)]">{description}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </fieldset>
  )
}

/**
 * Label, control, helper text and error, wired together. Pass one control as
 * the child: it receives the id and the `aria-describedby` / `aria-invalid`
 * attributes. Mark required fields with `required` (an indicator, plus
 * `aria-required` on the control; validation stays with the form).
 */
export function FormField({
  label,
  required = false,
  helper,
  error,
  children,
}: {
  label: string
  required?: boolean
  helper?: string
  error?: string
  children: ReactElement<Record<string, unknown>>
}) {
  const id = useId()
  const helperId = helper ? `${id}-helper` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required || undefined,
      })
    : children
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-nff-text-error">
            {' '}
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </Label>
      {control}
      {helper && (
        <p id={helperId} className="nff-caption text-[var(--admin-text-muted)]">
          {helper}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="nff-body-sm text-nff-text-error">
          {error}
        </p>
      )}
    </div>
  )
}

/** Save and cancel. Primary action first; stacks on small screens. */
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-col-reverse gap-2 border-t border-[var(--admin-border)] pt-4 sm:flex-row sm:justify-end">{children}</div>
}
