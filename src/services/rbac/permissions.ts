/**
 * The permission registry. Every protected operation in the Admin/CMS is one
 * of these identifiers; nothing else in the app should compare role names.
 *
 * Identifiers follow `domain.action`. Sensitive actions that need independent
 * control have their own permission (for example `content.unpublish` and
 * `campaigns.recipients.view`) rather than hiding behind a broad `manage`.
 *
 * Pure data: no React, no storage.
 */

export const PERMISSION_DOMAINS = [
  'platform',
  'content',
  'learning',
  'people',
  'insights',
  'campaigns',
  'settings',
] as const
export type PermissionDomain = (typeof PERMISSION_DOMAINS)[number]

interface PermissionDefinition {
  domain: PermissionDomain
  description: string
}

export const PERMISSION_DEFINITIONS = {
  // Platform ---------------------------------------------------------------
  'cms.access': { domain: 'platform', description: 'Open the Admin/CMS at all.' },

  // Content ----------------------------------------------------------------
  'content.view': { domain: 'content', description: 'See content records and their review status.' },
  'content.create': { domain: 'content', description: 'Create or duplicate content as a draft.' },
  'content.edit': { domain: 'content', description: 'Edit content and save drafts.' },
  'content.delete': { domain: 'content', description: 'Delete content (no screen uses it yet).' },
  'content.submit': { domain: 'content', description: 'Submit content for review.' },
  'content.review': { domain: 'content', description: 'Open the review queue to act on submissions.' },
  'content.approve': { domain: 'content', description: 'Approve submitted content.' },
  'content.reject': { domain: 'content', description: 'Reject submitted content with feedback.' },
  'content.publish': { domain: 'content', description: 'Publish content.' },
  'content.unpublish': { domain: 'content', description: 'Withdraw published content. Added: reversing a publish is its own decision.' },
  'content.schedule': { domain: 'content', description: 'Schedule publication.' },
  'content.preview': { domain: 'content', description: 'Preview content as a visitor or practitioner would see it.' },
  'content.ownership.manage': { domain: 'content', description: 'Assign a content owner and collaborators. Added in Phase 1.1: ownership is real account ids, set deliberately.' },

  // Learning ---------------------------------------------------------------
  'learning.view': { domain: 'learning', description: 'See curriculum structure and content relationships.' },
  'learning.manage': { domain: 'learning', description: 'Change curriculum structure, order and membership.' },
  'learning.assign': { domain: 'learning', description: 'Assign learning to individuals.' },
  'learning.withdraw': { domain: 'learning', description: 'Withdraw a learning assignment.' },
  'learning.groups.manage': { domain: 'learning', description: 'Create and change groups and group assignments.' },

  // People -----------------------------------------------------------------
  'practitioners.view': { domain: 'people', description: 'See the practitioner directory.' },
  'practitioners.manage': { domain: 'people', description: 'Change a practitioner account status.' },
  'practitioners.progress.view': { domain: 'people', description: 'See a practitioner’s learning progress.' },
  'team.view': { domain: 'people', description: 'See staff members and their roles.' },
  'team.invite': { domain: 'people', description: 'Invite staff (invitations are not delivered in this prototype).' },
  'team.roles.assign': { domain: 'people', description: 'Change a staff member’s role, within the roles the actor may assign.' },
  'team.remove': { domain: 'people', description: 'Remove staff access or deactivate a staff account.' },

  // Insights ---------------------------------------------------------------
  'insights.visitors.view': { domain: 'insights', description: 'See visitor analytics.' },
  'insights.engagement.view': { domain: 'insights', description: 'See engagement analytics.' },
  'insights.scores.configure': { domain: 'insights', description: 'Change engagement score weights.' },

  // Campaigns --------------------------------------------------------------
  'campaigns.view': { domain: 'campaigns', description: 'See campaigns, templates and aggregate delivery.' },
  'campaigns.manage': { domain: 'campaigns', description: 'Create and change campaigns and pause or resume them.' },
  'campaigns.send': { domain: 'campaigns', description: 'Trigger a campaign send.' },
  'campaigns.recipients.view': { domain: 'campaigns', description: 'See who a campaign was sent to.' },

  // Settings and platform administration -----------------------------------
  'settings.view': { domain: 'settings', description: 'See operational settings.' },
  'settings.manage': { domain: 'settings', description: 'Change system-level settings.' },
  'roles.view': { domain: 'settings', description: 'See the role and permission definitions.' },
  'roles.manage': { domain: 'settings', description: 'Change role and permission definitions (reserved; not editable in this prototype).' },
  'audit.view': { domain: 'settings', description: 'Read the audit trail.' },
} as const satisfies Record<string, PermissionDefinition>

export type Permission = keyof typeof PERMISSION_DEFINITIONS

export const ALL_PERMISSIONS = Object.keys(PERMISSION_DEFINITIONS) as Permission[]

export const isPermission = (value: unknown): value is Permission =>
  typeof value === 'string' && Object.hasOwn(PERMISSION_DEFINITIONS, value)

export const permissionsInDomain = (domain: PermissionDomain): Permission[] =>
  ALL_PERMISSIONS.filter((permission) => PERMISSION_DEFINITIONS[permission].domain === domain)
