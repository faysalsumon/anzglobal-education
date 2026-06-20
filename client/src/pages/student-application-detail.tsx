/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  AlertCircle,
  Building2,
  GraduationCap,
  Calendar,
  Clock,
  DollarSign,
  Globe,
  CheckCircle,
  MessageSquare,
  FolderOpen,
  History,
  AlertTriangle,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { StudentLayout } from "@/components/student-layout";
import { ApplicationProgressBar } from "@/components/application-progress-bar";
import { StudentApplicationNotes } from "@/components/student-application-notes";
import { StudentDocumentPicker } from "@/components/student-document-picker";
import { STAGE_COLORS, STAGE_CONFIG, STUDENT_STAGES, getStudentStageIndex, getStudentStage } from "@/lib/stage-config";
import type { ApplicationStage } from "@/lib/stage-config";
import { format } from "date-fns";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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
    slug?: string;
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

interface StageDocument {
  id: string;
  stage: ApplicationStage;
  documentType: string;
  documentName: string;
  documentUrl: string | null;
  isRequired: boolean;
  isVerified: boolean;
  rejectionReason: string | null;
  uploadedByRole: string | null;
}

function StudentApplicationDetailContent() {
  const [, params] = useRoute("/student/applications/:id");
  const applicationId = params?.id;
  const { toast } = useToast();
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);

  const { data: listData, isLoading, isError } = useQuery<{ applications: ApplicationWithDetails[] }>({
    queryKey: ["/api/student/applications"],
  });

  const { data: pendingData } = useQuery<{ pendingRequests: any[] }>({
    queryKey: [`/api/student/applications/${applicationId}/pending-documents`],
    enabled: !!applicationId,
  });

  const { data: stageDocsData } = useQuery<{ documents: StageDocument[] }>({
    queryKey: [`/api/student/applications/${applicationId}/documents`],
    enabled: !!applicationId,
  });

  const { data: historyData } = useQuery<{ history: Array<{ history: { id: string; fromStage: string | null; toStage: string; notes: string | null; createdAt: string }; changedByUser: { firstName: string | null; lastName: string | null } | null }> }>({
    queryKey: [`/api/student/applications/${applicationId}/history`],
    enabled: !!applicationId,
  });

  const attachMutation = useMutation({
    mutationFn: async (data: { documentId: string; stage: ApplicationStage }) => {
      return apiRequest("POST", `/api/student/applications/${applicationId}/attach-document`, data);
    },
    onSuccess: () => {
      toast({ title: "Document Attached", description: "Your document has been attached." });
      queryClient.invalidateQueries({ queryKey: [`/api/student/applications/${applicationId}/documents`] });
      setLibraryPickerOpen(false);
    },
    onError: (e: any) => {
      toast({ title: "Attach Failed", description: e.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const found = listData?.applications.find(a => a.application.id === applicationId);

  if (isError || !found) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild data-testid="button-back">
          <Link href="/student/applications">
            <ArrowLeft className="h-4 w-4 mr-2" />
            My Applications
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Application Not Found</AlertTitle>
          <AlertDescription>This application could not be found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { application, course, university, consultant } = found;
  const pendingRequests = pendingData?.pendingRequests ?? [];
  const stageDocs = stageDocsData?.documents ?? [];

  const currentStudentStageIndex = getStudentStageIndex(application.currentStage);
  const progressPercentage =
    application.currentStage === "Application Won"
      ? 100
      : application.currentStage === "Refusal/Refunds" || application.currentStage === "Application Lost"
      ? 0
      : currentStudentStageIndex >= 0
      ? Math.round(((currentStudentStageIndex + 1) / STUDENT_STAGES.length) * 100)
      : 0;

  const getDocStatus = (doc: StageDocument) => {
    if (!doc.documentUrl) return { label: "Pending", class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" };
    if (doc.isVerified) return { label: "Verified", class: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
    if (doc.rejectionReason) return { label: "Rejected", class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" };
    return { label: "Uploaded", class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" };
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Back link */}
      <Button variant="ghost" asChild data-testid="button-back">
        <Link href="/student/applications">
          <ArrowLeft className="h-4 w-4 mr-2" />
          My Applications
        </Link>
      </Button>

      {/* Header card */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start gap-4 flex-wrap">
            {university?.logo ? (
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
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {application.applicationNumber && (
                  <Badge variant="outline" className="font-mono text-xs no-default-active-elevate" data-testid="badge-app-number">
                    {application.applicationNumber}
                  </Badge>
                )}
                <Badge
                  className={`${STAGE_COLORS[application.currentStage]} text-xs no-default-active-elevate`}
                  data-testid="badge-current-stage"
                >
                  {application.currentStage}
                </Badge>
              </div>
              <h1 className="font-semibold text-base leading-tight" data-testid="text-course-title">
                {course?.title ?? "Course Application"}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5" data-testid="text-university-name">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                {university?.name ?? "University"}
                {university?.country && <span className="opacity-70">· {university.country}</span>}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Calendar className="h-3 w-3 shrink-0" />
                Applied {format(new Date(application.createdAt), "MMM d, yyyy")}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-primary" data-testid="text-progress-pct">{progressPercentage}%</p>
              <p className="text-xs text-muted-foreground">complete</p>
            </div>
          </div>

          {/* 5-Stage progress stepper */}
          {(() => {
            const currentStageObj = getStudentStage(application.currentStage);
            const currentIdx = currentStageObj ? STUDENT_STAGES.indexOf(currentStageObj) : -1;
            const isTerminal = application.currentStage === "Refusal/Refunds" || application.currentStage === "Application Lost";
            const isWon = application.currentStage === "Application Won";
            return (
              <div className="mt-5 pt-4 border-t" data-testid="student-stage-stepper">
                <div className="flex items-center">
                  {STUDENT_STAGES.filter(s => s.id !== "won").map((stage, idx) => {
                    const isCompleted = isWon || (!isTerminal && idx < currentIdx);
                    const isCurrent = !isTerminal && !isWon && idx === currentIdx;
                    const isFuture = !isCompleted && !isCurrent;
                    return (
                      <div key={stage.id} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center transition-colors ${
                            isCompleted
                              ? "bg-green-500 text-white"
                              : isCurrent
                              ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <span className="text-xs font-semibold">{idx + 1}</span>
                            )}
                          </div>
                          <p className={`text-[10px] font-medium text-center leading-tight max-w-[60px] ${isCurrent ? "text-primary" : isCompleted ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                            {stage.name}
                          </p>
                        </div>
                        {idx < STUDENT_STAGES.filter(s => s.id !== "won").length - 1 && (
                          <div className={`flex-1 h-0.5 mx-1 mb-5 rounded-full ${isCompleted ? "bg-green-400 dark:bg-green-600" : "bg-border"}`} />
                        )}
                      </div>
                    );
                  })}
                  {/* Won / terminal indicator */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center ${isWon ? "bg-green-500 text-white" : isTerminal ? "bg-destructive/80 text-destructive-foreground" : "bg-muted text-muted-foreground"}`}>
                      {isWon ? <CheckCircle className="h-4 w-4" /> : <span className="text-xs font-semibold">{STUDENT_STAGES.filter(s => s.id !== "won").length + 1}</span>}
                    </div>
                    <p className={`text-[10px] font-medium text-center leading-tight max-w-[60px] ${isWon ? "text-green-600 dark:text-green-400" : isTerminal ? "text-destructive" : "text-muted-foreground"}`}>
                      {isTerminal ? STAGE_CONFIG[application.currentStage]?.displayName ?? application.currentStage : "Won"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Pending doc requests alert */}
          {pendingRequests.length > 0 && (
            <Alert className="mt-4 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" data-testid="alert-pending-docs">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-900 dark:text-amber-100">
                Documents Requested ({pendingRequests.length})
              </AlertTitle>
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <div className="space-y-1.5 mt-1.5">
                  {pendingRequests.map((req: any) => (
                    <div key={req.id} className="text-sm">
                      <span className="font-medium">{req.documentName ?? req.documentType}</span>
                      {req.verificationNotes && (
                        <span className="ml-2 text-xs opacity-80">— {req.verificationNotes}</span>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="default"
                  className="mt-3"
                  onClick={() => setLibraryPickerOpen(true)}
                  data-testid="button-upload-requested-docs"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload from Library
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-3" data-testid="tabs-application-detail">
          <TabsTrigger value="documents" className="flex items-center gap-2" data-testid="tab-documents">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2" data-testid="tab-messages">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Messages</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2" data-testid="tab-timeline">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4 space-y-4">
          {stageDocs.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-20" />
                <p className="text-sm text-muted-foreground">No documents for this application yet.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onClick={() => setLibraryPickerOpen(true)}
                  data-testid="button-attach-from-library"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Attach from Library
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {stageDocs.map((doc) => {
                const status = getDocStatus(doc);
                return (
                  <Card key={doc.id} data-testid={`doc-item-${doc.id}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.documentName}</p>
                          <p className="text-xs text-muted-foreground">{doc.documentType}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge className={`text-xs no-default-active-elevate ${status.class}`}>{status.label}</Badge>
                            {doc.isRequired && (
                              <Badge variant="outline" className="text-xs no-default-active-elevate">Required</Badge>
                            )}
                            {doc.uploadedByRole === "admin" && (
                              <Badge variant="secondary" className="text-xs no-default-active-elevate">Consultant upload</Badge>
                            )}
                          </div>
                          {doc.rejectionReason && (
                            <p className="text-xs text-destructive mt-1">Rejected: {doc.rejectionReason}</p>
                          )}
                        </div>
                        {doc.isVerified && (
                          <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setLibraryPickerOpen(true)}
                data-testid="button-attach-more"
              >
                <Upload className="h-4 w-4 mr-2" />
                Attach More from Library
              </Button>
            </div>
          )}

          <div className="pt-2">
            <Button variant="ghost" size="sm" asChild data-testid="button-go-to-documents">
              <Link href="/student/documents">
                <FolderOpen className="h-4 w-4 mr-2" />
                Manage All Documents
              </Link>
            </Button>
          </div>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="mt-4">
          <Card>
            <CardContent className="pt-5">
              <StudentApplicationNotes
                applicationId={application.id}
                studentName="You"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                Application Stage Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ApplicationProgressBar currentStage={application.currentStage} showInternalStage={false} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Stage History</CardTitle>
            </CardHeader>
            <CardContent>
              {!historyData || historyData.history.length === 0 ? (
                <div className="text-center py-6">
                  <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-20" />
                  <p className="text-sm text-muted-foreground">No stage transitions recorded yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Currently in: <span className="font-medium">{STAGE_CONFIG[application.currentStage]?.displayName ?? application.currentStage}</span></p>
                </div>
              ) : (
                <div className="space-y-0">
                  {historyData.history.map((item, idx) => {
                    const isLast = idx === historyData.history.length - 1;
                    const toStage = item.history.toStage as ApplicationStage;
                    const isTerminal = toStage === "Application Won" || toStage === "Refusal/Refunds" || toStage === "Application Lost";
                    return (
                      <div key={item.history.id} className="flex items-start gap-3" data-testid={`history-item-${idx}`}>
                        <div className="flex flex-col items-center shrink-0">
                          {isTerminal ? (
                            toStage === "Application Won" ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                            )
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-primary/60 bg-primary/10 flex items-center justify-center">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            </div>
                          )}
                          {!isLast && <div className="w-0.5 h-6 bg-border mt-0.5" />}
                        </div>
                        <div className="flex-1 min-w-0 pb-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${STAGE_COLORS[toStage] ?? ""} text-xs no-default-active-elevate`}>
                              {STAGE_CONFIG[toStage]?.displayName ?? toStage}
                            </Badge>
                          </div>
                          {item.history.fromStage && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              from {STAGE_CONFIG[item.history.fromStage as ApplicationStage]?.displayName ?? item.history.fromStage}
                            </p>
                          )}
                          {item.history.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">{item.history.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            {format(new Date(item.history.createdAt), "MMM d, yyyy h:mm a")}
                            {item.changedByUser && (
                              <span className="ml-1">· by {item.changedByUser.firstName} {item.changedByUser.lastName}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Course Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Level</p>
                  <p className="font-medium flex items-center gap-1 mt-0.5">
                    <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                    {course?.level || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium flex items-center gap-1 mt-0.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {course?.duration || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tuition Fees</p>
                  <p className="font-medium flex items-center gap-1 mt-0.5">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    {course?.fees ? `$${course.fees}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p className="font-medium flex items-center gap-1 mt-0.5">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    {course?.country || university?.country || "—"}
                  </p>
                </div>
              </div>
              {consultant && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Your Consultant</p>
                  <p className="text-sm font-medium">
                    {consultant.firstName} {consultant.lastName}
                  </p>
                </div>
              )}
              {course?.id && (
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" asChild data-testid="button-view-course">
                    <Link href={`/courses/${(course as any).slug || course.id}`}>
                      View Course Details
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Library Picker Modal */}
      {libraryPickerOpen && (
        <StudentDocumentPicker
          open={libraryPickerOpen}
          onOpenChange={(open) => setLibraryPickerOpen(open)}
          onSelect={(doc) => {
            attachMutation.mutate({ documentId: doc.id, stage: application.currentStage });
          }}
        />
      )}
    </div>
  );
}

export default function StudentApplicationDetail() {
  return (
    <StudentLayout breadcrumbTitle="Application Detail">
      <StudentApplicationDetailContent />
    </StudentLayout>
  );
}
