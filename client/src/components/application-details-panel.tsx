/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDocumentEvents } from "@/hooks/useDocumentEvents";
import { 
  User, GraduationCap, Building, Building2, FileText, History, MessageSquare,
  Edit, Trash2, Upload, Download, Eye, CheckCircle, XCircle, Clock,
  AlertTriangle, Plus, Calendar, UserCheck, Send, Layers, StickyNote
} from "lucide-react";
import { format } from "date-fns";
import { ApplicationInternalNotes } from "@/components/application-internal-notes";
import { StudentApplicationNotes } from "@/components/student-application-notes";
import { ApplicationStageSelector } from "@/components/application-stage-selector";
import { ApplicationStage, STAGE_CONFIG, ALL_STAGES } from "@/lib/stage-config";
import { supabase } from "@/lib/supabase";
import { DocumentPreviewModal } from "@/components/document-preview-modal";

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

interface ApplicationDetailsPanelProps {
  application: {
    id: string;
    studentId: string;
    courseId: string;
    applicationNumber?: string | null;
    currentStage: ApplicationStage;
    status: string;
    assignedConsultantId: string | null;
    branchId?: string | null;
    personalStatement?: string | null;
    additionalInfo?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  course: {
    id: string;
    title: string;
    level: string | null;
  };
  university: {
    id: string;
    name: string;
    country: string | null;
  };
  student: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  consultant: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email?: string | null;
  } | null;
  currentUserId?: string;
  onClose: () => void;
  onDeleted?: () => void;
  hideHero?: boolean;
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
}

