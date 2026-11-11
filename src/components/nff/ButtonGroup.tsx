import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface ButtonGroupItem<T extends string = string> {
  value: T
  label: string
  /** Optional short count or note after the label, e.g. "3". */
  meta?: string
}

interface ButtonGroupBaseProps<T extends string> {
  items: readonly ButtonGroupItem<T>[]
  /** The selected item. */
  value: T
  /** Accessible name for the group, e.g. "Filter by category". */
  label: string
  size?: 'sm' | 'md'
  className?: string
}

interface ButtonGroupButtonsProps<T extends string> extends ButtonGroupBaseProps<T> {
  /** Button mode: toggles state in place (aria-pressed). */
  onValueChange: (value: T) => void
  hrefFor?: never
}

interface ButtonGroupLinksProps<T extends string> extends ButtonGroupBaseProps<T> {
  /** Link mode: each item is a URL, e.g. a ?tab= query (aria-current). */
  hrefFor: (value: T) => string
  onValueChange?: never
}

export type ButtonGroupProps<T extends string> = ButtonGroupButtonsProps<T> | ButtonGroupLinksProps<T>

const ITEM =
  'inline-flex shrink-0 items-center gap-1.5 rounded-full whitespace-nowrap transition-[background-color,color,box-shadow] duration-[var(--nff-duration-fast)] nff-focus-ring'
const SIZE = {
  sm: 'min-h-10 px-3.5 nff-label-sm',
  md: 'min-h-11 px-4 nff-label-md sm:px-5',
} as const
const ACTIVE = 'bg-[var(--nff-forest-900)] text-[var(--nff-ivory-50)] shadow-nff-1'
const IDLE = 'text-nff-text-secondary hover:bg-[rgb(255_255_255/0.7)] hover:text-foreground'

/**
 * Generic pill button group: one track, one selected pill in forest. Use it
 * for every set of mutually exclusive choices on the public site (library
 * categories, topics, catalogue filters). Pass `onValueChange` for in-place
 * state or `hrefFor` when each choice is a URL. Scrolls sideways on narrow
 * screens and keeps the selected pill in view without moving the page.
 */
export function ButtonGroup<T extends string>(props: ButtonGroupProps<T>) {
  const { items, value, label, size = 'md', className } = props
  const trackRef = useRef<HTMLDivElement>(null)
  const moved = useRef(false)

  useEffect(() => {
    const track = trackRef.current
    const current = track?.querySelector<HTMLElement>('[data-selected="true"]')
    if (!track || !current || track.scrollWidth <= track.clientWidth) return
    const left = current.offsetLeft - (track.clientWidth - current.offsetWidth) / 2
    track.scrollTo({ left, behavior: moved.current ? 'smooth' : 'auto' })
    moved.current = true
  }, [value])

  const isLinks = 'hrefFor' in props && props.hrefFor !== undefined

  const children = items.map((item) => {
    const selected = item.value === value
    const content = (
      <>
        {item.label}
        {item.meta && (
          <span className={cn('tabular-nums', selected ? 'text-[var(--nff-sage-200)]' : 'text-nff-text-tertiary')}>
            {item.meta}
          </span>
        )}
      </>
    )
    const classes = cn(ITEM, SIZE[size], selected ? ACTIVE : IDLE)
    return isLinks ? (
      <Link
        key={item.value}
        to={props.hrefFor!(item.value)}
        aria-current={selected ? 'page' : undefined}
        data-selected={selected}
        className={classes}
      >
        {content}
      </Link>
    ) : (
      <button
        key={item.value}
        type="button"
        aria-pressed={selected}
        data-selected={selected}
        onClick={() => props.onValueChange!(item.value)}
        className={classes}
      >
        {content}
      </button>
    )
  })

  const Root = isLinks ? 'nav' : 'div'
  return (
    <Root
      aria-label={label}
      role={isLinks ? undefined : 'group'}
      className={cn('max-w-full', className)}
    >
      <div
        ref={trackRef}
        className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-[rgb(255_255_255/0.55)] p-1 ring-1 ring-nff-border-default [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </Root>
  )
}
