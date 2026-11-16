import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { CODE_LENGTH } from '@/services/auth'

/**
 * Six single-digit boxes that behave like one field: typing moves forward,
 * Backspace moves back, arrows move between boxes, and pasting or the
 * browser's one-time-code autofill fills them all.
 */
export function OtpInput({
  value,
  onChange,
  invalid = false,
  disabled = false,
  labelId,
  describedBy,
}: {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  disabled?: boolean
  labelId: string
  describedBy?: string
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length: CODE_LENGTH }, (_, index) => value[index] ?? '')

  function focus(index: number) {
    refs.current[Math.max(0, Math.min(CODE_LENGTH - 1, index))]?.focus()
  }

  function setFrom(index: number, incoming: string) {
    const clean = incoming.replace(/\D/g, '')
    if (!clean) return
    const next = (value.slice(0, index) + clean).slice(0, CODE_LENGTH)
    onChange(next)
    focus(next.length)
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      if (digits[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1))
      } else if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index))
        focus(index - 1)
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focus(index - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      focus(index + 1)
    }
  }

  function onPaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    setFrom(index, event.clipboardData.getData('text'))
  }

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      className="grid grid-cols-6 gap-2 sm:gap-2.5"
    >
      {digits.map((digit, index) => (
        <input
          // Positions never reorder.
          // oxlint-disable-next-line react/no-array-index-key
          key={index}
          ref={(node) => {
            refs.current[index] = node
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={index === 0 ? CODE_LENGTH : 1}
          // The code step exists only to take this code; start in the first box.
          // oxlint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={index === 0}
          aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
          aria-invalid={invalid}
          disabled={disabled}
          value={digit}
          onFocus={(event) => event.target.select()}
          onChange={(event) => {
            // Ignore the edit when it only removed the digit (Backspace handles that).
            if (event.target.value === '') return
            // The first box also receives the whole code from autofill;
            // elsewhere keep the digit just typed.
            const raw = event.target.value
            setFrom(index, index === 0 && raw.length > 2 ? raw : raw.slice(-1))
          }}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={(event) => onPaste(index, event)}
          className={cn(
            'h-14 w-full min-w-0 rounded-xl border bg-[var(--nff-input-bg)] text-center text-2xl font-medium tabular-nums text-foreground outline-none transition-[border-color,box-shadow]',
            'border-[color:var(--nff-input-border,var(--color-input))] hover:border-[color:var(--nff-input-border-hover)]',
            'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-60',
            invalid && 'border-[color:var(--nff-input-border-error)] hover:border-[color:var(--nff-input-border-error)]',
          )}
        />
      ))}
    </div>
  )
}
