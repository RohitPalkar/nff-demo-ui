import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { LEARN_NAV, isLearnNavActive } from './navItems'

/** Horizontal primary navigation (md and up). Underline marks the current item. */
export function LearnNav({ className }: { className?: string }) {
  const { pathname } = useLocation()
  return (
    <nav aria-label="Primary" className={className}>
      <ul className="flex h-full items-stretch gap-0.5 lg:gap-1">
        {LEARN_NAV.map((item) => {
          const active = isLearnNavActive(item.to, pathname)
          return (
            <li key={item.to} className="flex">
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative inline-flex items-center px-2 nff-label-md whitespace-nowrap transition-colors duration-[var(--nff-duration-fast)] nff-focus-ring lg:px-3.5',
                  'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-[var(--nff-accent-active)] after:transition-opacity lg:after:inset-x-3.5',
                  active
                    ? 'text-[var(--nff-text-active)] after:opacity-100'
                    : 'text-nff-text-secondary after:opacity-0 hover:text-[var(--nff-text-active)] hover:after:bg-[var(--nff-sage-400)] hover:after:opacity-100',
                )}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
