import './styles/auth-milestone.css';
import './styles/student-access.css';
import './styles/ai-instructor.css';
import './styles/member-launch.css';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { useAuth, type AppRole } from './context/AuthContext';
import { MemberJourneyProvider, useMemberJourney } from './context/MemberJourneyContext';
import { MemberAccessGate } from './components/MemberAccessGate';
import { ChooseCareerPathPage } from './pages/ChooseCareerPathPage';
import { MemberHomePage, ExploreProgramsPage, MemberToolsPage, MemberCommunityPage } from './pages/MemberHomePage';
import { StudioPage } from './pages/StudioPage';
import { CreativeToolPage } from './pages/CreativeToolPage';
import { MyCoursesPage } from './pages/MyCoursesPage';
import { CoursePage } from './pages/CoursePage';
import { ModulePage } from './pages/ModulePage';
import { LessonPage } from './pages/LessonPage';
import { OperationsCenterPage } from './pages/OperationsCenterPage';
import { CurriculumStudioPage } from './pages/CurriculumStudioPage';
import { EnrollmentManagerPage } from './pages/EnrollmentManagerPage';
import { ManualStudentPage } from './pages/ManualStudentPage';
import { LabManagerPage } from './pages/LabManagerPage';
import { StudentIntelligencePage } from './pages/StudentIntelligencePage';
import { PracticeCoachPage } from './pages/PracticeCoachPage';
import { CertificateCenterPage } from './pages/CertificateCenterPage';
import { VerificationPage } from './pages/VerificationPage';
import { AdminPage } from './pages/AdminPage';
import { TeacherPage } from './pages/TeacherPage';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { SetPasswordPage } from './pages/SetPasswordPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { AIInstructorHubPage } from './pages/AIInstructorHubPage';
import { CareerPathingPage } from './pages/CareerPathingPage';
import { VideoFinderPage } from './pages/VideoFinderPage';
import { ModuleReadinessPage } from './pages/ModuleReadinessPage';
import { StaffCareerPathingPage } from './pages/StaffCareerPathingPage';
import { SingingPilotEnrollmentPage } from './pages/SingingPilotEnrollmentPage';
import { AIInstructorPreviewDebugPage, LIVE_AI_PREVIEW_DEBUG_ROUTE } from './pages/AIInstructorPreviewDebugPage';
import { CourseEnrollmentManagerPage } from './pages/CourseEnrollmentManagerPage';
import { MyPaymentsPage } from './pages/MyPaymentsPage';
import { PaymentLedgerPage } from './pages/PaymentLedgerPage';
import { LegalPoliciesPage } from './pages/LegalPoliciesPage';
import { StudentConsentPage } from './pages/StudentConsentPage';
import { ConsentLedgerPage } from './pages/ConsentLedgerPage';

function Loading() {
  return <div className="auth-loading"><img src="/assets/jpac-official-logo.png.png" alt="J. Moné's Performing Arts Center" /><p>Preparing your creative workspace…</p></div>;
}

function RequireAuth() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const journey = useMemberJourney();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!profile || profile.id !== user.id) return <section className="card card-pad"><h1>Preparing your member profile</h1><p>If your profile does not load, retry or contact JPAC staff.</p><button className="button button-primary" onClick={() => void refreshProfile()}>Retry profile</button><button className="auth-switch" onClick={() => void signOut()}>Sign out</button></section>;
  if (profile.role === 'student') {
    if (journey.loading) return <Loading />;
    if (journey.error) return <section className="card card-pad"><h1>Career Path unavailable</h1><p role="alert">{journey.error}</p><button className="button button-primary" onClick={() => void journey.refresh()}>Retry</button><button className="auth-switch" onClick={() => void signOut()}>Sign out</button></section>;
    if (!journey.selectedPath && location.pathname !== '/choose-career-path') return <Navigate to="/choose-career-path" replace />;
  }
  if (location.pathname === '/choose-career-path') return <ChooseCareerPathPage />;
  return <AppLayout />;
}

function RequireRole({ roles, children }: { roles: AppRole[]; children: ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading || !profile) return <Loading />;
  return roles.includes(profile.role) ? children : <Navigate to="/" replace />;
}

function HomeRoute() {
  const { profile } = useAuth();
  if (profile?.role === 'student') return <MemberHomePage />;
  if (profile?.role === 'teacher') return <TeacherPage />;
  return <OperationsCenterPage />;
}

