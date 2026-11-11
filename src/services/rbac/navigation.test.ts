import { describe, expect, it } from 'vitest'
import type { Role } from '@/types'
import {
  CMS_ROUTES,
  NAV_GROUPS,
  getAccessibleNavigationGroups,
  getBreadcrumbs,
  matchCmsRoute,
} from './navigation'

const groupsFor = (role: Role) =>
  getAccessibleNavigationGroups({ id: `u-${role}`, role }).map((group) => [group.label, group.items.map((item) => item.label)])

describe('navigation information architecture', () => {
  it('lists groups in the IA order', () => {
    expect(NAV_GROUPS.map((group) => group.label)).toEqual([
      'Overview', 'Content', 'Learning', 'Publishing', 'People', 'Insights', 'Campaigns', 'Settings',
    ])
  })

  it('gives an Editor only the content and learning-view groups', () => {
    expect(groupsFor('editor')).toEqual([
      ['Overview', ['Dashboard']],
      ['Content', ['Explorations', 'Meditations']],
      ['Learning', ['Curriculum']],
      ['Publishing', ['Review Queue']],
    ])
  })

  it('gives a Campaign manager only Overview and Campaigns', () => {
    expect(groupsFor('campaign')).toEqual([
      ['Overview', ['Dashboard']],
      ['Campaigns', ['Campaigns', 'Templates', 'Delivery']],
    ])
  })

  it('gives an Admin its sections, and no Settings group', () => {
    const admin = groupsFor('admin')
    expect(admin.map(([label]) => label)).toEqual(['Overview', 'Content', 'Learning', 'Publishing', 'People', 'Insights', 'Campaigns'])
    expect(admin.find(([label]) => label === 'People')![1]).toEqual(['Practitioners', 'Team & Roles'])
  })

  it('shows Score Settings only to a Super admin', () => {
    expect(groupsFor('super_admin').at(-1)).toEqual(['Settings', ['Score Settings']])
    expect(JSON.stringify(groupsFor('admin'))).not.toContain('Score Settings')
  })

  it('omits empty groups, and shows nothing to visitors, practitioners and unknown actors', () => {
    expect(groupsFor('visitor')).toEqual([])
    expect(groupsFor('practitioner')).toEqual([])
    expect(getAccessibleNavigationGroups(null)).toEqual([])
    expect(getAccessibleNavigationGroups({ id: 'x', role: 'god' as Role })).toEqual([])
  })

  it('does not list destinations whose module does not exist yet', () => {
    const everything = JSON.stringify(groupsFor('super_admin'))
    for (const planned of ['Media Library', 'Learning Paths', 'Modules', 'Assignments', 'Groups', 'Scheduled', 'History', 'Audit Log', 'Platform Settings']) {
      expect(everything, planned).not.toContain(planned)
    }
  })

  it('keeps every existing route path', () => {
    const paths = CMS_ROUTES.map((route) => route.path)
    for (const path of [
      '/cms', '/cms/explorations', '/cms/explorations/:id', '/cms/meditations', '/cms/meditations/:id',
      '/cms/curriculum', '/cms/curriculum/stages/:stageId', '/cms/publishing', '/cms/preview/:type/:id',
      '/cms/campaigns', '/cms/campaigns/:id', '/cms/templates', '/cms/templates/:id', '/cms/delivery',
      '/cms/users', '/cms/users/:id', '/cms/analytics/visitors', '/cms/analytics/engagement',
      '/cms/settings/score', '/cms/roles',
    ]) {
      expect(paths).toContain(path)
    }
  })
})

describe('route matching and breadcrumbs', () => {
  it('matches static routes and parameterised detail routes', () => {
    expect(matchCmsRoute('/cms')?.title).toBe('Dashboard')
    expect(matchCmsRoute('/cms/explorations')?.title).toBe('Explorations')
    expect(matchCmsRoute('/cms/explorations/exp-1')?.title).toBe('Exploration')
    expect(matchCmsRoute('/cms/preview/exploration/exp-1')?.title).toBe('Preview')
    expect(matchCmsRoute('/cms/nope')).toBeNull()
    expect(matchCmsRoute('/cms/explorations/a/b')).toBeNull()
  })

  it('builds group, ancestors and current page, with the current page last and unlinked', () => {
    expect(getBreadcrumbs('/cms')).toEqual([{ label: 'Dashboard' }])
    expect(getBreadcrumbs('/cms/explorations')).toEqual([{ label: 'Content' }, { label: 'Explorations' }])
    expect(getBreadcrumbs('/cms/explorations/exp-1')).toEqual([
      { label: 'Content' },
      { label: 'Explorations', href: '/cms/explorations' },
      { label: 'Exploration' },
    ])
    expect(getBreadcrumbs('/cms/analytics/visitors')).toEqual([{ label: 'Insights' }, { label: 'Visitors' }])
  })

  it('ends an unknown URL in "Not found"', () => {
    expect(getBreadcrumbs('/cms/nope')).toEqual([{ label: 'Admin', href: '/cms' }, { label: 'Not found' }])
  })

  it('every route has a parent that exists, or is a nav route', () => {
    for (const route of CMS_ROUTES) {
      if ('parent' in route) expect(CMS_ROUTES.some((entry) => entry.path === route.parent), route.path).toBe(true)
      else expect('nav' in route, route.path).toBe(true)
    }
  })
})
