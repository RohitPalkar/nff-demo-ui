import { mockApi, readJson, writeJson } from '@/mocks/api'
import {
  campaigns,
  content,
  emailLogs,
  emailTemplates,
  scoreWeightsSeed,
  stages,
  userById,
  users,
} from '@/mocks/db'
import { DEMO_EDITOR_ACCOUNT_ID, DEMO_OWNED_CONTENT } from '@/config/demoOwnership'
import { can, ForbiddenError } from '@/services/rbac/authorize'
import type { Permission } from '@/services/rbac/permissions'
import { transitionPermissions } from '@/services/rbac/contentWorkflow'
import { authorizeAction, resolveActor, type ActorInput } from '@/services/rbac/guard'
import { changeMemberRole, assertCanSetStatus } from '@/services/rbac/teamManagement'
import { USER_STATUS_KEY, listStaffMembers, readRoleAssignments } from '@/services/rbac/roleResolution'
import { canAccessContent } from '@/services/rbac/contentAccess'
import { emitAuditEvent } from '@/services/rbac/audit'
import { CMS_ITEMS_KEY } from '@/services/previewAccess'
import type { StaffRole } from '@/services/rbac/roles'
import type {
  Campaign,
  Category,
  ContentStatus,
  EmailTemplate,
  Role,
  TranscodeStatus,
  User,
} from '@/types'

export type CmsStatus = ContentStatus | 'rejected'

export interface CmsItem {
  id: string
  type: 'exploration' | 'meditation'
  slug: string
  title: string
  excerpt: string
  body: string
  category: Category
  stageId: string
  status: CmsStatus
  owner: string
  updatedAt: string
  featured: boolean
  seoTitle: string
  seoDescription: string
  preview: boolean
  transcode: TranscodeStatus
  durationSec: number
  scheduledFor?: string
  rejectionNote?: string
  /** Account id of whoever created the record in the CMS. Set once, never changed. Absent on legacy records. */
  createdBy?: string
  /** Account id of the owner. Absent = unassigned (all legacy records). */
  ownerId?: string
  /** Account ids explicitly added to the record. */
  collaboratorIds?: string[]
  /** Pending edits to live (published or scheduled) content. The live fields above are untouched until it is published. */
  revision?: CmsRevision
}

/** The fields an author edits. The rest of `CmsItem` is workflow or ownership state. */
export const CONTENT_FIELDS = [
  'slug',
  'title',
  'excerpt',
  'body',
  'category',
  'stageId',
  'featured',
  'seoTitle',
  'seoDescription',
  'preview',
  'transcode',
  'durationSec',
] as const
export type ContentField = (typeof CONTENT_FIELDS)[number]

export type RevisionStatus = 'draft' | 'in_review' | 'rejected'

/**
 * The smallest compatible revision model: one pending revision per live item,
 * holding only the fields that differ from the live version. There is no
 * revision list and no diff history; see docs/admin-rbac-foundation.md.
 */
export interface CmsRevision {
  fields: Partial<Pick<CmsItem, ContentField>>
  status: RevisionStatus
  /** Reviewer feedback. Kept while the author works on a rejected revision. */
  rejectionNote?: string
  authorId: string
  createdAt: string
  updatedAt: string
  /** The live record's `updatedAt` when this revision was started. If the live record changes later, the revision is stale. */
  basedOn?: string
}

/** Live content is what learners can see or will see: published and scheduled. */
export const isLiveStatus = (status: CmsStatus) => status === 'published' || status === 'scheduled'

/** The live record with its pending revision applied: what an author sees and edits. */
export const workingCopy = (item: CmsItem): CmsItem => ({ ...item, ...item.revision?.fields })

/** True when the live record changed after the pending revision was started. Unknown (false) for revisions without a base. */
export const isRevisionStale = (item: CmsItem): boolean =>
  Boolean(item.revision?.basedOn && item.revision.basedOn !== item.updatedAt)

/** Name for display only; never used to decide anything. */
export function ownerLabel(item: Pick<CmsItem, 'ownerId'>): string {
  return item.ownerId ? (userById.get(item.ownerId)?.name ?? 'Unknown account') : 'Unassigned'
}

