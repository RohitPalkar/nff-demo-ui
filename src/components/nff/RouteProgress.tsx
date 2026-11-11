import { useIsFetching } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/** Wait before showing, so fast responses never flash a bar. */
const SHOW_AFTER_MS = 300

/**
 * Hairline progress bar at the top of the viewport while page data is loading
 * slowly. Never blocks navigation; pages keep their own skeletons. Screen readers
 * get the page's own loading text, so this is decorative.
 */
export function RouteProgress() {
  const fetching = useIsFetching() > 0
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(
      () => setVisible(fetching),
      fetching ? SHOW_AFTER_MS : 0,
    )
    return () => window.clearTimeout(timer)
  }, [fetching])

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-nff-bg-tonal transition-opacity duration-[var(--nff-duration-slow)]',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="nff-progress-indeterminate h-full w-2/5 rounded-full bg-nff-bg-brand-default" />
    </div>
  )
}
