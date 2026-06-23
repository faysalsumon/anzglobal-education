import { useState, useRef } from "react";
import { useFileCompressor } from "@/hooks/useFileCompressor";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  File,
  Download,
  Eye,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  Folder,
  FolderOpen,
  AlertTriangle,
  User,
  ShieldCheck,
  Send,
  Plus,
  Upload,
  Trash2,
  Layers,
  Grid3x3,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { STAGE_CONFIG, ALL_STAGES } from "@/lib/stage-config";

// ── Types ──────────────────────────────────────────────────────────

interface DocumentFolder {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  sortOrder: number | null;
}

interface LibraryDocument {
  id: string;
  type: string;
  title: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: string;
  description: string | null;
  folderId: string | null;
  studentProfileId: string;
  senderId: string | null;
  createdAt: Date;
  reviewNotes?: string;
  senderType?: string;
  senderName?: string | null;
  expiryDate?: string | null;
}

export interface AppDocument {
  id: string;
  stage: string;
  documentType: string;
  documentName: string;
  documentUrl: string | null;
  isRequired: boolean;
  isVerified: boolean;
  uploadedByRole: string | null;
  rejectionReason: string | null;
  createdAt: string;
  documentId?: string | null;
}

interface StudentDocumentOrganizerProps {
  studentProfileId: string;
  compact?: boolean;
  applicationId?: string;
  applicationDocuments?: AppDocument[];
  onRequestDoc?: () => void;
  onUploadDoc?: () => void;
  onAttachDoc?: (docId: string) => void;
  onVerifyDoc?: (docId: string) => void;
  onDeleteDoc?: (docId: string) => void;
  onViewAppDoc?: (url: string, name: string) => void;
  onDownloadAppDoc?: (url: string, name: string) => void;
  onViewLibraryDoc?: (url: string, name: string) => void;
  onDownloadLibraryDoc?: (url: string, name: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────

const documentTypes = [
  { value: "transcript", label: "Academic Transcript" },
  { value: "diploma", label: "Diploma/Degree" },
  { value: "language_test", label: "Language Test Results" },
  { value: "passport", label: "Passport Copy" },
  { value: "visa", label: "Visa Copy" },
  { value: "cv", label: "CV/Resume" },
  { value: "recommendation", label: "Letter of Recommendation" },
  { value: "financial", label: "Financial Document" },
  { value: "sop", label: "Statement of Purpose" },
  { value: "offer_letter", label: "Offer Letter" },
  { value: "coe", label: "COE" },
  { value: "gte", label: "GTE Document" },
  { value: "other", label: "Other" },
];

const libraryStatusConfig = {
  pending:  { label: "Pending Review", icon: Clock,       color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  verified: { label: "Verified",       icon: CheckCircle, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  reviewed: { label: "Reviewed",       icon: CheckCircle, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  approved: { label: "Approved",       icon: CheckCircle, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Rejected",       icon: XCircle,     color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

function getAppDocStatus(doc: AppDocument) {
  if (!doc.documentUrl) return { label: "Requested", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" };
  if (doc.isVerified)   return { label: "Verified",  color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
  if (doc.rejectionReason) return { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" };
  return { label: "Uploaded", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" };
}

function getExpiryBadge(expiryDate: string | null | undefined) {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)   return { label: "Expired",       color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" };
  if (diffDays <= 60) return { label: "Expiring Soon", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" };
  return null;
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getFileIcon(mimeType: string) {
  if (mimeType?.includes("pdf")) return FileText;
  return File;
}

function UploaderLabel({ doc }: { doc: LibraryDocument }) {
  if (doc.senderType === "student" || !doc.senderType) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <User className="h-3 w-3" />Student
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400">
      <ShieldCheck className="h-3 w-3" />{doc.senderName || "Admin"}
    </span>
  );
}

// ── Library Document Row ───────────────────────────────────────────

function LibraryDocumentRow({
  doc,
  onAttach,
  isAttached = false,
  onView,
  onDownload,
  currentUserId,
  isCTO,
  studentProfileId,
  onDeleted,
}: {
  doc: LibraryDocument;
  onAttach?: (id: string) => void;
  isAttached?: boolean;
  onView?: (url: string, name: string) => void;
  onDownload?: (url: string, name: string) => void;
  currentUserId?: string;
  isCTO?: boolean;
  studentProfileId?: string;
  onDeleted?: () => void;
}) {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const FileIcon = getFileIcon(doc.mimeType);
  const status = libraryStatusConfig[doc.status as keyof typeof libraryStatusConfig] || libraryStatusConfig.pending;
  const StatusIcon = status.icon;
  const expiryBadge = getExpiryBadge(doc.expiryDate);
  const viewUrl = `/api/admin/documents/${doc.id}/download`;
  const downloadUrl = `/api/admin/documents/${doc.id}/download?dl=1`;

  const canDelete =
    doc.senderType === "admin" &&
    !!studentProfileId &&
    !!onDeleted &&
    (isCTO || doc.senderId === currentUserId);

  const deleteMutation = useMutation({
    mutationFn: async () =>
      apiRequest("DELETE", `/api/admin/students/${studentProfileId}/documents/${doc.id}`),
    onSuccess: () => {
      toast({ title: "Document deleted" });
      onDeleted?.();
      setConfirmOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to delete document", variant: "destructive" });
    },
  });

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border bg-card hover-elevate",
          doc.status === "rejected" && "border-red-200 dark:border-red-800"
        )}
        data-testid={`admin-doc-${doc.id}`}
      >
        <FileIcon className="h-8 w-8 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{doc.title || doc.fileName}</span>
            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", status.color)}>
              <StatusIcon className="h-3 w-3 mr-1" />{status.label}
            </Badge>
            {expiryBadge && (
              <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", expiryBadge.color)}>
                <AlertTriangle className="h-3 w-3 mr-1" />{expiryBadge.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <UploaderLabel doc={doc} />
            <span className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</span>
            {doc.expiryDate && (
              <span className="text-xs text-muted-foreground">Expires {formatDate(doc.expiryDate)}</span>
            )}
            <span className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{doc.type}</Badge>
          </div>
          {doc.description && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{doc.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost"
                onClick={() => onView ? onView(viewUrl, doc.title || doc.fileName) : window.open(viewUrl, "_blank")}
                data-testid={`button-view-${doc.id}`}>
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View Document</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost"
                onClick={() => onDownload ? onDownload(downloadUrl, doc.title || doc.fileName) : window.open(downloadUrl, "_blank")}
                data-testid={`button-download-${doc.id}`}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
          {onAttach && (
            isAttached ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 no-default-active-elevate">
                <CheckCircle className="h-3 w-3 mr-1" />Attached
              </Badge>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost"
                    onClick={() => onAttach(doc.id)}
                    data-testid={`button-attach-to-app-${doc.id}`}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add to Application</TooltipContent>
              </Tooltip>
            )
          )}
          {canDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="text-destructive"
                  onClick={() => setConfirmOpen(true)}
                  data-testid={`button-delete-admin-doc-${doc.id}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {canDelete && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{doc.title || doc.fileName}&quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                data-testid={`button-confirm-delete-${doc.id}`}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

// ── Library Document Card (grid mode) ─────────────────────────────

function LibraryDocumentCard({
  doc,
  onAttach,
  isAttached = false,
  onView,
  onDownload,
}: {
  doc: LibraryDocument;
  onAttach?: (id: string) => void;
  isAttached?: boolean;
  onView?: (url: string, name: string) => void;
  onDownload?: (url: string, name: string) => void;
}) {
  const FileIcon = getFileIcon(doc.mimeType);
  const status = libraryStatusConfig[doc.status as keyof typeof libraryStatusConfig] || libraryStatusConfig.pending;
  const StatusIcon = status.icon;
  const expiryBadge = getExpiryBadge(doc.expiryDate);
  const viewUrl = `/api/admin/documents/${doc.id}/download`;
  const downloadUrl = `/api/admin/documents/${doc.id}/download?dl=1`;

  return (
    <Card className="hover-elevate" data-testid={`admin-doc-card-${doc.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <FileIcon className="h-8 w-8 text-primary" />
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost"
                  onClick={() => onView?.(viewUrl, doc.title || doc.fileName)}
                  data-testid={`button-view-card-${doc.id}`}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost"
                  onClick={() => onDownload?.(downloadUrl, doc.title || doc.fileName)}
                  data-testid={`button-download-card-${doc.id}`}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <h3 className="font-semibold text-sm mb-1.5 truncate" title={doc.title || doc.fileName}>
          {doc.title || doc.fileName}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", status.color)}>
            <StatusIcon className="h-3 w-3 mr-1" />{status.label}
          </Badge>
          {expiryBadge && (
            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", expiryBadge.color)}>
              <AlertTriangle className="h-3 w-3 mr-1" />{expiryBadge.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <UploaderLabel doc={doc} />
          <span className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</span>
        </div>
        {onAttach && (
          <div className="mt-3 pt-3 border-t">
            {isAttached ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 no-default-active-elevate">
                <CheckCircle className="h-3 w-3 mr-1" />Attached
              </Badge>
            ) : (
              <Button size="sm" variant="outline" className="w-full" onClick={() => onAttach(doc.id)} data-testid={`button-attach-card-${doc.id}`}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add to Application
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Application Document Row ───────────────────────────────────────

function AppDocumentRow({
  doc, applicationId, onVerify, onDelete, onView, onDownload,
}: {
  doc: AppDocument;
  applicationId: string;
  onVerify?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (url: string, name: string) => void;
  onDownload?: (url: string, name: string) => void;
}) {
  const status = getAppDocStatus(doc);
  const downloadUrl = `/api/admin/applications/${applicationId}/documents/${doc.id}/download`;

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate"
      data-testid={`app-doc-${doc.id}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{doc.documentName}</span>
            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", status.color)}>
              {status.label}
            </Badge>
            {doc.uploadedByRole === "admin" && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Consultant upload</Badge>
            )}
            {doc.isRequired && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Required</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{doc.documentType}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {doc.documentUrl && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost"
                  onClick={() => onView?.(downloadUrl, doc.documentName)}
                  data-testid={`button-view-doc-${doc.id}`}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost"
                  onClick={() => onDownload?.(downloadUrl, doc.documentName)}
                  data-testid={`button-download-doc-${doc.id}`}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>
            {!doc.isVerified && !doc.rejectionReason && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost"
                    onClick={() => onVerify?.(doc.id)}
                    data-testid={`button-verify-doc-${doc.id}`}>
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Verify / Reject</TooltipContent>
              </Tooltip>
            )}
          </>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="text-destructive"
              onClick={() => onDelete?.(doc.id)}
              data-testid={`button-delete-doc-${doc.id}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// ── Admin Upload Dialog ────────────────────────────────────────────

interface AdminUploadDialogProps {
  studentProfileId: string;
  folders: DocumentFolder[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function AdminUploadDialog({ studentProfileId, folders, open, onOpenChange, onSuccess }: AdminUploadDialogProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressionLabel, setCompressionLabel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { compress, compressing } = useFileCompressor();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", `/api/admin/students/${studentProfileId}/documents/upload`, formData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Document uploaded successfully" });
      setSelectedFile(null);
      setCompressionLabel(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: err.message || "Failed to upload document", variant: "destructive" });
    },
  });

  const handleFileChange = async (file: File | null) => {
    setCompressionLabel(null);
    if (!file) { setSelectedFile(null); return; }
    try {
      const result = await compress(file);
      setSelectedFile(result.file);
      if (result.wasCompressed) {
        setCompressionLabel(
          `Compressed from ${result.originalMB.toFixed(2)} MB → ${result.compressedMB.toFixed(2)} MB`
        );
      }
    } catch {
      setSelectedFile(file);
      toast({ title: "Compression failed", description: "File will be uploaded as-is.", variant: "destructive" });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append("file", selectedFile);
    const folderId = formData.get("folderId") as string;
    if (!folderId || folderId === "none") formData.delete("folderId");
    uploadMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document for Student</DialogTitle>
          <DialogDescription>
            Upload a document on behalf of this student. It will be visible in their document library.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className={cn(
              "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors",
              selectedFile ? "border-primary" : "border-border"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              data-testid="input-admin-file-upload"
            />
            {compressing ? (
              <div className="space-y-1">
                <svg className="animate-spin h-10 w-10 mx-auto text-primary" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                <p className="font-medium text-sm">Compressing…</p>
              </div>
            ) : selectedFile ? (
              <div className="space-y-1">
                <FileText className="h-10 w-10 mx-auto text-primary" />
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                {compressionLabel && (
                  <p className="text-xs text-green-600">{compressionLabel}</p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setCompressionLabel(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="font-medium text-sm">Drop file here or click to browse</p>
                <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, PNG (Max 10MB)</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="admin-doc-type">Document Type</Label>
              <Select name="type" defaultValue="other">
                <SelectTrigger data-testid="select-admin-doc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-doc-folder">Folder</Label>
              <Select name="folderId" defaultValue="none">
                <SelectTrigger data-testid="select-admin-doc-folder">
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Documents (No Folder)</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-doc-title">Title (Optional)</Label>
            <Input
              id="admin-doc-title"
              name="title"
              placeholder="Leave blank to use filename"
              data-testid="input-admin-doc-title"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-doc-expiry">Expiry Date (Optional)</Label>
            <Input
              id="admin-doc-expiry"
              name="expiryDate"
              type="date"
              data-testid="input-admin-doc-expiry"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedFile || uploadMutation.isPending || compressing}
              data-testid="button-submit-admin-upload"
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Export ────────────────────────────────────────────────────

export function StudentDocumentOrganizer({
  studentProfileId,
  compact = false,
  applicationId,
  applicationDocuments,
  onRequestDoc,
  onUploadDoc,
  onAttachDoc,
  onVerifyDoc,
  onDeleteDoc,
  onViewAppDoc,
  onDownloadAppDoc,
  onViewLibraryDoc,
  onDownloadLibraryDoc,
}: StudentDocumentOrganizerProps) {
  const hasAppDocs = applicationDocuments !== undefined;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>(hasAppDocs ? "__app__" : "__all__");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [uploadOpen, setUploadOpen] = useState(false);

  const { user, isAdmin, isCTO } = useAuth();

  const { data: libraryDocuments = [], isLoading } = useQuery<LibraryDocument[]>({
    queryKey: [`/api/admin/students/${studentProfileId}/documents`],
    enabled: !!studentProfileId,
  });

  const { data: apiFolders = [] } = useQuery<DocumentFolder[]>({
    queryKey: [`/api/admin/students/${studentProfileId}/folders`],
    enabled: !!studentProfileId,
  });

  // ── Derived state ──────────────────────────────────────────────

  const refreshDocs = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/admin/students/${studentProfileId}/documents`] });
  };

  const refreshAfterUpload = () => {
    setUploadOpen(false);
    refreshDocs();
  };

  const isAppView = selectedFolderId === "__app__" || selectedFolderId.startsWith("__stage_");
  const selectedStageName = selectedFolderId.startsWith("__stage_")
    ? selectedFolderId.slice("__stage_".length)
    : null;

  const appDocsByStage = (applicationDocuments ?? []).reduce((acc, doc) => {
    if (!acc[doc.stage]) acc[doc.stage] = [];
    acc[doc.stage].push(doc);
    return acc;
  }, {} as Record<string, AppDocument[]>);

  const stagesWithDocs = ALL_STAGES.filter(s => (appDocsByStage[s]?.length ?? 0) > 0);
  const totalAppDocs = applicationDocuments?.length ?? 0;

  const attachedLibraryDocIds = new Set<string>(
    (applicationDocuments ?? []).filter(d => d.documentId).map(d => d.documentId!)
  );

  const baseStageView: Record<string, AppDocument[]> = selectedStageName
    ? { [selectedStageName]: appDocsByStage[selectedStageName] ?? [] }
    : appDocsByStage;

  const visibleAppDocsByStage = searchQuery
    ? (Object.fromEntries(
        Object.entries(baseStageView)
          .map(([s, docs]) => [s, docs.filter(d =>
            d.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.documentType.toLowerCase().includes(searchQuery.toLowerCase())
          )])
          .filter(([, docs]) => (docs as AppDocument[]).length > 0)
      ) as Record<string, AppDocument[]>)
    : baseStageView;

  const hasVisibleAppDocs = Object.values(visibleAppDocsByStage).some(d => d.length > 0);

  const sidebarFolders = apiFolders.length > 0
    ? [{ id: "__all__", name: "All Documents", color: "#6b7280", isDefault: true, sortOrder: 0 }, ...apiFolders]
    : [{ id: "__all__", name: "All Documents", color: "#6b7280", isDefault: true, sortOrder: 0 }];

  const folderFilteredDocs = selectedFolderId === "__all__"
    ? libraryDocuments
    : libraryDocuments.filter(d => d.folderId === selectedFolderId);

  const visibleLibraryDocs = searchQuery
    ? folderFilteredDocs.filter(d =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : folderFilteredDocs;

  const countForFolder = (folderId: string) =>
    folderId === "__all__" ? libraryDocuments.length : libraryDocuments.filter(d => d.folderId === folderId).length;

  const overallStats = {
    total: libraryDocuments.length,
    pending: libraryDocuments.filter(d => d.status === "pending").length,
    verified: libraryDocuments.filter(d => d.status === "verified" || d.status === "approved").length,
    rejected: libraryDocuments.filter(d => d.status === "rejected").length,
  };

  // ── Loading ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Loading documents...</CardContent>
      </Card>
    );
  }

  // ── Compact mode ───────────────────────────────────────────────
  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Folder className="h-5 w-5" />Student Documents
              </CardTitle>
              <div className="flex items-center gap-3 text-sm flex-wrap mt-1">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />{overallStats.pending} Pending
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" />{overallStats.verified} Verified
                </span>
                {overallStats.rejected > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" />{overallStats.rejected} Rejected
                  </span>
                )}
              </div>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => setUploadOpen(true)} data-testid="button-admin-upload-compact">
                <Upload className="h-4 w-4 mr-1.5" />Upload
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {libraryDocuments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No documents uploaded</p>
          ) : (
            libraryDocuments.slice(0, 5).map(doc => (
              <LibraryDocumentRow
                key={doc.id}
                doc={doc}
                currentUserId={user?.id}
                isCTO={isCTO}
                studentProfileId={studentProfileId}
                onDeleted={refreshDocs}
              />
            ))
          )}
          {libraryDocuments.length > 5 && (
            <p className="text-center text-sm text-muted-foreground pt-2">+{libraryDocuments.length - 5} more documents</p>
          )}
        </CardContent>

        <AdminUploadDialog
          studentProfileId={studentProfileId}
          folders={apiFolders}
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onSuccess={refreshAfterUpload}
        />
      </Card>
    );
  }

  // ── Panel title ────────────────────────────────────────────────
  const panelTitle = isAppView
    ? (selectedStageName
        ? (STAGE_CONFIG[selectedStageName as keyof typeof STAGE_CONFIG]?.displayName ?? selectedStageName)
        : "Application Documents")
    : (selectedFolderId === "__all__"
        ? "All Documents"
        : (sidebarFolders.find(f => f.id === selectedFolderId)?.name ?? "Documents"));

  const panelDocCount = isAppView
    ? (selectedStageName ? (appDocsByStage[selectedStageName]?.length ?? 0) : totalAppDocs)
    : overallStats.total;

  // ── Full two-column view ───────────────────────────────────────
  return (
    <div className="flex gap-4 items-start">
      {/* ── Left sidebar ──────────────────────────────────────── */}
      <div className="w-52 shrink-0">

        {/* Application group */}
        {hasAppDocs && (
          <>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 pt-1 pb-1">Application</p>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2 h-8 px-2 text-sm",
                selectedFolderId === "__app__" && "bg-primary text-primary-foreground"
              )}
              onClick={() => setSelectedFolderId("__app__")}
              data-testid="button-folder-app"
            >
              <Layers className={cn("h-4 w-4 shrink-0", selectedFolderId === "__app__" ? "text-primary-foreground" : "text-blue-600")} />
              <span className="truncate flex-1 text-left">Application Docs</span>
              <span className={cn("text-xs ml-auto", selectedFolderId === "__app__" ? "text-primary-foreground/70" : "text-muted-foreground")}>{totalAppDocs}</span>
            </Button>
            {stagesWithDocs.map(stage => {
              const stageKey = `__stage_${stage}`;
              const isSelected = selectedFolderId === stageKey;
              const cfg = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG];
              return (
                <Button
                  key={stageKey}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2 h-7 pl-6 pr-2 text-xs",
                    isSelected && "bg-primary/10 text-primary font-medium"
                  )}
                  onClick={() => setSelectedFolderId(stageKey)}
                  data-testid={`button-folder-stage-${stage}`}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg?.dotColor || "bg-gray-400")} />
                  <span className="truncate flex-1 text-left">{cfg?.displayName ?? stage}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{appDocsByStage[stage]?.length ?? 0}</span>
                </Button>
              );
            })}
            <div className="py-2 px-2">
              <Separator />
            </div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 pb-1">Student Library</p>
          </>
        )}

        {/* Student library folders */}
        {!hasAppDocs && (
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 pt-1 pb-1">Folders</p>
        )}
        {sidebarFolders.map(folder => {
          const count = countForFolder(folder.id);
          const isSelected = !isAppView && selectedFolderId === folder.id;
          return (
            <Button
              key={folder.id}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2 h-8 px-2 text-sm",
                isSelected && "bg-primary text-primary-foreground"
              )}
              onClick={() => setSelectedFolderId(folder.id)}
              data-testid={`button-folder-${folder.id}`}
            >
              {isSelected
                ? <FolderOpen className="h-4 w-4 shrink-0 text-primary-foreground" />
                : <Folder className="h-4 w-4 shrink-0" style={{ color: folder.color }} />
              }
              <span className="truncate flex-1 text-left">{folder.name}</span>
              <span className={cn("text-xs ml-auto", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>{count}</span>
            </Button>
          );
        })}
      </div>

      {/* ── Right document panel ──────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  {isAppView ? <Layers className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                  {panelTitle}
                </CardTitle>
                <CardDescription className="mt-0.5">
                  {isAppView
                    ? `${panelDocCount} document${panelDocCount !== 1 ? "s" : ""}`
                    : `${overallStats.total} total · ${overallStats.pending} pending review`
                  }
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="pl-9 w-[150px]"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    data-testid="input-search-admin-docs"
                  />
                </div>
                {!isAppView && (
                  <div className="flex items-center gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant={viewMode === "grid" ? "secondary" : "ghost"}
                          onClick={() => setViewMode("grid")}
                          data-testid="button-view-grid"
                        >
                          <Grid3x3 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Grid view</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant={viewMode === "list" ? "secondary" : "ghost"}
                          onClick={() => setViewMode("list")}
                          data-testid="button-view-list"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>List view</TooltipContent>
                    </Tooltip>
                  </div>
                )}
                {onRequestDoc && (
                  <Button variant="outline" size="sm" onClick={onRequestDoc} data-testid="button-request-document">
                    <Send className="h-3.5 w-3.5 mr-1" />Request
                  </Button>
                )}
                {onUploadDoc && (
                  <Button size="sm" onClick={onUploadDoc} data-testid="button-upload-document">
                    <Plus className="h-3.5 w-3.5 mr-1" />Upload Document
                  </Button>
                )}
                {!isAppView && isAdmin && (
                  <Button size="sm" onClick={() => setUploadOpen(true)} data-testid="button-admin-upload-doc">
                    <Upload className="h-3.5 w-3.5 mr-1" />Upload
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* ── Application Documents view ─────────────────── */}
            {isAppView && (
              <>
                {!hasVisibleAppDocs ? (
                  <div className="py-10 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">{searchQuery ? `No results for "${searchQuery}"` : "No documents yet"}</p>
                    {!searchQuery && <p className="text-xs mt-1">Request or upload documents to get started</p>}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ALL_STAGES.filter(s => (visibleAppDocsByStage[s]?.length ?? 0) > 0).map(stage => {
                      const cfg = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG];
                      return (
                        <div key={stage}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={cn("w-2 h-2 rounded-full", cfg?.dotColor || "bg-gray-400")} />
                            <span className="text-xs font-semibold text-muted-foreground uppercase">
                              {cfg?.displayName ?? stage}
                            </span>
                            <Badge variant="secondary" className="h-4 px-1 text-[10px] no-default-active-elevate">
                              {visibleAppDocsByStage[stage].length}
                            </Badge>
                          </div>
                          <div className="space-y-2 ml-4">
                            {visibleAppDocsByStage[stage].map(doc => (
                              <AppDocumentRow
                                key={doc.id}
                                doc={doc}
                                applicationId={applicationId ?? ""}
                                onVerify={onVerifyDoc}
                                onDelete={onDeleteDoc}
                                onView={onViewAppDoc}
                                onDownload={onDownloadAppDoc}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── Student Library view ───────────────────────── */}
            {!isAppView && (
              <>
                {visibleLibraryDocs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {searchQuery ? `No results for "${searchQuery}"` : "No documents in this folder"}
                  </p>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {visibleLibraryDocs.map(doc => (
                      <LibraryDocumentCard
                        key={doc.id}
                        doc={doc}
                        onAttach={onAttachDoc}
                        isAttached={attachedLibraryDocIds.has(doc.id)}
                        onView={onViewLibraryDoc}
                        onDownload={onDownloadLibraryDoc}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visibleLibraryDocs.map(doc => (
                      <LibraryDocumentRow
                        key={doc.id}
                        doc={doc}
                        onAttach={onAttachDoc}
                        isAttached={attachedLibraryDocIds.has(doc.id)}
                        onView={onViewLibraryDoc}
                        onDownload={onDownloadLibraryDoc}
                        currentUserId={user?.id}
                        isCTO={isCTO}
                        studentProfileId={studentProfileId}
                        onDeleted={refreshDocs}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AdminUploadDialog
        studentProfileId={studentProfileId}
        folders={apiFolders}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={refreshAfterUpload}
      />
    </div>
  );
}
