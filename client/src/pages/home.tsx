import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { UniversityDashboard } from "@/components/university-dashboard";
import { StudentDashboard } from "@/components/student-dashboard";
import { StudentLayout } from "@/components/student-layout";
import { UniversityLayout } from "@/components/university-layout";

export default function Home() {
  const { user, isUniversity, isStudent, isLoading, isAuthenticated, isAuthResolved, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect unauthenticated users to institution login (this page is for institution users)
  useEffect(() => {
    if (isAuthResolved && !isAuthenticated) {
      setLocation("/institution/login");
    }
  }, [isAuthResolved, isAuthenticated, setLocation]);

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (isAuthResolved && isAuthenticated && isAdmin) {
      setLocation("/admin/dashboard");
    }
  }, [isAuthResolved, isAuthenticated, isAdmin, setLocation]);

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

  // Don't render until authentication is confirmed
  if (!isAuthenticated) {
    return null;
  }

  if (isUniversity) {
    return (
      <UniversityLayout breadcrumbTitle="Dashboard">
        <UniversityDashboard />
      </UniversityLayout>
    );
  }

  if (isStudent) {
    return (
      <StudentLayout breadcrumbTitle="Dashboard">
        <StudentDashboard />
      </StudentLayout>
    );
  }

  // Admin users are redirected in useEffect above
  return null;
}
