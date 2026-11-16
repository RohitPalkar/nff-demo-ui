import { CheckCircle2, ShieldCheck, UserPlus, Users, UserX } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/cms/CmsParts'
import { RolePermissionEditor } from '@/components/cms/RolePermissionEditor'
import { TeamMemberDialog } from '@/components/cms/TeamMemberDialog'
import { CellStack, DataTable, Initials, useReturnFocus, type DataTableColumn } from '@/components/admin'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/AuthProvider'
import { attempt, usePermissions } from '@/features/auth/usePermissions'
import { formatDate } from '@/lib/format'
import { setUserStatus } from '@/services/cms'
import { assignableRolesFor } from '@/services/rbac/roleManagement'
import { listStaffMembers, type StaffMember } from '@/services/rbac/roleResolution'
import { STAFF_ROLE_IDS, getRoleLabel, isStaffRole, type StaffRole } from '@/services/rbac/roles'
import { changeMemberRole, removeMember } from '@/services/rbac/teamManagement'

export function RolesPage() {
  const { user, refresh } = useAuth()
  const { actor, can } = usePermissions()
  const [members, setMembers] = useState<StaffMember[]>(listStaffMembers)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [inviting, setInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const assignable = assignableRolesFor(actor)
  const [inviteRole, setInviteRole] = useState<StaffRole>(assignable[0] ?? 'editor')

  const returnInviteFocus = useReturnFocus(inviting)
  const reload = () => setMembers(listStaffMembers())
  const canSeeTeam = can('team.view')
  const canSeeRoles = can('roles.view')

  function afterChange(member: StaffMember) {
    reload()
    setEditing(null)
    // Your own role or permissions change what you can do at once.
    if (member.id === user?.id) refresh()
  }

  const manageable = (member: StaffMember) => isStaffRole(member.role) && assignable.includes(member.role)

  const columns: Array<DataTableColumn<StaffMember>> = [
    {
      id: 'name',
      header: 'Member',
      primary: true,
      sortValue: (member) => member.name,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <Initials name={member.name} />
          <CellStack
            title={
              <>
                {member.name}
                {member.id === user?.id && <span className="ml-1.5 nff-caption font-normal text-[var(--admin-text-muted)]">(you)</span>}
              </>
            }
            meta={member.email}
          />
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      sortValue: (member) => member.role,
      cell: (member) => (
        <span className="inline-flex items-center gap-1.5 nff-body-sm">
          <ShieldCheck aria-hidden="true" className="size-4 text-[var(--admin-text-muted)]" />
          {getRoleLabel(member.role)}
        </span>
      ),
    },
    {
      id: 'access',
      header: 'Access',
      sortValue: (member) => (member.active ? 0 : 1),
      cell: (member) =>
        member.active ? (
          <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-nff-border-success bg-nff-bg-success-subtle px-2 nff-label-sm text-nff-text-success">
            <CheckCircle2 aria-hidden="true" className="size-3.5" />
            Active
          </span>
        ) : (
          <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-[var(--admin-border)] bg-nff-bg-muted px-2 nff-label-sm text-[var(--admin-text-muted)]">
            <UserX aria-hidden="true" className="size-3.5" />
            Deactivated
          </span>
        ),
    },
    {
      id: 'last',
      header: 'Last login',
      sortValue: (member) => member.lastActiveAt,
      cell: (member) => <span className="tabular-nums">{formatDate(member.lastActiveAt)}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      hideHeader: true,
      cell: (member) => {
        const edit = manageable(member)
        return (
          <Button
            size="sm"
            variant="outline"
            aria-label={`${edit ? 'Edit' : 'View'} ${member.name}`}
            onClick={() => setEditing(member)}
          >
            {edit ? 'Edit' : 'View'}
          </Button>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Team & Roles" description="Who works in the Admin, their roles, and what each role can do." />

      <Tabs defaultValue={canSeeTeam ? 'members' : 'roles'}>
        <TabsList aria-label="Team and roles sections">
          {canSeeTeam && <TabsTrigger value="members">Team members</TabsTrigger>}
          {canSeeRoles && <TabsTrigger value="roles">Roles &amp; permissions</TabsTrigger>}
        </TabsList>

        {canSeeTeam && (
          <TabsContent value="members" className="flex flex-col gap-3 pt-4">
            <DataTable
              caption="Team members"
              noun="member"
              rows={members}
              columns={columns}
              getRowId={(member) => member.id}
              initialSort={{ id: 'name', direction: 'asc' }}
              search={{ placeholder: 'Search name or email', text: (member) => [member.name, member.email] }}
              filters={[
                {
                  id: 'role',
                  label: 'Role',
                  options: STAFF_ROLE_IDS.map((role) => ({ value: role, label: getRoleLabel(role) })),
                  predicate: (member, value) => member.role === value,
                },
                {
                  id: 'access',
                  label: 'Access',
                  options: [
                    { value: 'active', label: 'Active' },
                    { value: 'deactivated', label: 'Deactivated' },
                  ],
                  predicate: (member, value) => (value === 'active') === member.active,
                },
              ]}
              rowClassName={(member) => (member.active ? undefined : 'bg-[var(--admin-surface-subtle)]')}
              actions={
                can('team.invite') && (
                  <Button size="sm" className="h-11" onClick={() => setInviting(true)}>
                    <UserPlus aria-hidden="true" className="size-4" />
                    Invite member
                  </Button>
                )
              }
              empty={{ icon: Users, title: 'No team members', description: 'Invite staff to work in the Admin.' }}
            />
            <ul className="flex flex-col gap-1 nff-caption text-[var(--admin-text-muted)]">
              <li>Admins assign Editor and Campaign manager. Only a Super admin can grant Admin or Super admin.</li>
              <li>The last active Super admin cannot be deactivated or demoted, and nobody can remove their own access.</li>
            </ul>
          </TabsContent>
        )}

        {canSeeRoles && (
          <TabsContent value="roles" className="pt-4">
            <RolePermissionEditor
              actor={actor}
              members={members}
              onSaved={() => {
                reload()
                refresh()
              }}
            />
          </TabsContent>
        )}
      </Tabs>

      <TeamMemberDialog
        member={editing}
        actor={actor}
        isSelf={editing?.id === user?.id}
        canReactivate={Boolean(editing && can('team.remove') && manageable(editing))}
        onClose={() => setEditing(null)}
        onChangeRole={(member, role) => {
          if (!attempt(() => changeMemberRole(member.id, role))) return
          toast.success(`${member.name} is now ${getRoleLabel(role)}.`)
          afterChange(member)
        }}
        onDeactivate={(member) => {
          if (!attempt(() => removeMember(member.id))) return
          toast.success(`${member.name} was deactivated.`)
          afterChange(member)
        }}
        onReactivate={(member) => {
          if (!attempt(() => setUserStatus(member.id, 'active'))) return
          toast.success(`${member.name} was reactivated.`)
          afterChange(member)
        }}
      />

      <Dialog open={inviting} onOpenChange={setInviting}>
        <DialogContent onCloseAutoFocus={returnInviteFocus}>
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>
              Invitations are not sent in this prototype. This records nothing and emails no one.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as StaffRole)}>
                <SelectTrigger id="invite-role" className="w-full data-[size=default]:h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignable.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!/^\S+@\S+\.\S+$/.test(inviteEmail) || !can('team.invite')}
              onClick={() => {
                toast.info('Invitations are not available in this prototype. Nothing was sent.')
                setInviteEmail('')
                setInviting(false)
              }}
            >
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
