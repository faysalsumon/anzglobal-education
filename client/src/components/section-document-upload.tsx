/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  File,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  Paperclip,
  Loader2,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useFileCompressor, type CompressionResult } from "@/hooks/useFileCompressor";

interface Document {
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
  createdAt: Date;
}

export const SECTION_DOCUMENT_MAPPING = {
  passport_visa: {
    types: ["passport", "visa"],
    label: "Passport & Visa Documents",
    description: "Your passport is required for all applications. A visa copy is needed if you currently hold one.",
    requiredTypes: [
      {
        type: "passport",
        label: "Passport Copy",
        required: true,
        hint: "Scan the photo/personal details page clearly. Include all pages with existing visa stamps. Passport must be valid for at least 6 months from your intended course start date.",
      },
      {
        type: "visa",
        label: "Visa Copy",
        required: false,
        hint: "Upload your current visa grant notice or physical visa stamp. Include both front and back if it is a physical sticker. If you are on a student visa, include the grant letter.",
      },
    ],
  },
  education: {
    types: ["transcript", "diploma"],
    label: "Education Documents",
    description: "Official academic records proving your highest level of education completed.",
    requiredTypes: [
      {
        type: "transcript",
        label: "Academic Transcript",
        required: true,
        hint: "Official transcripts showing all subjects, grades, and GPA from each institution attended. Documents must be in English or accompanied by a certified translation.",
      },
      {
        type: "diploma",
        label: "Diploma / Degree Certificate",
        required: false,
        hint: "Official degree or diploma certificate issued by your institution. If you have not yet graduated, upload an enrolment confirmation letter or expected graduation statement.",
      },
    ],
  },
  english_proficiency: {
    types: ["language_test"],
    label: "English Test Results",
    description: "Required by most Australian institutions. Your test result must typically be no more than 2 years old at the time of application.",
    requiredTypes: [
      {
        type: "language_test",
        label: "IELTS / PTE / TOEFL Score Report",
        required: true,
        hint: "Official score report from your test provider showing the test date, overall band/score, and individual sub-scores (Listening, Reading, Writing, Speaking). Accepted tests: IELTS Academic, PTE Academic, TOEFL iBT, Duolingo English Test.",
      },
    ],
  },
  financial: {
    types: ["financial"],
    label: "Financial Documents",
    description: "Proof of sufficient funds to cover tuition fees and living costs for your study period.",
    requiredTypes: [
      {
        type: "financial",
        label: "Bank Statement / Sponsor Letter",
        required: true,
        hint: "Bank statements from the last 3–6 months showing your full name, account number, and current balance. If sponsored, include a sponsor letter stating the relationship to you along with their bank statement confirming available funds.",
      },
    ],
  },
  work_experience: {
    types: ["cv", "recommendation"],
    label: "Work & Reference Documents",
    description: "Optional but strengthens your application, especially for postgraduate and professional programs.",
    requiredTypes: [
      {
        type: "cv",
        label: "CV / Resume",
        required: false,
        hint: "Your most up-to-date CV or resume including all work history, education, and key skills. Keep it to 2 pages where possible. Save as a PDF to preserve formatting.",
      },
      {
        type: "recommendation",
        label: "Letter of Recommendation",
        required: false,
        hint: "Written on official letterhead and signed by a previous employer, manager, or academic supervisor. Should describe your skills, character, and suitability for further study.",
      },
    ],
  },
  sop: {
    types: ["sop"],
    label: "Statement of Purpose",
    description: "A personal essay explaining your study goals and why you chose this course. Typically 500–800 words.",
    requiredTypes: [
      {
        type: "sop",
        label: "Statement of Purpose (PDF / DOC)",
        required: false,
        hint: "Cover the following: why you chose this specific course and institution, your academic and professional background, your career goals after graduation, and why studying in Australia aligns with those goals. Aim for 500–800 words.",
      },
    ],
  },
} as const;

