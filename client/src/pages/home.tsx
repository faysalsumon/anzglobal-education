import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { StudentDashboard } from "@/components/student-dashboard";
import { StudentLayout } from "@/components/student-layout";

export default function Home() {
  const { isStudent, isLoading, isAuthenticated, isAuthResolved, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthResolved && !isAuthenticated) {
      setLocation("/institution/login");
    }
  }, [isAuthResolved, isAuthenticated, setLocation]);

  useEffect(() => {
    if (isAuthResolved && isAuthenticated && isAdmin) {
      setLocation("/admin/dashboard");
    }
  }, [isAuthResolved, isAuthenticated, isAdmin, setLocation]);

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

  if (!isAuthenticated) {
    return null;
  }

  if (isStudent) {
    return (
      <StudentLayout breadcrumbTitle="Dashboard">
        <StudentDashboard />
      </StudentLayout>
    );
  }

  return null;
}
