import { createBrowserRouter } from 'react-router-dom'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { CmsLayout } from '@/app/layouts/CmsLayout'
import { PractitionerLayout } from '@/app/layouts/PractitionerLayout'
import { PublicLayout } from '@/app/layouts/PublicLayout'
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
      { path: 'about/:slug', element: <ComingSoonPage title="About" /> },
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
      {
        path: 'cookie-preferences',
        element: <ComingSoonPage title="Cookie preferences" />,
      },
      {
        path: 'unsubscribe/:token',
        element: <ComingSoonPage title="Unsubscribe" />,
      },
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
        element: <ComingSoonPage title="Create your account" />,
      },
      {
        path: '/verify-email',
        element: <ComingSoonPage title="Verify your email" />,
      },
      { path: '/login', element: <ComingSoonPage title="Log in" /> },
      {
        path: '/forgot-password',
        element: <ComingSoonPage title="Forgot password" />,
      },
      {
        path: '/reset-password',
        element: <ComingSoonPage title="Reset password" />,
      },
    ],
  },
  {
    element: <PractitionerLayout />,
    errorElement: <ServerErrorPage />,
    children: [
      { path: '/journey', element: <ComingSoonPage title="Your journey" /> },
      {
        path: '/journey/stages/:stageId',
        element: <ComingSoonPage title="Stage" />,
      },
      {
        path: '/journey/stages/:stageId/read/:contentId',
        element: <ComingSoonPage title="Exploration reader" />,
      },
      {
        path: '/journey/stages/:stageId/listen/:contentId',
        element: <ComingSoonPage title="Player" />,
      },
      { path: '/my-journey', element: <ComingSoonPage title="My journey" /> },
      {
        path: '/account/profile',
        element: <ComingSoonPage title="Profile" />,
      },
      {
        path: '/account/email',
        element: <ComingSoonPage title="Email preferences" />,
      },
      {
        path: '/account/privacy',
        element: <ComingSoonPage title="Privacy" />,
      },
    ],
  },
  {
    path: '/cms',
    element: <CmsLayout />,
    errorElement: <ServerErrorPage />,
    children: [
      { index: true, element: <ComingSoonPage title="CMS overview" /> },
      {
        path: 'explorations',
        element: <ComingSoonPage title="Explorations" />,
      },
      {
        path: 'explorations/:id',
        element: <ComingSoonPage title="Exploration editor" />,
      },
      { path: 'meditations', element: <ComingSoonPage title="Meditations" /> },
      {
        path: 'meditations/:id',
        element: <ComingSoonPage title="Meditation editor" />,
      },
      { path: 'curriculum', element: <ComingSoonPage title="Curriculum" /> },
      {
        path: 'curriculum/stages/:stageId',
        element: <ComingSoonPage title="Stage sequence" />,
      },
      { path: 'publishing', element: <ComingSoonPage title="Publishing" /> },
      {
        path: 'preview/:type/:id',
        element: <ComingSoonPage title="Content preview" />,
      },
      { path: 'campaigns', element: <ComingSoonPage title="Campaigns" /> },
      {
        path: 'campaigns/:id',
        element: <ComingSoonPage title="Campaign setup" />,
      },
      { path: 'templates', element: <ComingSoonPage title="Templates" /> },
      {
        path: 'templates/:id',
        element: <ComingSoonPage title="Template editor" />,
      },
      { path: 'delivery', element: <ComingSoonPage title="Delivery reports" /> },
      { path: 'users', element: <ComingSoonPage title="Users" /> },
      { path: 'users/:id', element: <ComingSoonPage title="User detail" /> },
      {
        path: 'analytics/visitors',
        element: <ComingSoonPage title="Visitor dashboard" />,
      },
      {
        path: 'analytics/engagement',
        element: <ComingSoonPage title="Engagement dashboard" />,
      },
      {
        path: 'settings/score',
        element: <ComingSoonPage title="Score settings" />,
      },
      { path: 'roles', element: <ComingSoonPage title="Roles" /> },
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