/** Shared with services/previewAccess.ts, which reads the live free-preview setting for the public site. */
const ITEMS_KEY = CMS_ITEMS_KEY

/**
 * Seeded "scheduled" items need a date. Computed once per page load so it is
 * the same on every read (it used to change on each call, which made the item
 * look edited and could not be compared).
 */
const SEED_SCHEDULE = new Date(Date.now() + 3 * 86_400_000).toISOString()
const OWNERS = ['Rowan Ellis', 'Adeola Bankole', 'Rowan Ellis', 'Sofia Marchetti']

function seedItems(): CmsItem[] {
  return content.map((item, index) => {
    let status: CmsStatus = item.published ? 'published' : 'draft'
    if (item.published && index % 11 === 4) status = 'in_review'
    if (item.published && index % 13 === 6) status = 'scheduled'
    if (!item.published && index % 5 === 0) status = 'in_review'
    return {
      id: item.id,
      type: item.type,
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt,
      body: item.type === 'exploration' ? item.body.join('\n\n') : '',
      category: item.category,
      stageId: item.stageId,
      status,
      owner: OWNERS[index % OWNERS.length]!,
      updatedAt: item.updatedAt,
      featured: item.featured,
      seoTitle: item.title,
      seoDescription: item.excerpt,
      preview: item.type === 'meditation' ? item.preview : false,
      transcode: item.type === 'meditation' ? item.transcode : 'ready',
      durationSec: item.type === 'meditation' ? item.durationSec : 0,
      scheduledFor:
        status === 'scheduled'
          ? SEED_SCHEDULE
          : undefined,
      // Demo ownership seed (config/demoOwnership.ts): ownerId only, never createdBy.
      ...(Object.hasOwn(DEMO_OWNED_CONTENT, item.id)
        ? { ownerId: DEMO_EDITOR_ACCOUNT_ID, collaboratorIds: [] }
        : {}),
    }
  })
}

function allItems(): CmsItem[] {
  const base = seedItems()
  const stored = readJson<Record<string, CmsItem>>(ITEMS_KEY, {})
  const merged = base.map((item) => stored[item.id] ?? item)
  const baseIds = new Set(base.map((item) => item.id))
  const extras = Object.values(stored).filter((item) => !baseIds.has(item.id))
  return [...extras, ...merged]
}

/** Reads are checked too: a refused read rejects, it never returns data. */
function requireRead(actor: ActorInput, permission: Permission) {
  const resolved = resolveActor(actor)
  if (!resolved || !can(resolved, permission)) {
    throw new ForbiddenError(undefined, permission)
  }
  return resolved
}

/** What this actor sees of an item: publishers see the live record, authors see their working copy. */
const viewFor = (actor: ReturnType<typeof resolveActor>, item: CmsItem) =>
  can(actor, 'content.publish') ? item : workingCopy(item)

const accessible = (actor: ReturnType<typeof resolveActor>) =>
  allItems().filter((item) => canAccessContent(actor, item))

export async function listCmsItems(
  type: 'exploration' | 'meditation',
  actor?: ActorInput,
): Promise<CmsItem[]> {
  const resolved = requireRead(actor, 'content.view')
  return mockApi(() =>
    accessible(resolved)
      .filter((item) => item.type === type)
      .map((item) => viewFor(resolved, item)),
  )
}

export async function listAllCmsItems(actor?: ActorInput): Promise<CmsItem[]> {
  const resolved = requireRead(actor, 'content.view')
  return mockApi(() => accessible(resolved).map((item) => viewFor(resolved, item)))
}

/** `null` when the item does not exist or the actor may not open it. */
export async function getCmsItem(id: string, actor?: ActorInput): Promise<CmsItem | null> {
  const resolved = requireRead(actor, 'content.view')
  return mockApi(() => {
    const item = allItems().find((entry) => entry.id === id)
    return item && canAccessContent(resolved, item) ? viewFor(resolved, item) : null
  })
}

