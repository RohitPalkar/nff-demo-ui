import { useEffect, useRef, useState } from 'react'

/**
 * Reveals once, the first time the element is `threshold` of the way into
 * view. Starts revealed when IntersectionObserver is unavailable or the
 * visitor prefers reduced motion, so content can never stay hidden. Pair with
 * `data-reveal={shown ? 'shown' : 'pending'}` and the .nff-reveal-* classes.
 */
export function useRevealOnce<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(
    () =>
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const node = ref.current
    if (shown || !node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true)
          observer.disconnect()
        }
      },
      { threshold },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [shown, threshold])

  return [ref, shown] as const
}
