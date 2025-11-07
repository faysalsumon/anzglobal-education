import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { UniversityDashboard } from "@/components/university-dashboard";
import { StudentDashboard } from "@/components/student-dashboard";

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
    return <UniversityDashboard />;
  }

  if (isStudent) {
    return <StudentDashboard />;
  }

  // Admin users are redirected in useEffect above
  return null;
}
