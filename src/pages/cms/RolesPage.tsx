import { Check, Minus, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/cms/CmsParts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { users } from '@/mocks/db'
import { memberRoles, setMemberRole } from '@/services/cms'
import type { Role } from '@/types'

type StaffRole = Exclude<Role, 'visitor' | 'practitioner'>

const ROLE_LABEL: Record<StaffRole, string> = {
  editor: 'Editor',
  campaign: 'Campaign manager',
  admin: 'Super admin',
}

const MATRIX: Array<[string, Record<Role, string>]> = [
  ['Public pages / catalogue', { visitor: 'View', practitioner: 'View', editor: 'View', campaign: 'View', admin: 'View' }],
  ['Preview playback', { visitor: 'Yes', practitioner: 'Yes', editor: 'Yes', campaign: '', admin: 'Yes' }],
  ['Full content + curriculum', { visitor: '', practitioner: 'Own', editor: 'Manage', campaign: '', admin: 'Oversee' }],
  ['Create/edit content, upload media', { visitor: '', practitioner: '', editor: 'Yes', campaign: '', admin: 'Yes' }],
  ['Publish', { visitor: '', practitioner: '', editor: 'Flag', campaign: '', admin: 'Yes' }],
  ['Campaigns, templates, delivery', { visitor: '', practitioner: '', editor: '', campaign: 'Yes', admin: 'Yes' }],
  ['Users, dashboards, score, roles', { visitor: '', practitioner: '', editor: '', campaign: '', admin: 'Yes' }],
]

interface Member {
  id: string
  name: string
  email: string
  role: StaffRole
  lastActiveAt: string
}

function initialMembers(): Member[] {
  const overrides = memberRoles()
  return users
    .filter((user) => user.role === 'editor' || user.role === 'campaign' || user.role === 'admin')
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: (overrides[user.id] ?? user.role) as StaffRole,
      lastActiveAt: user.lastActiveAt,
    }))
}

export function RolesPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [pending, setPending] = useState<
    { kind: 'role'; member: Member; role: StaffRole } | { kind: 'remove'; member: Member } | null
  >(null)
  const [inviting, setInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<StaffRole>('editor')

  if (user?.role !== 'admin') {
    return (
      <p role="alert" className="rounded-xl border p-4 nff-body-md">
        Permission denied. Only a super admin can manage roles.
      </p>
    )
  }

  const admins = members.filter((member) => member.role === 'admin').length

  function requestRole(member: Member, role: StaffRole) {
    if (member.role === 'admin' && role !== 'admin' && admins <= 1) {
      toast.error('There must always be at least one super admin.')
      return
    }
    setPending({ kind: 'role', member, role })
  }

  function confirm() {
    if (!pending) return
    if (pending.kind === 'role') {
      setMemberRole(pending.member.id, pending.role)
      setMembers((current) =>
        current.map((member) =>
          member.id === pending.member.id ? { ...member, role: pending.role } : member,
        ),
      )
      toast.success(`${pending.member.name} is now ${ROLE_LABEL[pending.role]}.`)
    } else {
      setMembers((current) => current.filter((member) => member.id !== pending.member.id))
      toast.success(`${pending.member.name} was removed from the team.`)
    }
    setPending(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Roles and permissions" />

      <Tabs defaultValue="members">
        <TabsList aria-label="Roles sections">
          <TabsTrigger value="members">Team members</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="flex flex-col gap-3 pt-4">
          <Button className="w-fit" onClick={() => setInviting(true)}>
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
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Select
                        value={member.role}
                        onValueChange={(value) => requestRole(member, value as StaffRole)}
                      >
                        <SelectTrigger aria-label={`Role for ${member.name}`} className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_LABEL) as StaffRole[]).map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABEL[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{formatDate(member.lastActiveAt)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={member.role === 'admin' && admins <= 1}
                        onClick={() => setPending({ kind: 'remove', member })}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="nff-caption text-muted-foreground">
            The last super admin cannot be removed or demoted.
          </p>
        </TabsContent>

        <TabsContent value="roles" className="pt-4">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Capability</TableHead>
                  {(['visitor', 'practitioner', 'editor', 'campaign', 'admin'] as Role[]).map((role) => (
                    <TableHead key={role} className="capitalize">
                      {role}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {MATRIX.map(([capability, cells]) => (
                  <TableRow key={capability}>
                    <TableCell className="font-medium">{capability}</TableCell>
                    {(['visitor', 'practitioner', 'editor', 'campaign', 'admin'] as Role[]).map((role) => (
                      <TableCell key={role}>
                        {cells[role] ? (
                          <span className="inline-flex items-center gap-1">
                            <Check aria-hidden="true" className="size-3.5 text-nff-text-success" />
                            {cells[role]}
                          </span>
                        ) : (
                          <Minus aria-label="No access" className="size-3.5 text-muted-foreground" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 nff-caption text-muted-foreground">Read-only for now.</p>
        </TabsContent>
      </Tabs>

      <AlertDialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === 'remove'
                ? `Remove ${pending.member.name}?`
                : pending
                  ? `Make ${pending.member.name} ${ROLE_LABEL[pending.role]}?`
                  : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === 'remove'
                ? 'They will lose access to the CMS immediately.'
                : 'Their access changes the next time they load a page.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={inviting} onOpenChange={setInviting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>They will get an email invitation.</DialogDescription>
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
                  {(Object.keys(ROLE_LABEL) as StaffRole[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!/^\S+@\S+\.\S+$/.test(inviteEmail)}
              onClick={() => {
                toast.success(`Invitation sent to ${inviteEmail} (demo).`)
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
