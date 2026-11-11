import { Check, Minus, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/cms/CmsParts'
import { ConfirmationDialog, useReturnFocus } from '@/components/admin'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatDate } from '@/lib/format'
import { attempt, usePermissions } from '@/features/auth/usePermissions'
import { setUserStatus } from '@/services/cms'
import { changeMemberRole, previewRemoval, previewRoleChange, removeMember } from '@/services/rbac/teamManagement'
import { listStaffMembers, type StaffMember } from '@/services/rbac/roleResolution'
import { assignableRolesFor } from '@/services/rbac/roleManagement'
import { PERMISSION_DEFINITIONS, PERMISSION_DOMAINS, permissionsInDomain } from '@/services/rbac/permissions'
import { ROLE_DEFINITIONS, ROLE_IDS, getRoleLabel, type StaffRole } from '@/services/rbac/roles'

const DOMAIN_LABEL: Record<(typeof PERMISSION_DOMAINS)[number], string> = {
  platform: 'Platform',
  content: 'Content',
  learning: 'Learning',
  people: 'People',
  insights: 'Insights',
  campaigns: 'Campaigns',
  settings: 'Settings',
}

export function RolesPage() {
  const { user, refresh } = useAuth()
  const { actor, can } = usePermissions()
  const [members, setMembers] = useState<StaffMember[]>(listStaffMembers)
  const [pending, setPending] = useState<
    { kind: 'role'; member: StaffMember; role: StaffRole } | { kind: 'remove'; member: StaffMember } | null
  >(null)
  const [inviting, setInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const assignable = assignableRolesFor(actor)
  const [inviteRole, setInviteRole] = useState<StaffRole>(assignable[0] ?? 'editor')

  const returnInviteFocus = useReturnFocus(inviting)
  const reload = () => setMembers(listStaffMembers())
  const canSeeTeam = can('team.view')
  const canSeeRoles = can('roles.view')

  function requestRole(member: StaffMember, role: StaffRole) {
    // Say why now, before the confirmation, if the change is not allowed.
    const result = previewRoleChange(actor, member.id, role)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    setPending({ kind: 'role', member, role })
  }

  function confirm() {
    if (!pending) return
    if (pending.kind === 'role') {
      const done = attempt(() => changeMemberRole(pending.member.id, pending.role))
      if (done) {
        toast.success(`${pending.member.name} is now ${getRoleLabel(pending.role)}.`)
        // Changing your own role changes your own permissions straight away.
        if (pending.member.id === user?.id) refresh()
      }
    } else {
      const done = attempt(() => removeMember(pending.member.id))
      if (done) toast.success(`${pending.member.name} was deactivated.`)
    }
    reload()
    setPending(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Team & Roles" description="Staff, their roles, and what each role can do." />

      <Tabs defaultValue={canSeeTeam ? 'members' : 'roles'}>
        <TabsList aria-label="Roles sections">
          {canSeeTeam && <TabsTrigger value="members">Team members</TabsTrigger>}
          {canSeeRoles && <TabsTrigger value="roles">Roles</TabsTrigger>}
        </TabsList>

        {canSeeTeam && (
          <TabsContent value="members" className="flex flex-col gap-3 pt-4">
            <Button className="w-fit" disabled={!can('team.invite')} onClick={() => setInviting(true)}>
              <UserPlus aria-hidden="true" className="size-4" />
              Invite member
            </Button>
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last login</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const editable = (assignable as readonly string[]).includes(member.role)
                    const removal = previewRemoval(actor, member.id)
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.name}
                          {member.id === user?.id && (
                            <span className="ml-2 nff-caption text-muted-foreground">(you)</span>
                          )}
                          {!member.active && (
                            <span className="ml-2 nff-caption text-muted-foreground">Deactivated</span>
                          )}
                        </TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          {editable && member.active ? (
                            <Select
                              value={member.role}
                              onValueChange={(value) => requestRole(member, value as StaffRole)}
                            >
                              <SelectTrigger aria-label={`Role for ${member.name}`} className="w-48">
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
                          ) : (
                            <span title="You cannot change roles at or above your own level.">
                              {getRoleLabel(member.role)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(member.lastActiveAt)}</TableCell>
                        <TableCell>
                          {member.active ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!removal.ok}
                              title={removal.ok ? undefined : removal.message}
                              onClick={() => setPending({ kind: 'remove', member })}
                            >
                              Remove
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!can('team.remove') || !editable}
                              onClick={() => {
                                if (!attempt(() => setUserStatus(member.id, 'active'))) return
                                toast.success(`${member.name} was reactivated.`)
                                reload()
                              }}
                            >
                              Reactivate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="nff-caption text-muted-foreground">
              The last active Super admin cannot be removed or demoted. Admins can assign Editor and Campaign
              manager only; only a Super admin can grant Admin or Super admin.
            </p>
          </TabsContent>
        )}

        {canSeeRoles && (
          <TabsContent value="roles" className="pt-4">
            <div className="overflow-x-auto rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    {ROLE_IDS.map((role) => (
                      <TableHead key={role}>{getRoleLabel(role)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSION_DOMAINS.flatMap((domain) => [
                    <TableRow key={`domain-${domain}`} className="bg-nff-bg-muted">
                      <TableCell colSpan={ROLE_IDS.length + 1} className="nff-label-md">
                        {DOMAIN_LABEL[domain]}
                      </TableCell>
                    </TableRow>,
                    ...permissionsInDomain(domain).map((permission) => (
                      <TableRow key={permission}>
                        <TableCell>
                          <span className="font-medium">{permission}</span>
                          <span className="block nff-caption text-muted-foreground">
                            {PERMISSION_DEFINITIONS[permission].description}
                          </span>
                        </TableCell>
                        {ROLE_IDS.map((role) => (
                          <TableCell key={role}>
                            {ROLE_DEFINITIONS[role].permissions.includes(permission) ? (
                              <Check aria-label="Allowed" className="size-3.5 text-nff-text-success" />
                            ) : (
                              <Minus aria-label="Not allowed" className="size-3.5 text-muted-foreground" />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    )),
                  ])}
                </TableBody>
              </Table>
            </div>
            <p className="mt-2 nff-caption text-muted-foreground">
              Read-only. These defaults are fixed in code in this prototype; editing permissions is not available.
            </p>
          </TabsContent>
        )}
      </Tabs>

      <ConfirmationDialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending?.kind === 'remove'
            ? `Remove ${pending.member.name}?`
            : pending
              ? `Make ${pending.member.name} ${getRoleLabel(pending.role)}?`
              : ''
        }
        description={
          pending?.kind === 'remove'
            ? 'Their account is deactivated: they cannot sign in until someone reactivates it.'
            : 'Their access changes immediately. Their permissions follow the new role.'
        }
        onConfirm={confirm}
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
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as StaffRole)}>
                <SelectTrigger id="invite-role" className="w-full">
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
