import { Check, Info, Minus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmationDialog, InlineNotice } from '@/components/admin'
import { ActionBar } from '@/components/cms/CmsParts'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { attempt } from '@/features/auth/usePermissions'
import { cn } from '@/lib/utils'
import type { Actor } from '@/services/rbac/authorize'
import { getRolePermissions } from '@/services/rbac/authorize'
import {
  PERMISSION_DEFINITIONS,
  PERMISSION_DOMAINS,
  PERMISSION_LABELS,
  PERMISSION_REQUIRES,
  permissionsInDomain,
  type Permission,
  type PermissionDomain,
} from '@/services/rbac/permissions'
import {
  LOCKED_PERMISSIONS,
  canEditRole,
  isEditableRole,
  isRoleCustomised,
  resetRolePermissions,
  setRolePermissions,
  togglePermission,
  type EditableRole,
} from '@/services/rbac/rolePermissions'
import type { StaffMember } from '@/services/rbac/roleResolution'
import { STAFF_ROLE_IDS, getRoleLabel, type StaffRole } from '@/services/rbac/roles'

export const DOMAIN_LABEL: Record<PermissionDomain, string> = {
  platform: 'Platform',
  content: 'Content',
  learning: 'Learning',
  people: 'People',
  insights: 'Insights',
  campaigns: 'Campaigns',
  settings: 'Settings',
}

const same = (a: readonly Permission[], b: readonly Permission[]) =>
  a.length === b.length && a.every((permission) => b.includes(permission))

/**
 * What each staff role can do, as one grid: a row per permission, a column
 * per role, a checkbox where they meet. Ticking one brings what it needs;
 * clearing one clears what depends on it. Changes are drafts until reviewed
 * and saved. Only a Super admin can edit.
 */