export interface CmsItemSummary {
  id: string
  type: CmsItem['type']
  title: string
  status: CmsStatus
}

/**
 * Titles of every item, for showing curriculum relationships. No body and no
 * ownership data, and not limited by ownership, so an Editor can read what a
 * stage contains without being able to open the items.
 */
export async function listCmsItemSummaries(actor?: ActorInput): Promise<CmsItemSummary[]> {
  requireRead(actor, 'learning.view')
  return mockApi(() =>
    allItems().map((item) => ({ id: item.id, type: item.type, title: item.title, status: item.status })),
  )
}

/** Raw write. Callers must already have been authorised. `touch: false` keeps `updatedAt`. */
function writeItem(item: CmsItem, touch = true): CmsItem {
  const stored = readJson<Record<string, CmsItem>>(ITEMS_KEY, {})
  const next = { ...item, updatedAt: touch ? new Date().toISOString() : item.updatedAt }
  stored[item.id] = next
  writeJson(ITEMS_KEY, stored)
  return next
}

/** Refuses, and records the refusal, when the actor may not open this item. */
function requireAccess(actor: NonNullable<ReturnType<typeof resolveActor>>, item: CmsItem, action: string) {
  if (canAccessContent(actor, item)) return
  emitAuditEvent({ actorId: actor.id, action, resourceType: 'content', resourceId: item.id, outcome: 'denied' })
  throw new ForbiddenError('You do not have access to this item.')
}

function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Records an author's edits to live content as the pending revision. The live fields are not touched. */
function saveRevision(base: CmsItem, edited: CmsItem, actorId: string): CmsItem {
  const changed: CmsRevision['fields'] = {}
  for (const field of CONTENT_FIELDS) {
    if (!sameValue(edited[field], base[field])) (changed as Record<string, unknown>)[field] = edited[field]
  }
  if (Object.keys(changed).length === 0) {
    // Nothing differs from live: drop any pending revision.
    return workingCopy(base.revision ? writeItem({ ...base, revision: undefined }, false) : base)
  }
  const now = new Date().toISOString()
  const revision: CmsRevision = {
    fields: changed,
    // Editing a revision that was in review or rejected takes it back to a draft.
    status: 'draft',
    ...(base.revision?.rejectionNote ? { rejectionNote: base.revision.rejectionNote } : {}),
    authorId: base.revision?.authorId ?? actorId,
    createdAt: base.revision?.createdAt ?? now,
    updatedAt: now,
    basedOn: base.revision?.basedOn ?? base.updatedAt,
  }
  return workingCopy(writeItem({ ...base, revision }, false))
}

/**
 * Save an item. Needs `content.edit` (or `content.create` for a new id), and
 * access to the item (see `canAccessContent`).
 *
 * Status, scheduled date and rejection feedback belong to the review
 * workflow: a save that would change any of them is checked as the matching
 * workflow step, so saving can never publish, schedule or reject. Ownership
 * and `createdBy` can never be changed by a save.
 *
 * **Live content:** a save by someone without `content.publish` does not touch
 * the live record: it is stored as the item's pending revision
 * (`submitRevision` sends it for review). Publishers edit live content directly.
 * The returned item is the author's working copy.
 */
export function saveCmsItem(item: CmsItem, actor?: ActorInput): CmsItem {
  const current = allItems().find((entry) => entry.id === item.id)
  const permissions = new Set<Permission>([current ? 'content.edit' : 'content.create'])
  if (current) {
    const needed = transitionPermissions(current.status, item.status)
    if (needed === null) throw new ForbiddenError('That status change is not allowed.')
    needed.forEach((permission) => permissions.add(permission))
    if (item.scheduledFor !== current.scheduledFor) permissions.add('content.schedule')
    if (item.rejectionNote !== current.rejectionNote) permissions.add('content.reject')
  } else if (item.status !== 'draft') {
    const needed = transitionPermissions('draft', item.status)
    if (needed === null) throw new ForbiddenError('That status change is not allowed.')
    needed.forEach((permission) => permissions.add(permission))
  }
  return authorizeAction(
    actor,
    [...permissions],
    { action: 'content.edit', resourceType: 'content', resourceId: item.id, audit: false },
    (a) => {
      if (!current) {
        return writeItem({
          ...item,
          createdBy: a.id,
          ownerId: a.id,
          owner: userById.get(a.id)?.name ?? a.id,
          collaboratorIds: [],
          revision: undefined,
        })
      }
      requireAccess(a, current, 'content.edit')
      if (isLiveStatus(current.status) && !can(a, 'content.publish')) {
        return saveRevision(current, item, a.id)
      }
      return writeItem({
        ...item,
        createdBy: current.createdBy,
        ownerId: current.ownerId,
        owner: current.owner,
        collaboratorIds: current.collaboratorIds,
        revision: current.revision,
      })
    },
  )
}

