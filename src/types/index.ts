export type ContentType = 'exploration' | 'meditation'

export type Category = 'foundations' | 'understand' | 'contemplate' | 'explore'

export type UnderstandTopic = 'mind' | 'wellbeing'

export type ContentStatus =
  | 'draft'
  | 'in_review'
  | 'scheduled'
  | 'published'
  | 'unpublished'

export type TranscodeStatus =
  | 'uploading'
  | 'validating'
  | 'transcoding'
  | 'ready'
  | 'failed'

export type StageProgressStatus =
  | 'completed'
  | 'in_progress'
  | 'available'
  | 'locked'

export type ItemProgressStatus = 'not_started' | 'in_progress' | 'completed'

export type Role = 'visitor' | 'practitioner' | 'editor' | 'campaign' | 'admin'

export type AccountStatus =
  | 'active'
  | 'unverified'
  | 'deactivated'
  | 'pending_deletion'

export type CampaignState = 'running' | 'paused' | 'scheduled' | 'draft'

export type Scenario =
  | 'default'
  | 'empty'
  | 'error'
  | 'slow'
  | 'no-featured'
  | 'locked-stage'
  | 'token-expired'
  | 'transcode-failed'

export interface Artwork {
  /** Inline gradient key used by the mock artwork component. */
  tone: 'brand' | 'accent' | 'info' | 'warning' | 'success' | 'neutral'
  /** Short label rendered inside the artwork placeholder. */
  label: string
}

interface ContentBase {
  id: string
  slug: string
  type: ContentType
  title: string
  excerpt: string
  category: Category
  understandTopic?: UnderstandTopic
  stageId: string
  artwork: Artwork
  heroImage?: string
  published: boolean
  featured: boolean
  updatedAt: string
}

export interface Exploration extends ContentBase {
  type: 'exploration'
  readingTimeMin: number
  body: string[]
}

export interface Meditation extends ContentBase {
  type: 'meditation'
  durationSec: number
  preview: boolean
  audioUrl: string
  transcode: TranscodeStatus
  transcript?: string
}

export type ContentItem = Exploration | Meditation

export interface Stage {
  id: string
  number: number
  title: string
  description: string
  intro: string
  itemIds: string[]
  published: boolean
}

export interface Progress {
  userId: string
  completedItemIds: string[]
  inProgressItemId?: string
  positionsSec: Record<string, number>
  updatedAt: string
}

export interface StageWithProgress extends Stage {
  status: StageProgressStatus
  completedCount: number
  itemCount: number
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  status: AccountStatus
  verified: boolean
  currentStageId: string
  joinedAt: string
  lastActiveAt: string
  engagementScore: number
  minutesListened: number
}

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  verified: boolean
}

export interface Event {
  id: string
  userId: string
  type: 'login' | 'play' | 'complete' | 'signup' | 'email_open'
  contentId?: string
  at: string
}

export interface EmailLog {
  id: string
  userId: string
  campaignId: string
  status: 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed'
  at: string
}

export interface Campaign {
  id: string
  name: string
  state: CampaignState
  schedule: string
  audience: string
  lastRunAt?: string
  sent: number
  delivered: number
  bounced: number
  complained: number
  failed: number
}

export interface EmailTemplate {
  id: string
  name: string
  variantCount: number
  stagesCovered: number
  status: 'draft' | 'active' | 'archived'
  updatedAt: string
}

export interface RoleDefinition {
  id: Role
  label: string
  description: string
  capabilities: string[]
}

export interface ConsentRecord {
  essential: true
  analytics: boolean
  updatedAt: string
  policyVersion: string
}

export interface HomeTab {
  key: Category
  label: string
  description: string
  items: ContentItem[]
  subTabs?: Array<{ key: string; label: string; items: ContentItem[] }>
}

export interface HomeContent {
  tabs: HomeTab[]
  featured: ContentItem[]
}

export type CatalogueSort = 'newest' | 'title' | 'shortest'

export interface CatalogueQuery {
  category?: Category
  search?: string
  sort?: CatalogueSort
}

export interface CatalogueResult {
  items: ContentItem[]
  total: number
}

export interface ContentDetail {
  item: ContentItem
  related: ContentItem[]
}

export type AboutSlug = 'who-we-are' | 'what-we-do' | 'how-we-do-it'

export interface AboutSection {
  heading: string
  paragraphs: string[]
}

export interface AboutImage {
  src: string
  alt: string
  caption: string
}

export interface AboutPage {
  slug: AboutSlug
  title: string
  eyebrow: string
  lead: string
  updatedAt: string
  image: AboutImage
  sections: AboutSection[]
}

export interface Journey {
  overallPercent: number
  stagesCompleted: number
  totalStages: number
  continueItem?: { item: ContentItem; stage: StageWithProgress }
  stages: StageWithProgress[]
}

export interface Session {
  token: string
  user: SessionUser
}

export interface ConsentInput {
  analytics: boolean
}