interface PersonalDocument {
  id: string;
  type: string;
  title: string;
  fileName: string;
  fileUrl: string | null;
  filePath: string | null;
  fileSize: number | null;
  status: string;
  createdAt: string;
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

interface Consultant {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  userType?: string;
  profileImageUrl?: string | null;
}

export function ApplicationDetailsPanel({
  application,
  course,
  university,
  student,
  consultant,
  currentUserId,
  onClose,
  onDeleted,
  hideHero = false,
}: ApplicationDetailsPanelProps) {
  const { toast } = useToast();
  
  useDocumentEvents({ applicationId: application.id });
  
  // State for document preview modal
  const [previewDocument, setPreviewDocument] = useState<{
    url: string;
    name: string;
    mimeType?: string;
  } | null>(null);
  
  // Helper function to open document preview modal
  const openDocumentPreview = useCallback((url: string, fileName: string, mimeType?: string) => {
    setPreviewDocument({ url, name: fileName, mimeType });
  }, []);
  
  // Helper function to download documents with authentication
  const downloadDocument = useCallback(async (url: string, fileName?: string) => {
    try {
      if (!supabase) {
        toast({ title: "Error", description: "Authentication not available", variant: "destructive" });
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        toast({ title: "Error", description: "Please log in to download documents", variant: "destructive" });
        return;
      }
      
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({ title: "Error", description: "Failed to download document", variant: "destructive" });
    }
  }, [toast]);
  
  const [activeTab, setActiveTab] = useState("details");
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [requestDocDialogOpen, setRequestDocDialogOpen] = useState(false);
  const [uploadDocDialogOpen, setUploadDocDialogOpen] = useState(false);
  const [deleteDocConfirmOpen, setDeleteDocConfirmOpen] = useState<string | null>(null);
  const [verifyDocDialogOpen, setVerifyDocDialogOpen] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    assignedConsultantId: application.assignedConsultantId || "",
    personalStatement: application.personalStatement || "",
    additionalInfo: application.additionalInfo || "",
    status: application.status,
  });

  const [newDocRequest, setNewDocRequest] = useState({
    stage: application.currentStage,
    documentType: "",
    documentName: "",
    isRequired: true,
  });

  const [newDocUpload, setNewDocUpload] = useState({
    stage: application.currentStage,
    documentType: "",
    documentName: "",
    isRequired: false,
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null);

  // Map application stage → student's default folder name
  const STAGE_FOLDER_MAP: Record<string, string> = {
    "Offer-Letter": "Offer-Letter",
    "COE": "COE",
    "GS-Clearance": "GS/GTE",
    "Visa Lodgment": "Visa",
    "Collect Docs": "Academics",
    "Documents Verification": "Academics",
  };

  const [verifyNotes, setVerifyNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [slotsDialogOpen, setSlotsDialogOpen] = useState(false);
  const [newMaxSlots, setNewMaxSlots] = useState<number>(3);
  const [addCourseDialogOpen, setAddCourseDialogOpen] = useState(false);
  const [selectedCourseToAdd, setSelectedCourseToAdd] = useState("");
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [addCourseInstitutionFilter, setAddCourseInstitutionFilter] = useState("");
  const [addCourseMode, setAddCourseMode] = useState<"search" | "manual">("search");
  const [manualCourseNameToAdd, setManualCourseNameToAdd] = useState("");
  const [manualInstitutionNameToAdd, setManualInstitutionNameToAdd] = useState("");
  const [manualCountryToAdd, setManualCountryToAdd] = useState("Australia");

  const { data: consultantsData } = useQuery<{ consultants: Consultant[] }>({
    queryKey: ["/api/admin/consultants"],
    enabled: isEditing,
  });
  
  // Fetch application courses (multi-course support)
  const { data: coursesData, isLoading: coursesLoading } = useQuery<{ courses: ApplicationCourse[] }>({
    queryKey: ["/api/applications", application.id, "courses"],
  });
  const applicationCourses = coursesData?.courses || [];
  
  // Fetch assignable users (admins) for assignment dropdown  
  const { data: assignableUsersData } = useQuery<{ users: Consultant[] }>({
    queryKey: ["/api/admin/assignable-users"],
  });
  const assignableUsers = assignableUsersData?.users || [];

  // Fetch student application slots
  const { data: slotsData } = useQuery<{ maxSlots: number; usedSlots: number; availableSlots: number }>({
    queryKey: ["/api/admin/students", student.id, "application-slots"],
  });
  
  // Search for courses to add
  interface SearchCourse {
    id: string;
    title: string;
    level: string | null;
    duration: string | null;
    fees: string | null;
    university?: {
      id: string;
      name: string;
      logo?: string | null;
    };
  }
  const { data: courseSearchData, isLoading: courseSearchLoading } = useQuery<{ courses: SearchCourse[]; total: number }>({
    queryKey: ["/api/courses", { search: courseSearchQuery, limit: 20, universityId: addCourseInstitutionFilter || undefined }],
    enabled: addCourseDialogOpen && (courseSearchQuery.length >= 2 || !!addCourseInstitutionFilter),
  });
  const searchableCourses = courseSearchData?.courses || [];

  const { data: addCourseInstitutionsData } = useQuery<any[]>({
    queryKey: ["/api/institutions", { limit: 100, includePrivate: 'true' }],
    enabled: addCourseDialogOpen,
  });
  const addCourseInstitutions = Array.isArray(addCourseInstitutionsData) ? addCourseInstitutionsData : [];
  
  const _consultants = consultantsData?.consultants || [];

  const { data: documentsData } = useQuery<{ documents: StageDocument[] }>({
    queryKey: ["/api/admin/applications", application.id, "documents"],
  });

  const { data: historyData } = useQuery<{ history: StageHistoryRecord[] }>({
    queryKey: ["/api/admin/applications", application.id, "history"],
  });

  // Fetch student's personal library documents
  const { data: studentLibraryData } = useQuery<{ documents: PersonalDocument[] }>({
    queryKey: ["/api/admin/students", application.studentId, "documents"],
  });
  const studentLibrary = studentLibraryData?.documents || [];

  // Fetch student's document folders for the upload dialog
  const { data: studentFolders = [] } = useQuery<{ id: string; name: string; color: string }[]>({
    queryKey: ["/api/admin/applications", application.id, "student-folders"],
    enabled: uploadDocDialogOpen,
  });

  // Auto-suggest folder when dialog opens or folders load
  useEffect(() => {
    if (!uploadDocDialogOpen) return;
    const folderName = STAGE_FOLDER_MAP[newDocUpload.stage];
    const matched = folderName ? studentFolders.find(f => f.name === folderName) : undefined;
    setUploadFolderId(matched?.id ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadDocDialogOpen, studentFolders]);

  const documents = documentsData?.documents || [];
  const history = historyData?.history || [];

  const updateMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      return apiRequest("PATCH", `/api/admin/applications/${application.id}`, {
        ...data,
        assignedConsultantId: data.assignedConsultantId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      toast({ title: "Application Updated", description: "Changes saved successfully" });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/admin/applications/${application.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      toast({ title: "Application Deleted", description: "The application has been permanently deleted" });
      onDeleted?.();
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateSlotsMutation = useMutation({
    mutationFn: async (maxSlots: number) => {
      return apiRequest("PATCH", `/api/admin/students/${student.id}/application-slots`, { maxSlots });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students", student.id, "application-slots"] });
      toast({ title: "Slots Updated", description: "Student application slots have been updated" });
      setSlotsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const requestDocMutation = useMutation({
    mutationFn: async (data: typeof newDocRequest) => {
      return apiRequest("POST", `/api/admin/applications/${application.id}/request-document`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", application.id, "documents"] });
      toast({ title: "Document Requested", description: "Student has been notified to upload the document" });
      setRequestDocDialogOpen(false);
      setNewDocRequest({ stage: application.currentStage, documentType: "", documentName: "", isRequired: true });
    },
    onError: (error: any) => {
      toast({ title: "Request Failed", description: error.message, variant: "destructive" });
    },
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
      return apiRequest("POST", `/api/admin/applications/${application.id}/upload-document`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", application.id, "documents"] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/students/${student.id}/documents`] });
      toast({ title: "Document Uploaded", description: "Document has been added successfully" });
      setUploadDocDialogOpen(false);
      setNewDocUpload({ stage: application.currentStage, documentType: "", documentName: "", isRequired: false });
      setUploadFile(null);
      setUploadFolderId(null);
    },
    onError: (error: any) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return apiRequest("DELETE", `/api/admin/applications/${application.id}/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", application.id, "documents"] });
      toast({ title: "Document Deleted", description: "Document has been removed" });
      setDeleteDocConfirmOpen(null);
    },
    onError: (error: any) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });

  // Mutation to attach document from student library
  const attachFromLibraryMutation = useMutation({
    mutationFn: async (data: { documentId: string; stage: ApplicationStage }) => {
      return apiRequest("POST", `/api/admin/applications/${application.id}/attach-document`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", application.id, "documents"] });
      toast({ title: "Document Attached", description: "Document from student's library has been attached" });
    },
    onError: (error: any) => {
      toast({ title: "Attach Failed", description: error.message, variant: "destructive" });
    },
  });

  const verifyDocMutation = useMutation({
    mutationFn: async ({ documentId, isVerified }: { documentId: string; isVerified: boolean }) => {
      return apiRequest("POST", `/api/admin/applications/verify-document`, {
        documentId,
        isVerified,
        verificationNotes: verifyNotes,
        rejectionReason: rejectReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", application.id, "documents"] });
      toast({ title: "Document Status Updated" });
      setVerifyDocDialogOpen(null);
      setVerifyNotes("");
      setRejectReason("");
    },
    onError: (error: any) => {
      toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
    },
  });
  
  // Mutation to add a course to the application
  const addCourseMutation = useMutation({
    mutationFn: async (payload: { courseId?: string; externalCourseName?: string; externalInstitutionName?: string }) => {
      return apiRequest("POST", `/api/applications/${application.id}/courses`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", application.id, "courses"] });
      toast({ title: "Course Added", description: "Course has been added to the application" });
      setAddCourseDialogOpen(false);
      setSelectedCourseToAdd("");
      setManualCourseNameToAdd("");
      setManualInstitutionNameToAdd("");
      setAddCourseMode("search");
    },
    onError: (error: any) => {
      toast({ title: "Failed to Add Course", description: error.message, variant: "destructive" });
    },
  });
  
  // Mutation to remove a course from the application
  const removeCourseMutation = useMutation({
    mutationFn: async (entryId: string) => {
      return apiRequest("DELETE", `/api/applications/${application.id}/course-entries/${entryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", application.id, "courses"] });
      toast({ title: "Course Removed", description: "Course has been removed from the application" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to Remove Course", description: error.message, variant: "destructive" });
    },
  });
  
  // Mutation to assign a consultant to the application
  const assignConsultantMutation = useMutation({
    mutationFn: async (consultantId: string | null) => {
      return apiRequest("PATCH", `/api/applications/${application.id}/assign`, { assignedConsultantId: consultantId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      toast({ title: "Consultant Assigned", description: "Consultant assignment updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Assignment Failed", description: error.message, variant: "destructive" });
    },
  });

  const documentsByStage = documents.reduce((acc, doc) => {
    if (!acc[doc.stage]) acc[doc.stage] = [];
    acc[doc.stage].push(doc);
    return acc;
  }, {} as Record<ApplicationStage, StageDocument[]>);

  const getDocumentStatus = (doc: StageDocument) => {
    if (!doc.documentUrl) {
      return { label: "Pending", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" };
    }
    if (doc.isVerified) {
      return { label: "Verified", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
    }
    if (doc.rejectionReason) {
      return { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" };
    }
    return { label: "Uploaded", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" };
  };

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'reviewing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'withdrawn': return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';
      case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    }
  };
  const formatStatus = (s: string) =>
    s === 'accepted' ? 'Accepted' : s === 'reviewing' ? 'Under Review' : s === 'rejected' ? 'Rejected'
    : s === 'withdrawn' ? 'Withdrawn' : s === 'pending' ? 'Pending'
    : s.charAt(0).toUpperCase() + s.slice(1);

  const tabTriggerClass = "rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 py-2.5 text-sm gap-1.5 shrink-0";

  return (
    <div>
      <div className="flex flex-col xl:flex-row gap-5 items-start">

        {/* ── Left column: Hero + Tabs ─────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">

      {/* ── Hero Banner ─────────────────────────────────────── */}
      {!hideHero && (
      <Card className="overflow-hidden" data-testid="card-application-hero">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-4">
            <Avatar className="h-14 w-14 shrink-0 ring-2 ring-background ring-offset-2">
              <AvatarImage src={(student as any).profilePicture || undefined} alt={`${student.firstName} ${student.lastName}`} />
              <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
                {(student.firstName?.[0] ?? '') + (student.lastName?.[0] ?? '')}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                {application.applicationNumber && (
                  <Badge variant="outline" className="font-mono text-xs no-default-active-elevate" data-testid="badge-application-number">
                    {application.applicationNumber}
                  </Badge>
                )}
                <Badge className={`text-xs no-default-active-elevate ${statusBadgeClass(application.status)}`} data-testid="badge-status-hero">
                  {formatStatus(application.status)}
                </Badge>
              </div>
              <h2 className="text-xl font-bold leading-tight" data-testid="text-student-name-hero">
                {student.firstName} {student.lastName}
              </h2>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                {course.title}
                {course.level && <span className="text-xs text-muted-foreground/70">· {course.level}</span>}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Building2 className="h-3 w-3 shrink-0" />
                {university.name}
                {university.country && <span className="opacity-70">· {university.country}</span>}
              </p>
            </div>

            <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
              {!isEditing && (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)} data-testid="button-edit-application">
                    <Edit className="h-3.5 w-3.5 mr-1" />Edit
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(true)} data-testid="button-delete-application">
                    <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                  </Button>
                </div>
              )}
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 shrink-0" />
                Applied {format(new Date(application.createdAt), 'd MMM yyyy')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full border-b bg-transparent h-auto p-0 rounded-none justify-start overflow-x-auto">
          <TabsTrigger value="details" className={tabTriggerClass} data-testid="tab-details">
            <FileText className="h-3.5 w-3.5" />Details
          </TabsTrigger>
          <TabsTrigger value="documents" className={tabTriggerClass} data-testid="tab-documents">
            <Upload className="h-3.5 w-3.5" />Documents
            {documents.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px] no-default-active-elevate">{documents.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages" className={tabTriggerClass} data-testid="tab-messages">
            <MessageSquare className="h-3.5 w-3.5" />Messages
          </TabsTrigger>
          <TabsTrigger value="history" className={tabTriggerClass} data-testid="tab-history">
            <History className="h-3.5 w-3.5" />History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-5 space-y-5">
          {/* Stage Selector */}
          <div className="flex items-center gap-3">
            <ApplicationStageSelector
              applicationId={application.id}
              currentStage={application.currentStage}
            />
          </div>

          {/* 3-column grid: Courses (wide) + Assignment (narrow) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Courses & Institution — spans 2 cols */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  Courses &amp; Institution ({applicationCourses.length || 1})
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddCourseDialogOpen(true)}
                  data-testid="button-add-course"
                >
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {coursesLoading ? (
                  <p className="text-xs text-muted-foreground">Loading courses...</p>
                ) : applicationCourses.length > 0 ? (
                  applicationCourses.map((appCourse, index) => {
                    const isExternal = !appCourse.courseId;
                    const displayName = isExternal ? appCourse.externalCourseName : appCourse.course?.title;
                    const displayInstitution = isExternal ? appCourse.externalInstitutionName : appCourse.university?.name;
                    return (
                    <div key={appCourse.id} className="flex items-start justify-between gap-3 p-3 rounded-md border" data-testid={`course-item-${index}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium">{displayName ?? "(Untitled)"}</p>
                          {appCourse.isPrimary && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 no-default-active-elevate">Primary</Badge>
                          )}
                          {isExternal && (
                            <Badge variant="outline" className="text-[10px] px-1.5 no-default-active-elevate">External</Badge>
                          )}
                        </div>
                        {displayInstitution && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Building className="h-3 w-3 shrink-0" />{displayInstitution}
                          </p>
                        )}
                        {(() => {
                          const country = isExternal ? appCourse.externalCountry : appCourse.university?.country;
                          const level = !isExternal ? appCourse.course?.level : null;
                          return (
                            <>
                              {country && (
                                <p className="text-xs text-muted-foreground/70 mt-0.5">{country}</p>
                              )}
                              {level && (
                                <p className="text-xs text-muted-foreground/70 mt-0.5">{level}</p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      {applicationCourses.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCourseMutation.mutate(appCourse.id)}
                          disabled={removeCourseMutation.isPending}
                          data-testid={`button-remove-course-${index}`}
                        >
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                    );
                  })
                ) : (
                  <div className="p-3 rounded-md border">
                    <p className="text-sm font-medium">{course.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Building className="h-3 w-3 shrink-0" />{university.name}
                    </p>
                    {course.level && <p className="text-xs text-muted-foreground/70 mt-0.5">{course.level}</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assignment — narrow */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Consultant</p>
                  <Select
                    value={application.assignedConsultantId || "_unassigned"}
                    onValueChange={(v) => {
                      assignConsultantMutation.mutate(v === "_unassigned" ? null : v);
                    }}
                    disabled={assignConsultantMutation.isPending}
                  >
                    <SelectTrigger data-testid="select-assign-consultant">
                      <SelectValue placeholder="Assign consultant" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableUsers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5 shrink-0">
                              <AvatarImage src={c.profileImageUrl || undefined} alt={`${c.firstName} ${c.lastName}`} />
                              <AvatarFallback className="text-[9px]">
                                {(c.firstName?.[0] ?? '')}{(c.lastName?.[0] ?? '')}
                              </AvatarFallback>
                            </Avatar>
                            <span>{c.firstName} {c.lastName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {consultant?.email && (
                    <p className="text-xs text-muted-foreground mt-1.5">{consultant.email}</p>
                  )}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Application Slots</p>
                    <p className="text-sm font-semibold mt-0.5">
                      {slotsData?.usedSlots || 0} / {slotsData?.maxSlots || 3} <span className="font-normal text-muted-foreground">used</span>
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewMaxSlots(slotsData?.maxSlots || 3);
                      setSlotsDialogOpen(true);
                    }}
                    data-testid="button-manage-slots"
                  >
                    <Layers className="h-3 w-3 mr-1" />Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {(isEditing || application.personalStatement || application.additionalInfo) && (
            <>
              <Separator />
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Personal Statement</Label>
                  {isEditing ? (
                    <Textarea
                      value={editForm.personalStatement}
                      onChange={(e) => setEditForm({ ...editForm, personalStatement: e.target.value })}
                      placeholder="Student's personal statement..."
                      className="mt-1"
                      rows={4}
                      data-testid="input-personal-statement"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      {application.personalStatement || "No personal statement provided"}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Additional Information</Label>
                  {isEditing ? (
                    <Textarea
                      value={editForm.additionalInfo}
                      onChange={(e) => setEditForm({ ...editForm, additionalInfo: e.target.value })}
                      placeholder="Any additional information..."
                      className="mt-1"
                      rows={3}
                      data-testid="input-additional-info"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      {application.additionalInfo || "No additional information"}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {isEditing && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button onClick={() => updateMutation.mutate(editForm)} disabled={updateMutation.isPending} data-testid="button-save-edit">
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}

          <Separator />
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4" data-testid="section-application-meta">
            <div>
              <dt className="text-xs text-muted-foreground mb-1">Status</dt>
              <dd>
                <Badge className={`text-xs no-default-active-elevate ${statusBadgeClass(application.status)}`} data-testid="badge-application-status">
                  {formatStatus(application.status)}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-1">Applied</dt>
              <dd className="text-sm font-medium">{format(new Date(application.createdAt), 'd MMM yyyy')}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground mb-1">Last Updated</dt>
              <dd className="text-sm font-medium">{format(new Date(application.updatedAt), 'd MMM yyyy')}</dd>
            </div>
          </dl>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Application Documents</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setRequestDocDialogOpen(true)} data-testid="button-request-document">
                <Send className="h-4 w-4 mr-1" />
                Request Document
              </Button>
              <Button size="sm" onClick={() => setUploadDocDialogOpen(true)} data-testid="button-upload-document">
                <Upload className="h-4 w-4 mr-1" />
                Upload Document
              </Button>
            </div>
          </div>

          {/* Student Library Section */}
          {studentLibrary.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Student's Personal Library</h4>
                <Badge variant="secondary" className="text-xs">{studentLibrary.length} documents</Badge>
              </div>
              <div className="grid gap-2 p-3 rounded-md border bg-muted/30">
                {studentLibrary.slice(0, 5).map((doc) => {
                  const isVerified = doc.status === "verified";
                  const isPending = doc.status === "pending";
                  return (
                    <div 
                      key={doc.id} 
                      className="flex items-center justify-between p-2 rounded-md bg-card border"
                      data-testid={`student-lib-doc-${doc.id}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{doc.type}</p>
                        </div>
                        <Badge className={`text-xs ${isVerified ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : isPending ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {isVerified ? 'Verified' : isPending ? 'Pending' : 'Rejected'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {doc.filePath && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => openDocumentPreview(`/api/admin/documents/${doc.id}/download`, doc.fileName || doc.title)}
                            data-testid={`button-view-lib-doc-${doc.id}`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => attachFromLibraryMutation.mutate({
                            documentId: doc.id,
                            stage: application.currentStage
                          })}
                          disabled={attachFromLibraryMutation.isPending}
                          data-testid={`button-attach-lib-doc-${doc.id}`}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Attach
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {studentLibrary.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    + {studentLibrary.length - 5} more documents in library
                  </p>
                )}
              </div>
            </div>
          )}

          <ScrollArea className="h-[300px]">
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <FileText className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-sm">No documents yet</p>
                <p className="text-xs">Request or upload documents to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ALL_STAGES.filter(stage => documentsByStage[stage]?.length > 0).map((stage) => (
                  <div key={stage}>
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className={`w-2 h-2 rounded-full ${STAGE_CONFIG[stage].dotColor}`}
                      />
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                        {STAGE_CONFIG[stage].displayName}
                      </h4>
                      <Badge variant="secondary" className="h-4 px-1 text-xs">
                        {documentsByStage[stage].length}
                      </Badge>
                    </div>
                    <div className="space-y-2 ml-4">
                      {documentsByStage[stage].map((doc) => {
                        const status = getDocumentStatus(doc);
                        return (
                          <div 
                            key={doc.id} 
                            className="flex items-center justify-between p-2 rounded-md border bg-card"
                            data-testid={`document-item-${doc.id}`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{doc.documentName}</p>
                                <p className="text-xs text-muted-foreground">{doc.documentType}</p>
                              </div>
                              <Badge className={`text-xs ${status.color}`}>
                                {status.label}
                              </Badge>
                              {doc.uploadedByRole === 'admin' && (
                                <Badge variant="secondary" className="text-xs">Consultant upload</Badge>
                              )}
                              {doc.isRequired && (
                                <Badge variant="outline" className="text-xs">Required</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {doc.documentUrl && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => openDocumentPreview(`/api/admin/applications/${application.id}/documents/${doc.id}/download`, doc.documentName || 'document')}
                                    data-testid={`button-view-doc-${doc.id}`}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => downloadDocument(`/api/admin/applications/${application.id}/documents/${doc.id}/download`, doc.documentName || 'document')}
                                    data-testid={`button-download-doc-${doc.id}`}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                  {!doc.isVerified && !doc.rejectionReason && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7"
                                      onClick={() => setVerifyDocDialogOpen(doc.id)}
                                      data-testid={`button-verify-doc-${doc.id}`}
                                    >
                                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                    </Button>
                                  )}
                                </>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteDocConfirmOpen(doc.id)}
                                data-testid={`button-delete-doc-${doc.id}`}
                              >
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
          </ScrollArea>
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <StudentApplicationNotes
            applicationId={application.id}
            studentName={`${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student'}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <ScrollArea className="h-[400px]">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
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
                      <div 
                        className={`w-3 h-3 rounded-full ${STAGE_CONFIG[record.history.toStage]?.dotColor || 'bg-gray-500'}`}
                      />
                      {index < history.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {record.history.fromStage && (
                          <>
                            <Badge variant="outline" className="text-xs">
                              {STAGE_CONFIG[record.history.fromStage]?.displayName || record.history.fromStage}
                            </Badge>
                            <span className="text-muted-foreground text-xs">→</span>
                          </>
                        )}
                        <Badge 
                          className={`text-xs ${STAGE_CONFIG[record.history.toStage]?.badgeClass || 'bg-gray-100 text-gray-800'}`}
                        >
                          {STAGE_CONFIG[record.history.toStage]?.displayName || record.history.toStage}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
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
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          "{record.history.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

        </div>{/* end left column */}

        {/* ── Right column: Notes panel ────────────── */}
        <div className="w-full xl:w-80 2xl:w-96 xl:sticky xl:top-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-muted-foreground" />
                Internal Notes
              </CardTitle>
              <CardDescription className="text-xs">
                Only visible to team members. Use the Messages tab to communicate with the student.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ApplicationInternalNotes
                applicationId={application.id}
                currentUserId={currentUserId}
                branchId={application.branchId}
              />
            </CardContent>
          </Card>
        </div>

      </div>{/* end flex row */}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent data-testid="dialog-confirm-delete-application">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Application
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this application for <strong>{student.firstName} {student.lastName}</strong> applying to <strong>{course.title}</strong>. This action cannot be undone.
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

      <Dialog open={slotsDialogOpen} onOpenChange={setSlotsDialogOpen}>
        <DialogContent data-testid="dialog-manage-slots">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Manage Application Slots
            </DialogTitle>
            <DialogDescription>
              Increase application slots for {student.firstName} {student.lastName}. Default is 3 slots.
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
              <p className="text-xs text-muted-foreground">
                Minimum: {Math.max(1, slotsData?.usedSlots || 1)} (current usage), Maximum: 20
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlotsDialogOpen(false)} data-testid="button-cancel-slots">
              Cancel
            </Button>
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

      <Dialog open={requestDocDialogOpen} onOpenChange={setRequestDocDialogOpen}>
        <DialogContent data-testid="dialog-request-document">
          <DialogHeader>
            <DialogTitle>Request Document from Student</DialogTitle>
            <DialogDescription>
              The student will be notified to upload the requested document.
            </DialogDescription>
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
                    <SelectItem key={stage} value={stage}>
                      {STAGE_CONFIG[stage].displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="req-type">Document Type</Label>
              <Input
                id="req-type"
                value={newDocRequest.documentType}
                onChange={(e) => setNewDocRequest({ ...newDocRequest, documentType: e.target.value })}
                placeholder="e.g., passport, transcript"
                data-testid="input-request-doc-type"
              />
            </div>
            <div>
              <Label htmlFor="req-name">Document Name</Label>
              <Input
                id="req-name"
                value={newDocRequest.documentName}
                onChange={(e) => setNewDocRequest({ ...newDocRequest, documentName: e.target.value })}
                placeholder="e.g., Passport Copy"
                data-testid="input-request-doc-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDocDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => requestDocMutation.mutate(newDocRequest)}
              disabled={!newDocRequest.documentType || !newDocRequest.documentName || requestDocMutation.isPending}
              data-testid="button-send-request"
            >
              <Send className="h-4 w-4 mr-1" />
              {requestDocMutation.isPending ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDocDialogOpen} onOpenChange={setUploadDocDialogOpen}>
        <DialogContent data-testid="dialog-upload-document">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document to this application.
            </DialogDescription>
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
                <SelectTrigger id="upload-stage" data-testid="select-upload-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {STAGE_CONFIG[stage].displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="upload-folder">Student Folder</Label>
              <Select
                value={uploadFolderId ?? "__none__"}
                onValueChange={(v) => setUploadFolderId(v === "__none__" ? null : v)}
              >
                <SelectTrigger id="upload-folder" data-testid="select-upload-folder">
                  <SelectValue placeholder="Unfiled (no folder)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unfiled (no folder)</SelectItem>
                  {studentFolders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id} data-testid={`folder-option-${folder.id}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: folder.color }} />
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Auto-suggested from stage. You can change this.</p>
            </div>
            <div>
              <Label htmlFor="upload-type">Document Type</Label>
              <Input
                id="upload-type"
                value={newDocUpload.documentType}
                onChange={(e) => setNewDocUpload({ ...newDocUpload, documentType: e.target.value })}
                placeholder="e.g., offer_letter, coe"
                data-testid="input-upload-doc-type"
              />
            </div>
            <div>
              <Label htmlFor="upload-name">Document Name</Label>
              <Input
                id="upload-name"
                value={newDocUpload.documentName}
                onChange={(e) => setNewDocUpload({ ...newDocUpload, documentName: e.target.value })}
                placeholder="e.g., Offer Letter - John Smith"
                data-testid="input-upload-doc-name"
              />
            </div>
            <div>
              <Label htmlFor="upload-file">File</Label>
              <Input
                id="upload-file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setUploadFile(file);
                  if (file && !newDocUpload.documentName) {
                    setNewDocUpload((prev) => ({ ...prev, documentName: file.name }));
                  }
                }}
                data-testid="input-upload-file"
              />
              {uploadFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  {uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDocDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => uploadDocMutation.mutate()}
              disabled={!newDocUpload.documentType || !newDocUpload.documentName || !uploadFile || uploadDocMutation.isPending}
              data-testid="button-confirm-upload"
            >
              <Upload className="h-4 w-4 mr-1" />
              {uploadDocMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDocConfirmOpen} onOpenChange={() => setDeleteDocConfirmOpen(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete-document">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteDocConfirmOpen && deleteDocMutation.mutate(deleteDocConfirmOpen)}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteDocMutation.isPending}
            >
              {deleteDocMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!verifyDocDialogOpen} onOpenChange={() => setVerifyDocDialogOpen(null)}>
        <DialogContent data-testid="dialog-verify-document">
          <DialogHeader>
            <DialogTitle>Verify Document</DialogTitle>
            <DialogDescription>
              Approve or reject this document with optional notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="verify-notes">Verification Notes (optional)</Label>
              <Textarea
                id="verify-notes"
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="Add notes about this document..."
                rows={2}
                data-testid="input-verify-notes"
              />
            </div>
            <div>
              <Label htmlFor="reject-reason">Rejection Reason (if rejecting)</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={2}
                data-testid="input-reject-reason"
              />
            </div>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            <Button 
              variant="destructive"
              onClick={() => verifyDocDialogOpen && verifyDocMutation.mutate({ documentId: verifyDocDialogOpen, isVerified: false })}
              disabled={verifyDocMutation.isPending}
              data-testid="button-reject-document"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setVerifyDocDialogOpen(null)}>Cancel</Button>
              <Button 
                onClick={() => verifyDocDialogOpen && verifyDocMutation.mutate({ documentId: verifyDocDialogOpen, isVerified: true })}
                disabled={verifyDocMutation.isPending}
                data-testid="button-approve-document"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Course Dialog */}
      <Dialog open={addCourseDialogOpen} onOpenChange={(open) => {
        setAddCourseDialogOpen(open);
        if (!open) {
          setCourseSearchQuery("");
          setSelectedCourseToAdd("");
          setAddCourseInstitutionFilter("");
          setAddCourseMode("search");
          setManualCourseNameToAdd("");
          setManualInstitutionNameToAdd("");
          setManualCountryToAdd("Australia");
        }
      }}>
        <DialogContent data-testid="dialog-add-course" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Course to Application</DialogTitle>
            <DialogDescription>
              Search for a published platform course, or enter one manually.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-2">
            <Tabs value={addCourseMode} onValueChange={(v) => { setAddCourseMode(v as "search" | "manual"); setSelectedCourseToAdd(""); }} className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="search">Search Courses</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {addCourseMode === "search" && <div className="space-y-4 py-2 px-6">

            {/* Institution filter */}
            <div className="space-y-1.5">
              <Label>Filter by Institution</Label>
              <Select
                value={addCourseInstitutionFilter}
                onValueChange={(v) => {
                  setAddCourseInstitutionFilter(v === "_all" ? "" : v);
                  setSelectedCourseToAdd("");
                }}
              >
                <SelectTrigger data-testid="select-add-course-institution-filter">
                  <SelectValue placeholder="All Institutions">
                    {addCourseInstitutionFilter ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={addCourseInstitutions.find((i: any) => i.id === addCourseInstitutionFilter)?.logo || undefined} />
                          <AvatarFallback className="text-[9px] bg-muted">
                            {addCourseInstitutions.find((i: any) => i.id === addCourseInstitutionFilter)?.name?.slice(0,2).toUpperCase() ?? "IN"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{addCourseInstitutions.find((i: any) => i.id === addCourseInstitutionFilter)?.name}</span>
                      </div>
                    ) : "All Institutions"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Institutions</SelectItem>
                  {addCourseInstitutions.map((inst: any) => (
                    <SelectItem key={inst.id} value={inst.id} data-testid={`add-course-inst-${inst.id}`}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5 shrink-0">
                          <AvatarImage src={inst.logo || undefined} />
                          <AvatarFallback className="text-[9px] bg-muted">{inst.name?.slice(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{inst.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="course-search">Search Courses</Label>
              <Input
                id="course-search"
                value={courseSearchQuery}
                onChange={(e) => setCourseSearchQuery(e.target.value)}
                placeholder="Type at least 2 characters to search..."
                data-testid="input-course-search"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Search by name or filter by institution to find published courses.
              </p>
            </div>
            
            {/* Search Results */}
            {(courseSearchQuery.length >= 2 || !!addCourseInstitutionFilter) && (
              <div className="border rounded-md max-h-60 overflow-y-auto">
                {courseSearchLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Searching...
                  </div>
                ) : searchableCourses.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No courses found. Try a different search term.
                  </div>
                ) : (
                  <div className="divide-y">
                    {searchableCourses.map((course) => (
                      <div
                        key={course.id}
                        className={`p-3 cursor-pointer hover-elevate flex items-start gap-3 ${selectedCourseToAdd === course.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''}`}
                        onClick={() => setSelectedCourseToAdd(course.id)}
                        data-testid={`course-option-${course.id}`}
                      >
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={course.university?.logo || undefined} alt={course.university?.name || "Institution"} />
                          <AvatarFallback className="text-xs">
                            {course.university?.name?.slice(0, 2).toUpperCase() || "IN"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{course.title}</div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                            {course.university?.name && (
                              <span className="truncate max-w-[150px]">{course.university.name}</span>
                            )}
                            {course.level && (
                              <Badge variant="outline" className="text-xs py-0">{course.level}</Badge>
                            )}
                            {course.duration && (
                              <span>{course.duration}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Selected Course Preview */}
            {selectedCourseToAdd && (
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="text-xs text-muted-foreground mb-1">Selected Course:</div>
                <div className="font-medium text-sm">
                  {searchableCourses.find(c => c.id === selectedCourseToAdd)?.title || selectedCourseToAdd}
                </div>
              </div>
            )}
          </div>}
          {addCourseMode === "manual" && <div className="space-y-4 py-2 px-6">
            <p className="text-xs text-muted-foreground">
              Enter the institution and course name for a course not in the platform catalog.
            </p>
            <div className="space-y-1.5">
              <Label>Institution Name *</Label>
              <Input
                placeholder="e.g. University of Melbourne"
                value={manualInstitutionNameToAdd}
                onChange={(e) => setManualInstitutionNameToAdd(e.target.value)}
                data-testid="input-manual-institution-add"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Course Name *</Label>
              <Input
                placeholder="e.g. Master of Data Science"
                value={manualCourseNameToAdd}
                onChange={(e) => setManualCourseNameToAdd(e.target.value)}
                data-testid="input-manual-course-add"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Destination Country</Label>
              <Select value={manualCountryToAdd} onValueChange={setManualCountryToAdd}>
                <SelectTrigger data-testid="select-manual-country-add">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Australia">Australia</SelectItem>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="USA">United States</SelectItem>
                  <SelectItem value="New Zealand">New Zealand</SelectItem>
                  <SelectItem value="Ireland">Ireland</SelectItem>
                  <SelectItem value="Germany">Germany</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddCourseDialogOpen(false); setAddCourseMode("search"); setManualCourseNameToAdd(""); setManualInstitutionNameToAdd(""); setManualCountryToAdd("Australia"); }}>Cancel</Button>
            <Button 
              onClick={() => {
                if (addCourseMode === "search") {
                  addCourseMutation.mutate({ courseId: selectedCourseToAdd });
                } else {
                  addCourseMutation.mutate({ externalCourseName: manualCourseNameToAdd, externalInstitutionName: manualInstitutionNameToAdd, externalCountry: manualCountryToAdd || undefined } as any);
                }
              }}
              disabled={addCourseMutation.isPending || (addCourseMode === "search" ? !selectedCourseToAdd : !manualCourseNameToAdd.trim() || !manualInstitutionNameToAdd.trim())}
              data-testid="button-confirm-add-course"
            >
              <Plus className="h-4 w-4 mr-1" />
              {addCourseMutation.isPending ? "Adding..." : "Add Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        open={!!previewDocument}
        onOpenChange={(open) => !open && setPreviewDocument(null)}
        documentUrl={previewDocument?.url || ""}
        documentName={previewDocument?.name || "Document"}
        mimeType={previewDocument?.mimeType}
      />
    </div>
  );
}
