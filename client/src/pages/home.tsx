import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { UniversityDashboard } from "@/components/university-dashboard";
import { StudentDashboard } from "@/components/student-dashboard";
import { StudentLayout } from "@/components/student-layout";
import { UniversityLayout } from "@/components/university-layout";

export default function Home() {
  const { user, isUniversity, isStudent } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user?.userType === "admin";

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (isAdmin) {
      setLocation("/admin/dashboard");
    }
  }, [isAdmin, setLocation]);

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
