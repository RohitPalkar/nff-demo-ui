import { useCallback, useLayoutEffect, useRef } from 'react'

/** An element that can take focus back, with dropdown items mapped to the button that opened their menu. */
function focusTarget(element: Element | null): HTMLElement | null {
  if (!(element instanceof HTMLElement) || element === document.body) return null
  const menu = element.closest('[role="menu"]')
  if (!menu) return element
  const id = menu.getAttribute('aria-labelledby')
  return id ? document.getElementById(id) : null
}

// A dialog opened from a dropdown item mounts after the menu has closed and
// focus has left the item, so remember the last control that had focus.
let lastFocused: HTMLElement | null = null
if (typeof document !== 'undefined') {
  document.addEventListener(
    'focusin',
    (event) => {
      const target = focusTarget(event.target as Element | null)
      if (target && !target.closest('[role="dialog"],[role="alertdialog"]')) lastFocused = target
    },
    true,
  )
}

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
      opener.current = focusTarget(document.activeElement) ?? (lastFocused?.isConnected ? lastFocused : null)
    }
  }, [open])

  return useCallback((event: Event) => {
    event.preventDefault()
    const target = opener.current
    if (target && target.isConnected) target.focus()
    else document.getElementById('admin-main')?.focus()
  }, [])
}
