/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  AlertTriangle, Plus, Calendar, UserCheck, Send, Layers, StickyNote, ExternalLink
} from "lucide-react";
import { Link } from "wouter";
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

// ─── Exported section components ────────────────────────────────────────────

/**
 * Self-contained stage history list. Fetches its own data.
 * Import and use this in any admin tab that needs application history.
 */
export function ApplicationHistory({ applicationId }: { applicationId: string }) {
  const { data } = useQuery<{ history: StageHistoryRecord[] }>({
    queryKey: ["/api/admin/applications", applicationId, "history"],
  });
  const history = data?.history ?? [];

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
        <History className="h-12 w-12 mb-2 opacity-20" />
        <p className="text-sm">No stage history yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3">
        {history.map((record, index) => (
          <div
            key={record.history.id}
            className="flex gap-3 p-3 rounded-md border bg-card"
            data-testid={`history-item-${record.history.id}`}
          >
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full ${STAGE_CONFIG[record.history.toStage]?.dotColor || "bg-gray-500"}`} />
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
                <Badge className={`text-xs no-default-active-elevate ${STAGE_CONFIG[record.history.toStage]?.badgeClass || "bg-gray-100 text-gray-800"}`}>
                  {STAGE_CONFIG[record.history.toStage]?.displayName || record.history.toStage}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{new Date(record.history.createdAt).toLocaleString()}</span>
                {record.changedByUser && (
                  <><span>•</span><User className="h-3 w-3" /><span>{record.changedByUser.firstName} {record.changedByUser.lastName}</span></>
                )}
                {record.history.durationInStage !== null && (
                  <><span>•</span><Clock className="h-3 w-3" /><span>{record.history.durationInStage}h in previous stage</span></>
                )}
              </div>
              {record.history.notes && (
                <p className="text-xs text-muted-foreground mt-1 italic">"{record.history.notes}"</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

/**
 * Self-contained consultant notes section: student-facing thread + internal team notes.
 * Import and use in any admin tab that needs the dual-thread communication view.
 */
export function ApplicationConsultantNotes({
  applicationId,
  studentName,
  currentUserId,
  branchId,
}: {
  applicationId: string;
  studentName: string;
  currentUserId?: string;
  branchId?: string | null;
}) {
  return (
    <div className="space-y-4">
      <StudentApplicationNotes applicationId={applicationId} studentName={studentName} />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-muted-foreground" />Internal Notes
          </CardTitle>
          <CardDescription className="text-xs">Only visible to team members.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ApplicationInternalNotes
            applicationId={applicationId}
            currentUserId={currentUserId}
            branchId={branchId}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Self-contained stage document manager: fetches docs, supports request/upload/verify actions.
 * Import and use in the Process or Documents tab of admin detail.
 */
export function ApplicationStageDocuments({
  applicationId,
  currentStage,
  studentId,
}: {
  applicationId: string;
  currentStage: ApplicationStage;
  studentId: string;
}) {
  const { toast } = useToast();
  const [requestDocDialogOpen, setRequestDocDialogOpen] = useState(false);
  const [uploadDocDialogOpen, setUploadDocDialogOpen] = useState(false);
  const [verifyDocDialogOpen, setVerifyDocDialogOpen] = useState<string | null>(null);
  const [deleteDocConfirmOpen, setDeleteDocConfirmOpen] = useState<string | null>(null);
  const [verifyNotes, setVerifyNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null);
  const [newDocRequest, setNewDocRequest] = useState({ stage: currentStage, documentType: "", documentName: "", isRequired: true });
  const [newDocUpload, setNewDocUpload] = useState({ stage: currentStage, documentType: "", documentName: "", isRequired: false });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const { data: documentsData } = useQuery<{ documents: StageDocument[] }>({
    queryKey: ["/api/admin/applications", applicationId, "documents"],
  });
  const documents = documentsData?.documents ?? [];
  const stageDocs = documents.filter(d => d.stage === currentStage);

  const docQueryKey = ["/api/admin/applications", applicationId, "documents"];

  const getDocStatus = (doc: StageDocument) => {
    if (!doc.documentUrl) return { label: "Pending", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" };
    if (doc.isVerified) return { label: "Verified", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
    if (doc.rejectionReason) return { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" };
    return { label: "Uploaded", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" };
  };

  const requestDocMutation = useMutation({
    mutationFn: async (data: typeof newDocRequest) =>
      apiRequest("POST", `/api/admin/applications/${applicationId}/request-document`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: docQueryKey });
      toast({ title: "Document Requested" });
      setRequestDocDialogOpen(false);
      setNewDocRequest({ stage: currentStage, documentType: "", documentName: "", isRequired: true });
    },
    onError: (e: any) => toast({ title: "Request Failed", description: e.message, variant: "destructive" }),
  });

  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error("No file selected");
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("stage", newDocUpload.stage);
      fd.append("documentType", newDocUpload.documentType);
      fd.append("documentName", newDocUpload.documentName);
      fd.append("isRequired", String(newDocUpload.isRequired));
      return apiRequest("POST", `/api/admin/applications/${applicationId}/upload-document`, fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: docQueryKey });
      toast({ title: "Document Uploaded" });
      setUploadDocDialogOpen(false);
      setNewDocUpload({ stage: currentStage, documentType: "", documentName: "", isRequired: false });
      setUploadFile(null);
    },
    onError: (e: any) => toast({ title: "Upload Failed", description: e.message, variant: "destructive" }),
  });

  const verifyDocMutation = useMutation({
    mutationFn: async ({ docId, reject }: { docId: string; reject?: boolean }) =>
      apiRequest("POST", `/api/admin/applications/${applicationId}/documents/${docId}/${reject ? "reject" : "verify"}`, reject ? { rejectionReason: rejectReason } : { notes: verifyNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: docQueryKey });
      toast({ title: "Document Updated" });
      setVerifyDocDialogOpen(null);
      setVerifyNotes("");
      setRejectReason("");
    },
    onError: (e: any) => toast({ title: "Action Failed", description: e.message, variant: "destructive" }),
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) =>
      apiRequest("DELETE", `/api/admin/applications/${applicationId}/documents/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: docQueryKey });
      toast({ title: "Document Deleted" });
      setDeleteDocConfirmOpen(null);
    },
    onError: (e: any) => toast({ title: "Delete Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="no-default-active-elevate">
            {STAGE_CONFIG[currentStage]?.displayName ?? currentStage}
          </Badge>
          <span className="text-xs text-muted-foreground">{stageDocs.length} document(s)</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setRequestDocDialogOpen(true)} data-testid="button-request-doc">
            <Send className="h-4 w-4 mr-1.5" />Request
          </Button>
          <Button variant="outline" size="sm" onClick={() => setUploadDocDialogOpen(true)} data-testid="button-upload-doc">
            <Upload className="h-4 w-4 mr-1.5" />Upload
          </Button>
        </div>
      </div>

      {stageDocs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No documents for this stage yet.</p>
      ) : (
        <div className="space-y-2">
          {stageDocs.map(doc => {
            const status = getDocStatus(doc);
            return (
              <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-md border bg-muted/30" data-testid={`stage-doc-${doc.id}`}>
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
                      <Button variant="ghost" size="icon" onClick={() => setPreviewDoc({ url: `/api/admin/applications/${applicationId}/documents/${doc.id}/download`, name: doc.documentName })} data-testid={`btn-preview-${doc.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {!doc.isVerified && !doc.rejectionReason && (
                        <Button variant="ghost" size="icon" onClick={() => setVerifyDocDialogOpen(doc.id)} data-testid={`btn-verify-${doc.id}`}>
                          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                      )}
                    </>
                  )}
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteDocConfirmOpen(doc.id)} data-testid={`btn-delete-${doc.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Request doc dialog */}
      <Dialog open={requestDocDialogOpen} onOpenChange={setRequestDocDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Document</DialogTitle><DialogDescription>Ask the student to upload a document.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Document Type</Label><Input value={newDocRequest.documentType} onChange={e => setNewDocRequest(p => ({ ...p, documentType: e.target.value }))} placeholder="e.g. Passport" /></div>
            <div><Label className="text-xs">Document Name</Label><Input value={newDocRequest.documentName} onChange={e => setNewDocRequest(p => ({ ...p, documentName: e.target.value }))} placeholder="e.g. Passport copy" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDocDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => requestDocMutation.mutate(newDocRequest)} disabled={!newDocRequest.documentName || requestDocMutation.isPending}>Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload doc dialog */}
      <Dialog open={uploadDocDialogOpen} onOpenChange={setUploadDocDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Document</DialogTitle><DialogDescription>Upload a document on behalf of the student.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Document Type</Label><Input value={newDocUpload.documentType} onChange={e => setNewDocUpload(p => ({ ...p, documentType: e.target.value }))} placeholder="e.g. Offer Letter" /></div>
            <div><Label className="text-xs">Document Name</Label><Input value={newDocUpload.documentName} onChange={e => setNewDocUpload(p => ({ ...p, documentName: e.target.value }))} placeholder="e.g. Offer letter from Uni" /></div>
            <div><Label className="text-xs">File</Label><Input type="file" onChange={e => setUploadFile(e.target.files?.[0] ?? null)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDocDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => uploadDocMutation.mutate()} disabled={!uploadFile || !newDocUpload.documentName || uploadDocMutation.isPending}>
              {uploadDocMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify doc dialog */}
      <Dialog open={!!verifyDocDialogOpen} onOpenChange={open => { if (!open) setVerifyDocDialogOpen(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Verify or Reject Document</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Verification Notes (optional)</Label><Textarea value={verifyNotes} onChange={e => setVerifyNotes(e.target.value)} rows={2} /></div>
            <div><Label className="text-xs">Rejection Reason (if rejecting)</Label><Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setVerifyDocDialogOpen(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => verifyDocDialogOpen && verifyDocMutation.mutate({ docId: verifyDocDialogOpen, reject: true })} disabled={!rejectReason || verifyDocMutation.isPending}>Reject</Button>
            <Button onClick={() => verifyDocDialogOpen && verifyDocMutation.mutate({ docId: verifyDocDialogOpen })} disabled={verifyDocMutation.isPending}>Verify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete doc confirm */}
      <AlertDialog open={!!deleteDocConfirmOpen} onOpenChange={open => { if (!open) setDeleteDocConfirmOpen(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Document?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDocConfirmOpen && deleteDocMutation.mutate(deleteDocConfirmOpen)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {previewDoc && (
        <DocumentPreviewModal
          open={!!previewDoc}
          onOpenChange={open => { if (!open) setPreviewDoc(null); }}
          documentUrl={previewDoc.url}
          documentName={previewDoc.name}
        />
      )}
    </>
  );
}

/**
 * Self-contained multi-course manager for an application.
 * Fetches courses, supports add/remove actions.
 */
export function ApplicationMultiCourse({
  applicationId,
  defaultCourseTitle,
  defaultUniversityName,
}: {
  applicationId: string;
  defaultCourseTitle: string;
  defaultUniversityName: string;
}) {
  const { toast } = useToast();
  const [addCourseDialogOpen, setAddCourseDialogOpen] = useState(false);
  const [selectedCourseToAdd, setSelectedCourseToAdd] = useState("");
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [addCourseMode, setAddCourseMode] = useState<"search" | "manual">("search");
  const [manualCourseName, setManualCourseName] = useState("");
  const [manualInstitutionName, setManualInstitutionName] = useState("");
  const [manualCountry, setManualCountry] = useState("Australia");

  const { data: coursesData } = useQuery<{ courses: ApplicationCourse[] }>({
    queryKey: ["/api/applications", applicationId, "courses"],
  });
  const applicationCourses = coursesData?.courses ?? [];

  interface SearchCourse { id: string; title: string; level: string | null; university?: { name: string } | null; }
  const { data: courseSearchData } = useQuery<{ courses: SearchCourse[] }>({
    queryKey: ["/api/courses", { search: courseSearchQuery, limit: 20 }],
    enabled: addCourseDialogOpen && courseSearchQuery.length >= 2,
  });
  const searchableCourses = courseSearchData?.courses ?? [];

  const addCourseMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", `/api/admin/applications/${applicationId}/courses`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId, "courses"] });
      toast({ title: "Course Added" });
      setAddCourseDialogOpen(false);
      setSelectedCourseToAdd("");
    },
    onError: (e: any) => toast({ title: "Add Failed", description: e.message, variant: "destructive" }),
  });

  const removeCourseMutation = useMutation({
    mutationFn: async (appCourseId: string) => apiRequest("DELETE", `/api/admin/applications/${applicationId}/courses/${appCourseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId, "courses"] });
      toast({ title: "Course Removed" });
    },
    onError: (e: any) => toast({ title: "Remove Failed", description: e.message, variant: "destructive" }),
  });

  const handleAddCourse = () => {
    if (addCourseMode === "search" && selectedCourseToAdd) {
      addCourseMutation.mutate({ courseId: selectedCourseToAdd });
    } else if (addCourseMode === "manual" && manualCourseName) {
      addCourseMutation.mutate({ externalCourseName: manualCourseName, externalInstitutionName: manualInstitutionName, externalCountry: manualCountry });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase">Courses ({applicationCourses.length || 1})</span>
        <Button variant="outline" size="sm" onClick={() => setAddCourseDialogOpen(true)} data-testid="button-add-course">
          <Plus className="h-4 w-4 mr-1" />Add
        </Button>
      </div>
      <div className="space-y-2">
        {applicationCourses.length > 0 ? applicationCourses.map((appCourse, idx) => {
          const isExt = !appCourse.courseId;
          return (
            <div key={appCourse.id} className="flex items-start justify-between gap-3 p-3 rounded-md border" data-testid={`multi-course-${idx}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium">{isExt ? appCourse.externalCourseName : appCourse.course?.title ?? "(Untitled)"}</p>
                  {appCourse.isPrimary && <Badge variant="secondary" className="text-[10px] px-1.5 no-default-active-elevate">Primary</Badge>}
                  {isExt && <Badge variant="outline" className="text-[10px] px-1.5 no-default-active-elevate">External</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{isExt ? appCourse.externalInstitutionName : appCourse.university?.name}</p>
              </div>
              {applicationCourses.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeCourseMutation.mutate(appCourse.id)} disabled={removeCourseMutation.isPending} data-testid={`btn-remove-course-${idx}`}>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          );
        }) : (
          <div className="p-3 rounded-md border">
            <p className="text-sm font-medium">{defaultCourseTitle}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{defaultUniversityName}</p>
          </div>
        )}
      </div>

      <Dialog open={addCourseDialogOpen} onOpenChange={setAddCourseDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Course</DialogTitle><DialogDescription>Search or manually add a course to this application.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <Button variant={addCourseMode === "search" ? "default" : "outline"} size="sm" onClick={() => setAddCourseMode("search")}>Search</Button>
              <Button variant={addCourseMode === "manual" ? "default" : "outline"} size="sm" onClick={() => setAddCourseMode("manual")}>Manual</Button>
            </div>
            {addCourseMode === "search" ? (
              <div className="space-y-2">
                <Input placeholder="Search courses..." value={courseSearchQuery} onChange={e => setCourseSearchQuery(e.target.value)} />
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {searchableCourses.map(c => (
                    <div key={c.id} className={`p-2 rounded cursor-pointer text-sm border ${selectedCourseToAdd === c.id ? "border-primary bg-primary/5" : ""}`} onClick={() => setSelectedCourseToAdd(c.id)}>
                      <p className="font-medium">{c.title}</p>
                      {c.university && <p className="text-xs text-muted-foreground">{c.university.name}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Input placeholder="Course name" value={manualCourseName} onChange={e => setManualCourseName(e.target.value)} />
                <Input placeholder="Institution name" value={manualInstitutionName} onChange={e => setManualInstitutionName(e.target.value)} />
                <Input placeholder="Country" value={manualCountry} onChange={e => setManualCountry(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCourseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCourse} disabled={addCourseMutation.isPending || (addCourseMode === "search" ? !selectedCourseToAdd : !manualCourseName)}>Add Course</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main ApplicationDetailsPanel (flat, no internal tab navigation) ─────────

export function ApplicationDetailsPanel({
  application,
  course,
  university,
  student,
  consultant,
  currentUserId,
  onClose,
  onDeleted,
}: ApplicationDetailsPanelProps) {
  const { toast } = useToast();
  
  useDocumentEvents({ applicationId: application.id });
  
  const [previewDocument, setPreviewDocument] = useState<{
    url: string;
    name: string;
    mimeType?: string;
  } | null>(null);
  
  const openDocumentPreview = useCallback((url: string, fileName: string, mimeType?: string) => {
    setPreviewDocument({ url, name: fileName, mimeType });
  }, []);
  
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
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
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
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({ title: "Error", description: "Failed to download document", variant: "destructive" });
    }
  }, [toast]);
  
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
  
  const { data: coursesData, isLoading: coursesLoading } = useQuery<{ courses: ApplicationCourse[] }>({
    queryKey: ["/api/applications", application.id, "courses"],
  });
  const applicationCourses = coursesData?.courses || [];
  
  const { data: assignableUsersData } = useQuery<{ users: Consultant[] }>({
    queryKey: ["/api/admin/assignable-users"],
  });
  const assignableUsers = assignableUsersData?.users || [];

  const { data: slotsData } = useQuery<{ maxSlots: number; usedSlots: number; availableSlots: number }>({
    queryKey: ["/api/admin/students", student.id, "application-slots"],
  });
  
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

  const { data: studentLibraryData } = useQuery<{ documents: PersonalDocument[] }>({
    queryKey: ["/api/admin/students", application.studentId, "documents"],
  });
  const studentLibrary = studentLibraryData?.documents || [];

  const { data: studentFolders = [] } = useQuery<{ id: string; name: string; color: string }[]>({
    queryKey: ["/api/admin/applications", application.id, "student-folders"],
    enabled: uploadDocDialogOpen,
  });

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
      toast({ title: "Document Deleted" });
      setDeleteDocConfirmOpen(null);
    },
    onError: (error: any) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });

  const verifyDocMutation = useMutation({
    mutationFn: async ({ documentId, action }: { documentId: string; action: "verify" | "reject" }) => {
      return apiRequest(
        "POST",
        `/api/admin/applications/${application.id}/documents/${documentId}/${action}`,
        action === "verify" ? { notes: verifyNotes } : { rejectionReason: rejectReason }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", application.id, "documents"] });
      toast({ title: "Document Updated" });
      setVerifyDocDialogOpen(null);
      setVerifyNotes("");
      setRejectReason("");
    },
    onError: (error: any) => {
      toast({ title: "Action Failed", description: error.message, variant: "destructive" });
    },
  });

  const attachFromLibraryMutation = useMutation({
    mutationFn: async ({ documentId, stage }: { documentId: string; stage: ApplicationStage }) => {
      return apiRequest("POST", `/api/admin/applications/${application.id}/attach-document`, { documentId, stage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", application.id, "documents"] });
      toast({ title: "Document Attached" });
    },
    onError: (error: any) => {
      toast({ title: "Attach Failed", description: error.message, variant: "destructive" });
    },
  });

  const addCourseMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/admin/applications/${application.id}/courses`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", application.id, "courses"] });
      toast({ title: "Course Added" });
      setAddCourseDialogOpen(false);
      setSelectedCourseToAdd("");
      setCourseSearchQuery("");
    },
    onError: (error: any) => {
      toast({ title: "Add Failed", description: error.message, variant: "destructive" });
    },
  });

  const removeCourseMutation = useMutation({
    mutationFn: async (appCourseId: string) => {
      return apiRequest("DELETE", `/api/admin/applications/${application.id}/courses/${appCourseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", application.id, "courses"] });
      toast({ title: "Course Removed" });
    },
    onError: (error: any) => {
      toast({ title: "Remove Failed", description: error.message, variant: "destructive" });
    },
  });

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

  const getStatusLabel = (s: string) =>
    s === 'accepted' ? 'Accepted' : s === 'reviewing' ? 'Under Review' : s === 'rejected' ? 'Rejected'
    : s === 'withdrawn' ? 'Withdrawn' : s === 'pending' ? 'Pending'
    : s.charAt(0).toUpperCase() + s.slice(1);


  return (
    <div>
      <div className="flex flex-col xl:flex-row gap-5 items-start">

        {/* ── Left column ────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Header card */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {application.applicationNumber && (
                      <Badge variant="outline" className="font-mono text-xs no-default-active-elevate">
                        {application.applicationNumber}
                      </Badge>
                    )}
                    <Badge
                      className={`text-xs no-default-active-elevate ${STAGE_CONFIG[application.currentStage]?.badgeClass || ""}`}
                    >
                      {STAGE_CONFIG[application.currentStage]?.displayName || application.currentStage}
                    </Badge>
                    <Badge variant="secondary" className="text-xs no-default-active-elevate">
                      {getStatusLabel(application.status)}
                    </Badge>
                  </div>
                  <h2 className="font-semibold text-base">{course.title}</h2>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{university.name}</span>
                    {university.country && <span className="opacity-70">· {university.country}</span>}
                    {course.level && <Badge variant="secondary" className="ml-1 no-default-active-elevate">{course.level}</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span>{student.firstName} {student.lastName}</span>
                      {student.email && <span className="opacity-70 hidden sm:inline">· {student.email}</span>}
                    </div>
                    {consultant && (
                      <div className="flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5 shrink-0" />
                        <span>{consultant.firstName} {consultant.lastName}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditing(!isEditing)}
                    data-testid="button-edit-application"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    data-testid="button-close-panel"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <Link href={`/admin/applications/${application.id}`} data-testid="link-open-full-detail">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />Open Full Detail
                  </Button>
                </Link>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 gap-1.5"
                    onClick={() => setDeleteConfirmOpen(true)}
                    data-testid="button-delete-application"
                  >
                    <Trash2 className="h-3.5 w-3.5" />Delete
                  </Button>
                )}
              </div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                <Calendar className="h-3 w-3 shrink-0" />
                Applied {format(new Date(application.createdAt), 'd MMM yyyy')}
              </p>
            </CardContent>
          </Card>

          {/* ── Sections (flat, no internal tab navigation) ─────── */}
          <div className="w-full space-y-6">
            <div className="mt-5 space-y-5" data-section="details">
              {/* Stage Selector */}
              <div className="flex items-center gap-3">
                <ApplicationStageSelector
                  applicationId={application.id}
                  currentStage={application.currentStage}
                />
              </div>

              {/* Edit Form */}
              {isEditing && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Edit Application</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Consultant</Label>
                      <Select
                        value={editForm.assignedConsultantId || "_none"}
                        onValueChange={(v) => setEditForm(p => ({ ...p, assignedConsultantId: v === "_none" ? "" : v }))}
                      >
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Unassigned</SelectItem>
                          {assignableUsers.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Select
                        value={editForm.status}
                        onValueChange={(v) => setEditForm(p => ({ ...p, status: v }))}
                      >
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["pending", "reviewing", "accepted", "rejected", "withdrawn"].map(s => (
                            <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Personal Statement</Label>
                      <Textarea
                        className="mt-1"
                        rows={3}
                        value={editForm.personalStatement}
                        onChange={e => setEditForm(p => ({ ...p, personalStatement: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Additional Info</Label>
                      <Textarea
                        className="mt-1"
                        rows={3}
                        value={editForm.additionalInfo}
                        onChange={e => setEditForm(p => ({ ...p, additionalInfo: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={() => updateMutation.mutate(editForm)} disabled={updateMutation.isPending} data-testid="button-save-edit">
                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Application slots */}
              <div>
                <Button variant="outline" size="sm" onClick={() => setSlotsDialogOpen(true)} data-testid="button-manage-slots">
                  <Layers className="h-4 w-4 mr-2" />Manage Application Slots
                </Button>
              </div>

              {/* Application details summary */}
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground mb-1">Application ID</dt>
                  <dd className="font-mono text-xs">{application.id.slice(0, 8).toUpperCase()}</dd>
                </div>
                {application.applicationNumber && (
                  <div>
                    <dt className="text-xs text-muted-foreground mb-1">Application #</dt>
                    <dd className="font-mono text-xs">{application.applicationNumber}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted-foreground mb-1">Status</dt>
                  <dd className="text-sm font-medium">{getStatusLabel(application.status)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground mb-1">Last Updated</dt>
                  <dd className="text-sm font-medium">{format(new Date(application.updatedAt), 'd MMM yyyy')}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-4" data-section="documents">
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

              {studentLibrary.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">Student's Personal Library</h4>
                    <Badge variant="secondary" className="text-xs no-default-active-elevate">{studentLibrary.length} documents</Badge>
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
                            <Badge className={`text-xs no-default-active-elevate ${isVerified ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : isPending ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                              {isVerified ? 'Verified' : isPending ? 'Pending' : 'Rejected'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            {doc.filePath && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDocumentPreview(`/api/admin/documents/${doc.id}/download`, doc.fileName || doc.title)}
                                data-testid={`button-view-lib-doc-${doc.id}`}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => attachFromLibraryMutation.mutate({ documentId: doc.id, stage: application.currentStage })}
                              disabled={attachFromLibraryMutation.isPending}
                              data-testid={`button-attach-lib-doc-${doc.id}`}
                            >
                              <Plus className="h-3 w-3 mr-1" />Attach
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
                          <div className={`w-2 h-2 rounded-full ${STAGE_CONFIG[stage].dotColor}`} />
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                            {STAGE_CONFIG[stage].displayName}
                          </h4>
                          <Badge variant="secondary" className="h-4 px-1 text-xs no-default-active-elevate">
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
                                  <Badge className={`text-xs no-default-active-elevate ${status.color}`}>
                                    {status.label}
                                  </Badge>
                                  {doc.uploadedByRole === 'admin' && (
                                    <Badge variant="secondary" className="text-xs no-default-active-elevate">Consultant upload</Badge>
                                  )}
                                  {doc.isRequired && (
                                    <Badge variant="outline" className="text-xs no-default-active-elevate">Required</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {doc.documentUrl && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openDocumentPreview(`/api/admin/applications/${application.id}/documents/${doc.id}/download`, doc.documentName || 'document')}
                                        data-testid={`button-view-doc-${doc.id}`}
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => downloadDocument(`/api/admin/applications/${application.id}/documents/${doc.id}/download`, doc.documentName || 'document')}
                                        data-testid={`button-download-doc-${doc.id}`}
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                      </Button>
                                      {!doc.isVerified && !doc.rejectionReason && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
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
                                    className="text-destructive hover:text-destructive"
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
            </div>

            <div className="mt-4" data-section="messages">
              <StudentApplicationNotes
                applicationId={application.id}
                studentName={`${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student'}
              />
            </div>

            <div className="mt-4" data-section="history">
              <ApplicationHistory applicationId={application.id} />
            </div>
          </div>{/* end sections */}

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
                Only visible to team members.
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
      </div>

      {/* ── Dialogs ────────────────────────────────────────────── */}

      {/* Delete application confirm */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Application?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the application and all associated documents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Application"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage slots dialog */}
      <Dialog open={slotsDialogOpen} onOpenChange={setSlotsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Application Slots</DialogTitle>
            <DialogDescription>
              Control how many applications this student can submit.
              Currently using {slotsData?.usedSlots ?? 0} of {slotsData?.maxSlots ?? 3} slots.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-sm">Maximum Slots</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={newMaxSlots}
              onChange={e => setNewMaxSlots(parseInt(e.target.value) || 3)}
              className="mt-2 w-24"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlotsDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => updateSlotsMutation.mutate(newMaxSlots)} disabled={updateSlotsMutation.isPending}>
              {updateSlotsMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request document dialog */}
      <Dialog open={requestDocDialogOpen} onOpenChange={setRequestDocDialogOpen}>
        <DialogContent data-testid="dialog-request-document">
          <DialogHeader>
            <DialogTitle>Request Document</DialogTitle>
            <DialogDescription>Ask the student to upload a specific document.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Stage</Label>
              <Select value={newDocRequest.stage} onValueChange={v => setNewDocRequest(p => ({ ...p, stage: v as ApplicationStage }))}>
                <SelectTrigger data-testid="select-doc-stage"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_STAGES.map(stage => (
                    <SelectItem key={stage} value={stage}>{STAGE_CONFIG[stage]?.displayName || stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Document Type</Label>
              <Input value={newDocRequest.documentType} onChange={e => setNewDocRequest(p => ({ ...p, documentType: e.target.value }))} placeholder="e.g. Passport" data-testid="input-doc-type" />
            </div>
            <div>
              <Label>Document Name</Label>
              <Input value={newDocRequest.documentName} onChange={e => setNewDocRequest(p => ({ ...p, documentName: e.target.value }))} placeholder="e.g. Passport copy (all pages)" data-testid="input-doc-name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDocDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => requestDocMutation.mutate(newDocRequest)} disabled={!newDocRequest.documentName || requestDocMutation.isPending} data-testid="button-confirm-request">
              {requestDocMutation.isPending ? "Requesting..." : "Request Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload document dialog */}
      <Dialog open={uploadDocDialogOpen} onOpenChange={setUploadDocDialogOpen}>
        <DialogContent data-testid="dialog-upload-document">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a document on behalf of the student.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Stage</Label>
              <Select value={newDocUpload.stage} onValueChange={v => setNewDocUpload(p => ({ ...p, stage: v as ApplicationStage }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_STAGES.map(stage => (
                    <SelectItem key={stage} value={stage}>{STAGE_CONFIG[stage]?.displayName || stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Save to Student Folder</Label>
              <Select value={uploadFolderId ?? "__none__"} onValueChange={v => setUploadFolderId(v === "__none__" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unfiled (no folder)</SelectItem>
                  {studentFolders.map(folder => (
                    <SelectItem key={folder.id} value={folder.id} data-testid={`folder-option-${folder.id}`}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Document Type</Label>
              <Input value={newDocUpload.documentType} onChange={e => setNewDocUpload(p => ({ ...p, documentType: e.target.value }))} placeholder="e.g. Offer Letter" />
            </div>
            <div>
              <Label>Document Name</Label>
              <Input value={newDocUpload.documentName} onChange={e => setNewDocUpload(p => ({ ...p, documentName: e.target.value }))} placeholder="e.g. Offer letter from University" />
            </div>
            <div>
              <Label>File</Label>
              <Input type="file" onChange={e => setUploadFile(e.target.files?.[0] ?? null)} data-testid="input-upload-file" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDocDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => uploadDocMutation.mutate()} disabled={!uploadFile || !newDocUpload.documentName || uploadDocMutation.isPending} data-testid="button-confirm-upload">
              {uploadDocMutation.isPending ? "Uploading..." : "Upload Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify/reject document dialog */}
      <Dialog
        open={!!verifyDocDialogOpen}
        onOpenChange={(open) => { if (!open) { setVerifyDocDialogOpen(null); setVerifyNotes(""); setRejectReason(""); } }}
      >
        <DialogContent data-testid="dialog-verify-document">
          <DialogHeader>
            <DialogTitle>Verify or Reject Document</DialogTitle>
            <DialogDescription>Review and approve or reject this document.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Verification Notes (optional)</Label>
              <Textarea value={verifyNotes} onChange={e => setVerifyNotes(e.target.value)} placeholder="Add notes about this document..." rows={3} data-testid="input-verify-notes" />
            </div>
            <Separator />
            <div>
              <Label className="text-destructive">Rejection Reason (if rejecting)</Label>
              <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..." rows={2} data-testid="input-reject-reason" />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setVerifyDocDialogOpen(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => verifyDocDialogOpen && verifyDocMutation.mutate({ documentId: verifyDocDialogOpen, action: "reject" })}
              disabled={!rejectReason || verifyDocMutation.isPending}
              data-testid="button-reject-doc"
            >
              Reject
            </Button>
            <Button
              onClick={() => verifyDocDialogOpen && verifyDocMutation.mutate({ documentId: verifyDocDialogOpen, action: "verify" })}
              disabled={verifyDocMutation.isPending}
              data-testid="button-verify-doc"
            >
              {verifyDocMutation.isPending ? "Verifying..." : "Verify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete document confirm */}
      <AlertDialog open={!!deleteDocConfirmOpen} onOpenChange={open => { if (!open) setDeleteDocConfirmOpen(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDocConfirmOpen && deleteDocMutation.mutate(deleteDocConfirmOpen)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-doc"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add course dialog */}
      <Dialog open={addCourseDialogOpen} onOpenChange={setAddCourseDialogOpen}>
        <DialogContent data-testid="dialog-add-course">
          <DialogHeader>
            <DialogTitle>Add Course to Application</DialogTitle>
            <DialogDescription>Search for a course or enter details manually.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button variant={addCourseMode === "search" ? "default" : "outline"} size="sm" onClick={() => { setAddCourseMode("search"); setSelectedCourseToAdd(""); }}>
                Search Courses
              </Button>
              <Button variant={addCourseMode === "manual" ? "default" : "outline"} size="sm" onClick={() => { setAddCourseMode("manual"); setSelectedCourseToAdd(""); }}>
                Manual Entry
              </Button>
            </div>
            {addCourseMode === "search" ? (
              <div className="space-y-3">
                <div>
                  <Label>Filter by Institution (optional)</Label>
                  <Select value={addCourseInstitutionFilter || "_all"} onValueChange={v => setAddCourseInstitutionFilter(v === "_all" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="All institutions" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">All institutions</SelectItem>
                      {addCourseInstitutions.map((inst: any) => (
                        <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Search Course</Label>
                  <Input
                    value={courseSearchQuery}
                    onChange={e => setCourseSearchQuery(e.target.value)}
                    placeholder="Type to search..."
                    data-testid="input-course-search"
                  />
                </div>
                {courseSearchLoading && <p className="text-sm text-muted-foreground">Searching...</p>}
                {searchableCourses.length > 0 && (
                  <ScrollArea className="h-40 border rounded-md">
                    <div className="p-2 space-y-1">
                      {searchableCourses.map(c => (
                        <div
                          key={c.id}
                          className={`p-2 rounded cursor-pointer hover-elevate ${selectedCourseToAdd === c.id ? "bg-primary/10 border border-primary/30" : "border border-transparent"}`}
                          onClick={() => setSelectedCourseToAdd(c.id)}
                          data-testid={`course-option-${c.id}`}
                        >
                          <p className="text-sm font-medium">{c.title}</p>
                          <p className="text-xs text-muted-foreground">{c.university?.name}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>Course Name</Label>
                  <Input value={manualCourseNameToAdd} onChange={e => setManualCourseNameToAdd(e.target.value)} placeholder="e.g. Master of Business Administration" data-testid="input-manual-course" />
                </div>
                <div>
                  <Label>Institution Name</Label>
                  <Input value={manualInstitutionNameToAdd} onChange={e => setManualInstitutionNameToAdd(e.target.value)} placeholder="e.g. University of Melbourne" data-testid="input-manual-institution" />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input value={manualCountryToAdd} onChange={e => setManualCountryToAdd(e.target.value)} placeholder="Australia" data-testid="input-manual-country" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCourseDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (addCourseMode === "search" && selectedCourseToAdd) {
                  addCourseMutation.mutate({ courseId: selectedCourseToAdd });
                } else if (addCourseMode === "manual" && manualCourseNameToAdd) {
                  addCourseMutation.mutate({
                    externalCourseName: manualCourseNameToAdd,
                    externalInstitutionName: manualInstitutionNameToAdd,
                    externalCountry: manualCountryToAdd,
                  });
                }
              }}
              disabled={addCourseMutation.isPending || (addCourseMode === "search" ? !selectedCourseToAdd : !manualCourseNameToAdd)}
              data-testid="button-confirm-add-course"
            >
              {addCourseMutation.isPending ? "Adding..." : "Add Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
