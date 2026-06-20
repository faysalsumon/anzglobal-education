import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, AlertCircle, RefreshCw, Plus } from "lucide-react";
import { ApplicationCard } from "@/components/application-card";
import { StudentLayout } from "@/components/student-layout";

import type { ApplicationStage } from "@/lib/stage-config";

interface ApplicationWithDetails {
  application: {
    id: string;
    studentId: string;
    courseId: string;
    applicationNumber: string | null;
    currentStage: ApplicationStage;
    status: string;
    personalStatement: string | null;
    additionalInfo: string | null;
    assignedConsultantId: string | null;
    assignedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  course: {
    id: string;
    title: string;
    universityId: string;
    level: string;
    duration: string;
    fees: string;
    country: string;
  } | null;
  university: {
    id: string;
    name: string;
    logo: string | null;
    country: string | null;
  } | null;
  consultant: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profilePicture: string | null;
  } | null;
}

function StudentApplicationsContent() {
  const { data, isLoading, isError, error, refetch} = useQuery<{ applications: ApplicationWithDetails[] }>({
    queryKey: ["/api/student/applications"],
    refetchInterval: 30000,
  });
  
  const applications = data?.applications || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">My Applications</h1>
          <p className="text-muted-foreground">Track the status of your course applications and manage documents</p>
        </div>
        <Button asChild data-testid="button-find-course">
          <a href="/student/courses">
            <Plus className="mr-2 h-4 w-4" />
            Find a Course
          </a>
        </Button>
      </div>

      {isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Applications</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>{error instanceof Error ? error.message : "Failed to load applications. Please try again."}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="w-fit" data-testid="button-retry">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="grid gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-12">
                <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-muted rounded w-1/3 mb-6"></div>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-lg font-medium mb-2">No applications yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              Browse courses and submit your first application
            </p>
            <Button asChild data-testid="button-browse-courses">
              <a href="/student/courses">Browse Courses</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {applications.map(({ application, course, university, consultant }) => (
            <ApplicationCard
              key={application.id}
              application={application}
              course={course}
              university={university}
              consultant={consultant}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StudentApplications() {
  return (
    <StudentLayout breadcrumbTitle="My Applications">
      <StudentApplicationsContent />
    </StudentLayout>
  );
}