/** A new draft. `init` sets a title and stage up front (the curriculum's "create and add" flow). */
export function createCmsItem(
  type: 'exploration' | 'meditation',
  actor?: ActorInput,
  init: Partial<Pick<CmsItem, 'title' | 'stageId'>> = {},
): CmsItem {
  const id = `new-${type}-${Date.now()}`
  const title = init.title?.trim() ?? ''
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return authorizeAction(
    actor,
    'content.create',
    { action: 'content.create', resourceType: 'content', resourceId: id, metadata: { type } },
    (a) =>
      writeItem({
        id,
        type,
        slug,
        title,
        excerpt: '',
        body: '',
        category: 'foundations',
        stageId: init.stageId ?? stages[0]!.id,
        status: 'draft',
        owner: userById.get(a.id)?.name ?? a.id,
        createdBy: a.id,
        ownerId: a.id,
        collaboratorIds: [],
        updatedAt: new Date().toISOString(),
        featured: false,
        seoTitle: '',
        seoDescription: '',
        preview: false,
        transcode: 'uploading',
        durationSec: 0,
      }),
  )
}

export function duplicateCmsItem(item: CmsItem, actor?: ActorInput): CmsItem {
  const id = `copy-${item.id}-${Date.now()}`
  return authorizeAction(
    actor,
    'content.create',
    { action: 'content.create', resourceType: 'content', resourceId: id, metadata: { copyOf: item.id } },
    (a) => {
      const source = allItems().find((entry) => entry.id === item.id)
      if (source) requireAccess(a, source, 'content.create')
      return writeItem({
        ...item,
        id,
        slug: `${item.slug}-copy`,
        title: `${item.title} (copy)`,
        status: 'draft',
        scheduledFor: undefined,
        rejectionNote: undefined,
        revision: undefined,
        createdBy: a.id,
        ownerId: a.id,
        owner: userById.get(a.id)?.name ?? a.id,
        collaboratorIds: [],
      })
    },
  )
}

// Audio lock ------------------------------------------------------------------

/**
 * Lock or unlock meditations: `preview: true` makes the track a free preview
 * visitors can hear without an account; `false` locks it to members. This is a
 * publishing decision about the live record, so it needs `content.publish`
 * and never becomes a draft revision. The public site reads it through
 * services/previewAccess.ts. Returns how many items changed.
 */
export function setMeditationAccess(ids: readonly string[], preview: boolean, actor?: ActorInput): number {
  return authorizeAction(
    actor,
    ['content.edit', 'content.publish'],
    {
      action: 'content.access',
      resourceType: 'content',
      resourceId: ids.length === 1 ? ids[0]! : `${ids.length} meditations`,
      metadata: { preview, count: ids.length },
    },
    (a) => {
      let changed = 0
      for (const id of ids) {
        const item = allItems().find((entry) => entry.id === id)
        if (!item || item.type !== 'meditation') continue
        requireAccess(a, item, 'content.access')
        if (item.preview === preview) continue
        writeItem({ ...item, preview })
        changed += 1
      }
      return changed
    },
  )
}

// Revisions of live content -------------------------------------------------

function withRevision(id: string, status: RevisionStatus[] | null) {
  const item = allItems().find((entry) => entry.id === id)
  if (!item?.revision) throw new ForbiddenError('There is no pending revision for that item.')
  if (status && !status.includes(item.revision.status)) {
    throw new ForbiddenError('That revision is not in the right state for this action.')
  }
  return item as CmsItem & { revision: CmsRevision }
}

