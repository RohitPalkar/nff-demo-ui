import type { ReactElement } from 'react'
import type { RouteObject } from 'react-router-dom'
import { RequireRoutePermission } from '@/app/RequirePermission'
import { ContentPreviewPage } from '@/pages/cms/ContentPreviewPage'
import { CurriculumPage } from '@/pages/cms/CurriculumPage'
import { PublishingPage } from '@/pages/cms/PublishingPage'
import { StageSequencePage } from '@/pages/cms/StageSequencePage'
import { CampaignSetupPage } from '@/pages/cms/CampaignSetupPage'
import { CampaignsPage } from '@/pages/cms/CampaignsPage'
import { DeliveryPage } from '@/pages/cms/DeliveryPage'
import { TemplateEditorPage } from '@/pages/cms/TemplateEditorPage'
import { TemplatesPage } from '@/pages/cms/TemplatesPage'
import { EngagementDashboardPage } from '@/pages/cms/EngagementDashboardPage'
import { RolesPage } from '@/pages/cms/RolesPage'
import { ScoreSettingsPage } from '@/pages/cms/ScoreSettingsPage'
import { UserDetailPage } from '@/pages/cms/UserDetailPage'
import { UsersPage } from '@/pages/cms/UsersPage'
import { VisitorDashboardPage } from '@/pages/cms/VisitorDashboardPage'
import { CmsOverviewPage } from '@/pages/cms/CmsOverviewPage'
import { ExplorationEditorPage } from '@/pages/cms/ExplorationEditorPage'
import { ExplorationsListPage } from '@/pages/cms/ExplorationsListPage'
import { MeditationEditorPage } from '@/pages/cms/MeditationEditorPage'
import { MeditationsListPage } from '@/pages/cms/MeditationsListPage'
import { ComingSoonPage } from '@/pages/system/ComingSoonPage'
import type { CmsRoutePath } from '@/services/rbac/navigation'

/** Every `/cms` page goes through the permission registry (services/rbac/navigation.ts). */
const guard = (route: CmsRoutePath, page: ReactElement) => (
  <RequireRoutePermission route={route}>{page}</RequireRoutePermission>
)

/**
 * The `/cms` child routes. Separate from the router so tests can mount them
 * under a memory router with the real guards.
 */
export const cmsRoutes: RouteObject[] = [
      { index: true, element: guard('/cms', <CmsOverviewPage />) },
      { path: 'explorations', element: guard('/cms/explorations', <ExplorationsListPage />) },
      { path: 'explorations/:id', element: guard('/cms/explorations/:id', <ExplorationEditorPage />) },
      { path: 'meditations', element: guard('/cms/meditations', <MeditationsListPage />) },
      { path: 'meditations/:id', element: guard('/cms/meditations/:id', <MeditationEditorPage />) },
      { path: 'curriculum', element: guard('/cms/curriculum', <CurriculumPage />) },
      { path: 'curriculum/stages/:stageId', element: guard('/cms/curriculum/stages/:stageId', <StageSequencePage />) },
      { path: 'publishing', element: guard('/cms/publishing', <PublishingPage />) },
      { path: 'preview/:type/:id', element: guard('/cms/preview/:type/:id', <ContentPreviewPage />) },
      { path: 'campaigns', element: guard('/cms/campaigns', <CampaignsPage />) },
      { path: 'campaigns/:id', element: guard('/cms/campaigns/:id', <CampaignSetupPage />) },
      { path: 'templates', element: guard('/cms/templates', <TemplatesPage />) },
      { path: 'templates/:id', element: guard('/cms/templates/:id', <TemplateEditorPage />) },
      { path: 'delivery', element: guard('/cms/delivery', <DeliveryPage />) },
      { path: 'users', element: guard('/cms/users', <UsersPage />) },
      { path: 'users/:id', element: guard('/cms/users/:id', <UserDetailPage />) },
      { path: 'analytics/visitors', element: guard('/cms/analytics/visitors', <VisitorDashboardPage />) },
      { path: 'analytics/engagement', element: guard('/cms/analytics/engagement', <EngagementDashboardPage />) },
      { path: 'settings/score', element: guard('/cms/settings/score', <ScoreSettingsPage />) },
      { path: 'roles', element: guard('/cms/roles', <RolesPage />) },
      { path: '*', element: <ComingSoonPage title="Not found" /> },
]
