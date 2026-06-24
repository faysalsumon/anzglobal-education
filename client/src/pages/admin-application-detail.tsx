/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  GraduationCap,
  Building2,
  Building,
  User,
  Calendar,
  Clock,
  Bell,
  Mail,
  Phone,
  Globe,
  DollarSign,
  FileText,
  FolderOpen,
  ClipboardList,
  MessageSquare,
  History,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Upload,
  Download,
  Eye,
  Trash2,
  Send,
  Plus,
  Layers,
  UserCheck,
  AlertTriangle,
  StickyNote,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminLayout } from "@/components/admin-layout";
import { ApplicationProgressBar } from "@/components/application-progress-bar";
import { ApplicationStageSelector } from "@/components/application-stage-selector";
import { ApplicationInternalNotes } from "@/components/application-internal-notes";
import { StudentApplicationNotes } from "@/components/student-application-notes";
import { EntityFollowUpPanel } from "@/components/entity-follow-up-panel";
import { StudentVerificationPanel } from "@/components/admin/student-verification-panel";
import { StudentProfileViewer } from "@/components/admin/student-profile-viewer";
import { StudentDocumentOrganizer } from "@/components/admin/student-document-organizer";
import { CreateReminderModal } from "@/components/create-reminder-modal";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { useDocumentEvents } from "@/hooks/useDocumentEvents";
import { useFileCompressor } from "@/hooks/useFileCompressor";
import { ApplicationFinancePanel } from "@/components/application-finance-panel";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ApplicationStage, STAGE_CONFIG, ALL_STAGES } from "@/lib/stage-config";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────── */

type AppStage =
  | "Assessment" | "Collect Docs" | "Documents Verification"
  | "Offer-Letter" | "GS-Clearance" | "COE" | "Health Cover"
  | "Visa Lodgment" | "Application Won" | "Refusal/Refunds" | "Application Lost";

