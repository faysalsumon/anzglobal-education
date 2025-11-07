import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import UniversityProfile from "@/pages/university-profile";
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
import PublicCourses from "@/pages/public-courses";
import PublicInstitutions from "@/pages/public-institutions";
import PublicInstitutionDetail from "@/pages/public-institution-detail";
import UserTypeSelection from "@/pages/user-type-selection";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public routes accessible to everyone */}
      <Route path="/courses" component={PublicCourses} />
      <Route path="/institutions/:id" component={PublicInstitutionDetail} />
      <Route path="/institutions" component={PublicInstitutions} />
      
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : !user?.userType ? (
        <Route path="/" component={UserTypeSelection} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/university/profile" component={UniversityProfile} />
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
          <Route path="/student/referrals" component={StudentReferrals} />
          <Route path="/student/ai-assistant" component={StudentAIAssistant} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isLoading || !isAuthenticated || !user?.userType) {
    return <Router />;
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-14 items-center gap-4 border-b px-6">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
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
