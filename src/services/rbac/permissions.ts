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
  'roles.manage': { domain: 'settings', description: 'Change what the Editor, Campaign manager and Admin roles can do. Super admin only.' },
  'audit.view': { domain: 'settings', description: 'Read the audit trail.' },
} as const satisfies Record<string, PermissionDefinition>

export type Permission = keyof typeof PERMISSION_DEFINITIONS

export const ALL_PERMISSIONS = Object.keys(PERMISSION_DEFINITIONS) as Permission[]

export const isPermission = (value: unknown): value is Permission =>
  typeof value === 'string' && Object.hasOwn(PERMISSION_DEFINITIONS, value)

export const permissionsInDomain = (domain: PermissionDomain): Permission[] =>
  ALL_PERMISSIONS.filter((permission) => PERMISSION_DEFINITIONS[permission].domain === domain)

/** Short, human names for the permission editor. The id stays visible beside them. */
export const PERMISSION_LABELS: Record<Permission, string> = {
  'cms.access': 'Open the Admin',
  'content.view': 'View content',
  'content.create': 'Create content',
  'content.edit': 'Edit content',
  'content.delete': 'Delete content',
  'content.submit': 'Submit for review',
  'content.review': 'Open the review queue',
  'content.approve': 'Approve',
  'content.reject': 'Send back',
  'content.publish': 'Publish',
  'content.unpublish': 'Unpublish',
  'content.schedule': 'Schedule',
  'content.preview': 'Preview',
  'content.ownership.manage': 'Assign owners',
  'learning.view': 'View curriculum',
  'learning.manage': 'Change curriculum',
  'learning.assign': 'Assign learning',
  'learning.withdraw': 'Withdraw learning',
  'learning.groups.manage': 'Manage groups',
  'practitioners.view': 'View practitioners',
  'practitioners.manage': 'Change account status',
  'practitioners.progress.view': 'View progress',
  'team.view': 'View the team',
  'team.invite': 'Invite staff',
  'team.roles.assign': 'Change staff roles',
  'team.remove': 'Deactivate staff',
  'insights.visitors.view': 'Visitor analytics',
  'insights.engagement.view': 'Engagement analytics',
  'insights.scores.configure': 'Configure score weights',
  'campaigns.view': 'View campaigns',
  'campaigns.manage': 'Manage campaigns',
  'campaigns.send': 'Trigger sends',
  'campaigns.recipients.view': 'See recipients',
  'settings.view': 'View settings',
  'settings.manage': 'Change settings',
  'roles.view': 'View roles',
  'roles.manage': 'Edit role permissions',
  'audit.view': 'Read the audit trail',
}

/**
 * Prerequisites: a permission is only useful with the ones it lists (you cannot
 * approve what you cannot open). The role editor grants prerequisites with a
 * permission and removes dependants with a prerequisite, and a saved role must
 * be closed under this map. `cms.access` is a prerequisite of everything.
 */
export const PERMISSION_REQUIRES: Partial<Record<Permission, readonly Permission[]>> = {
  'content.create': ['content.view'],
  'content.edit': ['content.view'],
  'content.delete': ['content.view'],
  'content.submit': ['content.view'],
  'content.review': ['content.view'],
  'content.approve': ['content.review'],
  'content.reject': ['content.review'],
  'content.publish': ['content.view'],
  'content.unpublish': ['content.view'],
  'content.schedule': ['content.view'],
  'content.preview': ['content.view'],
  'content.ownership.manage': ['content.view'],
  'learning.manage': ['learning.view'],
  'learning.assign': ['learning.view'],
  'learning.withdraw': ['learning.view'],
  'learning.groups.manage': ['learning.view'],
  'practitioners.manage': ['practitioners.view'],
  'practitioners.progress.view': ['practitioners.view'],
  'team.invite': ['team.view'],
  'team.roles.assign': ['team.view'],
  'team.remove': ['team.view'],
  'insights.scores.configure': ['insights.engagement.view'],
  'campaigns.manage': ['campaigns.view'],
  'campaigns.send': ['campaigns.view'],
  'campaigns.recipients.view': ['campaigns.view'],
  'settings.manage': ['settings.view'],
  'roles.manage': ['roles.view'],
}

/** Every permission this one needs, directly or through others, including `cms.access`. */
export function prerequisitesOf(permission: Permission): Permission[] {
  const out = new Set<Permission>()
  const visit = (current: Permission) => {
    for (const next of PERMISSION_REQUIRES[current] ?? []) {
      if (!out.has(next)) {
        out.add(next)
        visit(next)
      }
    }
  }
  visit(permission)
  if (permission !== 'cms.access') out.add('cms.access')
  return [...out]
}

/** Every permission that needs this one, directly or through others. */
export function dependantsOf(permission: Permission): Permission[] {
  return ALL_PERMISSIONS.filter((other) => other !== permission && prerequisitesOf(other).includes(permission))
}
