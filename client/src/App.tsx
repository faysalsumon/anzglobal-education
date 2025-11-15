import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNavBar } from "@/components/top-nav-bar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useAuth } from "@/hooks/useAuth";
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
import PublicCourses from "@/pages/public-courses";
import PublicCourseDetail from "@/pages/public-course-detail";
import PublicInstitutions from "@/pages/public-institutions";
import PublicInstitutionDetail from "@/pages/public-institution-detail";
import PublicBlogArchive from "@/pages/public-blog-archive";
import PublicBlogDetail from "@/pages/public-blog-detail";
import CompareCourses from "@/pages/compare-courses";
import Contact from "@/pages/contact";
import UserTypeSelection from "@/pages/user-type-selection";
import Login from "@/pages/login";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminProfile from "@/pages/admin-profile";
import AdminCSVImport from "@/pages/admin-csv-import";
import ChatPage from "@/pages/chat";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public routes accessible to everyone */}
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/compare-courses" component={CompareCourses} />
      <Route path="/contact" component={Contact} />
      <Route path="/courses/:id" component={PublicCourseDetail} />
      <Route path="/courses" component={PublicCourses} />
      <Route path="/institutions/:id" component={PublicInstitutionDetail} />
      <Route path="/institutions" component={PublicInstitutions} />
      <Route path="/blog/:slug" component={PublicBlogDetail} />
      <Route path="/blog" component={PublicBlogArchive} />
      
      {!isLoading && isAuthenticated && !user?.userType && (
        <Route path="/user-type" component={UserTypeSelection} />
      )}
      
      {!isLoading && isAuthenticated && user?.userType && (
        <>
          <Route path="/dashboard" component={Home} />
          <Route path="/admin/dashboard" component={AdminDashboard} />
          <Route path="/admin/profile" component={AdminProfile} />
          <Route path="/admin/csv-import" component={AdminCSVImport} />
          <Route path="/university/profile" component={UniversityProfile} />
          <Route path="/university/institutions" component={UniversityInstitutions} />
          <Route path="/university/courses" component={UniversityCourses} />
          <Route path="/university/courses/new" component={CourseForm} />
          <Route path="/university/courses/:id/edit" component={CourseForm} />
          <Route path="/university/applications" component={UniversityApplications} />
          <Route path="/university/team" component={UniversityTeam} />
          <Route path="/university/ai-assistant" component={UniversityAIAssistant} />
          <Route path="/student/courses" component={StudentCourses} />
          <Route path="/student/courses/:id" component={CourseDetail} />
          <Route path="/student/profile" component={StudentProfilePage} />
          <Route path="/student/applications" component={StudentApplications} />
          <Route path="/student/documents" component={StudentDocuments} />
          <Route path="/student/referrals" component={StudentReferrals} />
          <Route path="/student/ai-assistant" component={StudentAIAssistant} />
          <Route path="/chat" component={ChatPage} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated || !user?.userType) {
    return <Router />;
  }

  return (
    <div className="flex flex-col h-screen w-full">
      <TopNavBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
        <Router />
      </main>
      <MobileBottomNav />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
