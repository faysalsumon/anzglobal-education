/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Mail,
  Phone,
  Globe,
  DollarSign,
  FileCheck,
  MessageSquare,
  FolderOpen,
  ClipboardList
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminLayout } from "@/components/admin-layout";
import { ApplicationDetailsPanel } from "@/components/application-details-panel";
import { ApplicationProgressBar } from "@/components/application-progress-bar";
import { CreateReminderModal } from "@/components/create-reminder-modal";
import { StudentVerificationPanel } from "@/components/admin/student-verification-panel";
import { StudentProfileViewer } from "@/components/admin/student-profile-viewer";
import { StudentDocumentOrganizer } from "@/components/admin/student-document-organizer";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { STAGE_COLORS } from "@/lib/stage-config";

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
    universityId?: string;
    level: string | null;
    duration: string | null;
    fees: string | null;
    country: string | null;
    subject?: string | null;
  };
  university: {
    id: string;
    name: string;
    country: string | null;
    logo: string | null;
  };
  externalCountry?: string | null;
  externalCourseName?: string | null;
  externalInstitutionName?: string | null;
  student: {
    id: string;
    oddsId?: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profilePicture: string | null;
    nationality: string | null;
    phone: string | null;
    userId: string | null;
  };
  consultant: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  documentProgress: {
    requiredDocs: number;
    requiredUploaded: number;
    totalDocs: number;
    uploadedDocs?: number;
    verifiedDocs?: number;
  };
}


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

  const { application, course, university, student, consultant, documentProgress, externalCountry, externalCourseName } = data;
  const progress = documentProgress.requiredDocs > 0 
    ? Math.round((documentProgress.requiredUploaded / documentProgress.requiredDocs) * 100)
    : 0;

  const studentInitials = `${student.firstName?.charAt(0) || ''}${student.lastName?.charAt(0) || ''}`.toUpperCase();

  return (
    <div className="space-y-6 pb-16">
      {/* Toolbar: back button + action buttons */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="ghost" data-testid="button-back" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
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

      {/* Application Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <ApplicationProgressBar 
            currentStage={application.currentStage} 
            showInternalStage={true}
          />
        </CardContent>
      </Card>

      {/* Unified Application Overview Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-lg">Application Overview</CardTitle>
            <Badge variant="outline" className="font-mono text-xs" data-testid="badge-application-id">
              #{application.id.slice(0, 8).toUpperCase()}
            </Badge>
            <Badge variant="secondary" data-testid="badge-application-status">
              {application.status}
            </Badge>
            <Badge className={STAGE_COLORS[application.currentStage]} data-testid="badge-current-stage">
              {application.currentStage}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Student column */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <User className="h-3 w-3" />
                Student
              </p>
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={student.profilePicture || undefined} alt={`${student.firstName} ${student.lastName}`} />
                  <AvatarFallback className="text-base">{studentInitials || 'ST'}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold text-base" data-testid="text-student-name">
                    {student.firstName} {student.lastName}
                  </h2>
                  {student.nationality && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {student.nationality}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-2 pt-2 border-t">
                {student.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a href={`mailto:${student.email}`} className="text-primary hover:underline truncate" data-testid="link-student-email">
                      {student.email}
                    </a>
                  </div>
                )}
                {student.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a href={`tel:${student.phone}`} className="hover:underline" data-testid="text-student-phone">
                      {student.phone}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  Applied: {format(new Date(application.createdAt), 'MMM d, yyyy')}
                </div>
              </div>
            </div>

            {/* Course column */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                Course
              </p>
              <div className="flex items-start gap-4">
                {university.logo ? (
                  <Avatar className="h-14 w-14 rounded-md flex-shrink-0">
                    <AvatarImage src={university.logo} alt={university.name} className="object-contain" />
                    <AvatarFallback className="rounded-md">{university.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-7 w-7 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold" data-testid="text-course-title">{course.title}</h3>
                    {externalCourseName && !application.courseId && (
                      <Badge variant="outline" className="text-[10px] px-1.5">External</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-university-name">{university.name}</p>
                  {course.level && (
                    <Badge variant="secondary" className="mt-1">{course.level}</Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    {course.duration ?? 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tuition Fees</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <DollarSign className="h-3 w-3 flex-shrink-0" />
                    {course.fees ?? 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Globe className="h-3 w-3 flex-shrink-0" />
                    {externalCountry || course.country || university.country || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Consultant</p>
                  <p className="text-sm font-medium flex items-center gap-1" data-testid="text-consultant-name">
                    <User className="h-3 w-3 flex-shrink-0" />
                    {consultant ? `${consultant.firstName} ${consultant.lastName}` : 'Unassigned'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supplementary Info Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4" data-testid="tabs-application-detail">
          <TabsTrigger value="overview" className="flex items-center gap-2" data-testid="tab-overview">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2" data-testid="tab-profile">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile Data</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2" data-testid="tab-documents">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center gap-2" data-testid="tab-verification">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Verification</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab — Document Progress only */}
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Document Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Required Documents</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="text-center px-4 border-l">
                  <p className="text-2xl font-bold" data-testid="text-doc-uploaded">{documentProgress.requiredUploaded}</p>
                  <p className="text-xs text-muted-foreground">of {documentProgress.requiredDocs} required</p>
                </div>
                <div className="text-center px-4 border-l">
                  <p className="text-2xl font-bold">{documentProgress.totalDocs}</p>
                  <p className="text-xs text-muted-foreground">total docs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Data Tab */}
        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <StudentProfileViewer 
                profileId={student.id}
                studentName={`${student.firstName} ${student.lastName}`}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <StudentDocumentOrganizer studentProfileId={student.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification" className="mt-4">
          <StudentVerificationPanel 
            profileId={student.id}
            studentName={`${student.firstName} ${student.lastName}`}
            onClose={() => {}}
          />
        </TabsContent>
      </Tabs>

      {/* Application Management — always visible, separate from tabs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Application Management
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Process application, manage documents, and communicate with the student
          </p>
        </CardHeader>
        <CardContent>
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
