import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { CmsLayout } from '@/app/layouts/CmsLayout'
import { PractitionerLayout } from '@/app/layouts/PractitionerLayout'
import { PublicLayout } from '@/app/layouts/PublicLayout'
import { RequireAuth } from '@/app/RequireAuth'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { SignUpPage } from '@/pages/auth/SignUpPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import { ExplorationReaderPage } from '@/pages/practitioner/ExplorationReaderPage'
import { MyJourneyPage } from '@/pages/practitioner/MyJourneyPage'
import { JourneyPage } from '@/pages/practitioner/JourneyPage'
import { PlayerPage } from '@/pages/practitioner/PlayerPage'
import { StageDetailPage } from '@/pages/practitioner/StageDetailPage'
import { AccountLayout } from '@/pages/account/AccountLayout'
import { EmailPreferencesPage } from '@/pages/account/EmailPreferencesPage'
import { PrivacyPage } from '@/pages/account/PrivacyPage'
import { ProfilePage } from '@/pages/account/ProfilePage'
import { UnsubscribePage } from '@/pages/account/UnsubscribePage'
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
import { PrivacyChoicesPage } from '@/pages/public/PrivacyChoicesPage'
import { AboutPage } from '@/pages/public/AboutPage'
import { ExplorationDetailPage } from '@/pages/public/ExplorationDetailPage'
import { ExplorationsPage } from '@/pages/public/ExplorationsPage'
import { HomePage } from '@/pages/public/HomePage'
import { MeditationDetailPage } from '@/pages/public/MeditationDetailPage'
import { MeditationsPage } from '@/pages/public/MeditationsPage'
import { ComingSoonPage } from '@/pages/system/ComingSoonPage'
import { ForbiddenPage } from '@/pages/system/ForbiddenPage'
import { NotFoundPage } from '@/pages/system/NotFoundPage'
import { ServerErrorPage } from '@/pages/system/ServerErrorPage'

export const router = createBrowserRouter(
  [
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <ServerErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'about/:slug', element: <AboutPage /> },
      { path: 'explorations', element: <ExplorationsPage /> },
      { path: 'explorations/:slug', element: <ExplorationDetailPage /> },
      { path: 'meditations', element: <MeditationsPage /> },
      { path: 'meditations/:slug', element: <MeditationDetailPage /> },
      { path: 'privacy', element: <ComingSoonPage title="Privacy" /> },
      { path: 'terms', element: <ComingSoonPage title="Terms" /> },
      {
        path: 'accessibility',
        element: <ComingSoonPage title="Accessibility" />,
      },
      { path: 'cookie-preferences', element: <PrivacyChoicesPage /> },
      { path: 'unsubscribe/:token', element: <UnsubscribePage /> },
      { path: '403', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    errorElement: <ServerErrorPage />,
    children: [
      {
        path: '/signup',
        element: <SignUpPage />,
      },
      {
        path: '/verify-email',
        element: <VerifyEmailPage />,
      },
      { path: '/login', element: <LoginPage /> },
      {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: '/reset-password',
        element: <ResetPasswordPage />,
      },
    ],
  },
  {
    element: (
      <RequireAuth>
        <PractitionerLayout />
      </RequireAuth>
    ),
    errorElement: <ServerErrorPage />,
    children: [
      { path: '/journey', element: <JourneyPage /> },
      {
        path: '/journey/stages/:stageId',
        element: <StageDetailPage />,
      },
      {
        path: '/journey/stages/:stageId/read/:contentId',
        element: <ExplorationReaderPage />,
      },
      {
        path: '/journey/stages/:stageId/listen/:contentId',
        element: <PlayerPage />,
      },
      { path: '/my-journey', element: <MyJourneyPage /> },
      {
        path: '/account',
        element: <AccountLayout />,
        children: [
          { index: true, element: <Navigate to="profile" replace /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'email', element: <EmailPreferencesPage /> },
          { path: 'privacy', element: <PrivacyPage /> },
        ],
      },
    ],
  },
  {
    path: '/cms',
    element: (
      <RequireAuth roles={['editor', 'campaign', 'admin']}>
        <CmsLayout />
      </RequireAuth>
    ),
    errorElement: <ServerErrorPage />,
    children: [
      { index: true, element: <CmsOverviewPage /> },
      { path: 'explorations', element: <ExplorationsListPage /> },
      { path: 'explorations/:id', element: <ExplorationEditorPage /> },
      { path: 'meditations', element: <MeditationsListPage /> },
      { path: 'meditations/:id', element: <MeditationEditorPage /> },
      { path: 'curriculum', element: <CurriculumPage /> },
      { path: 'curriculum/stages/:stageId', element: <StageSequencePage /> },
      { path: 'publishing', element: <PublishingPage /> },
      { path: 'preview/:type/:id', element: <ContentPreviewPage /> },
      { path: 'campaigns', element: <CampaignsPage /> },
      { path: 'campaigns/:id', element: <CampaignSetupPage /> },
      { path: 'templates', element: <TemplatesPage /> },
      { path: 'templates/:id', element: <TemplateEditorPage /> },
      { path: 'delivery', element: <DeliveryPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'users/:id', element: <UserDetailPage /> },
      { path: 'analytics/visitors', element: <VisitorDashboardPage /> },
      { path: 'analytics/engagement', element: <EngagementDashboardPage /> },
      { path: 'settings/score', element: <ScoreSettingsPage /> },
      { path: 'roles', element: <RolesPage /> },
      { path: '*', element: <ComingSoonPage title="Not found" /> },
    ],
  },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
)
