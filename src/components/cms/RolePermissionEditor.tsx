import { Check, Lock, Minus, RotateCcw, ShieldCheck } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { attempt } from '@/features/auth/usePermissions'
import { cn } from '@/lib/utils'
import type { Actor } from '@/services/rbac/authorize'
import { getRolePermissions } from '@/services/rbac/authorize'
import {
  ALL_PERMISSIONS,
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
import { ROLE_DEFINITIONS, STAFF_ROLE_IDS, getRoleLabel, type StaffRole } from '@/services/rbac/roles'

export const DOMAIN_LABEL: Record<PermissionDomain, string> = {
  platform: 'Platform',
  content: 'Content',
  learning: 'Learning',
  people: 'People',
  insights: 'Insights',
  campaigns: 'Campaigns',
  settings: 'Settings',
}

type Mode = StaffRole | 'compare'

const same = (a: readonly Permission[], b: readonly Permission[]) =>
  a.length === b.length && a.every((permission) => b.includes(permission))

/**
 * What each staff role can do, and (for a Super admin) changing it. Pick a
 * role on the left; its permissions are grouped by area on the right, each a
 * switch. Turning one on brings what it needs; turning one off takes what
 * depends on it. Changes are drafts until reviewed and saved.
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
  const [mode, setMode] = useState<Mode>('editor')
  const [drafts, setDrafts] = useState<Partial<Record<EditableRole, Permission[]>>>({})
  const [reviewing, setReviewing] = useState(false)
  const [resetting, setResetting] = useState(false)
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
        ? `Also turned on what it needs: ${added.map((entry) => PERMISSION_LABELS[entry]).join(', ')}.`
        : removed.length
          ? `Also turned off what depends on it: ${removed.map((entry) => PERMISSION_LABELS[entry]).join(', ')}.`
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

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="Roles" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {STAFF_ROLE_IDS.map((role) => {
            const count = working(role).length
            const dirty = isEditableRole(role) && changed.includes(role)
            return (
              <button
                key={role}
                type="button"
                aria-current={mode === role ? 'true' : undefined}
                onClick={() => setMode(role)}
                className={cn(
                  'flex min-w-48 flex-col gap-1 rounded-lg border p-3 text-left nff-focus-ring lg:min-w-0',
                  mode === role
                    ? 'border-[var(--admin-primary)] bg-[var(--admin-nav-active-bg)]'
                    : 'border-[var(--admin-border)] bg-[var(--admin-surface)] hover:border-[var(--admin-border-strong)]',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="nff-label-md">{getRoleLabel(role)}</span>
                  {dirty ? (
                    <span className="rounded-sm bg-nff-bg-warning-subtle px-1.5 nff-label-sm text-nff-text-warning">Unsaved</span>
                  ) : isRoleCustomised(role) ? (
                    <span className="rounded-sm bg-nff-bg-info-subtle px-1.5 nff-label-sm text-nff-text-info">Customised</span>
                  ) : role === 'super_admin' ? (
                    <Lock aria-label="Fixed" className="size-3.5 text-[var(--admin-text-muted)]" />
                  ) : null}
                </span>
                <span className="nff-caption text-[var(--admin-text-muted)]">
                  {count} of {ALL_PERMISSIONS.length} permissions · {memberCount(role)} {memberCount(role) === 1 ? 'member' : 'members'}
                </span>
              </button>
            )
          })}
          <button
            type="button"
            aria-current={mode === 'compare' ? 'true' : undefined}
            onClick={() => setMode('compare')}
            className={cn(
              'flex min-w-40 items-center gap-2 rounded-lg border border-dashed p-3 text-left nff-label-md nff-focus-ring lg:min-w-0',
              mode === 'compare' ? 'border-[var(--admin-primary)] bg-[var(--admin-nav-active-bg)]' : 'border-[var(--admin-border-strong)]',
            )}
          >
            Compare all roles
          </button>
        </nav>

        {mode === 'compare' ? (
          <CompareMatrix working={working} />
        ) : (
          <RolePanel
            key={mode}
            role={mode}
            actor={actor}
            permissions={working(mode)}
            hint={hint}
            onToggle={(permission, on) => isEditableRole(mode) && toggle(mode, permission, on)}
            onReset={() => setResetting(true)}
          />
        )}
        {mode !== 'compare' && isEditableRole(mode) && (
          <ConfirmationDialog
            open={resetting}
            onOpenChange={setResetting}
            title={`Reset ${getRoleLabel(mode)} to its default permissions?`}
            description={`Everyone with the ${getRoleLabel(mode)} role gets the default permissions straight away, and any customisation is lost.`}
            confirmLabel="Reset to defaults"
            onConfirm={() => {
              setResetting(false)
              if (!isEditableRole(mode)) return
              if (!attempt(() => resetRolePermissions(mode))) return
              setDrafts((current) => {
                const next = { ...current }
                delete next[mode]
                return next
              })
              setVersion((value) => value + 1)
              toast.success(`${getRoleLabel(mode)} is back to its default permissions.`)
              onSaved()
            }}
          />
        )}
      </div>

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

function RolePanel({
  role,
  actor,
  permissions,
  hint,
  onToggle,
  onReset,
}: {
  role: StaffRole
  actor: Actor | null
  permissions: readonly Permission[]
  hint: string
  onToggle: (permission: Permission, on: boolean) => void
  onReset: () => void
}) {
  const editable = canEditRole(actor, role)
  const customised = isRoleCustomised(role)
  return (
    <section aria-labelledby="role-panel-title" className="flex min-w-0 flex-col gap-4">
      <header className="flex flex-col gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="role-panel-title" className="flex items-center gap-2 admin-section-title">
            <ShieldCheck aria-hidden="true" className="size-5 text-[var(--admin-primary)]" />
            {getRoleLabel(role)}
          </h2>
          <p className="nff-body-sm text-[var(--admin-text-muted)]">{ROLE_DEFINITIONS[role].description}</p>
          {role === 'super_admin' ? (
            <p className="nff-caption text-[var(--admin-text-muted)]">
              Fixed: a Super admin always holds every permission, so the platform can never be locked out.
            </p>
          ) : (
            <p className="nff-caption text-[var(--admin-text-muted)]">
              {customised ? 'Customised by a Super admin.' : 'Using the default permissions.'}{' '}
              Can assign: {ROLE_DEFINITIONS[role].assignableRoles.map((entry) => getRoleLabel(entry)).join(', ') || 'no roles'}.
            </p>
          )}
        </div>
        {editable.ok && customised && (
          <Button size="sm" variant="outline" onClick={onReset}>
            <RotateCcw aria-hidden="true" className="size-4" />
            Reset to defaults
          </Button>
        )}
      </header>

      <p role="status" aria-live="polite" className={cn('nff-caption text-[var(--admin-text-muted)]', !hint && 'sr-only')}>
        {hint}
      </p>

      <div className="grid gap-4 xl:grid-cols-2">
        {PERMISSION_DOMAINS.map((domain) => {
          const list = permissionsInDomain(domain)
          const on = list.filter((permission) => permissions.includes(permission)).length
          return (
            <fieldset
              key={domain}
              className="flex min-w-0 flex-col rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)]"
            >
              <legend className="sr-only">{DOMAIN_LABEL[domain]}</legend>
              <div aria-hidden="true" className="flex items-center justify-between border-b border-[var(--admin-border)] px-4 py-2.5">
                <span className="nff-label-md">{DOMAIN_LABEL[domain]}</span>
                <span className="nff-caption tabular-nums text-[var(--admin-text-muted)]">
                  {on} of {list.length}
                </span>
              </div>
              <ul className="flex flex-col divide-y divide-[var(--admin-border)]">
                {list.map((permission) => {
                  const locked = role !== 'super_admin' ? LOCKED_PERMISSIONS[permission] : undefined
                  const checked = permissions.includes(permission)
                  const disabled = !editable.ok || Boolean(locked)
                  const needs = PERMISSION_REQUIRES[permission]
                  const id = `perm-${role}-${permission}`
                  return (
                    <li key={permission} className="flex items-start gap-3 px-4 py-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <label htmlFor={id} className="nff-label-md">
                          {PERMISSION_LABELS[permission]}
                        </label>
                        <span className="nff-caption text-[var(--admin-text-muted)]">
                          {PERMISSION_DEFINITIONS[permission].description}
                        </span>
                        <span className="flex flex-wrap gap-x-2 nff-caption text-[var(--admin-text-muted)]">
                          <code className="font-mono text-[0.6875rem]">{permission}</code>
                          {needs && <span>· Needs {needs.map((entry) => PERMISSION_LABELS[entry]).join(', ')}</span>}
                        </span>
                        {locked && (
                          <span className="flex items-center gap-1 nff-caption text-[var(--admin-text-muted)]">
                            <Lock aria-hidden="true" className="size-3" />
                            {locked.reason}
                          </span>
                        )}
                      </div>
                      <Switch
                        id={id}
                        checked={checked}
                        disabled={disabled}
                        aria-describedby={undefined}
                        onCheckedChange={(next) => onToggle(permission, next)}
                      />
                    </li>
                  )
                })}
              </ul>
            </fieldset>
          )
        })}
      </div>
    </section>
  )
}

function CompareMatrix({ working }: { working: (role: StaffRole) => readonly Permission[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="admin-dt-frame">
        <table aria-label="Permissions by role" className="admin-matrix w-full text-sm">
          <thead>
            <tr>
              <th scope="col" className="text-left">
                Permission
              </th>
              {STAFF_ROLE_IDS.map((role) => (
                <th key={role} scope="col">
                  {getRoleLabel(role)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_DOMAINS.flatMap((domain) => [
              <tr key={`domain-${domain}`} className="admin-matrix-group">
                <th scope="colgroup" colSpan={STAFF_ROLE_IDS.length + 1} className="text-left">
                  {DOMAIN_LABEL[domain]}
                </th>
              </tr>,
              ...permissionsInDomain(domain).map((permission) => (
                <tr key={permission}>
                  <th scope="row" className="text-left font-normal">
                    <span className="block nff-label-md">{PERMISSION_LABELS[permission]}</span>
                    <code className="font-mono text-[0.6875rem] text-[var(--admin-text-muted)]">{permission}</code>
                  </th>
                  {STAFF_ROLE_IDS.map((role) => (
                    <td key={role}>
                      {working(role).includes(permission) ? (
                        <Check aria-label="Allowed" className="mx-auto size-4 text-nff-text-success" />
                      ) : (
                        <Minus aria-label="Not allowed" className="mx-auto size-4 text-[var(--admin-border-strong)]" />
                      )}
                    </td>
                  ))}
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
      <p className="nff-caption text-[var(--admin-text-muted)]">
        Visitor and Practitioner hold no Admin permissions; what learners can open is set by content access rules.
      </p>
    </div>
  )
}
