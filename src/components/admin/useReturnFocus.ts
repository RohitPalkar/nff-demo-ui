import { useCallback, useLayoutEffect, useRef } from 'react'

/**
 * Returns focus to whatever opened a dialog that has no Radix trigger (one
 * opened from a button's onClick by setting state). Without it, closing the
 * dialog drops focus to the page body (WCAG 2.4.3).
 *
 * Usage: `const returnFocus = useReturnFocus(open)` and pass it to the
 * dialog content as `onCloseAutoFocus`. If the opener is gone by then (a row
 * was removed), focus moves to the main region instead of the body.
 */
export function useReturnFocus(open: boolean) {
  const opener = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (open) {
      const active = document.activeElement
      opener.current = active instanceof HTMLElement && active !== document.body ? active : null
    }
  }, [open])

  return useCallback((event: Event) => {
    event.preventDefault()
    const target = opener.current
    if (target && target.isConnected) target.focus()
    else document.getElementById('admin-main')?.focus()
  }, [])
}