interface AdminApplicationDetail {
  application: {
    id: string;
    studentId: string;
    courseId: string;
    applicationNumber?: string | null;
    currentStage: AppStage;
    status: string;
    personalStatement: string | null;
    additionalInfo: string | null;
    assignedConsultantId: string | null;
    branchId?: string | null;
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
    crmContactId: string | null;
    crmMobile: string | null;
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

interface StageDocument {
  id: string;
  applicationId: string;
  stage: ApplicationStage;
  documentType: string;
  documentName: string;
  documentUrl: string | null;
  isRequired: boolean;
  isVerified: boolean;
  uploadedBy: string | null;
  uploadedByRole: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verificationNotes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  documentId?: string | null;
}

interface StageHistoryRecord {
  history: {
    id: string;
    applicationId: string;
    fromStage: ApplicationStage | null;
    toStage: ApplicationStage;
    changedBy: string | null;
    changedByRole: string | null;
    notes: string | null;
    durationInStage: number | null;
    createdAt: string;
  };
  changedByUser: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface AssignableUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  userType?: string;
  profileImageUrl?: string | null;
}


interface ApplicationCourse {
  id: string;
  courseId: string | null;
  externalCourseName: string | null;
  externalInstitutionName: string | null;
  externalCountry: string | null;
  isPrimary: boolean;
  notes: string | null;
  displayOrder: number;
  createdAt: string;
  course: {
    id: string;
    title: string;
    level: string | null;
    duration: string | null;
    fees: string | null;
    universityId: string;
  } | null;
  university: {
    id: string;
    name: string;
    logo: string | null;
    country: string | null;
  } | null;
}

/* ── Helpers ────────────────────────────────────────────────────── */

const STAGE_COLORS: Record<AppStage, string> = {
  "Assessment": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Collect Docs": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Documents Verification": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Offer-Letter": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "GS-Clearance": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  "COE": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  "Health Cover": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "Visa Lodgment": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "Application Won": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Refusal/Refunds": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "Application Lost": "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const STAGE_FOLDER_MAP: Record<string, string> = {
  "Offer-Letter": "Offer-Letter",
  "COE": "COE",
  "GS-Clearance": "GS/GTE",
  "Visa Lodgment": "Visa",
  "Collect Docs": "Academics",
  "Documents Verification": "Academics",
};


/* ── Main Content ───────────────────────────────────────────────── */

function AdminApplicationDetailContent() {
  const [, params] = useRoute("/admin/applications/:id");
  const applicationId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();

  /* ── Role checks ─────────────────────────────────────────────── */
  const showAccountingTab =
    user?.adminRole === "cto" ||
    user?.adminRole === "accounts_officer";

  /* ── Invoice count for Accounting tab badge ───────────────────── */
  const { data: appInvoicesData } = useQuery<{ invoices: unknown[]; summary: { count: number } }>({
    queryKey: ["/api/accounting/invoices/by-application", applicationId],
    enabled: showAccountingTab && !!applicationId,
  });
  const accountingInvoiceCount = appInvoicesData?.summary?.count ?? 0;

  /* ── UI state ─────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState("overview");
  const [messagesView, setMessagesView] = useState<"student" | "internal">("student");
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [requestDocDialogOpen, setRequestDocDialogOpen] = useState(false);
  const [uploadDocDialogOpen, setUploadDocDialogOpen] = useState(false);
  const [deleteDocConfirmOpen, setDeleteDocConfirmOpen] = useState<string | null>(null);
  const [verifyDocDialogOpen, setVerifyDocDialogOpen] = useState<string | null>(null);
  const [slotsDialogOpen, setSlotsDialogOpen] = useState(false);
  const [newMaxSlots, setNewMaxSlots] = useState<number>(3);
  const [addCourseDialogOpen, setAddCourseDialogOpen] = useState(false);
  const [selectedCourseToAdd, setSelectedCourseToAdd] = useState("");
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [addCourseInstitutionFilter, setAddCourseInstitutionFilter] = useState("");
  const [addCourseMode, setAddCourseMode] = useState<"search" | "manual">("search");
  const [manualCourseName, setManualCourseName] = useState("");
  const [manualInstitutionName, setManualInstitutionName] = useState("");
  const [manualCountry, setManualCountry] = useState("Australia");
  const [consultantPopoverOpen, setConsultantPopoverOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<{ url: string; name: string; mimeType?: string } | null>(null);
  const [verifyNotes, setVerifyNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [newDocRequest, setNewDocRequest] = useState({ stage: "" as ApplicationStage, documentType: "", documentName: "", isRequired: true });
  const [newDocUpload, setNewDocUpload] = useState({ stage: "" as ApplicationStage, documentType: "", documentName: "", isRequired: false });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null);
  const [uploadExpiryDate, setUploadExpiryDate] = useState<string>("");
  const [uploadCompressionLabel, setUploadCompressionLabel] = useState<string | null>(null);
  const [uploadFileTooLarge, setUploadFileTooLarge] = useState(false);
  const { compress: compressUploadFile, compressing: uploadCompressing } = useFileCompressor();

  /* ── Queries ─────────────────────────────────────────────────── */
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

  const { data: assignableUsersData } = useQuery<{ users: AssignableUser[] }>({
    queryKey: ["/api/admin/assignable-users"],
    enabled: !!applicationId,
  });

  const { data: slotsData } = useQuery<{ maxSlots: number; usedSlots: number; availableSlots: number }>({
    queryKey: ["/api/admin/students", data?.student?.id, "application-slots"],
    enabled: !!data?.student?.id,
  });

  const { data: studentFolders = [] } = useQuery<{ id: string; name: string; color: string }[]>({
    queryKey: ["/api/admin/applications", applicationId, "student-folders"],
    enabled: uploadDocDialogOpen,
  });


  interface SearchCourse { id: string; title: string; level: string | null; university?: { id: string; name: string; logo?: string | null } }
  const { data: courseSearchData } = useQuery<{ courses: SearchCourse[]; total: number }>({
    queryKey: ["/api/courses", { search: courseSearchQuery, limit: 20, universityId: addCourseInstitutionFilter || undefined }],
    enabled: addCourseDialogOpen && (courseSearchQuery.length >= 2 || !!addCourseInstitutionFilter),
  });
  const { data: addCourseInstitutionsData } = useQuery<any[]>({
    queryKey: ["/api/institutions", { limit: 100, includePrivate: 'true' }],
    enabled: addCourseDialogOpen,
  });

  /* ── Derived data ─────────────────────────────────────────────── */
  const documents = documentsData?.documents || [];
  const history = historyData?.history || [];
  const applicationCourses = coursesData?.courses || [];
  const assignableUsers = assignableUsersData?.users || [];
  const searchableCourses = courseSearchData?.courses || [];
  const addCourseInstitutions = Array.isArray(addCourseInstitutionsData) ? addCourseInstitutionsData : [];
  /* ── useDocumentEvents hook ───────────────────────────────────── */
  useDocumentEvents({ applicationId: applicationId || "" });

  /* ── Auto-suggest upload folder ───────────────────────────────── */
  useEffect(() => {
    if (!uploadDocDialogOpen || !data) return;
    const folderName = STAGE_FOLDER_MAP[newDocUpload.stage || data.application.currentStage];
    const matched = folderName ? studentFolders.find(f => f.name === folderName) : undefined;
    setUploadFolderId(matched?.id ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadDocDialogOpen, studentFolders]);

  /* ── Document helpers ─────────────────────────────────────────── */
  const openDocumentPreview = useCallback((url: string, fileName: string, mimeType?: string) => {
    setPreviewDocument({ url, name: fileName, mimeType });
  }, []);

  const downloadDocument = useCallback(async (url: string, fileName?: string) => {
    try {
      if (!supabase) { toast({ title: "Error", description: "Authentication not available", variant: "destructive" }); return; }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast({ title: "Error", description: "Please log in to download documents", variant: "destructive" }); return; }
      const response = await fetch(url, { credentials: "include", headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch document');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast({ title: "Error", description: "Failed to download document", variant: "destructive" });
    }
  }, [toast]);

  /* ── Mutations ─────────────────────────────────────────────────── */
  const deleteMutation = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/admin/applications/${applicationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      toast({ title: "Application Deleted", description: "The application has been permanently deleted" });
      window.location.href = "/admin";
    },
    onError: (err: any) => toast({ title: "Delete Failed", description: err.message, variant: "destructive" }),
  });

  const assignConsultantMutation = useMutation({
    mutationFn: async (consultantId: string | null) =>
      apiRequest("PATCH", `/api/applications/${applicationId}/assign`, { assignedConsultantId: consultantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", applicationId] });
      toast({ title: "Consultant Assigned", description: "Consultant assignment updated successfully" });
    },
    onError: (err: any) => toast({ title: "Assignment Failed", description: err.message, variant: "destructive" }),
  });

  const updateSlotsMutation = useMutation({
    mutationFn: async (maxSlots: number) =>
      apiRequest("PATCH", `/api/admin/students/${data?.student?.id}/application-slots`, { maxSlots }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students", data?.student?.id, "application-slots"] });
      toast({ title: "Slots Updated" });
      setSlotsDialogOpen(false);
    },
    onError: (err: any) => toast({ title: "Update Failed", description: err.message, variant: "destructive" }),
  });

  const requestDocMutation = useMutation({
    mutationFn: async (payload: typeof newDocRequest) =>
      apiRequest("POST", `/api/admin/applications/${applicationId}/request-document`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", applicationId, "documents"] });
      toast({ title: "Document Requested", description: "Student has been notified to upload the document" });
      setRequestDocDialogOpen(false);
      if (data) setNewDocRequest({ stage: data.application.currentStage as ApplicationStage, documentType: "", documentName: "", isRequired: true });
    },
    onError: (err: any) => toast({ title: "Request Failed", description: err.message, variant: "destructive" }),
  });

  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("stage", newDocUpload.stage || (data?.application.currentStage ?? ""));
      formData.append("documentType", newDocUpload.documentType);
      formData.append("documentName", newDocUpload.documentName);
      formData.append("isRequired", String(newDocUpload.isRequired));
      if (uploadFolderId) formData.append("folderId", uploadFolderId);
      if (uploadExpiryDate) formData.append("expiryDate", uploadExpiryDate);
      return apiRequest("POST", `/api/admin/applications/${applicationId}/upload-document`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", applicationId, "documents"] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/students/${data?.student?.id}/documents`] });
      toast({ title: "Document Uploaded", description: "Document has been added successfully" });
      setUploadDocDialogOpen(false);
      if (data) setNewDocUpload({ stage: data.application.currentStage as ApplicationStage, documentType: "", documentName: "", isRequired: false });
      setUploadFile(null);
      setUploadFolderId(null);
      setUploadExpiryDate("");
      setUploadCompressionLabel(null);
      setUploadFileTooLarge(false);
    },
    onError: (err: any) => toast({ title: "Upload Failed", description: err.message, variant: "destructive" }),
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (documentId: string) =>
      apiRequest("DELETE", `/api/admin/applications/${applicationId}/documents/${documentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", applicationId, "documents"] });
      toast({ title: "Document Deleted", description: "Document has been removed" });
      setDeleteDocConfirmOpen(null);
    },
    onError: (err: any) => toast({ title: "Delete Failed", description: err.message, variant: "destructive" }),
  });

  const verifyDocMutation = useMutation({
    mutationFn: async ({ documentId, isVerified }: { documentId: string; isVerified: boolean }) =>
      apiRequest("POST", `/api/admin/applications/verify-document`, {
        documentId, isVerified, verificationNotes: verifyNotes, rejectionReason: rejectReason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", applicationId, "documents"] });
      toast({ title: "Document Status Updated" });
      setVerifyDocDialogOpen(null);
      setVerifyNotes("");
      setRejectReason("");
    },
    onError: (err: any) => toast({ title: "Verification Failed", description: err.message, variant: "destructive" }),
  });

  const attachFromLibraryMutation = useMutation({
    mutationFn: async (payload: { documentId: string; stage: ApplicationStage }) =>
      apiRequest("POST", `/api/admin/applications/${applicationId}/attach-document`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", applicationId, "documents"] });
      toast({ title: "Document Attached", description: "Document from student's library has been attached" });
    },
    onError: (err: any) => toast({ title: "Attach Failed", description: err.message, variant: "destructive" }),
  });

  const addCourseMutation = useMutation({
    mutationFn: async (payload: { courseId?: string; externalCourseName?: string; externalInstitutionName?: string; externalCountry?: string }) =>
      apiRequest("POST", `/api/applications/${applicationId}/courses`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId, "courses"] });
      toast({ title: "Course Added" });
      setAddCourseDialogOpen(false);
      setSelectedCourseToAdd("");
      setManualCourseName("");
      setManualInstitutionName("");
      setAddCourseMode("search");
    },
    onError: (err: any) => toast({ title: "Failed to Add Course", description: err.message, variant: "destructive" }),
  });

  const removeCourseMutation = useMutation({
    mutationFn: async (entryId: string) =>
      apiRequest("DELETE", `/api/applications/${applicationId}/course-entries/${entryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId, "courses"] });
      toast({ title: "Course Removed" });
    },
    onError: (err: any) => toast({ title: "Failed to Remove Course", description: err.message, variant: "destructive" }),
  });

  /* ── Loading / Error ──────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></div>
        </div>
        <Skeleton className="h-20" />
        <Skeleton className="h-32" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild data-testid="button-back">
          <Link href="/admin"><ArrowLeft className="h-4 w-4 mr-2" />Back to Applications</Link>
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
  const progress = documentProgress.requiredDocs > 0
    ? Math.round((documentProgress.requiredUploaded / documentProgress.requiredDocs) * 100)
    : 0;
  const studentInitials = `${student.firstName?.charAt(0) || ''}${student.lastName?.charAt(0) || ''}`.toUpperCase();
  const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student';

  /* ── Page ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4 pb-16">

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(true)} data-testid="button-delete-application">
          <Trash2 className="h-4 w-4 mr-1" />Delete
        </Button>
      </div>

      {/* ── SUMMARY STRIP ───────────────────────────────────────── */}
      <Card>
        <CardContent className="px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Avatar + name + phone/email */}
            <div className="flex items-center gap-2.5 shrink-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={student.profilePicture || undefined} alt={studentName} />
                <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                  {studentInitials || 'ST'}
                </AvatarFallback>
              </Avatar>
              <div className="leading-tight">
                <HoverCard openDelay={300} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <a
                      href={student.crmContactId ? `/admin?tab=crm-contacts&contactId=${student.crmContactId}` : undefined}
                      onClick={!student.crmContactId ? (e) => e.preventDefault() : undefined}
                      className={`text-sm font-semibold text-foreground transition-colors ${student.crmContactId ? 'cursor-pointer underline-offset-2 hover:underline hover:text-primary' : 'cursor-default'}`}
                      data-testid={student.crmContactId ? "link-summary-student-name" : "text-summary-student-name"}
                    >
                      {studentName}
                    </a>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-72 p-3" side="bottom" align="start">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={student.profilePicture || undefined} alt={studentName} />
                        <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                          {studentInitials || 'ST'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-none">{studentName}</p>
                        {student.nationality && (
                          <p className="text-xs text-muted-foreground">{student.nationality}</p>
                        )}
                        {student.email && (
                          <a href={`mailto:${student.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:underline truncate">
                            <Mail className="h-3 w-3 shrink-0" />{student.email}
                          </a>
                        )}
                        {student.crmMobile && (
                          <a href={`tel:${student.crmMobile}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:underline">
                            <Phone className="h-3 w-3 shrink-0" />{student.crmMobile}
                          </a>
                        )}
                        {!student.crmMobile && student.phone && (
                          <a href={`tel:${student.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:underline">
                            <Phone className="h-3 w-3 shrink-0" />{student.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
                {student.crmMobile && (
                  <a href={`tel:${student.crmMobile}`} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:underline mt-0.5" data-testid="link-summary-mobile-inline">
                    <Phone className="h-3 w-3 shrink-0" />{student.crmMobile}
                  </a>
                )}
                {!student.crmMobile && student.phone && (
                  <a href={`tel:${student.phone}`} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:underline mt-0.5" data-testid="link-summary-phone-inline">
                    <Phone className="h-3 w-3 shrink-0" />{student.phone}
                  </a>
                )}
                {student.email && (
                  <a href={`mailto:${student.email}`} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:underline" data-testid="link-summary-email-inline">
                    <Mail className="h-3 w-3 shrink-0" />{student.email}
                  </a>
                )}
              </div>
            </div>

            <div className="w-px h-8 bg-border shrink-0" />

            {/* Contact details row */}
            <div className="flex items-center gap-4 flex-wrap flex-1 min-w-0">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />Applied {format(new Date(application.createdAt), 'MMM d, yyyy')}
              </span>
              {application.applicationNumber && (
                <Badge variant="default" className="font-mono text-xs px-1.5 py-0" data-testid="badge-application-number">
                  {application.applicationNumber}
                </Badge>
              )}
            </div>

            <div className="w-px h-8 bg-border shrink-0 hidden sm:block" />

            {/* Consultant + docs */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <Popover open={consultantPopoverOpen} onOpenChange={setConsultantPopoverOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button
                        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        disabled={assignConsultantMutation.isPending}
                        data-testid="button-assign-consultant"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className={cn("text-[10px] font-semibold", consultant ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                            {consultant
                              ? `${(consultant.firstName ?? '')[0] ?? ''}${(consultant.lastName ?? '')[0] ?? ''}`
                              : <UserCheck className="h-3.5 w-3.5" />
                            }
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{consultant ? `${consultant.firstName} ${consultant.lastName}` : 'Unassigned — click to assign'}</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent className="w-52 p-2" side="bottom" align="start">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Assign Consultant</p>
                  <div className="space-y-0.5">
                    <button
                      className={cn("w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors", !application.assignedConsultantId ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted")}
                      onClick={() => { assignConsultantMutation.mutate(null); setConsultantPopoverOpen(false); }}
                    >
                      Unassigned
                    </button>
                    {assignableUsers.map((c) => (
                      <button
                        key={c.id}
                        className={cn("w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors", application.assignedConsultantId === c.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted")}
                        onClick={() => { assignConsultantMutation.mutate(c.id); setConsultantPopoverOpen(false); }}
                      >
                        {c.firstName} {c.lastName}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                <span>Docs</span>
                <span className="font-semibold text-foreground">{documentProgress.requiredUploaded}/{documentProgress.requiredDocs}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── STAGE MANAGEMENT ────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Stage:</span>
              <ApplicationStageSelector
                applicationId={application.id}
                currentStage={application.currentStage as ApplicationStage}
                onStageChange={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", applicationId] });
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", applicationId, "history"] });
                }}
              />
            </div>

          </div>

          <ApplicationProgressBar
            currentStage={application.currentStage as ApplicationStage}
            adminView={true}
            stageTimings={history.reduce<Record<string, number>>((acc, r) => {
              if (r.history.fromStage && r.history.durationInStage != null) {
                acc[r.history.fromStage] = (acc[r.history.fromStage] ?? 0) + r.history.durationInStage;
              }
              return acc;
            }, {})}
            currentStageEnteredAt={(() => {
              const transitionsIn = history.filter(
                r => r.history.toStage === application.currentStage && r.history.fromStage !== application.currentStage
              );
              if (transitionsIn.length > 0) {
                return [...transitionsIn].sort(
                  (a, b) => new Date(b.history.createdAt).getTime() - new Date(a.history.createdAt).getTime()
                )[0].history.createdAt;
              }
              return application.createdAt;
            })()}
          />
        </CardContent>
      </Card>

      {/* ── TWO-COLUMN BODY ─────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
      {/* ── LEFT: TABS ──────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full border-b bg-transparent h-auto p-0 rounded-none justify-start overflow-x-auto" data-testid="tabs-application-detail">
          {[
            { value: "overview", icon: ClipboardList, label: "Overview" },
            { value: "profile", icon: User, label: "Profile" },
            { value: "documents", icon: FolderOpen, label: "Documents" },
            { value: "verification", icon: ShieldCheck, label: "Verification" },
            { value: "messages", icon: MessageSquare, label: "Messages" },
            { value: "history", icon: History, label: "History" },
            ...(showAccountingTab ? [{ value: "accounting", icon: DollarSign, label: "Accounting", badge: accountingInvoiceCount > 0 ? accountingInvoiceCount : undefined }] : []),
          ].map(({ value, icon: Icon, label, ...rest }) => {
            const tabBadge = (rest as { badge?: number }).badge;
            return (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={cn(
                "flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm border-b-2 shrink-0 transition-colors",
                activeTab === value
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
              )}
              data-testid={`tab-${value}`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
              {tabBadge !== undefined && (
                <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs px-1.5 py-0 min-w-[1.25rem] text-center" data-testid={`badge-tab-count-${value}`}>
                  {tabBadge}
                </Badge>
              )}
            </button>
            );
          })}
        </TabsList>

        {/* ── OVERVIEW TAB ──────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Course details card */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Course Details
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setAddCourseDialogOpen(true)} data-testid="button-add-course">
                <Plus className="h-3.5 w-3.5 mr-1" />Add Course
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                {university.logo ? (
                  <Avatar className="h-14 w-14 rounded-md">
                    <AvatarImage src={university.logo} alt={university.name} className="object-contain" />
                    <AvatarFallback className="rounded-md">{university.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center shrink-0">
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
                  {course.level && <Badge variant="secondary" className="mt-1">{course.level}</Badge>}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />{course.duration ?? 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tuition Fees</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />{course.fees ?? 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Country</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Globe className="h-3 w-3" />{externalCountry || course.country || university.country || 'Not specified'}
                  </p>
                </div>
              </div>
              {applicationCourses.length > 1 && (
                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">All Courses</p>
                  <div className="flex flex-wrap gap-1.5">
                    {applicationCourses.map((ac, idx) => {
                      const name = ac.courseId ? (ac.course?.title ?? "(Untitled)") : (ac.externalCourseName ?? "(External)");
                      return (
                        <div key={ac.id} className="flex items-center gap-1 bg-muted rounded-md px-2 py-1 text-xs" data-testid={`course-chip-${idx}`}>
                          <GraduationCap className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[140px]">{name}</span>
                          {ac.isPrimary && <Badge variant="secondary" className="text-[9px] px-1 h-3.5 no-default-active-elevate">Primary</Badge>}
                          {!ac.isPrimary && (
                            <button
                              onClick={() => removeCourseMutation.mutate(ac.id)}
                              className="text-muted-foreground hover:text-destructive ml-0.5"
                              data-testid={`button-remove-course-${idx}`}
                            >
                              <XCircle className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Statement / Additional Info */}
          {(application.personalStatement || application.additionalInfo) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Application Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.personalStatement && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Personal Statement</p>
                    <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded-md p-3">{application.personalStatement}</p>
                  </div>
                )}
                {application.additionalInfo && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Additional Information</p>
                    <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded-md p-3">{application.additionalInfo}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Slots management */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Application Slots</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {slotsData?.usedSlots || 0} / {slotsData?.maxSlots || 3} used
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setNewMaxSlots(slotsData?.maxSlots || 3); setSlotsDialogOpen(true); }}
                  data-testid="button-manage-slots"
                >
                  <Layers className="h-3.5 w-3.5 mr-1" />Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PROFILE TAB ───────────────────────────────────────── */}
        <TabsContent value="profile" className="mt-4">
          <StudentProfileViewer
            profileId={student.id}
            studentName={studentName}
          />
        </TabsContent>

        {/* ── DOCUMENTS TAB ─────────────────────────────────────── */}
        <TabsContent value="documents" className="mt-4">
          <StudentDocumentOrganizer
            studentProfileId={student.id}
            applicationId={applicationId ?? ""}
            applicationDocuments={documents}
            onRequestDoc={() => {
              setNewDocRequest({ stage: application.currentStage as ApplicationStage, documentType: "", documentName: "", isRequired: true });
              setRequestDocDialogOpen(true);
            }}
            onUploadDoc={() => {
              setNewDocUpload({ stage: application.currentStage as ApplicationStage, documentType: "", documentName: "", isRequired: false });
              setUploadDocDialogOpen(true);
            }}
            onAttachDoc={(docId) => attachFromLibraryMutation.mutate({ documentId: docId, stage: application.currentStage as ApplicationStage })}
            onVerifyDoc={(docId) => setVerifyDocDialogOpen(docId)}
            onDeleteDoc={(docId) => setDeleteDocConfirmOpen(docId)}
            onViewAppDoc={(url, name) => openDocumentPreview(url, name)}
            onDownloadAppDoc={(url, name) => downloadDocument(url, name)}
            onViewLibraryDoc={(url, name) => openDocumentPreview(url, name)}
            onDownloadLibraryDoc={(url, name) => downloadDocument(url, name)}
          />
        </TabsContent>

        {/* ── VERIFICATION TAB ──────────────────────────────────── */}
        <TabsContent value="verification" className="mt-4">
          <StudentVerificationPanel
            profileId={student.id}
            studentName={studentName}
            onClose={() => {}}
          />
        </TabsContent>

        {/* ── MESSAGES TAB ──────────────────────────────────────── */}
        <TabsContent value="messages" className="mt-4">
          {/* Segmented toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit mb-4">
            <button
              onClick={() => setMessagesView("student")}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                messagesView === "student"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="toggle-student-messages"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5 inline-block" />
              Student Messages
            </button>
            <button
              onClick={() => setMessagesView("internal")}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                messagesView === "internal"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="toggle-internal-notes"
            >
              <StickyNote className="h-3.5 w-3.5 mr-1.5 inline-block" />
              Internal Notes
            </button>
          </div>

          {messagesView === "student" ? (
            <StudentApplicationNotes
              applicationId={application.id}
              studentName={studentName}
            />
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                  Internal Notes
                </CardTitle>
                <p className="text-xs text-muted-foreground">Only visible to team members.</p>
              </CardHeader>
              <CardContent className="pt-0">
                <ApplicationInternalNotes
                  applicationId={application.id}
                  currentUserId={user?.id}
                  branchId={application.branchId}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── HISTORY TAB ───────────────────────────────────────── */}
        <TabsContent value="history" className="mt-4">
          <ScrollArea className="h-[500px]">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <History className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-sm">No stage history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((record, index) => (
                  <div
                    key={record.history.id}
                    className="flex gap-3 p-3 rounded-md border bg-card"
                    data-testid={`history-item-${record.history.id}`}
                  >
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${STAGE_CONFIG[record.history.toStage]?.dotColor || 'bg-gray-500'}`} />
                      {index < history.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {record.history.fromStage && (
                          <>
                            <Badge variant="outline" className="text-xs no-default-active-elevate">
                              {STAGE_CONFIG[record.history.fromStage]?.displayName || record.history.fromStage}
                            </Badge>
                            <span className="text-muted-foreground text-xs">→</span>
                          </>
                        )}
                        <Badge className={`text-xs no-default-active-elevate ${STAGE_CONFIG[record.history.toStage]?.badgeClass || 'bg-gray-100 text-gray-800'}`}>
                          {STAGE_CONFIG[record.history.toStage]?.displayName || record.history.toStage}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(record.history.createdAt).toLocaleString()}</span>
                        {record.changedByUser && (
                          <>
                            <span>•</span>
                            <User className="h-3 w-3" />
                            <span>{record.changedByUser.firstName} {record.changedByUser.lastName}</span>
                          </>
                        )}
                        {record.history.durationInStage !== null && (
                          <>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{record.history.durationInStage}h in previous stage</span>
                          </>
                        )}
                      </div>
                      {record.history.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">"{record.history.notes}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* ── ACCOUNTING TAB ────────────────────────────────────── */}
        {showAccountingTab && (
          <TabsContent value="accounting" className="mt-4">
            <ApplicationFinancePanel
              applicationId={application.id}
              studentId={student.id}
              studentName={studentName}
              studentEmail={student.email}
              applicationNumber={application.applicationNumber}
              institutionId={university.id}
              institutionName={university.name}
            />
          </TabsContent>
        )}
      </Tabs>
      </div>{/* end left column */}

      {/* ── RIGHT: STICKY PANEL ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-4">
        <EntityFollowUpPanel entityType="application" entityId={application.id} />
        <div>
          <p className="text-xs font-semibold mb-2 text-muted-foreground flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5" />
            Internal Notes
          </p>
          <ApplicationInternalNotes
            applicationId={application.id}
            currentUserId={user?.id}
            branchId={application.branchId}
          />
        </div>
      </div>

      </div>{/* end two-column body */}

      {/* ── MODALS ─────────────────────────────────────────────────── */}

      <CreateReminderModal
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        applicationId={application.id}
      />

      {previewDocument && (
        <DocumentPreviewModal
          open={!!previewDocument}
          onOpenChange={(open) => { if (!open) setPreviewDocument(null); }}
          documentUrl={previewDocument.url}
          documentName={previewDocument.name}
          mimeType={previewDocument.mimeType}
        />
      )}

      {/* Delete application */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent data-testid="dialog-confirm-delete-application">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />Delete Application
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this application for <strong>{studentName}</strong> applying to <strong>{course.title}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Application"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Application slots dialog */}
      <Dialog open={slotsDialogOpen} onOpenChange={setSlotsDialogOpen}>
        <DialogContent data-testid="dialog-manage-slots">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />Manage Application Slots
            </DialogTitle>
            <DialogDescription>
              Increase application slots for {studentName}. Default is 3 slots.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Usage:</span>
              <span className="font-medium">{slotsData?.usedSlots || 0} / {slotsData?.maxSlots || 3} slots used</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-slots">Maximum Slots</Label>
              <Input
                id="max-slots"
                type="number"
                min={Math.max(1, slotsData?.usedSlots || 1)}
                max={20}
                value={newMaxSlots}
                onChange={(e) => setNewMaxSlots(parseInt(e.target.value) || 3)}
                data-testid="input-max-slots"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlotsDialogOpen(false)} data-testid="button-cancel-slots">Cancel</Button>
            <Button
              onClick={() => updateSlotsMutation.mutate(newMaxSlots)}
              disabled={updateSlotsMutation.isPending || newMaxSlots < (slotsData?.usedSlots || 1)}
              data-testid="button-save-slots"
            >
              {updateSlotsMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request document dialog */}
      <Dialog open={requestDocDialogOpen} onOpenChange={setRequestDocDialogOpen}>
        <DialogContent data-testid="dialog-request-document">
          <DialogHeader>
            <DialogTitle>Request Document from Student</DialogTitle>
            <DialogDescription>The student will be notified to upload the requested document.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="req-stage">Stage</Label>
              <Select
                value={newDocRequest.stage}
                onValueChange={(v) => setNewDocRequest({ ...newDocRequest, stage: v as ApplicationStage })}
              >
                <SelectTrigger id="req-stage" data-testid="select-request-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>{STAGE_CONFIG[stage].displayName}</SelectItem>
                  ))}
                </SelectContent>
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
              <Send className="h-4 w-4 mr-1" />{requestDocMutation.isPending ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload document dialog */}
      <Dialog open={uploadDocDialogOpen} onOpenChange={setUploadDocDialogOpen}>
        <DialogContent data-testid="dialog-upload-document">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a document to this application via Object Storage.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="upload-stage">Stage</Label>
              <Select
                value={newDocUpload.stage}
                onValueChange={(v) => {
                  setNewDocUpload({ ...newDocUpload, stage: v as ApplicationStage });
                  const folderName = STAGE_FOLDER_MAP[v];
                  const matched = folderName ? studentFolders.find(f => f.name === folderName) : undefined;
                  setUploadFolderId(matched?.id ?? null);
                }}
              >
                <SelectTrigger id="upload-stage" data-testid="select-upload-stage"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>{STAGE_CONFIG[stage].displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="upload-folder">Student Folder</Label>
              <Select value={uploadFolderId ?? "__none__"} onValueChange={(v) => setUploadFolderId(v === "__none__" ? null : v)}>
                <SelectTrigger id="upload-folder" data-testid="select-upload-folder"><SelectValue placeholder="Unfiled (no folder)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unfiled (no folder)</SelectItem>
                  {studentFolders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: folder.color }} />
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Auto-suggested from stage.</p>
            </div>
            <div>
              <Label htmlFor="upload-type">Document Type</Label>
              <Input id="upload-type" value={newDocUpload.documentType} onChange={(e) => setNewDocUpload({ ...newDocUpload, documentType: e.target.value })} placeholder="e.g., offer_letter, coe" data-testid="input-upload-doc-type" />
            </div>
            <div>
              <Label htmlFor="upload-name">Document Name</Label>
              <Input id="upload-name" value={newDocUpload.documentName} onChange={(e) => setNewDocUpload({ ...newDocUpload, documentName: e.target.value })} placeholder="e.g., Offer Letter" data-testid="input-upload-doc-name" />
            </div>
            <div>
              <Label htmlFor="upload-expiry">Expiry Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="upload-expiry"
                type="date"
                value={uploadExpiryDate}
                onChange={(e) => setUploadExpiryDate(e.target.value)}
                data-testid="input-upload-expiry-date"
              />
              <p className="text-xs text-muted-foreground mt-1">For time-sensitive documents like visas or test results.</p>
            </div>
            <div>
              <Label htmlFor="upload-file">File</Label>
              <Input
                id="upload-file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls,.csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0] ?? null;
                  setUploadCompressionLabel(null);
                  setUploadFileTooLarge(false);
                  if (!file) { setUploadFile(null); return; }
                  try {
                    const result = await compressUploadFile(file);
                    setUploadFile(result.file);
                    if (!result.wasCompressed && result.compressedMB > 10) {
                      setUploadFileTooLarge(true);
                    } else if (result.wasCompressed) {
                      setUploadCompressionLabel(
                        `Compressed from ${result.originalMB.toFixed(2)} MB → ${result.compressedMB.toFixed(2)} MB`
                      );
                    }
                  } catch {
                    setUploadFile(file);
                    toast({ title: "Compression failed", description: "File will be uploaded as-is.", variant: "destructive" });
                  }
                  if (!newDocUpload.documentName) {
                    setNewDocUpload((prev) => ({ ...prev, documentName: file.name }));
                  }
                }}
                data-testid="input-upload-file"
              />
              {uploadCompressing && (
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  Compressing…
                </p>
              )}
              {!uploadCompressing && uploadFile && (
                <p className="text-xs text-muted-foreground mt-1">{uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} KB)</p>
              )}
              {!uploadCompressing && uploadFileTooLarge && (
                <p className="text-xs text-destructive mt-1" data-testid="warning-upload-file-too-large">This file is too large to upload. Max 10 MB — please choose a smaller file.</p>
              )}
              {!uploadCompressing && uploadCompressionLabel && (
                <p className="text-xs text-green-600 mt-0.5">{uploadCompressionLabel}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDocDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => uploadDocMutation.mutate()} disabled={!newDocUpload.documentType || !newDocUpload.documentName || !uploadFile || uploadDocMutation.isPending || uploadCompressing || uploadFileTooLarge} data-testid="button-confirm-upload">
              <Upload className="h-4 w-4 mr-1" />{uploadDocMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete document confirm */}
      <AlertDialog open={!!deleteDocConfirmOpen} onOpenChange={() => setDeleteDocConfirmOpen(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete-document">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this document? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDocConfirmOpen && deleteDocMutation.mutate(deleteDocConfirmOpen)} className="bg-destructive hover:bg-destructive/90" disabled={deleteDocMutation.isPending}>
              {deleteDocMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Verify document dialog */}
      <Dialog open={!!verifyDocDialogOpen} onOpenChange={() => setVerifyDocDialogOpen(null)}>
        <DialogContent data-testid="dialog-verify-document">
          <DialogHeader>
            <DialogTitle>Verify Document</DialogTitle>
            <DialogDescription>Approve or reject this document with optional notes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="verify-notes">Verification Notes (optional)</Label>
              <Textarea id="verify-notes" value={verifyNotes} onChange={(e) => setVerifyNotes(e.target.value)} placeholder="Add notes about this document..." rows={2} data-testid="input-verify-notes" />
            </div>
            <div>
              <Label htmlFor="reject-reason">Rejection Reason (if rejecting)</Label>
              <Textarea id="reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." rows={2} data-testid="input-reject-reason" />
            </div>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            <Button variant="outline" onClick={() => verifyDocDialogOpen && verifyDocMutation.mutate({ documentId: verifyDocDialogOpen, isVerified: false })} disabled={verifyDocMutation.isPending} data-testid="button-reject-doc">
              <XCircle className="h-4 w-4 mr-1" />Reject
            </Button>
            <Button onClick={() => verifyDocDialogOpen && verifyDocMutation.mutate({ documentId: verifyDocDialogOpen, isVerified: true })} disabled={verifyDocMutation.isPending} data-testid="button-approve-doc">
              <CheckCircle className="h-4 w-4 mr-1" />{verifyDocMutation.isPending ? "Saving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Course dialog */}
      <Dialog open={addCourseDialogOpen} onOpenChange={setAddCourseDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-add-course">
          <DialogHeader>
            <DialogTitle>Add Course to Application</DialogTitle>
            <DialogDescription>Search for a course or enter manually.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={addCourseMode === "search" ? "default" : "outline"}
                size="sm"
                onClick={() => setAddCourseMode("search")}
                data-testid="button-mode-search"
              >
                Search
              </Button>
              <Button
                variant={addCourseMode === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => setAddCourseMode("manual")}
                data-testid="button-mode-manual"
              >
                Manual Entry
              </Button>
            </div>

            {addCourseMode === "search" ? (
              <div className="space-y-3">
                <Select
                  value={addCourseInstitutionFilter || "__all__"}
                  onValueChange={(v) => setAddCourseInstitutionFilter(v === "__all__" ? "" : v)}
                >
                  <SelectTrigger data-testid="select-filter-institution"><SelectValue placeholder="Filter by institution (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All institutions</SelectItem>
                    {addCourseInstitutions.map((inst: any) => (
                      <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Search courses (type at least 2 chars)..."
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)}
                  data-testid="input-course-search"
                />
                {searchableCourses.length > 0 && (
                  <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                    {searchableCourses.map((c) => (
                      <div
                        key={c.id}
                        className={cn(
                          "p-2 cursor-pointer hover:bg-muted/50 text-sm",
                          selectedCourseToAdd === c.id && "bg-primary/10"
                        )}
                        onClick={() => setSelectedCourseToAdd(c.id)}
                        data-testid={`course-option-${c.id}`}
                      >
                        <p className="font-medium">{c.title}</p>
                        {c.university && <p className="text-xs text-muted-foreground">{c.university.name}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Input placeholder="Course name" value={manualCourseName} onChange={(e) => setManualCourseName(e.target.value)} data-testid="input-manual-course-name" />
                <Input placeholder="Institution name" value={manualInstitutionName} onChange={(e) => setManualInstitutionName(e.target.value)} data-testid="input-manual-institution-name" />
                <Input placeholder="Country (e.g. Australia)" value={manualCountry} onChange={(e) => setManualCountry(e.target.value)} data-testid="input-manual-country" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCourseDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (addCourseMode === "search" && selectedCourseToAdd) {
                  addCourseMutation.mutate({ courseId: selectedCourseToAdd });
                } else if (addCourseMode === "manual" && manualCourseName) {
                  addCourseMutation.mutate({
                    externalCourseName: manualCourseName,
                    externalInstitutionName: manualInstitutionName || undefined,
                    externalCountry: manualCountry || undefined,
                  });
                }
              }}
              disabled={
                addCourseMutation.isPending ||
                (addCourseMode === "search" ? !selectedCourseToAdd : !manualCourseName)
              }
              data-testid="button-confirm-add-course"
            >
              {addCourseMutation.isPending ? "Adding..." : "Add Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