export function RolePermissionEditor({
  actor,
  members,
  onSaved,
}: {
  actor: Actor | null
  members: StaffMember[]
  onSaved: () => void
}) {
  const [drafts, setDrafts] = useState<Partial<Record<EditableRole, Permission[]>>>({})
  const [reviewing, setReviewing] = useState(false)
  const [resetting, setResetting] = useState<EditableRole | null>(null)
  const [hint, setHint] = useState('')
  const [, setVersion] = useState(0)

  const saved = (role: StaffRole) => getRolePermissions(role)
  const working = (role: StaffRole) => (isEditableRole(role) ? drafts[role] : undefined) ?? saved(role)
  const changed = (Object.keys(drafts) as EditableRole[]).filter((role) => !same(drafts[role]!, saved(role)))
  const memberCount = (role: StaffRole) => members.filter((member) => member.active && member.role === role).length
  const anyEditable = STAFF_ROLE_IDS.some((role) => canEditRole(actor, role).ok)

  function toggle(role: EditableRole, permission: Permission, on: boolean) {
    const before = working(role)
    const next = togglePermission(before, permission, on)
    const added = next.filter((entry) => !before.includes(entry) && entry !== permission)
    const removed = before.filter((entry) => !next.includes(entry) && entry !== permission)
    setDrafts((current) => ({ ...current, [role]: next }))
    setHint(
      added.length
        ? `${getRoleLabel(role)}: also turned on what it needs: ${added.map((entry) => PERMISSION_LABELS[entry]).join(', ')}.`
        : removed.length
          ? `${getRoleLabel(role)}: also turned off what depends on it: ${removed.map((entry) => PERMISSION_LABELS[entry]).join(', ')}.`
          : '',
    )
  }

  function saveAll() {
    const done = attempt(() => {
      for (const role of changed) setRolePermissions(role, drafts[role]!)
    })
    setReviewing(false)
    if (!done) return
    toast.success(changed.length === 1 ? `${getRoleLabel(changed[0])} permissions saved.` : 'Role permissions saved.')
    setDrafts({})
    setHint('')
    onSaved()
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      {!anyEditable && (
        <InlineNotice tone="info" title="View only">
          Only a Super admin can change what roles can do. You can see each role&rsquo;s permissions here.
        </InlineNotice>
      )}

      <p
        role="status"
        aria-live="polite"
        className={cn(
          'flex items-start gap-2 rounded-md border border-nff-border-info bg-nff-bg-info-subtle px-4 py-2.5 nff-body-sm text-nff-text-info',
          !hint && 'sr-only',
        )}
      >
        {hint && <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
        {hint}
      </p>

      <div className="admin-dt-frame">
        <table aria-label="Permissions by role" className="admin-matrix admin-matrix-edit w-full">
          <thead>
            <tr>
              <th scope="col" className="text-left">
                Actions
              </th>
              {STAFF_ROLE_IDS.map((role) => {
                const editable = canEditRole(actor, role).ok
                const dirty = isEditableRole(role) && changed.includes(role)
                return (
                  <th key={role} scope="col">
                    <span className="flex flex-col items-center gap-0.5">
                      <span>{getRoleLabel(role)}</span>
                      <span className="nff-caption font-normal text-[var(--admin-text-muted)]">
                        {memberCount(role)} {memberCount(role) === 1 ? 'member' : 'members'}
                      </span>
                      {dirty ? (
                        <span className="rounded-sm bg-nff-bg-warning-subtle px-1.5 nff-label-sm text-nff-text-warning">Unsaved</span>
                      ) : role === 'super_admin' ? (
                        <span className="nff-caption font-normal text-[var(--admin-text-muted)]">Fixed</span>
                      ) : isEditableRole(role) && isRoleCustomised(role) ? (
                        editable ? (
                          <button
                            type="button"
                            onClick={() => setResetting(role)}
                            aria-label={`Reset ${getRoleLabel(role)} to defaults`}
                            className="nff-caption font-medium text-nff-text-link underline underline-offset-2 nff-focus-ring"
                          >
                            Reset
                          </button>
                        ) : (
                          <span className="nff-caption font-normal text-nff-text-info">Customised</span>
                        )
                      ) : null}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_DOMAINS.flatMap((domain) => [
              <tr key={`domain-${domain}`} className="admin-matrix-group">
                <th scope="colgroup" colSpan={STAFF_ROLE_IDS.length + 1} className="text-left">
                  {DOMAIN_LABEL[domain]}
                </th>
              </tr>,
              ...permissionsInDomain(domain).map((permission) => {
                const needs = PERMISSION_REQUIRES[permission]
                return (
                  <tr key={permission}>
                    <th scope="row" className="text-left font-normal">
                      <span className="block nff-body-sm font-medium text-[var(--admin-text)]">
                        {PERMISSION_LABELS[permission]}
                      </span>
                      <span className="block nff-caption text-[var(--admin-text-muted)]">
                        {PERMISSION_DEFINITIONS[permission].description}
                        {needs && ` Requires ${needs.map((entry) => PERMISSION_LABELS[entry]).join(', ')}.`}
                      </span>
                    </th>
                    {STAFF_ROLE_IDS.map((role) => {
                      const locked = role !== 'super_admin' ? LOCKED_PERMISSIONS[permission] : undefined
                      const editable = canEditRole(actor, role).ok && isEditableRole(role)
                      return (
                        <td key={role}>
                          <span className="flex justify-center" title={locked?.reason}>
                            <Checkbox
                              checked={working(role).includes(permission)}
                              disabled={!editable || Boolean(locked)}
                              aria-label={`${PERMISSION_LABELS[permission]}, ${getRoleLabel(role)}`}
                              onCheckedChange={(next) => isEditableRole(role) && toggle(role, permission, next === true)}
                            />
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              }),
            ])}
          </tbody>
        </table>
      </div>
      <p className="nff-caption text-[var(--admin-text-muted)]">
        A Super admin always holds every permission, so the platform can never be locked out. Visitor and
        Practitioner hold no Admin permissions; what learners can open is set by content access rules.
      </p>

      {resetting && (
        <ConfirmationDialog
          open
          onOpenChange={(open) => !open && setResetting(null)}
          title={`Reset ${getRoleLabel(resetting)} to its default permissions?`}
          description={`Everyone with the ${getRoleLabel(resetting)} role gets the default permissions straight away, and any customisation is lost.`}
          confirmLabel="Reset to defaults"
          onConfirm={() => {
            const role = resetting
            setResetting(null)
            if (!attempt(() => resetRolePermissions(role))) return
            setDrafts((current) => {
              const next = { ...current }
              delete next[role]
              return next
            })
            setVersion((value) => value + 1)
            toast.success(`${getRoleLabel(role)} is back to its default permissions.`)
            onSaved()
          }}
        />
      )}

      {changed.length > 0 && (
        <ActionBar status={`Unsaved changes to ${changed.map((role) => getRoleLabel(role)).join(', ')}.`}>
          <Button
            variant="outline"
            onClick={() => {
              setDrafts({})
              setHint('')
            }}
          >
            Discard
          </Button>
          <Button onClick={() => setReviewing(true)}>Review and save</Button>
        </ActionBar>
      )}

      <Dialog open={reviewing} onOpenChange={setReviewing}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Save role permissions?</DialogTitle>
            <DialogDescription>
              Everyone with these roles gets the new permissions straight away: the sidebar, pages and actions follow them.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {changed.map((role) => {
              const before = saved(role)
              const after = drafts[role]!
              const granted = after.filter((entry) => !before.includes(entry))
              const removed = before.filter((entry) => !after.includes(entry))
              return (
                <section key={role} aria-label={getRoleLabel(role)} className="flex flex-col gap-2 rounded-lg border border-[var(--admin-border)] p-3">
                  <p className="nff-label-md">
                    {getRoleLabel(role)}
                    <span className="ml-2 nff-caption font-normal text-[var(--admin-text-muted)]">
                      affects {memberCount(role)} {memberCount(role) === 1 ? 'member' : 'members'}
                    </span>
                  </p>
                  <ul className="flex flex-col gap-1 nff-body-sm">
                    {granted.map((entry) => (
                      <li key={entry} className="flex items-center gap-2 text-nff-text-success">
                        <Check aria-hidden="true" className="size-4" />
                        <span>
                          <span className="sr-only">Grants </span>
                          {PERMISSION_LABELS[entry]}
                        </span>
                      </li>
                    ))}
                    {removed.map((entry) => (
                      <li key={entry} className="flex items-center gap-2 text-nff-text-error">
                        <Minus aria-hidden="true" className="size-4" />
                        <span>
                          <span className="sr-only">Removes </span>
                          {PERMISSION_LABELS[entry]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(false)}>
              Keep editing
            </Button>
            <Button onClick={saveAll}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
