import { useState } from 'react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { attempt } from '@/features/auth/usePermissions'
import { setContentOwnership, type CmsItem } from '@/services/cms'
import { can } from '@/services/rbac/authorize'
import { listStaffMembers } from '@/services/rbac/roleResolution'

const NONE = '__none__'

/**
 * Owner and collaborators for a content record, by account. Rendered only for
 * people who may manage ownership (Admin, Super admin). A legacy record shows
 * as unassigned until someone assigns it.
 */
export function OwnershipPanel({ item, onChanged }: { item: CmsItem; onChanged: () => void }) {
  const people = listStaffMembers().filter(
    (member) => member.active && can({ id: member.id, role: member.role }, 'content.edit'),
  )
  const [owner, setOwner] = useState(item.ownerId ?? NONE)
  const [collaborators, setCollaborators] = useState(item.collaboratorIds ?? [])

  function save(next: { ownerId?: string | null; collaboratorIds?: string[] }) {
    if (!attempt(() => setContentOwnership(item.id, next))) return
    toast.success('Ownership saved.')
    onChanged()
  }

  return (
    <fieldset className="flex flex-col gap-3 border-t pt-4">
      <legend className="nff-label-md">Ownership</legend>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="content-owner">Owner</Label>
        <Select
          value={owner}
          onValueChange={(value) => {
            setOwner(value)
            save({ ownerId: value === NONE ? null : value })
          }}
        >
          <SelectTrigger id="content-owner" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Unassigned</SelectItem>
            {people.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <span className="nff-label-sm text-muted-foreground">Collaborators</span>
        {people
          .filter((member) => member.id !== owner)
          .map((member) => (
            <label key={member.id} className="flex items-center gap-2 nff-body-sm">
              <Checkbox
                checked={collaborators.includes(member.id)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...collaborators, member.id]
                    : collaborators.filter((entry) => entry !== member.id)
                  setCollaborators(next)
                  save({ collaboratorIds: next })
                }}
              />
              {member.name}
            </label>
          ))}
      </div>
      <p className="nff-caption text-muted-foreground">
        {item.createdBy ? 'Created in the CMS by an account; the creator never changes.' : 'Legacy record: no creator is recorded.'}
      </p>
    </fieldset>
  )
}
