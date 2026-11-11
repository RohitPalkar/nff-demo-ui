import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Mail,
  Route,
  Shield,
  Sparkles,
  User as UserIcon,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/AuthProvider'
import { STAFF_ROLES, initials } from './navConfig'

const itemClass = 'cursor-pointer rounded-lg px-2.5 py-2 nff-label-md focus:bg-nff-bg-hover'

/** Signed-in account menu: Profile, Email, Privacy, journeys, CMS (staff), Log out. */
export function AccountMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null
  const isPractitioner = user.role === 'practitioner'
  const isStaff = STAFF_ROLES.includes(user.role)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${user.name}`}
        className="group inline-flex h-10 items-center gap-2 rounded-full py-1 pr-2.5 pl-1 text-[var(--nff-nav-fg)] transition-colors hover:bg-[var(--nff-nav-bg-hover)] hover:text-foreground nff-focus-ring"
      >
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-nff-bg-tonal nff-label-sm text-nff-text-brand"
        >
          {initials(user.name)}
        </span>
        <span className="hidden nff-nav xl:inline">{user.name.split(' ')[0]}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 transition-transform group-data-[state=open]:rotate-180"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-64 rounded-xl p-2">
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-2">
          <span className="nff-label-md text-foreground">{user.name}</span>
          <span className="truncate nff-caption text-nff-text-secondary">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isPractitioner && (
          <>
            <DropdownMenuItem asChild className={itemClass}>
              <Link to="/journey">
                <Route aria-hidden="true" />
                Journey
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={itemClass}>
              <Link to="/my-journey">
                <Sparkles aria-hidden="true" />
                My Journey
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {isStaff && (
          <>
            <DropdownMenuItem asChild className={itemClass}>
              <Link to="/cms">
                <LayoutDashboard aria-hidden="true" />
                CMS
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild className={itemClass}>
          <Link to="/account/profile">
            <UserIcon aria-hidden="true" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={itemClass}>
          <Link to="/account/email">
            <Mail aria-hidden="true" />
            Email preferences
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={itemClass}>
          <Link to="/account/privacy">
            <Shield aria-hidden="true" />
            Privacy
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={itemClass}
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
  )
}