/** Send an author's pending revision for review. The live version stays live. */
export function submitRevision(id: string, actor?: ActorInput): CmsItem {
  return authorizeAction(
    actor,
    'content.submit',
    { action: 'content.submit', resourceType: 'content', resourceId: id, metadata: { revision: true } },
    (a) => {
      const item = withRevision(id, ['draft', 'rejected'])
      requireAccess(a, item, 'content.submit')
      const { rejectionNote: _cleared, ...rest } = item.revision
      void _cleared
      return writeItem({ ...item, revision: { ...rest, status: 'in_review', updatedAt: new Date().toISOString() } }, false)
    },
  )
}

/** Approve a revision: its fields replace the live ones. Needs the same authority as publishing from review. */
export function publishRevision(id: string, actor?: ActorInput): CmsItem {
  return authorizeAction(
    actor,
    ['content.review', 'content.approve', 'content.publish'],
    { action: 'content.publish', resourceType: 'content', resourceId: id, metadata: { revision: true } },
    () => {
      const item = withRevision(id, ['in_review'])
      return writeItem({ ...item, ...item.revision.fields, revision: undefined })
    },
  )
}

/** Reject a revision. The live version is never changed. */
export function rejectRevision(id: string, note: string, actor?: ActorInput): CmsItem {
  return authorizeAction(
    actor,
    ['content.review', 'content.reject'],
    { action: 'content.reject', resourceType: 'content', resourceId: id, metadata: { revision: true } },
    () => {
      const item = withRevision(id, ['in_review'])
      return writeItem(
        { ...item, revision: { ...item.revision, status: 'rejected', rejectionNote: note, updatedAt: new Date().toISOString() } },
        false,
      )
    },
  )
}

/** Drop a revision that is not under review. */
export function discardRevision(id: string, actor?: ActorInput): CmsItem {
  return authorizeAction(
    actor,
    'content.edit',
    { action: 'content.edit', resourceType: 'content', resourceId: id, metadata: { revision: 'discard' } },
    (a) => {
      const item = withRevision(id, ['draft', 'rejected'])
      requireAccess(a, item, 'content.edit')
      return writeItem({ ...item, revision: undefined }, false)
    },
  )
}

// Ownership -------------------------------------------------------------------

/**
 * Set the owner and collaborators by account id. Admin and Super admin only.
 * Ids must belong to active staff who can edit content. `ownerId: null`
 * returns the record to the unassigned state. `createdBy` never changes.
 */
export function setContentOwnership(
  id: string,
  patch: { ownerId?: string | null; collaboratorIds?: string[] },
  actor?: ActorInput,
): CmsItem {
  return authorizeAction(
    actor,
    'content.ownership.manage',
    { action: 'content.ownership.manage', resourceType: 'content', resourceId: id },
    () => {
      const item = allItems().find((entry) => entry.id === id)
      if (!item) throw new ForbiddenError('That item does not exist.')
      const eligible = new Map(
        listStaffMembers()
          .filter((member) => member.active && can({ id: member.id, role: member.role }, 'content.edit'))
          .map((member) => [member.id, member]),
      )
      for (const accountId of [patch.ownerId, ...(patch.collaboratorIds ?? [])]) {
        if (accountId && !eligible.has(accountId)) {
          throw new ForbiddenError('Only active staff who can edit content can own or collaborate on it.')
        }
      }
      const ownerId = patch.ownerId === undefined ? item.ownerId : (patch.ownerId ?? undefined)
      const collaboratorIds = [...new Set(patch.collaboratorIds ?? item.collaboratorIds ?? [])].filter(
        (accountId) => accountId !== ownerId,
      )
      return writeItem(
        {
          ...item,
          ownerId,
          collaboratorIds,
          owner: ownerId ? (eligible.get(ownerId)?.name ?? item.owner) : item.owner,
        },
        false,
      )
    },
  )
}

