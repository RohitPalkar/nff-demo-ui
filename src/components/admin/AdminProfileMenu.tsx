import { ChevronsUpDown, ExternalLink, Eye, LifeBuoy, LogOut } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { isPreviewRole } from '@/services/learning/previewRoles'
import { LEARN_HOME } from '@/services/learning/routes'
import { getRoleLabel } from '@/services/rbac/roles'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')

/**
 * The signed-in account: name, email and role from the real session, and
 * only actions that exist. The learner preview link is offered to the roles
 * that may preview the learner area (read-only); everyone gets the public
 * site and Log out.
 */
export function AdminProfileMenu({
  variant,
  collapsed = false,
}: {
  /** `sidebar`: a full-width row at the foot of the sidebar. `topbar`: an avatar button. */
  variant: 'sidebar' | 'topbar'
  collapsed?: boolean
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null
  const role = getRoleLabel(user.role)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${user.name}, ${role}`}
        className={cn(
          'flex items-center gap-3 rounded-md text-left transition-colors hover:bg-nff-bg-hover data-[state=open]:bg-nff-bg-hover nff-focus-ring',
          variant === 'sidebar' ? 'w-full p-2' : 'h-9 p-1',
          collapsed && 'justify-center',
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--admin-primary)] nff-label-sm text-[var(--nff-ivory-50)]"
        >
          {initials(user.name)}
        </span>
        {variant === 'sidebar' && !collapsed && (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate nff-label-md text-[var(--admin-text)]">{user.name}</span>
              <span className="truncate nff-caption text-[var(--admin-text-muted)]">{role}</span>
            </span>
            <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-[var(--admin-text-muted)]" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === 'sidebar' ? 'start' : 'end'} side={variant === 'sidebar' ? 'top' : 'bottom'} className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate nff-label-md">{user.name}</span>
          <span className="truncate nff-caption font-normal text-muted-foreground">{user.email}</span>
          <span className="nff-caption font-normal text-muted-foreground">{role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isPreviewRole(user.role) && (
          <DropdownMenuItem asChild>
            <Link to={LEARN_HOME}>
              <Eye aria-hidden="true" />
              Preview the learner area
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/">
            <ExternalLink aria-hidden="true" />
            Public website
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/contact">
            <LifeBuoy aria-hidden="true" />
            Help &amp; support
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
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
