import {
  ChevronDown,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  Shield,
  SlidersHorizontal,
  User as UserIcon,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { initials, STAFF_ROLES } from '@/components/nff/header/navConfig'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/AuthProvider'
import { SOW_SCOPE } from '@/config/sowScope'

const itemClass =
  'cursor-pointer rounded-md px-2.5 py-2 nff-label-md focus:bg-nff-bg-hover'

const ACCOUNT_LINKS = [
  { label: 'My Profile', to: '/account/profile', icon: UserIcon },
  // Not in SOW v1.3 (see config/sowScope.ts).
  ...(SOW_SCOPE.playbackPreferences
    ? [{ label: 'Preferences', to: '/account/preferences', icon: SlidersHorizontal }]
    : []),
  { label: 'Email Preferences', to: '/account/email', icon: Mail },
  { label: 'Privacy & Security', to: '/account/privacy', icon: Shield },
  { label: 'Help & support', to: '/learn/support', icon: LifeBuoy },
]

/**
 * Avatar menu. Identity comes from the signed-in session. Radix supplies
 * Escape, outside click, arrow keys, focus return and the ARIA wiring.
 */
export function ProfileMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null
  const isStaff = STAFF_ROLES.includes(user.role)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${user.name}`}
        className="group inline-flex h-10 items-center gap-1.5 rounded-md py-1 pr-1.5 pl-1 transition-colors hover:bg-nff-bg-hover data-[state=open]:bg-nff-bg-hover nff-focus-ring"
      >
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-[var(--nff-forest-800)] nff-label-sm text-[var(--nff-ivory-50)]"
        >
          {initials(user.name)}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 text-nff-icon-secondary transition-transform group-data-[state=open]:rotate-180"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-md p-1.5">
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-2">
          <span className="truncate nff-label-md text-foreground">{user.name}</span>
          <span className="truncate nff-caption text-nff-text-secondary">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ACCOUNT_LINKS.map(({ label, to, icon: Icon }) => (
          <DropdownMenuItem key={to} asChild className={itemClass}>
            <Link to={to}>
              <Icon aria-hidden="true" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
        {isStaff && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className={itemClass}>
              <Link to="/cms">
                <LayoutDashboard aria-hidden="true" />
                Back to CMS
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={itemClass}
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
        >
          <LogOut aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