/**
 * Move an item through the workflow. The permissions come from the transition
 * table (`rbac/contentWorkflow.ts`). `extra` may carry only the scheduled date
 * and rejection feedback; anything else is ignored.
 */
export function setCmsStatus(
  id: string,
  status: CmsStatus,
  extra: Partial<Pick<CmsItem, 'scheduledFor' | 'rejectionNote'>> = {},
  actor?: ActorInput,
): CmsItem | null {
  const item = allItems().find((entry) => entry.id === id)
  if (!item) return null
  const needed = transitionPermissions(item.status, status)
  const event = {
    action: `content.${
      status === 'in_review'
        ? 'submit'
        : status === 'published'
          ? 'publish'
          : status === 'scheduled'
            ? 'schedule'
            : status === 'rejected'
              ? 'reject'
              : status === 'unpublished'
                ? 'unpublish'
                : 'edit'
    }`,
    resourceType: 'content' as const,
    resourceId: id,
    metadata: { from: item.status, to: status },
  }
  if (needed === null) {
    // Refused as a workflow rule, but recorded like any other denial.
    return authorizeAction(actor, ['cms.access', 'content.edit'], event, () => {
      throw new ForbiddenError('That status change is not allowed.')
    })
  }
  const allowed: Partial<Pick<CmsItem, 'scheduledFor' | 'rejectionNote'>> = {}
  if ('scheduledFor' in extra) allowed.scheduledFor = extra.scheduledFor
  if ('rejectionNote' in extra) allowed.rejectionNote = extra.rejectionNote
  return authorizeAction(actor, [...needed, 'content.edit'], event, (a) => {
    requireAccess(a, item, event.action)
    return writeItem({ ...item, status, ...allowed })
  })
}

export const STATUS_LABEL: Record<CmsStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  scheduled: 'Scheduled',
  published: 'Published',
  unpublished: 'Unpublished',
  rejected: 'Rejected',
}

export function validateItem(item: CmsItem): Record<string, string> {
  const errors: Record<string, string> = {}
  if (item.title.trim().length < 3) errors.title = 'Add a title of at least 3 characters.'
  if (!item.slug.trim()) errors.slug = 'Add a web address, for example morning-calm.'
  else if (!/^[a-z0-9-]+$/.test(item.slug)) errors.slug = 'Use only lowercase letters, numbers and hyphens, for example morning-calm.'
  if (item.excerpt.trim().length < 10) errors.excerpt = 'Write at least 10 characters so people know what this is about.'
  return errors
}

export function checksFor(item: CmsItem) {
  return {
    artwork: true,
    audio: item.type === 'exploration' || item.transcode === 'ready',
    metadata: Object.keys(validateItem(item)).length === 0,
  }
}

// Curriculum -----------------------------------------------------------

const STAGE_ORDER_KEY = 'nff.cms.stage-order'
const STAGE_ITEMS_KEY = 'nff.cms.stage-items'

export interface CmsStage {
  id: string
  number: number
  title: string
  description: string
  intro: string
  itemIds: string[]
  published: boolean
  /** Items in this stage that do not block the next stage. Everything else is required. */
  optionalItemIds?: string[]
}

const NEW_STAGES_KEY = 'nff.cms.new-stages'

export function addStage(title: string, actor?: ActorInput, intro = ''): CmsStage {
  const extra = readJson<CmsStage[]>(NEW_STAGES_KEY, [])
  const stage: CmsStage = {
    id: `stage-new-${Date.now()}`,
    number: stages.length + extra.length + 1,
    title,
    description: 'A new stage.',
    intro,
    itemIds: [],
    published: false,
  }
  return authorizeAction(
    actor,
    'learning.manage',
    { action: 'learning.manage', resourceType: 'stage', resourceId: stage.id, metadata: { change: 'add' } },
    () => {
      writeJson(NEW_STAGES_KEY, [...extra, stage])
      return stage
    },
  )
}

