import { StudentLayout } from "@/components/student-layout";
import { StudentDashboard } from "@/components/student-dashboard";
import { Helmet } from "react-helmet";

export default function StudentDashboardPage() {
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
