import {
  LEARN_HOME,
  LEARN_LIBRARY,
  LEARN_MEDITATIONS,
  LEARN_MY_LEARNING,
  LEARN_PROGRESS,
} from '@/services/learning/routes'

/** The five primary destinations, in order. Nothing else belongs here. */
export const LEARN_NAV = [
  { label: 'Home', to: LEARN_HOME },
  { label: 'My Learning', to: LEARN_MY_LEARNING },
  { label: 'Library', to: LEARN_LIBRARY },
  { label: 'Meditations', to: LEARN_MEDITATIONS },
  { label: 'Progress', to: LEARN_PROGRESS },
] as const

/**
 * Which item the URL belongs to. Home is exact. Paths and lessons live under
 * My Learning; library resources under Library.
 */
export function isLearnNavActive(to: string, pathname: string) {
  if (to === LEARN_HOME) return pathname === LEARN_HOME
  if (to === LEARN_MY_LEARNING) {
    return pathname.startsWith(LEARN_MY_LEARNING) || pathname.startsWith('/learn/paths')
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}