const staff: AppRole[] = ['teacher', 'admin', 'developer'];
const admins: AppRole[] = ['admin', 'developer'];

export default function App() {
  return <BrowserRouter><MemberJourneyProvider><Routes>
    <Route path="/legal" element={<LegalPoliciesPage />} />
    <Route path="/legal/:slug" element={<LegalPoliciesPage />} />
    <Route path="/verify/:token" element={<VerificationPage />} />
    <Route path="/auth/callback" element={<AuthCallbackPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/set-password" element={<SetPasswordPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route element={<RequireAuth />}>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/choose-career-path" element={<ChooseCareerPathPage />} />
      <Route path="/programs" element={<ExploreProgramsPage />} />
      <Route path="/tools" element={<MemberToolsPage />} />
      <Route path="/community" element={<MemberCommunityPage />} />
      <Route path="account" element={<AccountSettingsPage />} />
      <Route path="/account/payments" element={<RequireRole roles={['student']}><MyPaymentsPage /></RequireRole>} />
      <Route path="/account/consents" element={<RequireRole roles={['student']}><StudentConsentPage /></RequireRole>} />
      <Route path="/coach" element={<AIInstructorHubPage />} />
      <Route path={LIVE_AI_PREVIEW_DEBUG_ROUTE} element={<RequireRole roles={staff}><AIInstructorPreviewDebugPage /></RequireRole>} />
      <Route path="/staff/career-pathing" element={<RequireRole roles={staff}><StaffCareerPathingPage /></RequireRole>} />
      <Route path="/career-pathing" element={<RequireRole roles={['student']}><CareerPathingPage /></RequireRole>} />
      <Route path="/courses" element={<MyCoursesPage />} />
      <Route path="/courses/:courseId" element={<MemberAccessGate><CoursePage /></MemberAccessGate>} />
      <Route path="/courses/:courseId/modules/:moduleId" element={<MemberAccessGate><ModulePage /></MemberAccessGate>} />
      <Route path="/courses/:courseId/lessons/:lessonId" element={<MemberAccessGate><LessonPage /></MemberAccessGate>} />
      <Route path="/practice-coach" element={<MemberAccessGate anyCourse><PracticeCoachPage /></MemberAccessGate>} />
      <Route path="/student-intelligence" element={<StudentIntelligencePage />} />
      <Route path="/studio" element={<StudioPage />} />
      <Route path="/studio/tools/:toolSlug" element={<CreativeToolPage />} />
      <Route path="/certificates" element={<CertificateCenterPage />} />
      <Route path="/curriculum" element={<RequireRole roles={staff}><CurriculumStudioPage /></RequireRole>} />
      <Route path="/staff/module-readiness" element={<RequireRole roles={staff}><ModuleReadinessPage /></RequireRole>} />
      <Route path="/staff/video-finder" element={<RequireRole roles={staff}><VideoFinderPage /></RequireRole>} />
      <Route path="/staff/singing-pilot-enrollment" element={<RequireRole roles={staff}><SingingPilotEnrollmentPage /></RequireRole>} />
      <Route path="/staff/course-enrollment" element={<RequireRole roles={staff}><CourseEnrollmentManagerPage /></RequireRole>} />
      <Route path="/staff/payment-ledger" element={<RequireRole roles={staff}><PaymentLedgerPage /></RequireRole>} />
      <Route path="/staff/consent-ledger" element={<RequireRole roles={staff}><ConsentLedgerPage /></RequireRole>} />
      <Route path="/teacher" element={<RequireRole roles={staff}><TeacherPage /></RequireRole>} />
      <Route path="/enrollment" element={<RequireRole roles={admins}><EnrollmentManagerPage /></RequireRole>} />
      <Route path="/manual-student" element={<RequireRole roles={admins}><ManualStudentPage /></RequireRole>} />
      <Route path="/lab-manager" element={<RequireRole roles={admins}><LabManagerPage /></RequireRole>} />
      <Route path="/admin" element={<RequireRole roles={admins}><AdminPage /></RequireRole>} />
      <Route path="/admin/policies" element={<RequireRole roles={admins}><LegalPoliciesPage editable /></RequireRole>} />
      <Route path="/admin/policies/:policySlug" element={<RequireRole roles={admins}><LegalPoliciesPage editable /></RequireRole>} />
      <Route path="/developer" element={<Navigate to="/admin" replace />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></MemberJourneyProvider></BrowserRouter>;
}
