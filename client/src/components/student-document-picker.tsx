/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Search, CheckCircle, Clock, XCircle, FolderOpen, Upload, Loader2, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFileCompressor, type CompressionResult } from "@/hooks/useFileCompressor";

interface PersonalDocument {
  id: string;
  type: string;
  title: string;
  fileName: string;
  fileSize: number | null;
  status: string;
  createdAt: string;
}

interface StudentDocumentPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (document: PersonalDocument) => void;
  onUploadAndAttach?: (file: File, type: string, title: string) => void;
  currentStage?: string;
  excludeDocumentIds?: string[];
  applicationId?: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  passport: "Passport",
  transcript: "Academic Transcript",
  diploma: "Diploma/Degree",
  language_test: "Language Test",
  visa: "Visa Document",
  cv: "CV/Resume",
  recommendation: "Recommendation Letter",
  financial: "Financial Document",
  other: "Other",
};

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", label: "Pending" },
  verified: { icon: CheckCircle, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "Verified" },
  rejected: { icon: XCircle, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", label: "Rejected" },
};

export function StudentDocumentPicker({ 
  open, 
  onOpenChange, 
  onSelect,
  applicationId,
  excludeDocumentIds = [],
}: StudentDocumentPickerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<PersonalDocument | null>(null);
  
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<string>("");
  const [uploadTitle, setUploadTitle] = useState<string>("");
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const { compress, compressing } = useFileCompressor();

  const { data: documents = [], isLoading } = useQuery<PersonalDocument[]>({
    queryKey: ["/api/student/documents"],
    enabled: open,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/student/documents/upload", formData);
      return response.json();
    },
    onSuccess: async (data) => {
      toast({
        title: "Document Uploaded",
        description: "Your document has been uploaded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/student/documents"] });
      
      const newDocument: PersonalDocument = {
        id: data.id,
        type: data.type,
        title: data.title,
        fileName: data.fileName,
        fileSize: data.fileSize,
        status: data.status || "pending",
        createdAt: data.createdAt,
      };
      
      onSelect(newDocument);
      resetUploadForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document.",
        variant: "destructive",
      });
    },
  });

  const filteredDocuments = documents
    .filter(doc => !excludeDocumentIds.includes(doc.id))
    .filter(doc => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(query) ||
        doc.type.toLowerCase().includes(query) ||
        doc.fileName.toLowerCase().includes(query)
      );
    });

  const handleSelect = () => {
    if (selectedDoc) {
      onSelect(selectedDoc);
      setSelectedDoc(null);
      onOpenChange(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setCompressionResult(null);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadType || !uploadTitle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a file, document type, and title.",
        variant: "destructive",
      });
      return;
    }

    const result = await compress(uploadFile);
    setCompressionResult(result);

    const formData = new FormData();
    formData.append("file", result.file);
    formData.append("type", uploadType);
    formData.append("title", uploadTitle.trim());
    if (applicationId) {
      formData.append("applicationId", applicationId);
    }

    uploadMutation.mutate(formData);
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadType("");
    setUploadTitle("");
    setCompressionResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        resetUploadForm();
        setSelectedDoc(null);
        setSearchQuery("");
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-document-picker">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Attach Document
          </DialogTitle>
          <DialogDescription>
            Choose from your library or upload a new document.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "library" | "upload")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library" data-testid="tab-library">
              <FolderOpen className="h-4 w-4 mr-2" />
              My Library
            </TabsTrigger>
            <TabsTrigger value="upload" data-testid="tab-upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-documents"
              />
            </div>

            <ScrollArea className="h-[250px] border rounded-lg">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm text-muted-foreground">Loading documents...</div>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/20 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No documents match your search" : "No documents in your library"}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-xs mt-1 text-primary" 
                    onClick={() => setActiveTab("upload")}
                    data-testid="button-switch-to-upload"
                  >
                    Upload a new document
                  </Button>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {filteredDocuments.map((doc) => {
                    const statusConfig = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;
                    const isSelected = selectedDoc?.id === doc.id;

                    return (
                      <div
                        key={doc.id}
                        className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer hover-elevate ${
                          isSelected 
                            ? "border-primary bg-primary/5" 
                            : ""
                        }`}
                        onClick={() => setSelectedDoc(doc)}
                        data-testid={`doc-item-${doc.id}`}
                      >
                        <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-xs">
                              {DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(doc.fileSize)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`text-xs ${statusConfig.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button 
                onClick={handleSelect} 
                disabled={!selectedDoc}
                data-testid="button-attach-document"
              >
                Attach Document
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upload-file">Select File</Label>
                <div 
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover-elevate"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="upload-dropzone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="upload-file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileChange}
                    data-testid="input-file-upload"
                  />
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-medium">{uploadFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(uploadFile.size)}</p>
                        {uploadFile.size > 8 * 1024 * 1024 && !compressing && !compressionResult && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5" data-testid="text-large-file-warning-picker">
                            <Info className="h-3 w-3" />
                            This file is large — it will be compressed before upload
                          </p>
                        )}
                        {compressing && (
                          <p className="text-xs text-primary flex items-center gap-1 mt-0.5" data-testid="text-compressing-picker">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Compressing…
                          </p>
                        )}
                        {compressionResult?.wasCompressed && !compressing && (
                          <p className="text-xs text-green-700 dark:text-green-400 mt-0.5" data-testid="text-compression-result-picker">
                            Compressed from {compressionResult.originalMB.toFixed(2)} MB → {compressionResult.compressedMB.toFixed(2)} MB
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to select a file</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, JPG, PNG, GIF</p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="upload-type">Document Type</Label>
                <Select value={uploadType} onValueChange={setUploadType}>
                  <SelectTrigger data-testid="select-document-type">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value} data-testid={`option-type-${value}`}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="upload-title">Document Title</Label>
                <Input
                  id="upload-title"
                  placeholder="Enter document title"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  data-testid="input-document-title"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-upload">
                Cancel
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!uploadFile || !uploadType || !uploadTitle.trim() || compressing || uploadMutation.isPending}
                data-testid="button-upload-and-attach"
              >
                {compressing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Compressing…
                  </>
                ) : uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Attach
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
