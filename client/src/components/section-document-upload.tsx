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
  Download,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Plus,
  Paperclip,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
    description: "Upload your passport and visa documents",
    requiredTypes: [
      { type: "passport", label: "Passport Copy", required: true },
      { type: "visa", label: "Visa Copy", required: false },
    ],
  },
  education: {
    types: ["transcript", "diploma"],
    label: "Education Documents",
    description: "Upload your academic transcripts and certificates",
    requiredTypes: [
      { type: "transcript", label: "Academic Transcript", required: true },
      { type: "diploma", label: "Diploma/Degree Certificate", required: false },
    ],
  },
  english_proficiency: {
    types: ["language_test"],
    label: "English Test Results",
    description: "Upload your English proficiency test results",
    requiredTypes: [
      { type: "language_test", label: "IELTS/PTE/TOEFL Score Report", required: true },
    ],
  },
  financial: {
    types: ["financial"],
    label: "Financial Documents",
    description: "Upload bank statements and sponsor letters",
    requiredTypes: [
      { type: "financial", label: "Bank Statement / Sponsor Letter", required: true },
    ],
  },
  work_experience: {
    types: ["cv", "recommendation"],
    label: "Work & Reference Documents",
    description: "Upload your CV and recommendation letters",
    requiredTypes: [
      { type: "cv", label: "CV/Resume", required: false },
      { type: "recommendation", label: "Letter of Recommendation", required: false },
    ],
  },
  sop: {
    types: ["sop"],
    label: "Statement of Purpose",
    description: "Upload your statement of purpose document",
    requiredTypes: [
      { type: "sop", label: "Statement of Purpose (PDF/DOC)", required: false },
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

  const { data: allDocuments = [], isLoading } = useQuery<Document[]>({
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

  const getFileIcon = (mimeType: string) => {
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
            {sectionConfig.requiredTypes.map(({ type, label, required }) => {
              const uploaded = hasDocumentOfType(type);
              const docs = sectionDocuments.filter((d) => d.type === type);

              return (
                <div
                  key={type}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    uploaded ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800" : "bg-muted/30"
                  )}
                  data-testid={`section-doc-${section}-${type}`}
                >
                  <div className="flex items-center gap-3">
                    {uploaded ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className={cn(
                        "h-5 w-5 rounded-full border-2",
                        required ? "border-orange-400" : "border-muted-foreground/40"
                      )} />
                    )}
                    <div>
                      <span className="font-medium text-sm">{label}</span>
                      {required && !uploaded && (
                        <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 border-orange-300 text-orange-600">
                          Required
                        </Badge>
                      )}
                      {docs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
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
                        <DialogDescription>
                          {sectionConfig.description}
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
      checkForDuplicate(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      checkForDuplicate(file);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("type", defaultType);
    formData.append("title", selectedFile.name);
    
    const description = (e.currentTarget.elements.namedItem("description") as HTMLInputElement)?.value;
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                setDuplicateWarning(null);
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
          disabled={!selectedFile || uploadMutation.isPending}
          data-testid="button-submit-section-upload"
        >
          {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
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