export function saveStageDetails(
  id: string,
  patch: Partial<Pick<CmsStage, 'title' | 'intro' | 'published' | 'optionalItemIds'>>,
  actor?: ActorInput,
) {
  authorizeAction(
    actor,
    'learning.manage',
    {
      action: 'learning.manage',
      resourceType: 'stage',
      resourceId: id,
      metadata: { change: 'published' in patch ? (patch.published ? 'go-live' : 'take-offline') : 'details' },
    },
    () => {
      const stored = readJson<Record<string, typeof patch>>('nff.cms.stage-details', {})
      stored[id] = { ...stored[id], ...patch }
      writeJson('nff.cms.stage-details', stored)
    },
  )
}

export function loadStages(): CmsStage[] {
  const order = readJson<string[] | null>(STAGE_ORDER_KEY, null)
  const itemOverrides = readJson<Record<string, string[]>>(STAGE_ITEMS_KEY, {})
  const details = readJson<Record<string, Partial<CmsStage>>>(
    'nff.cms.stage-details',
    {},
  )
  const extra = readJson<CmsStage[]>(NEW_STAGES_KEY, [])
  const withItems = [...stages, ...extra].map((stage) => ({
    ...stage,
    ...details[stage.id],
    itemIds: itemOverrides[stage.id] ?? stage.itemIds,
  }))
  if (!order) return withItems
  const ordered = order
    .map((id) => withItems.find((stage) => stage.id === id))
    .filter((stage): stage is CmsStage => Boolean(stage))
  const missing = withItems.filter((stage) => !order.includes(stage.id))
  return [...ordered, ...missing]
}

export async function getCmsStages(actor?: ActorInput): Promise<CmsStage[]> {
  requireRead(actor, 'learning.view')
  return mockApi(() => loadStages())
}

export function saveStageOrder(ids: string[], actor?: ActorInput) {
  authorizeAction(
    actor,
    'learning.manage',
    { action: 'learning.manage', resourceType: 'stage', resourceId: 'order', metadata: { change: 'order' } },
    () => writeJson(STAGE_ORDER_KEY, ids),
  )
}

export function saveStageItems(stageId: string, itemIds: string[], actor?: ActorInput) {
  authorizeAction(
    actor,
    'learning.manage',
    { action: 'learning.manage', resourceType: 'stage', resourceId: stageId, metadata: { change: 'items' } },
    () => {
      const stored = readJson<Record<string, string[]>>(STAGE_ITEMS_KEY, {})
      stored[stageId] = itemIds
      writeJson(STAGE_ITEMS_KEY, stored)
    },
  )
}

// Campaigns, templates, delivery ---------------------------------------

const CAMPAIGN_KEY = 'nff.cms.campaigns'

export function loadCampaigns(): Campaign[] {
  const stored = readJson<Record<string, Partial<Campaign>>>(CAMPAIGN_KEY, {})
  const extra = readJson<Campaign[]>('nff.cms.campaigns-new', [])
  return [...extra, ...campaigns.map((c) => ({ ...c, ...stored[c.id] }))]
}

export async function getCampaigns(actor?: ActorInput): Promise<Campaign[]> {
  requireRead(actor, 'campaigns.view')
  return mockApi(() => loadCampaigns())
}

/** Pausing and resuming needs `campaigns.manage`; setting a campaign running also needs `campaigns.send`. */
export function patchCampaign(id: string, patch: Partial<Campaign>, actor?: ActorInput) {
  authorizeAction(
    actor,
    patch.state === 'running' ? ['campaigns.manage', 'campaigns.send'] : 'campaigns.manage',
    {
      action: patch.state === 'running' ? 'campaigns.send' : 'campaigns.manage',
      resourceType: 'campaign',
      resourceId: id,
      metadata: patch.state ? { state: patch.state } : undefined,
    },
    () => {
      const stored = readJson<Record<string, Partial<Campaign>>>(CAMPAIGN_KEY, {})
      stored[id] = { ...stored[id], ...patch }
      writeJson(CAMPAIGN_KEY, stored)
    },
  )
}

