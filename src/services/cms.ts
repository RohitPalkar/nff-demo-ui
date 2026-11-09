import { mockApi, readJson, writeJson } from '@/mocks/api'
import {
  campaigns,
  content,
  emailLogs,
  emailTemplates,
  roles,
  scoreWeightsSeed,
  stages,
  users,
} from '@/mocks/db'
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
}

const ITEMS_KEY = 'nff.cms.items'
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
          ? new Date(Date.now() + 3 * 86_400_000).toISOString()
          : undefined,
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

export async function listCmsItems(
  type: 'exploration' | 'meditation',
): Promise<CmsItem[]> {
  return mockApi(() => allItems().filter((item) => item.type === type))
}

export async function listAllCmsItems(): Promise<CmsItem[]> {
  return mockApi(() => allItems())
}

export async function getCmsItem(id: string): Promise<CmsItem | null> {
  return mockApi(() => allItems().find((item) => item.id === id) ?? null)
}

export function saveCmsItem(item: CmsItem): CmsItem {
  const stored = readJson<Record<string, CmsItem>>(ITEMS_KEY, {})
  const next = { ...item, updatedAt: new Date().toISOString() }
  stored[item.id] = next
  writeJson(ITEMS_KEY, stored)
  return next
}

export function createCmsItem(type: 'exploration' | 'meditation'): CmsItem {
  const id = `new-${type}-${Date.now()}`
  return saveCmsItem({
    id,
    type,
    slug: '',
    title: '',
    excerpt: '',
    body: '',
    category: 'foundations',
    stageId: stages[0]!.id,
    status: 'draft',
    owner: 'You',
    updatedAt: new Date().toISOString(),
    featured: false,
    seoTitle: '',
    seoDescription: '',
    preview: false,
    transcode: 'uploading',
    durationSec: 0,
  })
}

export function duplicateCmsItem(item: CmsItem): CmsItem {
  return saveCmsItem({
    ...item,
    id: `copy-${item.id}-${Date.now()}`,
    slug: `${item.slug}-copy`,
    title: `${item.title} (copy)`,
    status: 'draft',
  })
}

export function setCmsStatus(
  id: string,
  status: CmsStatus,
  extra: Partial<CmsItem> = {},
): CmsItem | null {
  const item = allItems().find((entry) => entry.id === id)
  if (!item) return null
  return saveCmsItem({ ...item, status, ...extra })
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
  if (!item.slug.trim()) errors.slug = 'Add a slug.'
  else if (!/^[a-z0-9-]+$/.test(item.slug)) errors.slug = 'Use lowercase letters, numbers and hyphens.'
  if (item.excerpt.trim().length < 10) errors.excerpt = 'Add a short excerpt.'
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
}

const NEW_STAGES_KEY = 'nff.cms.new-stages'

export function addStage(title: string): CmsStage {
  const extra = readJson<CmsStage[]>(NEW_STAGES_KEY, [])
  const stage: CmsStage = {
    id: `stage-new-${Date.now()}`,
    number: stages.length + extra.length + 1,
    title,
    description: 'A new stage.',
    intro: '',
    itemIds: [],
    published: false,
  }
  writeJson(NEW_STAGES_KEY, [...extra, stage])
  return stage
}

export function saveStageDetails(
  id: string,
  patch: Partial<Pick<CmsStage, 'title' | 'intro'>>,
) {
  const stored = readJson<Record<string, typeof patch>>('nff.cms.stage-details', {})
  stored[id] = { ...stored[id], ...patch }
  writeJson('nff.cms.stage-details', stored)
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

export async function getCmsStages(): Promise<CmsStage[]> {
  return mockApi(() => loadStages())
}

export function saveStageOrder(ids: string[]) {
  writeJson(STAGE_ORDER_KEY, ids)
}

export function saveStageItems(stageId: string, itemIds: string[]) {
  const stored = readJson<Record<string, string[]>>(STAGE_ITEMS_KEY, {})
  stored[stageId] = itemIds
  writeJson(STAGE_ITEMS_KEY, stored)
}

// Campaigns, templates, delivery ---------------------------------------

const CAMPAIGN_KEY = 'nff.cms.campaigns'

export function loadCampaigns(): Campaign[] {
  const stored = readJson<Record<string, Partial<Campaign>>>(CAMPAIGN_KEY, {})
  const extra = readJson<Campaign[]>('nff.cms.campaigns-new', [])
  return [...extra, ...campaigns.map((c) => ({ ...c, ...stored[c.id] }))]
}

export async function getCampaigns(): Promise<Campaign[]> {
  return mockApi(() => loadCampaigns())
}

export function patchCampaign(id: string, patch: Partial<Campaign>) {
  const stored = readJson<Record<string, Partial<Campaign>>>(CAMPAIGN_KEY, {})
  stored[id] = { ...stored[id], ...patch }
  writeJson(CAMPAIGN_KEY, stored)
}

export function addCampaign(campaign: Campaign) {
  const extra = readJson<Campaign[]>('nff.cms.campaigns-new', [])
  writeJson('nff.cms.campaigns-new', [campaign, ...extra])
}

export async function getTemplates(): Promise<EmailTemplate[]> {
  return mockApi(() => emailTemplates)
}

export async function getDelivery() {
  return mockApi(() => emailLogs)
}

// Users, roles, score --------------------------------------------------

export async function getUsers(): Promise<User[]> {
  return mockApi(() => users)
}

export async function getUser(id: string): Promise<User | null> {
  return mockApi(() => users.find((user) => user.id === id) ?? null)
}

const USER_STATUS_KEY = 'nff.cms.user-status'

export function userStatusOverrides() {
  return readJson<Record<string, User['status']>>(USER_STATUS_KEY, {})
}

export function setUserStatus(id: string, status: User['status']) {
  const stored = userStatusOverrides()
  stored[id] = status
  writeJson(USER_STATUS_KEY, stored)
}

export const ROLE_LIST = roles

const SCORE_KEY = 'nff.cms.score-weights'
export type ScoreWeights = typeof scoreWeightsSeed

export function loadScoreWeights(): ScoreWeights {
  return readJson<ScoreWeights>(SCORE_KEY, scoreWeightsSeed)
}

export function saveScoreWeights(weights: ScoreWeights) {
  writeJson(SCORE_KEY, weights)
  const log = readJson<Array<{ at: string; weights: ScoreWeights }>>(
    `${SCORE_KEY}.log`,
    [],
  )
  writeJson(`${SCORE_KEY}.log`, [
    { at: new Date().toISOString(), weights },
    ...log,
  ].slice(0, 5))
}

export function scoreLog() {
  return readJson<Array<{ at: string; weights: ScoreWeights }>>(
    `${SCORE_KEY}.log`,
    [],
  )
}

const ROLE_KEY = 'nff.cms.member-roles'

export function memberRoles(): Record<string, Role> {
  return readJson<Record<string, Role>>(ROLE_KEY, {})
}

export function setMemberRole(id: string, role: Role) {
  const stored = memberRoles()
  stored[id] = role
  writeJson(ROLE_KEY, stored)
}
