/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect, Component, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, AlertCircle, RefreshCw, GraduationCap, Building2, Building, User, Calendar,
  Clock, Bell, Mail, Phone, Globe, DollarSign, FileText, MessageSquare, FolderOpen,
  History, Send, Upload, Download, Eye, CheckCircle, XCircle, Trash2, Plus,
  UserCheck, StickyNote, AlertTriangle, Layers,
} from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { ApplicationProgressBar } from "@/components/application-progress-bar";
import {
  ApplicationHistory,
  ApplicationMultiCourse,
} from "@/components/application-details-panel";
import { ApplicationInternalNotes } from "@/components/application-internal-notes";
import { StudentApplicationNotes } from "@/components/student-application-notes";
import { ApplicationStageSelector } from "@/components/application-stage-selector";
import { StudentVerificationPanel } from "@/components/admin/student-verification-panel";
import { StudentProfileViewer } from "@/components/admin/student-profile-viewer";
import { StudentDocumentOrganizer } from "@/components/admin/student-document-organizer";
import { CreateReminderModal } from "@/components/create-reminder-modal";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentEvents } from "@/hooks/useDocumentEvents";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ApplicationStage, STAGE_COLORS, STAGE_CONFIG, ALL_STAGES } from "@/lib/stage-config";
import { supabase } from "@/lib/supabase";
import { ShieldCheck } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────── */

interface AdminApplicationDetail {
  application: {
    id: string;
    studentId: string;
    courseId: string;
    applicationNumber?: string | null;
    currentStage: ApplicationStage;
    status: string;
    personalStatement: string | null;
    additionalInfo: string | null;
    assignedConsultantId: string | null;
    assignedAt: string | null;
    branchId?: string | null;
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
  };
  university: { id: string; name: string; country: string | null; logo: string | null };
  externalCountry?: string | null;
  externalCourseName?: string | null;
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
  consultant: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
  documentProgress: {
    requiredDocs: number;
    requiredUploaded: number;
    totalDocs: number;
    uploadedDocs?: number;
    verifiedDocs?: number;
  };
}

interface StageDocument {
  id: string;
  applicationId: string;
  stage: ApplicationStage;
  documentType: string;
  documentName: string;
  documentUrl: string | null;
  isRequired: boolean;
  isVerified: boolean;
  uploadedByRole: string | null;
  verificationNotes: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

interface StageHistoryRecord {
  history: {
    id: string;
    fromStage: ApplicationStage | null;
    toStage: ApplicationStage;
    notes: string | null;
    durationInStage: number | null;
    createdAt: string;
  };
  changedByUser: { id: string; firstName: string | null; lastName: string | null } | null;
}

interface ApplicationCourse {
  id: string;
  courseId: string | null;
  externalCourseName: string | null;
  externalInstitutionName: string | null;
  externalCountry: string | null;
  isPrimary: boolean;
  course: { id: string; title: string; level: string | null; duration: string | null; fees: string | null } | null;
  university: { id: string; name: string; logo: string | null; country: string | null } | null;
}

interface AssignableUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

/* ─── Error boundary ─────────────────────────────────────────────────── */

class TabErrorBoundary extends Component<
  { children: ReactNode; label?: string },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode; label?: string }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-destructive">
                Something went wrong{this.props.label ? ` in ${this.props.label}` : ""}
              </p>
              <p className="text-xs text-muted-foreground font-mono">{this.state.error.message}</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-destructive/30 text-xs text-destructive hover:bg-destructive/10 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── Main content ───────────────────────────────────────────────────── */

