import { ArrowDownRight, ArrowUpRight, Lock, UserCheck, UserX } from 'lucide-react'
import { useState } from 'react'
import { Initials, InlineNotice, useReturnFocus } from '@/components/admin'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/format'
import type { Actor } from '@/services/rbac/authorize'
import { getRolePermissions } from '@/services/rbac/authorize'
import { PERMISSION_LABELS } from '@/services/rbac/permissions'
import { assignableRolesFor } from '@/services/rbac/roleManagement'
import type { StaffMember } from '@/services/rbac/roleResolution'
import { ROLE_DEFINITIONS, STAFF_ROLE_IDS, getRoleLabel, isStaffRole, type StaffRole } from '@/services/rbac/roles'
import { previewRemoval, previewRoleChange } from '@/services/rbac/teamManagement'

/**
 * Edit one team member: their role (a dropdown limited to the roles the actor
 * may assign, with what the change grants and takes away) and their access
 * (deactivate or reactivate). Every rule is checked by the same service
 * previews the mutations use, so the dialog never offers a change the service
 * would refuse.
 */
export function TeamMemberDialog({
  member,
  actor,
  isSelf,
  canReactivate,
  onClose,
  onChangeRole,
  onDeactivate,
  onReactivate,
}: {
  member: StaffMember | null
  actor: Actor | null
  isSelf: boolean
  canReactivate: boolean
  onClose: () => void
  onChangeRole: (member: StaffMember, role: StaffRole) => void
  onDeactivate: (member: StaffMember) => void
  onReactivate: (member: StaffMember) => void
}) {
  const returnFocus = useReturnFocus(Boolean(member))
  return (
    <Dialog open={Boolean(member)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onCloseAutoFocus={returnFocus} className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        {member && (
          <MemberForm
            key={member.id}
            member={member}
            actor={actor}
            isSelf={isSelf}
            canReactivate={canReactivate}
            onClose={onClose}
            onChangeRole={onChangeRole}
            onDeactivate={onDeactivate}
            onReactivate={onReactivate}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function MemberForm({
  member,
  actor,
  isSelf,
  canReactivate,
  onClose,
  onChangeRole,
  onDeactivate,
  onReactivate,
}: {
  member: StaffMember
  actor: Actor | null
  isSelf: boolean
  canReactivate: boolean
  onClose: () => void
  onChangeRole: (member: StaffMember, role: StaffRole) => void
  onDeactivate: (member: StaffMember) => void
  onReactivate: (member: StaffMember) => void
}) {
  const current = isStaffRole(member.role) ? member.role : 'editor'
  const [role, setRole] = useState<StaffRole>(current)
  const [confirmingRemoval, setConfirmingRemoval] = useState(false)
  const assignable = assignableRolesFor(actor)
  const canEditRole = member.active && assignable.includes(current)
  const removal = previewRemoval(actor, member.id)
  const change = role === current ? null : previewRoleChange(actor, member.id, role)

  const before = getRolePermissions(current)
  const after = getRolePermissions(role)
  const gains = after.filter((permission) => !before.includes(permission))
  const losses = before.filter((permission) => !after.includes(permission))

  // Why the role is read-only, in the service's own words.
  const lockedReason = !member.active
    ? 'Reactivate this account before changing its role.'
    : assignable.length === 0
      ? 'Your role cannot change team roles.'
      : previewRoleChange(actor, member.id, assignable.find((entry) => entry !== current) ?? current).ok
        ? null
        : 'Only a Super admin can change an Admin or a Super admin.'

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <Initials name={member.name} className="size-10" />
          <div className="flex min-w-0 flex-col">
            <DialogTitle>
              {canEditRole ? 'Edit' : 'View'} {member.name}
              {isSelf && <span className="ml-2 nff-caption font-normal text-[var(--admin-text-muted)]">(you)</span>}
            </DialogTitle>
            <DialogDescription>
              {member.email} · Last login {formatDate(member.lastActiveAt)}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <section aria-labelledby="member-role" className="flex flex-col gap-3">
        <h3 id="member-role" className="nff-label-lg">
          Role
        </h3>
        {canEditRole ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="member-role-select">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as StaffRole)}>
              <SelectTrigger id="member-role-select" aria-label={`Role for ${member.name}`} className="w-full data-[size=default]:h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLE_IDS.map((entry) => (
                  <SelectItem key={entry} value={entry} disabled={!assignable.includes(entry)}>
                    {getRoleLabel(entry)}
                    {!assignable.includes(entry) && ' · Super admin only'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="nff-caption text-[var(--admin-text-muted)]">{ROLE_DEFINITIONS[role].description}</p>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-3">
            <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--admin-text-muted)]" />
            <div className="flex flex-col gap-0.5">
              <span className="nff-label-md">{getRoleLabel(member.role)}</span>
              <span className="nff-caption text-[var(--admin-text-muted)]">{lockedReason ?? ROLE_DEFINITIONS[current].description}</span>
            </div>
          </div>
        )}

        {change && !change.ok && <InlineNotice tone="error">{change.message}</InlineNotice>}
        {change?.ok && (
          <div aria-label="What changes" className="grid gap-3 rounded-lg border border-[var(--admin-border)] p-3 sm:grid-cols-2">
            <PermissionDelta icon={ArrowUpRight} title={`Gains ${gains.length}`} items={gains.map((entry) => PERMISSION_LABELS[entry])} tone="text-nff-text-success" />
            <PermissionDelta icon={ArrowDownRight} title={`Loses ${losses.length}`} items={losses.map((entry) => PERMISSION_LABELS[entry])} tone="text-nff-text-error" />
            <p className="nff-caption text-[var(--admin-text-muted)] sm:col-span-2">
              Takes effect at once{isSelf ? ', including for you' : ''}. Their next page load follows the new role.
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="member-access" className="flex flex-col gap-3 border-t border-[var(--admin-border)] pt-4">
        <h3 id="member-access" className="nff-label-lg">
          Access
        </h3>
        {member.active ? (
          confirmingRemoval ? (
            <div role="alert" className="flex flex-col gap-3 rounded-lg border border-nff-border-error bg-nff-bg-error-subtle p-3">
              <p className="nff-body-sm text-nff-text-error">
                Deactivate {member.name}? They cannot sign in until someone reactivates the account. Their role is kept.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="destructive" onClick={() => onDeactivate(member)}>
                  Deactivate access
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  autoFocus
                  onClick={() => {
                    setConfirmingRemoval(false)
                    setTimeout(() => document.getElementById('deactivate-member')?.focus(), 0)
                  }}
                >
                  Keep access
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="nff-body-sm text-[var(--admin-text-muted)]">
                {removal.ok ? 'Active. Deactivating stops them signing in.' : removal.message}
              </p>
              <Button id="deactivate-member" size="sm" variant="outline" disabled={!removal.ok} onClick={() => setConfirmingRemoval(true)}>
                <UserX aria-hidden="true" className="size-4" />
                Deactivate…
              </Button>
            </div>
          )
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="nff-body-sm text-[var(--admin-text-muted)]">Deactivated. They cannot sign in.</p>
            <Button size="sm" variant="outline" disabled={!canReactivate} onClick={() => onReactivate(member)}>
              <UserCheck aria-hidden="true" className="size-4" />
              Reactivate
            </Button>
          </div>
        )}
      </section>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {canEditRole ? 'Cancel' : 'Close'}
        </Button>
        {canEditRole && (
          <Button disabled={!change?.ok} onClick={() => onChangeRole(member, role)}>
            Save role
          </Button>
        )}
      </DialogFooter>
    </>
  )
}

function PermissionDelta({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: typeof ArrowUpRight
  title: string
  items: string[]
  tone: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className={`flex items-center gap-1 nff-label-md ${tone}`}>
        <Icon aria-hidden="true" className="size-4" />
        {title}
      </p>
      {items.length === 0 ? (
        <p className="nff-caption text-[var(--admin-text-muted)]">Nothing.</p>
      ) : (
        <ul className="flex flex-col gap-0.5 nff-caption">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
