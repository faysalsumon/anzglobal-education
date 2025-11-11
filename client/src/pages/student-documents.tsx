import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Folder,
  FolderPlus,
  FileText,
  MoreVertical,
  Download,
  Trash2,
  Edit,
  File,
  Plus,
  Search,
  Grid3x3,
  List,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentFolder {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  sortOrder: number | null;
  itemCount?: number;
}

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
  uploadedAt: Date | null;
}

const documentTypes = [
  { value: "transcript", label: "Academic Transcript" },
  { value: "diploma", label: "Diploma/Degree" },
  { value: "language_test", label: "Language Test Results" },
  { value: "passport", label: "Passport Copy" },
  { value: "cv", label: "CV/Resume" },
  { value: "recommendation", label: "Letter of Recommendation" },
  { value: "financial", label: "Financial Document" },
  { value: "other", label: "Other" },
];

const statusConfig = {
  pending: { label: "Pending Review", icon: Clock, color: "text-yellow-600" },
  verified: { label: "Verified", icon: CheckCircle, color: "text-green-600" },
  rejected: { label: "Rejected", icon: XCircle, color: "text-red-600" },
};

export default function StudentDocuments() {
  const { toast } = useToast();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const { data: folders = [], isLoading: foldersLoading } = useQuery<DocumentFolder[]>({
    queryKey: ["/api/student/documents/folders"],
  });

  const { data: allDocuments = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/student/documents"],
  });

  const documents = allDocuments.filter(
    (doc) =>
      (selectedFolderId === null ? doc.folderId === null : doc.folderId === selectedFolderId) &&
      (searchQuery === "" ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) =>
      apiRequest("POST", "/api/student/documents/folders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/documents/folders"] });
      setFolderDialogOpen(false);
      toast({ title: "Success", description: "Folder created successfully" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest("DELETE", `/api/student/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/documents"] });
      setDeleteDialogOpen(false);
      setSelectedDocument(null);
      toast({ title: "Success", description: "Document deleted successfully" });
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

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) return FileText;
    return File;
  };

  return (
    <div className="min-h-screen">
      <div className="container py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
            My Documents
          </h1>
          <p className="text-muted-foreground">
            Manage your application documents, transcripts, and certifications
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg">Folders</CardTitle>
                <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost" data-testid="button-create-folder">
                      <FolderPlus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Folder</DialogTitle>
                      <DialogDescription>
                        Organize your documents by creating custom folders
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        createFolderMutation.mutate({
                          name: formData.get("name") as string,
                          color: formData.get("color") as string,
                        });
                      }}
                    >
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Folder Name</Label>
                          <Input
                            id="name"
                            name="name"
                            placeholder="Enter folder name"
                            required
                            data-testid="input-folder-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="color">Color</Label>
                          <Select name="color" defaultValue="#6366f1">
                            <SelectTrigger data-testid="select-folder-color">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="#6366f1">Indigo</SelectItem>
                              <SelectItem value="#8b5cf6">Purple</SelectItem>
                              <SelectItem value="#ec4899">Pink</SelectItem>
                              <SelectItem value="#f59e0b">Amber</SelectItem>
                              <SelectItem value="#10b981">Green</SelectItem>
                              <SelectItem value="#3b82f6">Blue</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={createFolderMutation.isPending}
                          data-testid="button-submit-folder"
                        >
                          {createFolderMutation.isPending ? "Creating..." : "Create Folder"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-1">
                <Button
                  variant={selectedFolderId === null ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedFolderId(null)}
                  data-testid="button-folder-all"
                >
                  <Folder className="h-4 w-4 mr-2" />
                  All Documents
                  <span className="ml-auto text-xs text-muted-foreground">
                    {allDocuments.filter((d) => d.folderId === null).length}
                  </span>
                </Button>
                {folders.map((folder) => (
                  <Button
                    key={folder.id}
                    variant={selectedFolderId === folder.id ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedFolderId(folder.id)}
                    data-testid={`button-folder-${folder.id}`}
                  >
                    <Folder
                      className="h-4 w-4 mr-2"
                      style={{ color: folder.color }}
                      fill={folder.color}
                      fillOpacity={0.2}
                    />
                    {folder.name}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {allDocuments.filter((d) => d.folderId === folder.id).length}
                    </span>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </aside>

          <main className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 flex-wrap gap-4">
                <div className="flex-1 flex items-center gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search documents..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search-documents"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant={viewMode === "grid" ? "secondary" : "ghost"}
                      onClick={() => setViewMode("grid")}
                      data-testid="button-view-grid"
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant={viewMode === "list" ? "secondary" : "ghost"}
                      onClick={() => setViewMode("list")}
                      data-testid="button-view-list"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button onClick={() => setUploadDialogOpen(true)} data-testid="button-upload-document">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Loading documents...
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-12">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by uploading your first document
                    </p>
                    <Button onClick={() => setUploadDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {documents.map((doc) => {
                      const FileIcon = getFileIcon(doc.mimeType);
                      const StatusIcon = statusConfig[doc.status as keyof typeof statusConfig]?.icon || Clock;
                      return (
                        <Card key={doc.id} className="hover-elevate" data-testid={`card-document-${doc.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <FileIcon className="h-8 w-8 text-primary" />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    data-testid={`button-menu-${doc.id}`}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem data-testid={`button-download-${doc.id}`}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedDocument(doc);
                                      setDeleteDialogOpen(true);
                                    }}
                                    className="text-destructive"
                                    data-testid={`button-delete-${doc.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <h3 className="font-semibold text-sm mb-1 truncate" title={doc.title}>
                              {doc.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mb-2 truncate">
                              {doc.fileName}
                            </p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {formatFileSize(doc.fileSize)}
                              </span>
                              <div className={cn("flex items-center gap-1", statusConfig[doc.status as keyof typeof statusConfig]?.color)}>
                                <StatusIcon className="h-3 w-3" />
                                <span>{statusConfig[doc.status as keyof typeof statusConfig]?.label}</span>
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                              {formatDate(doc.createdAt)}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => {
                      const FileIcon = getFileIcon(doc.mimeType);
                      const StatusIcon = statusConfig[doc.status as keyof typeof statusConfig]?.icon || Clock;
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center gap-4 p-4 rounded-md border hover-elevate"
                          data-testid={`row-document-${doc.id}`}
                        >
                          <FileIcon className="h-8 w-8 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{doc.title}</h3>
                            <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(doc.fileSize)}
                            </span>
                            <div className={cn("flex items-center gap-1 text-xs", statusConfig[doc.status as keyof typeof statusConfig]?.color)}>
                              <StatusIcon className="h-3 w-3" />
                              <span>{statusConfig[doc.status as keyof typeof statusConfig]?.label}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(doc.createdAt)}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  data-testid={`button-menu-list-${doc.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem data-testid={`button-download-list-${doc.id}`}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedDocument(doc);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive"
                                  data-testid={`button-delete-list-${doc.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload your academic documents, certificates, or other required files
            </DialogDescription>
          </DialogHeader>
          <UploadDocumentForm
            folderId={selectedFolderId}
            folders={folders}
            onSuccess={() => {
              setUploadDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["/api/student/documents"] });
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDocument?.title}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedDocument && deleteDocumentMutation.mutate(selectedDocument.id)}
              disabled={deleteDocumentMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteDocumentMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface UploadDocumentFormProps {
  folderId: string | null;
  folders: DocumentFolder[];
  onSuccess: () => void;
}

function UploadDocumentForm({ folderId: initialFolderId, folders, onSuccess }: UploadDocumentFormProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) =>
      fetch("/api/student/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      }).then((res) => {
        if (!res.ok) throw new Error("Upload failed");
        return res.json();
      }),
    onSuccess: () => {
      toast({ title: "Success", description: "Document uploaded successfully" });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    },
  });

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
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData(e.currentTarget);
    formData.append("file", selectedFile);

    uploadMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-border",
          selectedFile && "border-primary"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
          data-testid="input-file-upload"
        />
        {selectedFile ? (
          <div className="space-y-2">
            <FileText className="h-12 w-12 mx-auto text-primary" />
            <p className="font-semibold">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFile(null)}
              data-testid="button-remove-file"
            >
              Remove
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="font-semibold">Drop your file here or click to browse</p>
            <p className="text-sm text-muted-foreground">
              Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Document Type</Label>
          <Select name="type" defaultValue="other">
            <SelectTrigger data-testid="select-document-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="folderId">Folder</Label>
          <Select name="folderId" defaultValue={initialFolderId || ""}>
            <SelectTrigger data-testid="select-upload-folder">
              <SelectValue placeholder="Select folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No Folder</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Input
          id="description"
          name="description"
          placeholder="Add a description for this document"
          data-testid="input-document-description"
        />
      </div>

      <DialogFooter>
        <Button
          type="submit"
          disabled={!selectedFile || uploadMutation.isPending}
          data-testid="button-submit-upload"
        >
          {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
        </Button>
      </DialogFooter>
    </form>
  );
}
