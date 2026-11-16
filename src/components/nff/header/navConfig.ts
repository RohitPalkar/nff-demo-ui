import { useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { CATEGORY_COPY } from '@/services/content'
import { STAFF_ROLE_IDS } from '@/services/rbac/roles'
import type { Category, Role } from '@/types'

/** Phase 02 information architecture. Destinations are existing routes only. */

const PRACTICE_KEYS: Category[] = ['foundations', 'understand', 'contemplate', 'explore']

export const PRACTICE_ITEMS = PRACTICE_KEYS.map((key) => ({
  key,
  label: CATEGORY_COPY[key].label,
  description: CATEGORY_COPY[key].description,
  href: `/explorations?tab=${key}`,
}))

/**
 * The Library menu (navbar only). Display names are the category labels;
 * the category keys and routes use the new `/library/:category` paths.
 */
export const LIBRARY_ITEMS = PRACTICE_KEYS.map((key, index) => ({
  key,
  index: String(index + 1).padStart(2, '0'),
  label: CATEGORY_COPY[key].label,
  description: CATEGORY_COPY[key].description,
  href: `/library/${key}`,
}))

/** The whole catalogue, offered at the foot of the Library menu. */
export const ALL_EXPLORATIONS_LINK = {
  label: 'Browse all explorations',
  href: '/explorations',
}

export type NavSection = 'library' | 'meditations' | 'about'

export interface NavLink {
  id: NavSection
  label: string
  href: string
}

/** Direct links after The Library. About is one continuous page. */
export const NAV_LINKS: NavLink[] = [
  { id: 'meditations', label: 'Meditations', href: '/meditations' },
  { id: 'about', label: 'About', href: '/about' },
]

/** About topics, used by the footer (not the navbar). */
export const ABOUT_ITEMS = [
  { label: 'Who we are', href: '/about/who-we-are' },
  { label: 'What we do', href: '/about/what-we-do' },
  { label: 'How we do it', href: '/about/how-we-do-it' },
]

export const STAFF_ROLES: Role[] = [...STAFF_ROLE_IDS]

/** The one primary action for the current visitor (header, footer, menus). */
export function usePrimaryCta() {
  const { user } = useAuth()
  if (!user) return { to: '/signup', label: 'Begin your journey', short: 'Begin' }
  if (STAFF_ROLES.includes(user.role)) return { to: '/cms', label: 'Open CMS', short: 'CMS' }
  return { to: '/journey', label: 'Continue journey', short: 'Continue' }
}

/** Which section and item the current URL belongs to, for active states. */
export function useNavActive() {
  const { pathname, search } = useLocation()
  const tab = new URLSearchParams(search).get('tab')
  const onCategory =
    pathname === '/explorations' &&
    PRACTICE_KEYS.includes(tab as Category)

  const section = (id: NavSection) => {
    switch (id) {
      case 'library':
        return pathname.startsWith('/explorations')
      case 'meditations':
        return pathname.startsWith('/meditations')
      case 'about':
        return pathname.startsWith('/about')
    }
  }

  const item = (href: string) => {
    const [path, query] = href.split('?')
    if (path !== pathname) return false
    const wanted = new URLSearchParams(query ?? '').get('tab')
    return wanted ? wanted === tab : !onCategory
  }

  return { section, item }
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
