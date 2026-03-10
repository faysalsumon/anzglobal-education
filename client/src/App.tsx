import { lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNavBar } from "@/components/top-nav-bar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
const ChatWidget = lazy(() => import("@/components/chat-widget").then(m => ({ default: m.ChatWidget })));
import { Footer } from "@/components/footer";
import { PublicHeader } from "@/components/public-header";
import { useAuth } from "@/hooks/useAuth";
import { RegionProvider } from "@/context/RegionContext";
import { SupabaseAuthProvider } from "@/lib/supabase-auth";
import { useMetaPixel } from "@/hooks/useMetaPixel";
import { useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";

const NotFound = lazy(() => import("@/pages/not-found"));
const Landing = lazy(() => import("@/pages/landing"));
const Home = lazy(() => import("@/pages/home"));
const CourseForm = lazy(() => import("@/pages/course-form"));
const StudentCourses = lazy(() => import("@/pages/student-courses"));
const CourseDetail = lazy(() => import("@/pages/course-detail"));
const StudentProfilePage = lazy(() => import("@/pages/student-profile"));
const StudentApplications = lazy(() => import("@/pages/student-applications"));
const StudentAIAssistant = lazy(() => import("@/pages/student-ai-assistant"));
const StudentReferrals = lazy(() => import("@/pages/student-referrals"));
const StudentDocuments = lazy(() => import("@/pages/student-documents"));
const StudentFavorites = lazy(() => import("@/pages/student-favorites"));
const StudentAccount = lazy(() => import("@/pages/student-account"));
const StudentPreferences = lazy(() => import("@/pages/student-preferences"));
const StudentDashboardPage = lazy(() => import("@/pages/student-dashboard-page"));
const DashboardRedirect = lazy(() => import("@/pages/dashboard-redirect"));
const PublicCourses = lazy(() => import("@/pages/public-courses"));
const PublicCourseDetail = lazy(() => import("@/pages/public-course-detail"));
const PublicInstitutions = lazy(() => import("@/pages/public-institutions"));
const PublicInstitutionDetail = lazy(() => import("@/pages/public-institution-detail"));
const PublicBlogArchive = lazy(() => import("@/pages/public-blog-archive"));
const PublicBlogDetail = lazy(() => import("@/pages/public-blog-detail"));
const CompareCourses = lazy(() => import("@/pages/compare-courses"));
const Contact = lazy(() => import("@/pages/contact"));
const PartnerWithUs = lazy(() => import("@/pages/partner-with-us"));
const StudyInAustralia = lazy(() => import("@/pages/study-in-australia"));
const OurStory = lazy(() => import("@/pages/our-story"));
const StudentReviews = lazy(() => import("@/pages/student-reviews"));
const UserTypeSelection = lazy(() => import("@/pages/user-type-selection"));
const AdminLogin = lazy(() => import("@/pages/admin-login"));
const AdminForgotPassword = lazy(() => import("@/pages/admin-forgot-password"));
const AuthPage = lazy(() => import("@/pages/auth"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const AdminProfile = lazy(() => import("@/pages/admin-profile"));
const AdminCSVImport = lazy(() => import("@/pages/admin-csv-import"));
const ScrapingJobDetail = lazy(() => import("@/pages/scraping-job-detail"));
const ScrapingReviewDashboard = lazy(() => import("@/pages/scraping-review-dashboard"));
const AdminApplicationDetail = lazy(() => import("@/pages/admin-application-detail"));
const ChatPage = lazy(() => import("@/pages/chat"));
const TermsOfService = lazy(() => import("@/pages/terms-of-service"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));
const AffiliatePage = lazy(() => import("@/pages/affiliate"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const AuthCallback = lazy(() => import("@/pages/auth-callback"));
const AdminPendingApproval = lazy(() => import("@/pages/admin-pending-approval"));
const AcceptInvitation = lazy(() => import("@/pages/accept-invitation"));
const ForcePasswordReset = lazy(() => import("@/pages/force-password-reset"));
const AdminContactForm = lazy(() => import("@/pages/admin-contact-form"));
const Developers = lazy(() => import("@/pages/developers"));
const StudyAbroad = lazy(() => import("@/pages/study-abroad"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[200px] w-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
}

interface RouterProps {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
}

function Router({ user, isAuthenticated, isLoading }: RouterProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/forgot-password" component={AdminForgotPassword} />
        <Route path="/compare-courses" component={CompareCourses} />
        <Route path="/contact" component={Contact} />
        <Route path="/partner-with-us" component={PartnerWithUs} />
        <Route path="/study-in-australia" component={StudyInAustralia} />
        <Route path="/study-abroad" component={StudyAbroad} />
        <Route path="/our-story" component={OurStory} />
        <Route path="/student-reviews" component={StudentReviews} />
        <Route path="/courses/:id" component={PublicCourseDetail} />
        <Route path="/courses" component={PublicCourses} />
        <Route path="/institutions/:id" component={PublicInstitutionDetail} />
        <Route path="/institutions" component={PublicInstitutions} />
        <Route path="/blog/:slug" component={PublicBlogDetail} />
        <Route path="/blog" component={PublicBlogArchive} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/affiliate" component={AffiliatePage} />
        <Route path="/developers" component={Developers} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/force-password-reset" component={ForcePasswordReset} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/auth/accept-invite" component={AcceptInvitation} />
        <Route path="/accept-invitation" component={AcceptInvitation} />
        <Route path="/user-type" component={UserTypeSelection} />
        <Route path="/dashboard" component={DashboardRedirect} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/pending-approval" component={AdminPendingApproval} />
        <Route path="/admin/profile" component={AdminProfile} />
        <Route path="/admin/csv-import" component={AdminCSVImport} />
        <Route path="/admin/scraping/jobs/:jobId" component={ScrapingJobDetail} />
        <Route path="/admin/scraping/review/:jobId" component={ScrapingReviewDashboard} />
        <Route path="/admin/applications/:id" component={AdminApplicationDetail} />
        <Route path="/admin/contacts/new" component={AdminContactForm} />
        <Route path="/admin/contacts/:id/edit" component={AdminContactForm} />
        <Route path="/student/dashboard" component={StudentDashboardPage} />
        <Route path="/student/courses" component={StudentCourses} />
        <Route path="/student/courses/:id" component={CourseDetail} />
        <Route path="/student/profile" component={StudentProfilePage} />
        <Route path="/student/account" component={StudentAccount} />
        <Route path="/student/applications" component={StudentApplications} />
        <Route path="/student/documents" component={StudentDocuments} />
        <Route path="/student/favorites" component={StudentFavorites} />
        <Route path="/student/referrals" component={StudentReferrals} />
        <Route path="/student/ai-assistant" component={StudentAIAssistant} />
        <Route path="/student/preferences" component={StudentPreferences} />
        <Route path="/chat" component={ChatPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppContent() {
  const { user, isAuthenticated, isLoading, isAuthResolved } = useAuth();
  const [location, setLocation] = useLocation();
  useMetaPixel();
  useGoogleAnalytics();
  
  // Public routes that should not have padding even for authenticated users
  const publicRoutes = ['/', '/courses', '/institutions', '/blog', '/contact', '/compare-courses', '/partner-with-us', '/study-in-australia', '/study-abroad', '/our-story', '/student-reviews', '/auth', '/auth/callback', '/admin/login', '/admin/forgot-password'];
  
  // Standalone pages that have their own complete layout (no header/footer wrapping)
  const standalonePages = ['/reset-password', '/force-password-reset', '/accept-invitation', '/auth/accept-invite'];
  const isPublicRoute = publicRoutes.some(route => 
    location === route || 
    location.startsWith('/courses/') || 
    location.startsWith('/institutions/') || 
    location.startsWith('/blog/')
  );

  // Admin dashboard has its own sidebar layout - don't show TopNavBar/MobileBottomNav
  // Only for authenticated admin users on dashboard pages (not login)
  const isAdminDashboard = location === '/admin' || 
    (location.startsWith('/admin/') && location !== '/admin/login');

  // Student and University portal pages now have their own 3-column layouts
  const isStudentPortal = location.startsWith('/student/') || location === '/dashboard' || location === '/affiliate';

  // Internal dashboard/portal pages that should NOT show footer (only for authenticated users)
  const internalDashboardRoutes = [
    '/dashboard',
    '/student/',
    '/chat',
    '/affiliate'
  ];
  const isInternalDashboard = internalDashboardRoutes.some(route => 
    location === route || location.startsWith(route)
  );
  
  // Show footer on all pages except internal dashboards when authenticated
  // Always show footer for unauthenticated users on any page
  const shouldShowFooter = !isAuthenticated || !isInternalDashboard;

  // Standalone pages have their own complete layout — render immediately, no auth gate needed
  const isStandalonePage = standalonePages.includes(location);
  if (isStandalonePage) {
    return <Router user={user} isAuthenticated={isAuthenticated} isLoading={isLoading} />;
  }

  // PUBLIC ROUTES: render the full layout immediately on first React paint.
  // The URL is known synchronously so we never need to wait for auth resolution here.
  // This eliminates the 0.42 CLS caused by spinner → full-layout transition (footer appearing late).
  // Auth hydrates in the background; ChatWidget only mounts once auth is confirmed.
  if (isPublicRoute) {
    return (
      <div className="flex flex-col min-h-screen w-full">
        <PublicHeader />
        <main className="flex-1">
          <Router user={user} isAuthenticated={isAuthenticated} isLoading={isLoading} />
        </main>
        <Footer />
        {isAuthenticated && !isLoading && (
          (user?.userType === 'admin' || user?.userType === 'platform_admin') ? (
            <Button
              data-testid="button-admin-chat-fab"
              className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg gap-2 px-5"
              onClick={() => setLocation('/admin/dashboard?tab=messages')}
            >
              <MessageCircle className="h-4 w-4" />
              Chat
            </Button>
          ) : (
            <Suspense fallback={null}>
              <ChatWidget />
            </Suspense>
          )
        )}
      </div>
    );
  }

  // For auth-gated routes (portals, admin, etc.): wait until auth is resolved
  if (isLoading || !isAuthResolved) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Admin dashboard uses its own full layout with sidebar (no footer)
  if (isAdminDashboard && isAuthenticated) {
    return <Router user={user} isAuthenticated={isAuthenticated} isLoading={isLoading} />;
  }

  // Student portal has its own 3-column layout with sidebar
  if (isStudentPortal && isAuthenticated) {
    return <Router user={user} isAuthenticated={isAuthenticated} isLoading={isLoading} />;
  }

  // Unauthenticated users on non-public routes get the public layout
  if (!isAuthenticated || !user?.userType) {
    return (
      <div className="flex flex-col min-h-screen w-full">
        <PublicHeader />
        <main className="flex-1">
          <Router user={user} isAuthenticated={isAuthenticated} isLoading={isLoading} />
        </main>
        {shouldShowFooter && <Footer />}
      </div>
    );
  }

  // Internal dashboard/portal routes - use TopNavBar for authenticated users
  return (
    <div className="flex flex-col min-h-screen w-full">
      <TopNavBar />
      <main className={`flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6`}>
        <Router user={user} isAuthenticated={isAuthenticated} isLoading={isLoading} />
      </main>
      {shouldShowFooter && <Footer />}
      <MobileBottomNav />
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SupabaseAuthProvider>
          <RegionProvider>
            <AppContent />
            <Toaster />
          </RegionProvider>
        </SupabaseAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
