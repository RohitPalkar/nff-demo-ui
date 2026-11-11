import { ArrowRight, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  ALL_EXPLORATIONS_LINK,
  LIBRARY_ITEMS,
  NAV_LINKS,
  useNavActive,
  type NavLink,
} from './navConfig'

/** Plain text items: colour carries hover, a short forest rule marks the
 *  current section. No filled pills. */
function navItemClass(active: boolean) {
  return cn(
    'group relative inline-flex h-10 items-center gap-1 whitespace-nowrap rounded-full px-3 nff-nav nff-focus-ring xl:px-4',
    'transition-colors duration-[var(--nff-duration-fast)]',
    active
      ? 'text-[var(--nff-nav-fg-active)]'
      : 'text-[var(--nff-nav-fg)] hover:text-[var(--nff-nav-fg-active)]',
  )
}

function ActiveBar({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-[var(--nff-nav-indicator)] transition-[opacity,transform] duration-[var(--nff-duration-base)]',
        active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0',
      )}
    />
  )
}

/**
 * The Library: a compact list anchored under its trigger. Radix supplies click
 * to open, outside click and Escape to close (focus returns to the trigger),
 * arrow keys, typeahead and aria-expanded on the trigger.
 */
function LibraryMenu() {
  const { section, item } = useNavActive()
  const active = section('library')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          navItemClass(active),
          'data-[state=open]:text-[var(--nff-nav-fg-active)]',
        )}
      >
        The Library
        <ChevronDown
          aria-hidden="true"
          className="size-4 text-nff-icon-secondary transition-transform duration-[var(--nff-duration-base)] group-data-[state=open]:rotate-180"
        />
        <ActiveBar active={active} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={10}
        collisionPadding={16}
        loop
        className="w-[min(23rem,calc(100vw-2rem))] rounded-2xl border-nff-border-default bg-nff-bg-surface p-1.5 shadow-nff-3 duration-200 motion-reduce:animate-none"
      >
        <DropdownMenuGroup aria-label="Library categories">
          {LIBRARY_ITEMS.map((entry) => {
            const current = item(entry.href)
            return (
              <DropdownMenuItem
                key={entry.key}
                asChild
                className="group/item grid cursor-pointer grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-2 rounded-xl px-3 py-3 transition-colors duration-[var(--nff-duration-fast)] focus:bg-nff-bg-hover focus:text-foreground data-[active=true]:bg-nff-bg-selected"
              >
                <Link
                  to={entry.href}
                  data-active={current}
                  aria-current={current ? 'page' : undefined}
                >
                  <span
                    aria-hidden="true"
                    className="pt-0.5 font-serif text-[0.875rem] leading-5 tabular-nums text-nff-text-tertiary transition-colors group-focus/item:text-nff-text-brand group-data-[active=true]/item:text-nff-text-brand"
                  >
                    {entry.index}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 nff-label-md text-foreground group-data-[active=true]/item:text-nff-text-brand">
                      {entry.label}
                      <ArrowRight
                        aria-hidden="true"
                        className="size-3.5 -translate-x-1 text-nff-icon-brand opacity-0 transition-[opacity,transform] duration-[var(--nff-duration-fast)] group-focus/item:translate-x-0 group-focus/item:opacity-100"
                      />
                    </span>
                    <span className="nff-caption text-pretty text-nff-text-secondary">
                      {entry.description}
                    </span>
                  </span>
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-1.5 my-1.5 bg-nff-border-default" />
        <DropdownMenuItem
          asChild
          className="group/all cursor-pointer justify-between rounded-xl px-3 py-2.5 nff-label-md text-nff-text-brand focus:bg-nff-bg-hover focus:text-nff-text-brand"
        >
          <Link to={ALL_EXPLORATIONS_LINK.href}>
            {ALL_EXPLORATIONS_LINK.label}
            <ArrowRight
              aria-hidden="true"
              className="size-4 text-nff-icon-brand transition-transform duration-[var(--nff-duration-fast)] group-focus/all:translate-x-0.5"
            />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TopLink({ id, label, href }: NavLink) {
  const { section } = useNavActive()
  const active = section(id)
  return (
    <Link to={href} className={navItemClass(active)} aria-current={active ? 'page' : undefined}>
      {label}
      <ActiveBar active={active} />
    </Link>
  )
}

/** Horizontal navigation (≥1024px), centred between logo and actions. */
export function DesktopNav() {
  return (
    <nav aria-label="Primary" className="hidden lg:block lg:justify-self-center">
      <ul className="flex items-center gap-1 xl:gap-2">
        <li>
          <LibraryMenu />
        </li>
        {NAV_LINKS.map((link) => (
          <li key={link.id}>
            <TopLink {...link} />
          </li>
        ))}
      </ul>
    </nav>
  )
}
