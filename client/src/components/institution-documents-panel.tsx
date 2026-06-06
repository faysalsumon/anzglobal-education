/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCsrfToken } from "@/hooks/useCsrf";
import { supabase } from "@/lib/supabase";
import { Upload, Download, Trash2, FileText, FolderOpen, File, Plus, Lock, Eye } from "lucide-react";
import { DocumentPreviewModal } from "@/components/document-preview-modal";

const DOCUMENT_CATEGORIES = [
  { value: "application_forms", label: "Application Forms", icon: FileText },
  { value: "brochures", label: "Brochures", icon: FolderOpen },
  { value: "contracts", label: "Contracts", icon: Lock },
  { value: "marketing", label: "Marketing", icon: FolderOpen },
  { value: "agreements", label: "Agreements", icon: FileText },
  { value: "other", label: "Other", icon: File },
];

interface InstitutionDocument {
  id: string;
  institutionId: string;
  fileName: string;
  originalFileName: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  category: string;
  description: string | null;
  isConfidential: boolean;
  createdAt: string;
  uploadedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
}

interface InstitutionDocumentsPanelProps {
  institutionId: string;
  institutionName: string;
}

export function InstitutionDocumentsPanel({ institutionId, institutionName: _institutionName }: InstitutionDocumentsPanelProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [uploadCategory, setUploadCategory] = useState("other");
  const [uploadDescription, setUploadDescription] = useState("");
  const [isConfidential, setIsConfidential] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDocument, setPreviewDocument] = useState<InstitutionDocument | null>(null);

  const documentsUrl = selectedCategory === "all"
    ? `/api/admin/institution-crm/institutions/${institutionId}/documents`
    : `/api/admin/institution-crm/institutions/${institutionId}/documents?category=${selectedCategory}`;

  const { data: documents = [], isLoading } = useQuery<InstitutionDocument[]>({
    queryKey: [documentsUrl],
    enabled: !!institutionId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Get CSRF token and Supabase session for auth
      const csrfToken = await getCsrfToken();
      const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } };
      
      const headers: Record<string, string> = {
        "X-CSRF-Token": csrfToken,
      };
      
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      
      const res = await fetch(`/api/admin/institution-crm/institutions/${institutionId}/documents`, {
        method: "POST",
        credentials: "include",
        headers,
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Document uploaded successfully" });
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.includes(`/api/admin/institution-crm/institutions/${institutionId}/documents`);
      }});
      setIsUploadDialogOpen(false);
      resetUploadForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to upload document",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return apiRequest("DELETE", `/api/admin/institution-crm/institutions/${institutionId}/documents/${documentId}`);
    },
    onSuccess: () => {
      toast({ title: "Document deleted successfully" });
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.includes(`/api/admin/institution-crm/institutions/${institutionId}/documents`);
      }});
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete document",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const resetUploadForm = () => {
    setSelectedFile(null);
    setUploadCategory("other");
    setUploadDescription("");
    setIsConfidential(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast({ title: "Please select a file", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("category", uploadCategory);
    formData.append("description", uploadDescription);
    formData.append("isConfidential", String(isConfidential));
    uploadMutation.mutate(formData);
  };

  const handleDownload = async (doc: InstitutionDocument) => {
    try {
      const res = await fetch(
        `/api/admin/institution-crm/institutions/${institutionId}/documents/${doc.id}/download`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalFileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast({
        title: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryLabel = (category: string) => {
    return DOCUMENT_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const groupedDocuments = DOCUMENT_CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = documents.filter((d) => d.category === cat.value);
    return acc;
  }, {} as Record<string, InstitutionDocument[]>);

  return (
    <>
    <Card data-testid="card-institution-documents">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Documents
            </CardTitle>
            <CardDescription>Manage documents, contracts, and marketing materials</CardDescription>
          </div>
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-upload-document">
                <Plus className="h-4 w-4 mr-1" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>File</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    data-testid="input-document-file"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={uploadCategory} onValueChange={setUploadCategory}>
                    <SelectTrigger data-testid="select-document-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value} data-testid={`option-category-${cat.value}`}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="Add a description..."
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    rows={2}
                    data-testid="textarea-document-description"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isConfidential"
                    checked={isConfidential}
                    onChange={(e) => setIsConfidential(e.target.checked)}
                    className="rounded border-border"
                    data-testid="checkbox-document-confidential"
                  />
                  <Label htmlFor="isConfidential" className="font-normal cursor-pointer">
                    Mark as confidential (internal only)
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)} data-testid="button-cancel-upload">
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                  data-testid="button-confirm-upload"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {uploadMutation.isPending ? "Uploading..." : "Upload"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="text-loading-documents">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="text-no-documents">
            No documents uploaded yet. Click "Upload Document" to get started.
          </div>
        ) : (
          <Tabs defaultValue="all" onValueChange={setSelectedCategory}>
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="all" data-testid="tab-documents-all">All ({documents.length})</TabsTrigger>
              {DOCUMENT_CATEGORIES.map((cat) => {
                const count = groupedDocuments[cat.value]?.length || 0;
                if (count === 0) return null;
                return (
                  <TabsTrigger key={cat.value} value={cat.value} data-testid={`tab-documents-${cat.value}`}>
                    {cat.label} ({count})
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <TabsContent value="all" className="space-y-2">
              {documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  onView={() => setPreviewDocument(doc)}
                  onDownload={() => handleDownload(doc)}
                  onDelete={() => deleteMutation.mutate(doc.id)}
                  isDeleting={deleteMutation.isPending}
                  getCategoryLabel={getCategoryLabel}
                  formatFileSize={formatFileSize}
                />
              ))}
            </TabsContent>
            {DOCUMENT_CATEGORIES.map((cat) => (
              <TabsContent key={cat.value} value={cat.value} className="space-y-2">
                {groupedDocuments[cat.value]?.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onView={() => setPreviewDocument(doc)}
                    onDownload={() => handleDownload(doc)}
                    onDelete={() => deleteMutation.mutate(doc.id)}
                    isDeleting={deleteMutation.isPending}
                    getCategoryLabel={getCategoryLabel}
                    formatFileSize={formatFileSize}
                  />
                ))}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>

    {/* Document Preview Modal - outside Card for proper z-index */}
    <DocumentPreviewModal
      open={!!previewDocument}
      onOpenChange={(open) => !open && setPreviewDocument(null)}
      documentUrl={previewDocument ? `/api/admin/institution-crm/institutions/${institutionId}/documents/${previewDocument.id}/download` : ""}
      documentName={previewDocument?.originalFileName || ""}
      mimeType={previewDocument?.mimeType || undefined}
    />
  </>
  );
}

function DocumentRow({
  doc,
  onView,
  onDownload,
  onDelete,
  isDeleting,
  getCategoryLabel,
  formatFileSize,
}: {
  doc: InstitutionDocument;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  getCategoryLabel: (category: string) => string;
  formatFileSize: (bytes: number | null) => string;
}) {
  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border bg-card"
      data-testid={`document-item-${doc.id}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{doc.originalFileName}</span>
            {doc.isConfidential && (
              <Lock className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {getCategoryLabel(doc.category)}
            </Badge>
            <span>{formatFileSize(doc.fileSize)}</span>
            {doc.uploadedBy && (
              <span>by {doc.uploadedBy.firstName} {doc.uploadedBy.lastName}</span>
            )}
          </div>
          {doc.description && (
            <p className="text-sm text-muted-foreground truncate mt-1">{doc.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onView}
          data-testid={`button-view-${doc.id}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onDownload}
          data-testid={`button-download-${doc.id}`}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          disabled={isDeleting}
          data-testid={`button-delete-${doc.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
