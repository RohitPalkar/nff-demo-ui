import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BrandLogo } from '@/components/nff/BrandLogo'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { LEARN_HOME } from '@/services/learning/routes'
import { LEARN_NAV, isLearnNavActive } from './navItems'

/**
 * Menu sheet for screens under 768px. Radix Dialog gives focus trapping,
 * Escape, outside click and returns focus to the button on close. No bottom
 * bar: the audio mini-player owns the bottom edge.
 */
export function LearnMobileNav() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 rounded-md md:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 bg-nff-bg-surface p-0 sm:max-w-sm"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <BrandLogo to={LEARN_HOME} />
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 rounded-md"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </Button>
          </SheetClose>
        </div>
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Practitioner navigation</SheetDescription>
        <nav aria-label="Mobile" className="flex flex-col py-2">
          <ul>
            {LEARN_NAV.map((item) => {
              const active = isLearnNavActive(item.to, pathname)
              return (
                <li key={item.to} className="border-b border-nff-border-default last:border-b-0">
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-14 items-center border-l-2 px-4 nff-heading-h4 transition-colors nff-focus-ring',
                      active
                        ? 'border-[var(--nff-accent-active)] bg-[var(--nff-bg-active)] text-[var(--nff-text-active)]'
                        : 'border-transparent text-nff-text-secondary hover:bg-[var(--nff-sage-50)] hover:text-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