function AdminApplicationDetailContent() {
  const [, params] = useRoute("/admin/applications/:id");
  const applicationId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();

  useDocumentEvents({ applicationId: applicationId ?? "" });

  /* Track which tabs have ever been activated so we lazy-mount their content */
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(["process"]));

  /* dialogs & ephemeral state */
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [requestDocDialogOpen, setRequestDocDialogOpen] = useState(false);
  const [uploadDocDialogOpen, setUploadDocDialogOpen] = useState(false);
  const [deleteDocConfirmOpen, setDeleteDocConfirmOpen] = useState<string | null>(null);
  const [verifyDocDialogOpen, setVerifyDocDialogOpen] = useState<string | null>(null);
  const [verifyNotes, setVerifyNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [slotsDialogOpen, setSlotsDialogOpen] = useState(false);
  const [newMaxSlots, setNewMaxSlots] = useState(3);
  const [addCourseDialogOpen, setAddCourseDialogOpen] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [selectedCourseToAdd, setSelectedCourseToAdd] = useState("");
  const [addCourseMode, setAddCourseMode] = useState<"search" | "manual">("search");
  const [manualCourseName, setManualCourseName] = useState("");
  const [manualInstitution, setManualInstitution] = useState("");
  const [manualCountry, setManualCountry] = useState("Australia");
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null);

  const [newDocRequest, setNewDocRequest] = useState({
    stage: "Assessment" as ApplicationStage,
    documentType: "",
    documentName: "",
    isRequired: true,
  });
  const [newDocUpload, setNewDocUpload] = useState({
    stage: "Assessment" as ApplicationStage,
    documentType: "",
    documentName: "",
    isRequired: false,
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null);

  /* Stage folder map */
  const STAGE_FOLDER_MAP: Record<string, string> = {
    "Offer-Letter": "Offer-Letter",
    "COE": "COE",
    "GS-Clearance": "GS/GTE",
    "Visa Lodgment": "Visa",
    "Collect Docs": "Academics",
    "Documents Verification": "Academics",
  };

  /* ── Queries ── */
  const { data, isLoading, isError, error, refetch } = useQuery<AdminApplicationDetail>({
    queryKey: ["/api/admin/applications", applicationId],
    enabled: !!applicationId,
  });

  const { data: documentsData } = useQuery<{ documents: StageDocument[] }>({
    queryKey: ["/api/admin/applications", applicationId, "documents"],
    enabled: !!applicationId,
  });

  const { data: historyData } = useQuery<{ history: StageHistoryRecord[] }>({
    queryKey: ["/api/admin/applications", applicationId, "history"],
    enabled: !!applicationId,
  });

  const { data: coursesData } = useQuery<{ courses: ApplicationCourse[] }>({
    queryKey: ["/api/applications", applicationId, "courses"],
    enabled: !!applicationId,
  });

  const { data: assignableData } = useQuery<{ users: AssignableUser[] }>({
    queryKey: ["/api/admin/assignable-users"],
  });

  const { data: slotsData } = useQuery<{ maxSlots: number; usedSlots: number }>({
    queryKey: ["/api/admin/students", data?.student?.id, "application-slots"],
    enabled: !!data?.student?.id,
  });

  const { data: studentFolders = [] } = useQuery<{ id: string; name: string; color: string }[]>({
    queryKey: ["/api/admin/applications", applicationId, "student-folders"],
    enabled: uploadDocDialogOpen,
  });

  interface SearchCourse { id: string; title: string; level: string | null; university?: { id: string; name: string } }
  const { data: courseSearchData } = useQuery<{ courses: SearchCourse[] }>({
    queryKey: ["/api/courses", { search: courseSearchQuery, limit: 20 }],
    enabled: addCourseDialogOpen && courseSearchQuery.length >= 2,
  });

  /* Auto-suggest folder on upload dialog open */
  useEffect(() => {
    if (!uploadDocDialogOpen) return;
    const folderName = STAGE_FOLDER_MAP[newDocUpload.stage];
    const matched = folderName ? studentFolders.find(f => f.name === folderName) : undefined;
    setUploadFolderId(matched?.id ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadDocDialogOpen, studentFolders]);

  /* Sync newDocRequest stage once data loads */
  useEffect(() => {
    if (data?.application?.currentStage) {
      setNewDocRequest(prev => ({ ...prev, stage: data.application.currentStage }));
      setNewDocUpload(prev => ({ ...prev, stage: data.application.currentStage }));
    }
  }, [data?.application?.currentStage]);

  /* Authenticated download helper */
  const downloadDocument = useCallback(async (url: string, fileName?: string) => {
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast({ title: "Error", description: "Please log in", variant: "destructive" }); return; }
      const response = await fetch(url, { credentials: "include", headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Failed to fetch");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl; a.download = fileName || "document";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch { toast({ title: "Error", description: "Failed to download document", variant: "destructive" }); }
  }, [toast]);

  /* ── Mutations ── */
  const assignConsultantMutation = useMutation({
    mutationFn: (consultantId: string | null) =>
      apiRequest("PATCH", `/api/applications/${applicationId}/assign`, { assignedConsultantId: consultantId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", applicationId] }); toast({ title: "Consultant Updated" }); },
    onError: (e: any) => toast({ title: "Assignment Failed", description: e.message, variant: "destructive" }),
  });

  const requestDocMutation = useMutation({
    mutationFn: (d: typeof newDocRequest) => apiRequest("POST", `/api/admin/applications/${applicationId}/request-document`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", applicationId, "documents"] });
      toast({ title: "Document Requested" }); setRequestDocDialogOpen(false);
      setNewDocRequest({ stage: data?.application.currentStage ?? "Assessment", documentType: "", documentName: "", isRequired: true });
    },
    onError: (e: any) => toast({ title: "Request Failed", description: e.message, variant: "destructive" }),
  });

  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("stage", newDocUpload.stage);
      formData.append("documentType", newDocUpload.documentType);
      formData.append("documentName", newDocUpload.documentName);
      formData.append("isRequired", String(newDocUpload.isRequired));
      if (uploadFolderId) formData.append("folderId", uploadFolderId);
      return apiRequest("POST", `/api/admin/applications/${applicationId}/upload-document`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", applicationId, "documents"] });
      toast({ title: "Document Uploaded" }); setUploadDocDialogOpen(false);
      setNewDocUpload({ stage: data?.application.currentStage ?? "Assessment", documentType: "", documentName: "", isRequired: false });
      setUploadFile(null); setUploadFolderId(null);
    },
    onError: (e: any) => toast({ title: "Upload Failed", description: e.message, variant: "destructive" }),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (documentId: string) => apiRequest("DELETE", `/api/admin/applications/${applicationId}/documents/${documentId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", applicationId, "documents"] }); toast({ title: "Document Deleted" }); setDeleteDocConfirmOpen(null); },
    onError: (e: any) => toast({ title: "Delete Failed", description: e.message, variant: "destructive" }),
  });

  const verifyDocMutation = useMutation({
    mutationFn: ({ documentId, isVerified }: { documentId: string; isVerified: boolean }) =>
      apiRequest("POST", `/api/admin/applications/verify-document`, { documentId, isVerified, verificationNotes: verifyNotes, rejectionReason: rejectReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", applicationId, "documents"] });
      toast({ title: "Document Status Updated" }); setVerifyDocDialogOpen(null); setVerifyNotes(""); setRejectReason("");
    },
    onError: (e: any) => toast({ title: "Verification Failed", description: e.message, variant: "destructive" }),
  });

  const addCourseMutation = useMutation({
    mutationFn: (payload: { courseId?: string; externalCourseName?: string; externalInstitutionName?: string; externalCountry?: string }) =>
      apiRequest("POST", `/api/applications/${applicationId}/courses`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId, "courses"] });
      toast({ title: "Course Added" }); setAddCourseDialogOpen(false);
      setSelectedCourseToAdd(""); setManualCourseName(""); setManualInstitution(""); setAddCourseMode("search");
    },
    onError: (e: any) => toast({ title: "Failed to Add Course", description: e.message, variant: "destructive" }),
  });

  const removeCourseMutation = useMutation({
    mutationFn: (entryId: string) => apiRequest("DELETE", `/api/applications/${applicationId}/course-entries/${entryId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId, "courses"] }); toast({ title: "Course Removed" }); },
    onError: (e: any) => toast({ title: "Failed to Remove Course", description: e.message, variant: "destructive" }),
  });

  const updateSlotsMutation = useMutation({
    mutationFn: (maxSlots: number) => apiRequest("PATCH", `/api/admin/students/${data?.student?.id}/application-slots`, { maxSlots }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/students", data?.student?.id, "application-slots"] }); toast({ title: "Slots Updated" }); setSlotsDialogOpen(false); },
    onError: (e: any) => toast({ title: "Update Failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/admin/applications/${applicationId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] }); toast({ title: "Application Deleted" }); window.location.href = "/admin"; },
    onError: (e: any) => toast({ title: "Delete Failed", description: e.message, variant: "destructive" }),
  });

  /* ── Loading / Error ── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-40" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild data-testid="button-back">
          <Link href="/admin?tab=applications"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Application</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>{error instanceof Error ? error.message : "Failed to load application details."}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="w-fit" data-testid="button-retry">
              <RefreshCw className="mr-2 h-4 w-4" />Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { application, course, university, student, consultant, documentProgress, externalCountry, externalCourseName } = data;
  const documents = documentsData?.documents ?? [];
  const history = historyData?.history ?? [];
  const applicationCourses = coursesData?.courses ?? [];
  const assignableUsers = assignableData?.users ?? [];
  const searchableCourses = courseSearchData?.courses ?? [];

  const docProgress = documentProgress.requiredDocs > 0
    ? Math.round((documentProgress.requiredUploaded / documentProgress.requiredDocs) * 100) : 0;

  const studentInitials = `${student.firstName?.charAt(0) ?? ""}${student.lastName?.charAt(0) ?? ""}`.toUpperCase();

  const documentsByStage = documents.reduce((acc, doc) => {
    if (!acc[doc.stage]) acc[doc.stage] = [];
    acc[doc.stage].push(doc);
    return acc;
  }, {} as Record<ApplicationStage, StageDocument[]>);

  const getDocumentStatus = (doc: StageDocument) => {
    if (!doc.documentUrl) return { label: "Pending", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" };
    if (doc.isVerified) return { label: "Verified", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
    if (doc.rejectionReason) return { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" };
    return { label: "Uploaded", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" };
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="ghost" asChild data-testid="button-back">
          <Link href="/admin?tab=applications"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setReminderDialogOpen(true)} data-testid="button-set-reminder">
            <Bell className="h-4 w-4 mr-2" />Set Reminder
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(true)} data-testid="button-delete-application">
            <Trash2 className="h-4 w-4 mr-2" />Delete
          </Button>
        </div>
      </div>

      {/* Overview Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-lg">Application Overview</CardTitle>
            {application.applicationNumber && (
              <Badge variant="outline" className="font-mono text-xs no-default-active-elevate" data-testid="badge-application-number">
                {application.applicationNumber}
              </Badge>
            )}
            <Badge variant="outline" className="font-mono text-xs no-default-active-elevate" data-testid="badge-application-id">
              #{application.id.slice(0, 8).toUpperCase()}
            </Badge>
            <Badge variant="secondary" className="no-default-active-elevate" data-testid="badge-application-status">{application.status}</Badge>
            <Badge className={`${STAGE_COLORS[application.currentStage]} no-default-active-elevate`} data-testid="badge-current-stage">
              {application.currentStage}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Student */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <User className="h-3 w-3" />Student
              </p>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={student.profilePicture || undefined} alt={`${student.firstName} ${student.lastName}`} />
                  <AvatarFallback>{studentInitials || "ST"}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold" data-testid="text-student-name">{student.firstName} {student.lastName}</h2>
                  {student.nationality && <p className="text-sm text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" />{student.nationality}</p>}
                </div>
              </div>
              <div className="space-y-1 pt-2 border-t">
                {student.email && (
                  <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${student.email}`} className="text-primary hover:underline truncate" data-testid="link-student-email">{student.email}</a>
                  </div>
                )}
                {student.phone && (
                  <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`tel:${student.phone}`} className="hover:underline">{student.phone}</a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />Applied: {format(new Date(application.createdAt), "MMM d, yyyy")}
                </div>
              </div>
            </div>

            {/* Course */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />Course
              </p>
              <div className="flex items-start gap-3">
                {university.logo ? (
                  <Avatar className="h-12 w-12 rounded-md flex-shrink-0">
                    <AvatarImage src={university.logo} alt={university.name} className="object-contain" />
                    <AvatarFallback className="rounded-md">{university.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold" data-testid="text-course-title">
                    {course.title}
                    {externalCourseName && !application.courseId && (
                      <Badge variant="outline" className="ml-1 text-[10px] px-1.5 no-default-active-elevate">External</Badge>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground" data-testid="text-university-name">{university.name}</p>
                  {course.level && <Badge variant="secondary" className="mt-1 no-default-active-elevate">{course.level}</Badge>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" />{course.duration ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fees</p>
                  <p className="font-medium flex items-center gap-1"><DollarSign className="h-3 w-3 shrink-0" />{course.fees ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p className="font-medium flex items-center gap-1"><Globe className="h-3 w-3 shrink-0" />{externalCountry || course.country || university.country || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Consultant</p>
                  <p className="font-medium flex items-center gap-1" data-testid="text-consultant-name">
                    <User className="h-3 w-3 shrink-0" />{consultant ? `${consultant.firstName} ${consultant.lastName}` : "Unassigned"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permanent progress strip — always visible regardless of active tab */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <ApplicationProgressBar currentStage={application.currentStage} showInternalStage={true} />
        </CardContent>
      </Card>

      {/* 5 Flat Tabs */}
      <Tabs
        defaultValue="process"
        className="w-full"
        onValueChange={(tab) => setVisitedTabs(prev => { const next = new Set(prev); next.add(tab); return next; })}
      >
        <TabsList className="grid w-full grid-cols-5" data-testid="tabs-application-detail">
          <TabsTrigger value="process" className="flex items-center gap-1.5" data-testid="tab-process">
            <MessageSquare className="h-4 w-4" /><span className="hidden sm:inline">Process</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1.5" data-testid="tab-documents">
            <FolderOpen className="h-4 w-4" /><span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="student" className="flex items-center gap-1.5" data-testid="tab-student">
            <User className="h-4 w-4" /><span className="hidden sm:inline">Student</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5" data-testid="tab-history">
            <History className="h-4 w-4" /><span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="courses" className="flex items-center gap-1.5" data-testid="tab-courses">
            <GraduationCap className="h-4 w-4" /><span className="hidden sm:inline">Courses</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Process Tab ──────────────────────────────────────────── */}
        <TabsContent value="process" className="mt-4 space-y-4">
          {/* Stage selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Application Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <ApplicationStageSelector applicationId={application.id} currentStage={application.currentStage} />
            </CardContent>
          </Card>

          {/* Consultant assignment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Consultant</p>
                <Select
                  value={application.assignedConsultantId || "_unassigned"}
                  onValueChange={(v) => assignConsultantMutation.mutate(v === "_unassigned" ? null : v)}
                  disabled={assignConsultantMutation.isPending}
                >
                  <SelectTrigger data-testid="select-assign-consultant">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_unassigned">Unassigned</SelectItem>
                    {assignableUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={() => setSlotsDialogOpen(true)} data-testid="button-manage-slots">
                  <Layers className="h-4 w-4 mr-2" />Manage Application Slots
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current-stage documents: request / upload / verify inline */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Stage Documents
                  <Badge variant="secondary" className="no-default-active-elevate">{STAGE_CONFIG[application.currentStage]?.displayName ?? application.currentStage}</Badge>
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setRequestDocDialogOpen(true)} data-testid="button-request-document-process">
                    <Send className="h-4 w-4 mr-1.5" />Request
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setUploadDocDialogOpen(true)} data-testid="button-upload-document-process">
                    <Upload className="h-4 w-4 mr-1.5" />Upload
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(documentsByStage[application.currentStage] ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No documents for this stage yet.</p>
              ) : (
                <div className="space-y-2">
                  {(documentsByStage[application.currentStage] ?? []).map(doc => {
                    const status = getDocumentStatus(doc);
                    return (
                      <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-md border bg-muted/30" data-testid={`process-doc-${doc.id}`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{doc.documentName}</p>
                            <p className="text-xs text-muted-foreground">{doc.documentType}</p>
                          </div>
                          <Badge className={`text-xs no-default-active-elevate ${status.color}`}>{status.label}</Badge>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {doc.documentUrl && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => setPreviewDoc({ url: `/api/admin/applications/${application.id}/documents/${doc.id}/download`, name: doc.documentName })} data-testid={`button-preview-process-doc-${doc.id}`}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {!doc.isVerified && !doc.rejectionReason && (
                                <Button variant="ghost" size="icon" onClick={() => setVerifyDocDialogOpen(doc.id)} data-testid={`button-verify-process-doc-${doc.id}`}>
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages with student */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />Messages with Student
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <StudentApplicationNotes
                applicationId={application.id}
                studentName={`${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() || "Student"}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Documents Tab ─────────────────────────────────────────── */}
        <TabsContent value="documents" className="mt-4 space-y-4">
          {/* Document progress */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Required Documents</span>
                    <span className="font-medium">{docProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${docProgress}%` }} />
                  </div>
                </div>
                <div className="text-center px-3 border-l">
                  <p className="text-xl font-bold" data-testid="text-doc-uploaded">{documentProgress.requiredUploaded}</p>
                  <p className="text-xs text-muted-foreground">of {documentProgress.requiredDocs} required</p>
                </div>
                <div className="text-center px-3 border-l">
                  <p className="text-xl font-bold">{documentProgress.totalDocs}</p>
                  <p className="text-xs text-muted-foreground">total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setRequestDocDialogOpen(true)} data-testid="button-request-document">
              <Send className="h-4 w-4 mr-2" />Request Document
            </Button>
            <Button variant="outline" size="sm" onClick={() => setUploadDocDialogOpen(true)} data-testid="button-upload-document">
              <Upload className="h-4 w-4 mr-2" />Upload Document
            </Button>
          </div>

          {/* Stage-organized documents */}
          {documents.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-20" />
                <p className="text-sm text-muted-foreground">No application documents yet. Request or upload to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {ALL_STAGES.filter(stage => documentsByStage[stage]?.length > 0).map(stage => (
                <div key={stage}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${STAGE_CONFIG[stage]?.dotColor ?? "bg-gray-400"}`} />
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">{STAGE_CONFIG[stage]?.displayName ?? stage}</h4>
                    <Badge variant="secondary" className="h-4 px-1 text-xs no-default-active-elevate">{documentsByStage[stage].length}</Badge>
                  </div>
                  <div className="space-y-2 ml-4">
                    {documentsByStage[stage].map(doc => {
                      const status = getDocumentStatus(doc);
                      return (
                        <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-md border bg-card" data-testid={`document-item-${doc.id}`}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{doc.documentName}</p>
                              <p className="text-xs text-muted-foreground">{doc.documentType}</p>
                            </div>
                            <Badge className={`text-xs no-default-active-elevate ${status.color}`}>{status.label}</Badge>
                            {doc.uploadedByRole === "admin" && <Badge variant="secondary" className="text-xs no-default-active-elevate">Consultant</Badge>}
                            {doc.isRequired && <Badge variant="outline" className="text-xs no-default-active-elevate">Required</Badge>}
                          </div>
                          <div className="flex items-center gap-1">
                            {doc.documentUrl && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => setPreviewDoc({ url: `/api/admin/applications/${application.id}/documents/${doc.id}/download`, name: doc.documentName })} data-testid={`button-view-doc-${doc.id}`}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => downloadDocument(`/api/admin/applications/${application.id}/documents/${doc.id}/download`, doc.documentName)} data-testid={`button-download-doc-${doc.id}`}>
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                                {!doc.isVerified && !doc.rejectionReason && (
                                  <Button variant="ghost" size="icon" onClick={() => setVerifyDocDialogOpen(doc.id)} data-testid={`button-verify-doc-${doc.id}`}>
                                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                  </Button>
                                )}
                              </>
                            )}
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteDocConfirmOpen(doc.id)} data-testid={`button-delete-doc-${doc.id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Student's document library */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Student Document Library</CardTitle>
              <CardDescription className="text-xs">Browse and manage documents in the student's personal library.</CardDescription>
            </CardHeader>
            <CardContent>
              {visitedTabs.has("documents") && (
                <TabErrorBoundary label="Document Organizer">
                  <StudentDocumentOrganizer studentProfileId={student.id} />
                </TabErrorBoundary>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Student Tab ───────────────────────────────────────────── */}
        <TabsContent value="student" className="mt-4 space-y-4">
          {visitedTabs.has("student") && (
            <TabErrorBoundary label="Student tab">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />Student Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StudentProfileViewer
                    profileId={student.id}
                    studentName={`${student.firstName} ${student.lastName}`}
                  />
                </CardContent>
              </Card>

              <StudentVerificationPanel
                profileId={student.id}
                studentName={`${student.firstName} ${student.lastName}`}
                onClose={() => {}}
              />
            </TabErrorBoundary>
          )}
        </TabsContent>

        {/* ── History Tab ───────────────────────────────────────────── */}
        <TabsContent value="history" className="mt-4 space-y-4">
          {visitedTabs.has("history") && (
            <TabErrorBoundary label="History tab">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />Stage History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ApplicationHistory applicationId={application.id} />
                </CardContent>
              </Card>

              <div className="space-y-4">
                <StudentApplicationNotes
                  applicationId={application.id}
                  studentName={`${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() || 'Student'}
                />
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <StickyNote className="h-4 w-4 text-muted-foreground" />Internal Notes
                    </CardTitle>
                    <CardDescription className="text-xs">Only visible to team members.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ApplicationInternalNotes
                      applicationId={application.id}
                      currentUserId={user?.id}
                      branchId={application.branchId}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabErrorBoundary>
          )}
        </TabsContent>

        {/* ── Courses Tab ───────────────────────────────────────────── */}
        <TabsContent value="courses" className="mt-4 space-y-4">
          {visitedTabs.has("courses") && (
            <TabErrorBoundary label="Courses tab">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    Courses &amp; Institutions
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">All courses attached to this application.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ApplicationMultiCourse
                    applicationId={application.id}
                    defaultCourseTitle={course.title}
                    defaultUniversityName={university.name}
                  />
                </CardContent>
              </Card>
            </TabErrorBoundary>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ────────────────────────────────────────────────── */}

      <CreateReminderModal open={reminderDialogOpen} onOpenChange={setReminderDialogOpen} applicationId={application.id} />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent data-testid="dialog-confirm-delete-application">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Delete Application</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the application for <strong>{student.firstName} {student.lastName}</strong>. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive hover:bg-destructive/90" disabled={deleteMutation.isPending} data-testid="button-confirm-delete">
              {deleteMutation.isPending ? "Deleting…" : "Delete Application"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={requestDocDialogOpen} onOpenChange={setRequestDocDialogOpen}>
        <DialogContent data-testid="dialog-request-document">
          <DialogHeader><DialogTitle>Request Document from Student</DialogTitle><DialogDescription>The student will be notified to upload the document.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Stage</Label>
              <Select value={newDocRequest.stage} onValueChange={(v) => setNewDocRequest({ ...newDocRequest, stage: v as ApplicationStage })}>
                <SelectTrigger data-testid="select-request-stage"><SelectValue /></SelectTrigger>
                <SelectContent>{ALL_STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_CONFIG[s].displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="req-type">Document Type</Label>
              <Input id="req-type" value={newDocRequest.documentType} onChange={(e) => setNewDocRequest({ ...newDocRequest, documentType: e.target.value })} placeholder="e.g., passport, transcript" data-testid="input-request-doc-type" />
            </div>
            <div>
              <Label htmlFor="req-name">Document Name</Label>
              <Input id="req-name" value={newDocRequest.documentName} onChange={(e) => setNewDocRequest({ ...newDocRequest, documentName: e.target.value })} placeholder="e.g., Passport Copy" data-testid="input-request-doc-name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDocDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => requestDocMutation.mutate(newDocRequest)} disabled={!newDocRequest.documentType || !newDocRequest.documentName || requestDocMutation.isPending} data-testid="button-send-request">
              <Send className="h-4 w-4 mr-1" />{requestDocMutation.isPending ? "Sending…" : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDocDialogOpen} onOpenChange={setUploadDocDialogOpen}>
        <DialogContent data-testid="dialog-upload-document">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle><DialogDescription>Upload a document to this application.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Stage</Label>
              <Select value={newDocUpload.stage} onValueChange={(v) => setNewDocUpload({ ...newDocUpload, stage: v as ApplicationStage })}>
                <SelectTrigger data-testid="select-upload-stage"><SelectValue /></SelectTrigger>
                <SelectContent>{ALL_STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_CONFIG[s].displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Student Folder</Label>
              <Select value={uploadFolderId ?? "__none__"} onValueChange={(v) => setUploadFolderId(v === "__none__" ? null : v)}>
                <SelectTrigger data-testid="select-upload-folder"><SelectValue placeholder="Unfiled" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unfiled (no folder)</SelectItem>
                  {studentFolders.map(f => <SelectItem key={f.id} value={f.id}><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: f.color }} />{f.name}</div></SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="upload-type">Document Type</Label>
              <Input id="upload-type" value={newDocUpload.documentType} onChange={(e) => setNewDocUpload({ ...newDocUpload, documentType: e.target.value })} placeholder="e.g., offer_letter" data-testid="input-upload-doc-type" />
            </div>
            <div>
              <Label htmlFor="upload-name">Document Name</Label>
              <Input id="upload-name" value={newDocUpload.documentName} onChange={(e) => setNewDocUpload({ ...newDocUpload, documentName: e.target.value })} placeholder="e.g., Offer Letter" data-testid="input-upload-doc-name" />
            </div>
            <div>
              <Label htmlFor="upload-file">File</Label>
              <Input id="upload-file" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls,.csv" onChange={(e) => { const f = e.target.files?.[0] ?? null; setUploadFile(f); if (f && !newDocUpload.documentName) setNewDocUpload(prev => ({ ...prev, documentName: f.name })); }} data-testid="input-upload-file" />
              {uploadFile && <p className="text-xs text-muted-foreground mt-1">{uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} KB)</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDocDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => uploadDocMutation.mutate()} disabled={!newDocUpload.documentType || !newDocUpload.documentName || !uploadFile || uploadDocMutation.isPending} data-testid="button-confirm-upload">
              <Upload className="h-4 w-4 mr-1" />{uploadDocMutation.isPending ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDocConfirmOpen} onOpenChange={() => setDeleteDocConfirmOpen(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete-document">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDocConfirmOpen && deleteDocMutation.mutate(deleteDocConfirmOpen)} className="bg-destructive hover:bg-destructive/90" disabled={deleteDocMutation.isPending}>
              {deleteDocMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!verifyDocDialogOpen} onOpenChange={() => setVerifyDocDialogOpen(null)}>
        <DialogContent data-testid="dialog-verify-document">
          <DialogHeader><DialogTitle>Verify Document</DialogTitle><DialogDescription>Approve or reject this document.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="verify-notes">Verification Notes (optional)</Label>
              <Textarea id="verify-notes" value={verifyNotes} onChange={(e) => setVerifyNotes(e.target.value)} placeholder="Add notes…" rows={2} data-testid="input-verify-notes" />
            </div>
            <div>
              <Label htmlFor="reject-reason">Rejection Reason (if rejecting)</Label>
              <Textarea id="reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection…" rows={2} data-testid="input-reject-reason" />
            </div>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            <Button variant="destructive" onClick={() => verifyDocDialogOpen && verifyDocMutation.mutate({ documentId: verifyDocDialogOpen, isVerified: false })} disabled={!rejectReason || verifyDocMutation.isPending} data-testid="button-reject-doc">
              <XCircle className="h-4 w-4 mr-1" />{verifyDocMutation.isPending ? "Processing…" : "Reject"}
            </Button>
            <Button onClick={() => verifyDocDialogOpen && verifyDocMutation.mutate({ documentId: verifyDocDialogOpen, isVerified: true })} disabled={verifyDocMutation.isPending} data-testid="button-approve-doc">
              <CheckCircle className="h-4 w-4 mr-1" />{verifyDocMutation.isPending ? "Processing…" : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={slotsDialogOpen} onOpenChange={setSlotsDialogOpen}>
        <DialogContent data-testid="dialog-manage-slots">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5" />Manage Application Slots</DialogTitle>
            <DialogDescription>Increase application slots for {student.firstName} {student.lastName}. Default is 3.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Usage:</span>
              <span className="font-medium">{slotsData?.usedSlots ?? 0} / {slotsData?.maxSlots ?? 3} slots used</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-slots">Maximum Slots</Label>
              <Input id="max-slots" type="number" min={Math.max(1, slotsData?.usedSlots ?? 1)} max={20} value={newMaxSlots} onChange={(e) => setNewMaxSlots(parseInt(e.target.value) || 3)} data-testid="input-max-slots" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlotsDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => updateSlotsMutation.mutate(newMaxSlots)} disabled={updateSlotsMutation.isPending || newMaxSlots < (slotsData?.usedSlots ?? 1)} data-testid="button-save-slots">
              {updateSlotsMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addCourseDialogOpen} onOpenChange={setAddCourseDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-add-course">
          <DialogHeader><DialogTitle>Add Course to Application</DialogTitle></DialogHeader>
          <div className="space-y-3 py-3">
            <div className="flex gap-2">
              <Button variant={addCourseMode === "search" ? "default" : "outline"} size="sm" onClick={() => setAddCourseMode("search")}>Search</Button>
              <Button variant={addCourseMode === "manual" ? "default" : "outline"} size="sm" onClick={() => setAddCourseMode("manual")}>Manual Entry</Button>
            </div>
            {addCourseMode === "search" ? (
              <>
                <Input placeholder="Search courses…" value={courseSearchQuery} onChange={(e) => { setCourseSearchQuery(e.target.value); setSelectedCourseToAdd(""); }} data-testid="input-course-search" />
                {searchableCourses.length > 0 && (
                  <ScrollArea className="h-40 border rounded-md">
                    <div className="p-1 space-y-1">
                      {searchableCourses.map(c => (
                        <button key={c.id} onClick={() => setSelectedCourseToAdd(c.id)} className={`w-full text-left p-2 rounded text-sm hover-elevate ${selectedCourseToAdd === c.id ? "bg-primary/10" : ""}`} data-testid={`course-option-${c.id}`}>
                          <p className="font-medium">{c.title}</p>
                          {c.university && <p className="text-xs text-muted-foreground">{c.university.name}</p>}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </>
            ) : (
              <>
                <Input placeholder="Course name" value={manualCourseName} onChange={(e) => setManualCourseName(e.target.value)} data-testid="input-manual-course-name" />
                <Input placeholder="Institution name" value={manualInstitution} onChange={(e) => setManualInstitution(e.target.value)} data-testid="input-manual-institution" />
                <Input placeholder="Country" value={manualCountry} onChange={(e) => setManualCountry(e.target.value)} data-testid="input-manual-country" />
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCourseDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (addCourseMode === "search" && selectedCourseToAdd) addCourseMutation.mutate({ courseId: selectedCourseToAdd });
                else if (addCourseMode === "manual" && manualCourseName) addCourseMutation.mutate({ externalCourseName: manualCourseName, externalInstitutionName: manualInstitution, externalCountry: manualCountry });
              }}
              disabled={addCourseMode === "search" ? !selectedCourseToAdd : !manualCourseName || addCourseMutation.isPending}
              data-testid="button-confirm-add-course"
            >
              {addCourseMutation.isPending ? "Adding…" : "Add Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewDoc && (
        <DocumentPreviewModal
          documentUrl={previewDoc.url}
          documentName={previewDoc.name}
          open={true}
          onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}
        />
      )}
    </div>
  );
}

export default function AdminApplicationDetail() {
  return (
    <TabErrorBoundary>
      <AdminLayout breadcrumbTitle="Application Details">
        <TabErrorBoundary label="Application Details">
          <AdminApplicationDetailContent />
        </TabErrorBoundary>
      </AdminLayout>
    </TabErrorBoundary>
  );
}
