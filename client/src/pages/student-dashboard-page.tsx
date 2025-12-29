import { useEffect } from "react";
import { useLocation } from "wouter";
import { StudentLayout } from "@/components/student-layout";
import { StudentDashboard } from "@/components/student-dashboard";
import { Helmet } from "react-helmet";
import { useAuth } from "@/hooks/useAuth";

export default function StudentDashboardPage() {
  const { isLoading, isAuthenticated, isAuthResolved, isStudent } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (isAuthResolved && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthResolved, isAuthenticated, setLocation]);

  // Redirect non-student users to appropriate dashboard
  useEffect(() => {
    if (isAuthResolved && isAuthenticated && !isStudent) {
      setLocation("/dashboard");
    }
  }, [isAuthResolved, isAuthenticated, isStudent, setLocation]);

  // Show loading state while auth is being resolved
  if (isLoading || !isAuthResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard content until authentication is confirmed
  if (!isAuthenticated || !isStudent) {
    return null;
  }

  return (
    <StudentLayout>
      <Helmet>
        <title>Student Dashboard | ANZ Global Education</title>
        <meta name="description" content="Your personalized student dashboard for managing applications, exploring courses, and tracking your education journey with ANZ Global Education." />
      </Helmet>
      <StudentDashboard />
    </StudentLayout>
  );
}
