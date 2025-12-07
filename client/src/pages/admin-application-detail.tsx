import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  AlertCircle, 
  RefreshCw, 
  GraduationCap, 
  Building2, 
  User, 
  Calendar,
  Clock,
  Bell,
  ChevronRight
} from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { ApplicationDetailsPanel } from "@/components/application-details-panel";
import { CreateReminderModal } from "@/components/create-reminder-modal";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { format } from "date-fns";

type ApplicationStage = 
  | "Assessment"
  | "Collect Docs"
  | "Documents Verification"
  | "Offer-Letter"
  | "GS-Clearance"
  | "COE"
  | "Health Cover"
  | "Visa Lodgment"
  | "Application Won"
  | "Refusal/Refunds"
  | "Application Lost";

interface AdminApplicationDetail {
  application: {
    id: string;
    studentId: string;
    courseId: string;
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
    level: string | null;
    duration?: string | null;
    fees?: string | null;
  };
  university: {
    id: string;
    name: string;
    country: string | null;
    logo?: string | null;
  };
  student: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profilePicture?: string | null;
    nationality?: string | null;
    phone?: string | null;
  };
  consultant: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email?: string | null;
  } | null;
  documentProgress: {
    requiredDocs: number;
    requiredUploaded: number;
    totalDocs: number;
  };
}

const STAGE_COLORS: Record<ApplicationStage, string> = {
  "Assessment": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Collect Docs": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Documents Verification": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Offer-Letter": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "GS-Clearance": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  "COE": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  "Health Cover": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "Visa Lodgment": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "Application Won": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Refusal/Refunds": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Application Lost": "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

function AdminApplicationDetailContent() {
  const [, params] = useRoute("/admin/applications/:id");
  const applicationId = params?.id;
  const { user } = useAuth();
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery<AdminApplicationDetail>({
    queryKey: ["/api/admin/applications", applicationId],
    enabled: !!applicationId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild className="mb-4" data-testid="button-back">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Application</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>{error instanceof Error ? error.message : "Failed to load application details."}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="w-fit" data-testid="button-retry">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { application, course, university, student, consultant, documentProgress } = data;
  const progress = documentProgress.requiredDocs > 0 
    ? Math.round((documentProgress.requiredUploaded / documentProgress.requiredDocs) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild data-testid="button-back">
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-student-name">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              {course.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={STAGE_COLORS[application.currentStage]} data-testid="badge-current-stage">
            {application.currentStage}
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setReminderDialogOpen(true)}
            data-testid="button-set-reminder"
          >
            <Bell className="h-4 w-4 mr-2" />
            Set Reminder
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">University</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold truncate" data-testid="text-university-name">
              {university.name}
            </div>
            <p className="text-xs text-muted-foreground">{university.country}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Consultant</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold truncate" data-testid="text-consultant-name">
              {consultant ? `${consultant.firstName} ${consultant.lastName}` : "Unassigned"}
            </div>
            {consultant?.email && (
              <p className="text-xs text-muted-foreground truncate">{consultant.email}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Document Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold" data-testid="text-doc-progress">
              {progress}%
            </div>
            <p className="text-xs text-muted-foreground">
              {documentProgress.requiredUploaded}/{documentProgress.requiredDocs} required docs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applied Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold" data-testid="text-applied-date">
              {format(new Date(application.createdAt), 'MMM d, yyyy')}
            </div>
            <p className="text-xs text-muted-foreground">
              Updated: {format(new Date(application.updatedAt), 'MMM d')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ApplicationDetailsPanel
            application={application as any}
            course={course}
            university={university}
            student={student}
            consultant={consultant}
            currentUserId={user?.id}
            onClose={() => {}}
            onDeleted={() => {
              window.location.href = "/admin";
            }}
          />
        </CardContent>
      </Card>

      <CreateReminderModal
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        applicationId={application.id}
      />
    </div>
  );
}

export default function AdminApplicationDetail() {
  return (
    <AdminLayout breadcrumbTitle="Application Details">
      <AdminApplicationDetailContent />
    </AdminLayout>
  );
}
