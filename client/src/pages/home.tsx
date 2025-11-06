import { useAuth } from "@/hooks/useAuth";
import { UniversityDashboard } from "@/components/university-dashboard";
import { StudentDashboard } from "@/components/student-dashboard";

export default function Home() {
  const { isUniversity, isStudent } = useAuth();

  if (isUniversity) {
    return <UniversityDashboard />;
  }

  if (isStudent) {
    return <StudentDashboard />;
  }

  return null;
}
