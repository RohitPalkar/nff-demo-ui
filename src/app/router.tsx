import { SOW_SCOPE } from '@/config/sowScope'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { CmsLayout } from '@/app/layouts/CmsLayout'
import { LearnLayout } from '@/app/layouts/LearnLayout'
import { PublicLayout } from '@/app/layouts/PublicLayout'
import { LegacyRedirect } from '@/app/LegacyRedirect'
import { cmsRoutes } from '@/app/cmsRoutes'
import { RequireAuth } from '@/app/RequireAuth'
import { RequireCmsAccess } from '@/app/RequirePermission'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { SignUpPage } from '@/pages/auth/SignUpPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import { AccountLayout } from '@/pages/account/AccountLayout'
import { EmailPreferencesPage } from '@/pages/account/EmailPreferencesPage'
import { PrivacyPage } from '@/pages/account/PrivacyPage'
import { PreferencesPage } from '@/pages/account/PreferencesPage'
import { ProfilePage } from '@/pages/account/ProfilePage'
import { AccessDeniedPage } from '@/pages/learn/AccessDeniedPage'
import { LearnHomePage } from '@/pages/learn/LearnHomePage'
import { LearnMeditationsPage } from '@/pages/learn/LearnMeditationsPage'
import { MeditationPage } from '@/pages/learn/MeditationPage'
import { LearnNotFoundPage } from '@/pages/learn/LearnNotFoundPage'
import { LearnProgressPage } from '@/pages/learn/LearnProgressPage'
import { LessonPage } from '@/pages/learn/LessonPage'
import { LibraryPage } from '@/pages/learn/LibraryPage'
import { MyLearningPage } from '@/pages/learn/MyLearningPage'
import { PathPage } from '@/pages/learn/PathPage'
import { ResourcePage } from '@/pages/learn/ResourcePage'
import { UnsubscribePage } from '@/pages/account/UnsubscribePage'
import { PrivacyChoicesPage } from '@/pages/public/PrivacyChoicesPage'
import { AboutPage } from '@/pages/public/AboutPage'
import { ExplorationDetailPage } from '@/pages/public/ExplorationDetailPage'
import { ExplorationsPage } from '@/pages/public/ExplorationsPage'
import { HomePage } from '@/pages/public/HomePage'
import { LibraryCategoryPage } from '@/pages/public/LibraryCategoryPage'
import { MeditationDetailPage } from '@/pages/public/MeditationDetailPage'
import { MeditationsPage } from '@/pages/public/MeditationsPage'
import { ComingSoonPage } from '@/pages/system/ComingSoonPage'
import { CookiePolicyPage } from '@/pages/public/legal/CookiePolicyPage'
import { PrivacyPolicyPage } from '@/pages/public/legal/PrivacyPolicyPage'
import { TermsPage } from '@/pages/public/legal/TermsPage'
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
      { path: 'about', element: <AboutPage /> },
      { path: 'about/:slug', element: <AboutPage /> },
      { path: 'explorations', element: <ExplorationsPage /> },
      { path: 'explorations/:slug', element: <ExplorationDetailPage /> },
      { path: 'library/:category', element: <LibraryCategoryPage /> },
      { path: 'meditations', element: <MeditationsPage /> },
      { path: 'meditations/:slug', element: <MeditationDetailPage /> },
      // Sample legal pages (SOW §3.1 #9); NFF's counsel supplies the final text.
      { path: 'privacy', element: <PrivacyPolicyPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'cookies', element: <CookiePolicyPage /> },
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
      // Password reset is not in SOW v1.3 (OTP sign-in, no passwords).
      ...(SOW_SCOPE.passwordReset
        ? [
            { path: '/forgot-password', element: <ForgotPasswordPage /> },
            { path: '/reset-password', element: <ResetPasswordPage /> },
          ]
        : []),
    ],
  },
  // Old practitioner URLs: redirect into /learn, keeping query and hash.
  // See services/learning/legacyRoutes.ts for the verified mapping.
  { path: '/journey', element: <LegacyRedirect /> },
  { path: '/my-journey', element: <LegacyRedirect /> },
  { path: '/journey/stages/:stageId', element: <LegacyRedirect /> },
  { path: '/journey/stages/:stageId/read/:contentId', element: <LegacyRedirect /> },
  { path: '/journey/stages/:stageId/listen/:contentId', element: <LegacyRedirect /> },
  {
    element: (
      <RequireAuth>
        <LearnLayout />
      </RequireAuth>
    ),
    errorElement: <ServerErrorPage />,
    children: [
      { path: '/learn', element: <LearnHomePage /> },
      { path: '/learn/my-learning', element: <MyLearningPage /> },
      { path: '/learn/library', element: <LibraryPage /> },
      { path: '/learn/library/:type/:slug', element: <ResourcePage /> },
      { path: '/learn/meditations', element: <LearnMeditationsPage /> },
      { path: '/learn/meditations/:slug', element: <MeditationPage /> },
      { path: '/learn/progress', element: <LearnProgressPage /> },
      { path: '/learn/paths/:pathSlug', element: <PathPage /> },
      { path: '/learn/paths/:pathSlug/lessons/:lessonId', element: <LessonPage /> },
      { path: '/learn/access-denied', element: <AccessDeniedPage /> },
      { path: '/learn/*', element: <LearnNotFoundPage /> },
      {
        path: '/account',
        element: <AccountLayout />,
        children: [
          { index: true, element: <Navigate to="profile" replace /> },
          { path: 'profile', element: <ProfilePage /> },
          // Playback preferences are not in SOW v1.3 (profile is name, time zone, email).
          ...(SOW_SCOPE.playbackPreferences
            ? [{ path: 'preferences', element: <PreferencesPage /> }]
            : []),
          { path: 'email', element: <EmailPreferencesPage /> },
          { path: 'privacy', element: <PrivacyPage /> },
        ],
      },
    ],
  },
  {
    path: '/cms',
    element: (
      <RequireAuth>
        <RequireCmsAccess>
          <CmsLayout />
        </RequireCmsAccess>
      </RequireAuth>
    ),
    errorElement: <ServerErrorPage />,
    children: cmsRoutes,
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