/** Creating a campaign that starts sending now also needs `campaigns.send`. */
export function addCampaign(campaign: Campaign, actor?: ActorInput) {
  authorizeAction(
    actor,
    campaign.state === 'running' ? ['campaigns.manage', 'campaigns.send'] : 'campaigns.manage',
    {
      action: campaign.state === 'running' ? 'campaigns.send' : 'campaigns.manage',
      resourceType: 'campaign',
      resourceId: campaign.id,
      metadata: { state: campaign.state },
    },
    () => {
      const extra = readJson<Campaign[]>('nff.cms.campaigns-new', [])
      writeJson('nff.cms.campaigns-new', [campaign, ...extra])
    },
  )
}

export async function getTemplates(actor?: ActorInput): Promise<EmailTemplate[]> {
  requireRead(actor, 'campaigns.view')
  return mockApi(() => emailTemplates)
}

/**
 * Delivery log. Who each message went to is withheld unless the actor holds
 * `campaigns.recipients.view`: the data itself is redacted, not just hidden
 * by the screen.
 */
export async function getDelivery(actor?: ActorInput) {
  const resolved = requireRead(actor, 'campaigns.view')
  const withRecipients = can(resolved, 'campaigns.recipients.view')
  return mockApi(() =>
    withRecipients ? emailLogs : emailLogs.map((log) => ({ ...log, userId: 'redacted' })),
  )
}

// Users, roles, score --------------------------------------------------

export async function getUsers(actor?: ActorInput): Promise<User[]> {
  requireRead(actor, 'practitioners.view')
  return mockApi(() => users)
}

export async function getUser(id: string, actor?: ActorInput): Promise<User | null> {
  requireRead(actor, 'practitioners.view')
  return mockApi(() => users.find((user) => user.id === id) ?? null)
}

export function userStatusOverrides() {
  return readJson<Record<string, User['status']>>(USER_STATUS_KEY, {})
}

/**
 * Practitioners need `practitioners.manage`. Staff accounts are treated like
 * removing staff access (`team.remove`, and the last Super admin cannot be
 * deactivated). The status is read by login and by the session, so it takes
 * effect.
 */
export function setUserStatus(id: string, status: User['status'], actor?: ActorInput) {
  const resolved = assertCanSetStatus(actor, id, status)
  authorizeAction(
    resolved,
    'practitioners.manage',
    { action: 'practitioners.manage', resourceType: 'user', resourceId: id, metadata: { status } },
    () => {
      const stored = userStatusOverrides()
      stored[id] = status
      writeJson(USER_STATUS_KEY, stored)
    },
  )
}

const SCORE_KEY = 'nff.cms.score-weights'
export type ScoreWeights = typeof scoreWeightsSeed

export function loadScoreWeights(): ScoreWeights {
  return readJson<ScoreWeights>(SCORE_KEY, scoreWeightsSeed)
}

export interface ScoreLogEntry {
  at: string
  weights: ScoreWeights
  /** Who saved it. Absent on entries saved before authorship was recorded. */
  by?: string
}

/** Saving weights stores them. Nothing recalculates scores from them (see docs). */
export function saveScoreWeights(weights: ScoreWeights, actor?: ActorInput) {
  authorizeAction(
    actor,
    'insights.scores.configure',
    { action: 'insights.scores.configure', resourceType: 'score_settings', resourceId: 'weights' },
    (resolved) => {
      writeJson(SCORE_KEY, weights)
      const log = readJson<ScoreLogEntry[]>(`${SCORE_KEY}.log`, [])
      writeJson(
        `${SCORE_KEY}.log`,
        [{ at: new Date().toISOString(), weights, by: resolved.id }, ...log].slice(0, 5),
      )
    },
  )
}

export function scoreLog() {
  return readJson<ScoreLogEntry[]>(`${SCORE_KEY}.log`, [])
}

/** Role assignments made through the team screen, by user id. */
export function memberRoles(): Record<string, Role> {
  return Object.fromEntries(
    Object.entries(readRoleAssignments()).map(([id, entry]) => [id, entry.role]),
  )
}

/** Kept for existing callers. Delegates to the guarded team operation, so it changes real access. */
export function setMemberRole(id: string, role: StaffRole, actor?: ActorInput) {
  return changeMemberRole(id, role, actor)
}