export type ProfileSection = keyof typeof SECTION_DOCUMENT_MAPPING;

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  verified: { label: "Verified", icon: CheckCircle, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  reviewed: { label: "Reviewed", icon: CheckCircle, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
};

interface SectionDocumentUploadProps {
  section: ProfileSection;
  compact?: boolean;
  showDocumentList?: boolean;
  onDocumentChange?: () => void;
}

export function SectionDocumentUpload({
  section,
  compact = false,
  showDocumentList = true,
  onDocumentChange,
}: SectionDocumentUploadProps) {
  const { toast } = useToast();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const sectionConfig = SECTION_DOCUMENT_MAPPING[section];

  const { data: allDocuments = [] } = useQuery<Document[]>({
    queryKey: ["/api/student/documents"],
  });

  const sectionDocuments = allDocuments.filter((doc) =>
    (sectionConfig.types as readonly string[]).includes(doc.type)
  );

  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest("DELETE", `/api/student/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/documents"] });
      setDeleteDialogOpen(false);
      setSelectedDocument(null);
      toast({ title: "Success", description: "Document deleted successfully" });
      onDocumentChange?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const _getFileIcon = (mimeType: string) => {
    if (mimeType?.includes("pdf")) return FileText;
    return File;
  };

  const openUploadDialog = (docType?: string) => {
    setSelectedDocType(docType || sectionConfig.types[0]);
    setUploadDialogOpen(true);
  };

  const hasDocumentOfType = (type: string) =>
    sectionDocuments.some((doc) => doc.type === type);

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {sectionDocuments.length} document{sectionDocuments.length !== 1 ? "s" : ""} attached
            </span>
          </div>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openUploadDialog()}
                data-testid={`button-upload-${section}`}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{sectionConfig.label}</DialogTitle>
                <DialogDescription>{sectionConfig.description}</DialogDescription>
              </DialogHeader>
              <SectionUploadForm
                section={section}
                defaultType={selectedDocType || sectionConfig.types[0]}
                onSuccess={() => {
                  setUploadDialogOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/student/documents"] });
                  onDocumentChange?.();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {sectionDocuments.length > 0 && showDocumentList && (
          <div className="flex flex-wrap gap-2">
            {sectionDocuments.map((doc) => {
              const StatusIcon = statusConfig[doc.status as keyof typeof statusConfig]?.icon || Clock;
              return (
                <Badge
                  key={doc.id}
                  variant="secondary"
                  className="flex items-center gap-1 pl-2 pr-1 py-1"
                  data-testid={`badge-document-${doc.id}`}
                >
                  <StatusIcon className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">{doc.fileName}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-4 w-4 ml-1 hover:bg-destructive/20"
                    onClick={() => {
                      setSelectedDocument(doc);
                      setDeleteDialogOpen(true);
                    }}
                    data-testid={`button-delete-inline-${doc.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </Badge>
              );
            })}
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedDocument?.fileName}"? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedDocument && deleteDocumentMutation.mutate(selectedDocument.id)}
                disabled={deleteDocumentMutation.isPending}
              >
                {deleteDocumentMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                {sectionConfig.label}
              </h4>
              <p className="text-sm text-muted-foreground">{sectionConfig.description}</p>
            </div>
          </div>

          <div className="space-y-2">
            {sectionConfig.requiredTypes.map((docType) => {
              const { type, label, required } = docType;
              const hint = (docType as { hint?: string }).hint;
              const uploaded = hasDocumentOfType(type);
              const docs = sectionDocuments.filter((d) => d.type === type);

              return (
                <div
                  key={type}
                  className={cn(
                    "rounded-lg border",
                    uploaded ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800" : "bg-muted/30"
                  )}
                  data-testid={`section-doc-${section}-${type}`}
                >
                  <div className="flex items-start justify-between p-3 gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {uploaded ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <div className={cn(
                            "h-5 w-5 rounded-full border-2",
                            required ? "border-orange-400" : "border-muted-foreground/40"
                          )} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-1">
                          <span className="font-medium text-sm">{label}</span>
                          {required && !uploaded && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-300 text-orange-600">
                              Required
                            </Badge>
                          )}
                        </div>
                        {hint && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed italic">
                            {hint}
                          </p>
                        )}
                        {docs.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {docs.map((doc) => (
                              <Badge
                                key={doc.id}
                                variant="secondary"
                                className={cn(
                                  "text-[10px] px-1.5 py-0",
                                  statusConfig[doc.status as keyof typeof statusConfig]?.color
                                )}
                              >
                                {doc.fileName} ({formatFileSize(doc.fileSize || 0)})
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <Dialog open={uploadDialogOpen && selectedDocType === type} onOpenChange={(open) => {
                      if (!open) setUploadDialogOpen(false);
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant={uploaded ? "outline" : "default"}
                          onClick={() => openUploadDialog(type)}
                          data-testid={`button-upload-${type}`}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          {uploaded ? "Add More" : "Upload"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Upload {label}</DialogTitle>
                          <DialogDescription asChild>
                            <div className="space-y-2">
                              <p>{sectionConfig.description}</p>
                              {hint && (
                                <div className="rounded-md bg-muted/60 px-3 py-2">
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    <span className="font-medium text-foreground">What to include: </span>
                                    {hint}
                                  </p>
                                </div>
                              )}
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                        <SectionUploadForm
                          section={section}
                          defaultType={type}
                          onSuccess={() => {
                            setUploadDialogOpen(false);
                            queryClient.invalidateQueries({ queryKey: ["/api/student/documents"] });
                            onDocumentChange?.();
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SectionUploadFormProps {
  section: ProfileSection;
  defaultType: string;
  onSuccess: () => void;
}

function SectionUploadForm({ section, defaultType, onSuccess }: SectionUploadFormProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const { compress, compressing } = useFileCompressor();

  const { data: existingDocuments = [] } = useQuery<Document[]>({
    queryKey: ["/api/student/documents"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/student/documents/upload", formData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Document uploaded successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to upload document";
      if (message.includes("duplicate")) {
        toast({
          title: "Duplicate Detected",
          description: "This document appears to already be uploaded.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    },
  });

  const checkForDuplicate = (file: File) => {
    const duplicate = existingDocuments.find(
      (doc) => doc.fileName === file.name && doc.fileSize === file.size
    );
    if (duplicate) {
      setDuplicateWarning(`A file with the same name and size already exists: "${file.name}"`);
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setCompressionResult(null);
      checkForDuplicate(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setCompressionResult(null);
      checkForDuplicate(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) return;

    const description = (e.currentTarget.elements.namedItem("description") as HTMLInputElement)?.value;

    const result = await compress(selectedFile);
    setCompressionResult(result);

    const formData = new FormData();
    formData.append("file", result.file);
    formData.append("type", defaultType);
    formData.append("title", result.file.name);
    if (description) {
      formData.append("description", description);
    }

    uploadMutation.mutate(formData);
  };

  const sectionConfig = SECTION_DOCUMENT_MAPPING[section];
  const typeLabel = sectionConfig.requiredTypes.find((t) => t.type === defaultType)?.label || defaultType;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-border",
          selectedFile && "border-primary bg-primary/5"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="section-file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
          data-testid="input-section-file-upload"
        />
        {selectedFile ? (
          <div className="space-y-2">
            <FileText className="h-10 w-10 mx-auto text-primary" />
            <p className="font-medium text-sm">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
            {selectedFile.size > 8 * 1024 * 1024 && !compressing && !compressionResult && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1" data-testid="text-large-file-warning-section">
                <Info className="h-3 w-3" />
                This file is large — it will be compressed before upload
              </p>
            )}
            {compressing && (
              <p className="text-sm text-primary flex items-center justify-center gap-1.5" data-testid="text-compressing-section">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Compressing…
              </p>
            )}
            {compressionResult?.wasCompressed && !compressing && (
              <p className="text-xs text-green-700 dark:text-green-400" data-testid="text-compression-result-section">
                Compressed from {compressionResult.originalMB.toFixed(2)} MB → {compressionResult.compressedMB.toFixed(2)} MB
              </p>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                setDuplicateWarning(null);
                setCompressionResult(null);
              }}
              data-testid="button-remove-section-file"
            >
              Remove
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-medium text-sm">Drop your {typeLabel} here</p>
            <p className="text-xs text-muted-foreground">
              PDF, DOC, DOCX, JPG, PNG (Max 10MB)
            </p>
          </div>
        )}
      </div>

      {duplicateWarning && (
        <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {duplicateWarning}
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            You can still upload if this is a different version.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Input
          id="description"
          name="description"
          placeholder="Add notes about this document"
          data-testid="input-section-description"
        />
      </div>

      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">
          Document will be tagged as: <Badge variant="secondary" className="ml-1">{typeLabel}</Badge>
        </p>
      </div>

      <DialogFooter>
        <Button
          type="submit"
          disabled={!selectedFile || compressing || uploadMutation.isPending}
          data-testid="button-submit-section-upload"
        >
          {compressing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Compressing…
            </>
          ) : uploadMutation.isPending ? (
            "Uploading..."
          ) : (
            "Upload Document"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SectionDocumentSummary({ section }: { section: ProfileSection }) {
  const { data: allDocuments = [] } = useQuery<Document[]>({
    queryKey: ["/api/student/documents"],
  });

  const sectionConfig = SECTION_DOCUMENT_MAPPING[section];
  const sectionDocuments = allDocuments.filter((doc) =>
    (sectionConfig.types as readonly string[]).includes(doc.type)
  );

  const requiredCount = sectionConfig.requiredTypes.filter((t) => t.required).length;
  const uploadedRequiredCount = sectionConfig.requiredTypes.filter(
    (t) => t.required && sectionDocuments.some((d) => d.type === t.type)
  ).length;

  if (sectionDocuments.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        No documents ({uploadedRequiredCount}/{requiredCount} required)
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Paperclip className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">
        {sectionDocuments.length} doc{sectionDocuments.length !== 1 ? "s" : ""}
        {requiredCount > 0 && ` (${uploadedRequiredCount}/${requiredCount} required)`}
      </span>
    </div>
  );
}
