import { useAuth } from "@/hooks/useAuth";
import { UniversityDashboard } from "@/components/university-dashboard";
import { StudentDashboard } from "@/components/student-dashboard";
import Landing from "./landing";

export default function Home() {
  const { user, isUniversity, isStudent } = useAuth();
  const isAdmin = user?.userType === "admin";

  if (isUniversity) {
    return <UniversityDashboard />;
  }

  if (isStudent) {
    return <StudentDashboard />;
  }

  // Show landing page for admin users or any other user type
  if (isAdmin) {
    return <Landing />;
  }

  return null;
}
