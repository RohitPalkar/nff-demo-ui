import {
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Sun,
  User as UserIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Link, useNavigate } from 'react-router-dom'
import { BrandLogo } from '@/components/nff/BrandLogo'
import { ThemeToggle } from '@/components/nff/ThemeToggle'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { BRAND } from '@/config/brand'
import { useAuth } from '@/features/auth/AuthProvider'
import { FLAGS } from '@/config/flags'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Foundations', href: '/?tab=foundations' },
  { label: 'Understand', href: '/?tab=understand' },
  { label: 'Contemplate', href: '/?tab=contemplate' },
  { label: 'Explore', href: '/explorations' },
  { label: 'About', href: '/about/who-we-are' },
]

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { setTheme } = useTheme()

  const navItems = FLAGS.homeTabsInGlobalNav
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => !item.href.includes('?tab='))

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="nff-content flex h-[var(--nff-layout-header-height)] items-center gap-4">
        <BrandLogo />

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.href}
                  className="inline-flex min-h-11 items-center rounded-md px-3 nff-label-md text-muted-foreground transition-colors hover:bg-nff-bg-hover hover:text-foreground nff-focus-ring"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 gap-2 px-2"
                  aria-label="Account menu"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-8 items-center justify-center rounded-full bg-nff-bg-brand-subtle nff-label-sm text-nff-text-brand"
                  >
                    {initials(user.name)}
                  </span>
                  <span className="hidden nff-label-md sm:inline">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown aria-hidden="true" className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="nff-label-md">{user.name}</span>
                  <span className="nff-caption text-muted-foreground">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account/profile">
                    <UserIcon aria-hidden="true" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/email">Email preferences</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/privacy">Privacy</Link>
                </DropdownMenuItem>
                {user.role === 'practitioner' && (
                  <DropdownMenuItem asChild>
                    <Link to="/journey">My journey</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="nff-caption text-muted-foreground">
                  Theme
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun aria-hidden="true" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon aria-hidden="true" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  <Monitor aria-hidden="true" />
                  System
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                >
                  <LogOut aria-hidden="true" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                className="hidden h-11 px-4 sm:inline-flex"
              >
                <Link to="/login">
                  <LogIn aria-hidden="true" className="size-4" />
                  Log in
                </Link>
              </Button>
              <Button asChild className="h-11 px-4">
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-sm">
              <SheetHeader>
                <SheetTitle>{BRAND.productName}</SheetTitle>
                <SheetDescription>Menu</SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile" className="mt-4 flex flex-col gap-1 px-4">
                {navItems.map((item) => (
                  <SheetClose asChild key={item.label}>
                    <Link
                      to={item.href}
                      className="inline-flex min-h-11 items-center rounded-md px-3 nff-body-md text-foreground hover:bg-nff-bg-hover nff-focus-ring"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                <div className="my-2 h-px bg-border" />
                {user ? (
                  <>
                    <SheetClose asChild>
                      <Link
                        to="/account/profile"
                        className="inline-flex min-h-11 items-center rounded-md px-3 nff-body-md hover:bg-nff-bg-hover nff-focus-ring"
                      >
                        Profile
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/account/email"
                        className="inline-flex min-h-11 items-center rounded-md px-3 nff-body-md hover:bg-nff-bg-hover nff-focus-ring"
                      >
                        Email preferences
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/account/privacy"
                        className="inline-flex min-h-11 items-center rounded-md px-3 nff-body-md hover:bg-nff-bg-hover nff-focus-ring"
                      >
                        Privacy
                      </Link>
                    </SheetClose>
                    <Button
                      variant="outline"
                      className="mt-2 h-11"
                      onClick={() => {
                        logout()
                        navigate('/')
                      }}
                    >
                      <LogOut aria-hidden="true" className="size-4" />
                      Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link
                        to="/login"
                        className={cn(
                          'inline-flex min-h-11 items-center rounded-md px-3 nff-body-md hover:bg-nff-bg-hover nff-focus-ring',
                        )}
                      >
                        Log in
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild className="mt-2 h-11">
                        <Link to="/signup">Sign up free</Link>
                      </Button>
                    </SheetClose>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
