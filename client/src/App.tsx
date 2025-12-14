import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNavBar } from "@/components/top-nav-bar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ChatWidget } from "@/components/chat-widget";
import { Footer } from "@/components/footer";
import { PublicHeader } from "@/components/public-header";
import { useAuth } from "@/hooks/useAuth";
import { RegionProvider } from "@/context/RegionContext";
import { SupabaseAuthProvider } from "@/lib/supabase-auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import UniversityProfile from "@/pages/university-profile";
import UniversityInstitutions from "@/pages/university-institutions";
import UniversityCourses from "@/pages/university-courses";
import CourseForm from "@/pages/course-form";
import UniversityApplications from "@/pages/university-applications";
import UniversityTeam from "@/pages/university-team";
import UniversityAIAssistant from "@/pages/university-ai-assistant";
import StudentCourses from "@/pages/student-courses";
import CourseDetail from "@/pages/course-detail";
import StudentProfilePage from "@/pages/student-profile";
import StudentApplications from "@/pages/student-applications";
import StudentAIAssistant from "@/pages/student-ai-assistant";
import StudentReferrals from "@/pages/student-referrals";
import StudentDocuments from "@/pages/student-documents";
import StudentFavorites from "@/pages/student-favorites";
import StudentDashboardPage from "@/pages/student-dashboard-page";
import PublicCourses from "@/pages/public-courses";
import PublicCourseDetail from "@/pages/public-course-detail";
import PublicInstitutions from "@/pages/public-institutions";
import PublicInstitutionDetail from "@/pages/public-institution-detail";
import PublicBlogArchive from "@/pages/public-blog-archive";
import PublicBlogDetail from "@/pages/public-blog-detail";
import CompareCourses from "@/pages/compare-courses";
import Contact from "@/pages/contact";
import PartnerWithUs from "@/pages/partner-with-us";
import StudyInAustralia from "@/pages/study-in-australia";
import OurStory from "@/pages/our-story";
import StudentReviews from "@/pages/student-reviews";
import UserTypeSelection from "@/pages/user-type-selection";
import Login from "@/pages/login";
import AdminLogin from "@/pages/admin-login";
import InstitutionLogin from "@/pages/institution-login";
import AuthPage from "@/pages/auth";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminProfile from "@/pages/admin-profile";
import AdminCSVImport from "@/pages/admin-csv-import";
import ScrapingJobDetail from "@/pages/scraping-job-detail";
import ScrapingReviewDashboard from "@/pages/scraping-review-dashboard";
import AdminApplicationDetail from "@/pages/admin-application-detail";
import ChatPage from "@/pages/chat";
import TermsOfService from "@/pages/terms-of-service";
import PrivacyPolicy from "@/pages/privacy-policy";
import AffiliatePage from "@/pages/affiliate";
import ResetPasswordPage from "@/pages/reset-password";
import AuthCallback from "@/pages/auth-callback";

interface RouterProps {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
}

function Router({ user, isAuthenticated, isLoading }: RouterProps) {
  return (
    <Switch>
      {/* Public routes accessible to everyone */}
      <Route path="/" component={Landing} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={Login} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/institution/login" component={InstitutionLogin} />
      <Route path="/compare-courses" component={CompareCourses} />
      <Route path="/contact" component={Contact} />
      <Route path="/partner-with-us" component={PartnerWithUs} />
      <Route path="/study-in-australia" component={StudyInAustralia} />
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
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/auth/callback" component={AuthCallback} />
      
      {/* Protected routes - always available but protected at component level */}
      <Route path="/user-type" component={UserTypeSelection} />
      <Route path="/dashboard" component={StudentDashboardPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/profile" component={AdminProfile} />
      <Route path="/admin/csv-import" component={AdminCSVImport} />
      <Route path="/admin/scraping/jobs/:jobId" component={ScrapingJobDetail} />
      <Route path="/admin/scraping/review/:jobId" component={ScrapingReviewDashboard} />
      <Route path="/admin/applications/:id" component={AdminApplicationDetail} />
      <Route path="/university/profile" component={UniversityProfile} />
      <Route path="/university/dashboard" component={Home} />
      <Route path="/university/institutions" component={UniversityInstitutions} />
      <Route path="/university/courses" component={UniversityCourses} />
      <Route path="/university/courses/new" component={CourseForm} />
      <Route path="/university/courses/:id/edit" component={CourseForm} />
      <Route path="/university/applications" component={UniversityApplications} />
      <Route path="/university/team" component={UniversityTeam} />
      <Route path="/university/ai-assistant" component={UniversityAIAssistant} />
      <Route path="/student/dashboard" component={StudentDashboardPage} />
      <Route path="/student/courses" component={StudentCourses} />
      <Route path="/student/courses/:id" component={CourseDetail} />
      <Route path="/student/profile" component={StudentProfilePage} />
      <Route path="/student/applications" component={StudentApplications} />
      <Route path="/student/documents" component={StudentDocuments} />
      <Route path="/student/favorites" component={StudentFavorites} />
      <Route path="/student/referrals" component={StudentReferrals} />
      <Route path="/student/ai-assistant" component={StudentAIAssistant} />
      <Route path="/chat" component={ChatPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isAuthenticated, isLoading, isAuthResolved } = useAuth();
  const [location] = useLocation();
  
  // Public routes that should not have padding even for authenticated users
  const publicRoutes = ['/', '/courses', '/institutions', '/blog', '/contact', '/compare-courses', '/partner-with-us', '/study-in-australia', '/our-story', '/student-reviews', '/auth', '/auth/callback', '/login', '/admin/login', '/institution/login', '/reset-password'];
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
  const isUniversityPortal = location.startsWith('/university/');

  // Internal dashboard/portal pages that should NOT show footer (only for authenticated users)
  const internalDashboardRoutes = [
    '/dashboard',
    '/university/',
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

  // Show loading state while auth is initializing OR until auth status is resolved
  // This prevents the race condition where routes render before auth hydration completes
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

  // Student and University portals now have their own 3-column layouts with sidebars
  if ((isStudentPortal || isUniversityPortal) && isAuthenticated) {
    return <Router user={user} isAuthenticated={isAuthenticated} isLoading={isLoading} />;
  }

  // Public routes - use PublicHeader for both authenticated and unauthenticated users
  // The PublicHeader component now shows profile dropdown for logged-in users
  if (isPublicRoute || !isAuthenticated || !user?.userType) {
    return (
      <div className="flex flex-col min-h-screen w-full">
        <PublicHeader />
        <main className="flex-1">
          <Router user={user} isAuthenticated={isAuthenticated} isLoading={isLoading} />
        </main>
        {shouldShowFooter && <Footer />}
        {/* ChatWidget only for authenticated users */}
        {isAuthenticated && <ChatWidget />}
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
      <ChatWidget />
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
